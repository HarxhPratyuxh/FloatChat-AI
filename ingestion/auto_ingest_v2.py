"""
FloatChat — Argovis-Based Argo Ingestion Pipeline (India-First)
================================================================
Source: https://argovis-api.colorado.edu (REST API, QC=1 only)

Two modes:
  1. BACKFILL  — One-time historical pull (2020–2025), month by month
  2. DAILY     — Scheduler runs this to pull last 30 days (incremental)

Focus regions: Arabian Sea, Bay of Bengal, Indian Ocean

Author: Team Wavesena
"""

import os
import io
import sys
import time
import logging
import requests
import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("floatchat.ingestion")

# ── Config ────────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL")
CORPUS_PATH  = Path(os.getenv("CORPUS_PATH", "rag/corpus"))

ARGOVIS_API = "https://argovis-api.colorado.edu"

MAX_TOTAL_PROFILES = 80000
THROTTLE_SECONDS   = 5
REQUEST_TIMEOUT    = 120

USER_AGENT = "FloatChat-AI/1.0 (Argo Research Project; contact: team-argonauts)"

# ── Historical backfill config ────────────────────────────────────────────────
BACKFILL_START_YEAR  = 2020
BACKFILL_END_YEAR    = 2025   # inclusive
BACKFILL_THROTTLE    = 8      # 8 seconds between monthly pulls (be polite)

# ── India-First Regions ───────────────────────────────────────────────────────

REGIONS = [
    ("Arabian Sea",          5,   25,   50,   78),
    ("Bay of Bengal",        5,   23,   80,  100),
    ("Indian Ocean North",  -10,   5,   40,  100),
    ("Indian Ocean South",  -40, -10,   40,  100),
]

# ── HTTP Session ──────────────────────────────────────────────────────────────

def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    })
    return session


SESSION = make_session()


def get_conn():
    return psycopg2.connect(DATABASE_URL, sslmode="require")


def get_profile_count(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM argo_profiles")
        return cur.fetchone()[0]


def get_existing_keys(conn) -> set:
    with conn.cursor() as cur:
        cur.execute("SELECT wmo_id, cycle_number FROM argo_profiles")
        return set(cur.fetchall())


# ── Argovis API fetch ─────────────────────────────────────────────────────────

def build_argovis_polygon(lat_min, lat_max, lon_min, lon_max) -> str:
    polygon = [
        [lon_min, lat_min],
        [lon_max, lat_min],
        [lon_max, lat_max],
        [lon_min, lat_max],
        [lon_min, lat_min],
    ]
    return str(polygon).replace(" ", "")


def fetch_argovis(
    region_name: str,
    lat_min: float,
    lat_max: float,
    lon_min: float,
    lon_max: float,
    start_date: datetime,
    end_date: datetime,
) -> pd.DataFrame | None:
    """
    Fetch Argo profiles from Argovis API for a region + time window.
    Used by both backfill (monthly windows) and daily mode.
    """
    polygon = build_argovis_polygon(lat_min, lat_max, lon_min, lon_max)

    params = {
        "polygon":   polygon,
        "startDate": start_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "endDate":   end_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "data":      "temperature,salinity,pressure",
    }

    date_label = f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
    log.info(f"  Fetching {region_name} ({date_label})...")

    try:
        resp = SESSION.get(f"{ARGOVIS_API}/argo", params=params, timeout=REQUEST_TIMEOUT)

        if resp.status_code == 404:
            log.info(f"    No data for {region_name} in this window")
            return pd.DataFrame()

        if resp.status_code == 413:
            log.warning(f"    413 — region/time window too large")
            return None

        if resp.status_code == 429:
            log.warning(f"    429 Rate limited — waiting 60s...")
            time.sleep(60)
            return None

        resp.raise_for_status()
        data = resp.json()

        if not data:
            log.info(f"    No profiles returned")
            return pd.DataFrame()

        # Parse Argovis JSON into flat rows
        rows = []
        for profile in data:
            wmo_id = profile.get("_id", "").split("_")[0] if "_id" in profile else None
            cycle  = profile.get("cycle_number")
            geoloc = profile.get("geolocation", {})
            coords = geoloc.get("coordinates", [None, None])
            lon    = coords[0]
            lat    = coords[1]
            ts     = profile.get("timestamp")
            data_mode = profile.get("data_mode", "D")

            data_info  = profile.get("data_info", [[], [], []])
            data_items = profile.get("data", [])

            var_names = data_info[0] if len(data_info) > 0 else []
            var_map = {name: idx for idx, name in enumerate(var_names)}

            pres_idx = var_map.get("pressure", var_map.get("pres"))
            temp_idx = var_map.get("temperature", var_map.get("temp"))
            psal_idx = var_map.get("salinity", var_map.get("psal"))

            if pres_idx is None or temp_idx is None:
                continue

            try:
                if isinstance(data_items, list) and len(data_items) > 0:
                    pres_arr = data_items[pres_idx] if pres_idx is not None and pres_idx < len(data_items) else []
                    temp_arr = data_items[temp_idx] if temp_idx is not None and temp_idx < len(data_items) else []
                    psal_arr = data_items[psal_idx] if psal_idx is not None and psal_idx < len(data_items) else []

                    for i in range(len(pres_arr)):
                        pres_val = pres_arr[i] if i < len(pres_arr) else None
                        temp_val = temp_arr[i] if i < len(temp_arr) else None
                        psal_val = psal_arr[i] if psal_idx is not None and i < len(psal_arr) else None

                        if pres_val is None or temp_val is None:
                            continue

                        rows.append({
                            "platform_number": wmo_id,
                            "cycle_number":    cycle,
                            "time":            ts,
                            "latitude":        lat,
                            "longitude":       lon,
                            "pres":            pres_val,
                            "temp":            temp_val,
                            "psal":            psal_val,
                            "data_mode":       data_mode,
                            "temp_qc":         "1",
                            "psal_qc":         "1",
                        })
            except (IndexError, TypeError) as e:
                log.debug(f"    Skipping profile {wmo_id}_{cycle}: {e}")
                continue

        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame(rows)
        df = df.dropna(subset=["latitude", "longitude", "pres", "temp"])
        df = df[df["pres"] >= 0]
        df = df[df["temp"] > -9]

        log.info(f"    Got {len(df):,} measurements")
        return df

    except requests.exceptions.Timeout:
        log.warning(f"    Timeout for {region_name}")
        return None

    except requests.exceptions.ConnectionError as e:
        log.warning(f"    Connection error: {e}")
        return None

    except Exception as e:
        log.warning(f"    Error: {e}")
        return None


# ── Transform to DB rows ──────────────────────────────────────────────────────

def argovis_df_to_db_rows(df: pd.DataFrame, existing_keys: set) -> tuple[list, list]:
    """All values cast to native Python types to avoid numpy.int64 errors."""
    profiles = []
    measurements = []

    df["platform_number"] = pd.to_numeric(df["platform_number"], errors="coerce")
    df["cycle_number"]    = pd.to_numeric(df["cycle_number"],    errors="coerce")
    df = df.dropna(subset=["platform_number", "cycle_number"])

    df["platform_number"] = df["platform_number"].astype(int)
    df["cycle_number"]    = df["cycle_number"].astype(int)

    grouped = df.groupby(["platform_number", "cycle_number"])

    for (wmo_id, cycle_number), group in grouped:
        wmo_id       = int(wmo_id)
        cycle_number = int(cycle_number)

        if (wmo_id, cycle_number) in existing_keys:
            continue

        first = group.iloc[0]

        try:
            profile_dt = pd.to_datetime(first["time"], utc=True).to_pydatetime()
        except Exception:
            continue

        lat       = float(first["latitude"])
        lon       = float(first["longitude"])
        data_mode = str(first.get("data_mode", "D")).strip()

        profiles.append((
            wmo_id, cycle_number, profile_dt,
            lat, lon, data_mode,
            f"argovis_{wmo_id}_{cycle_number}",
        ))

        for _, row in group.iterrows():
            try:
                pres = float(row["pres"])
                temp = float(row["temp"])
                psal = (
                    float(row["psal"])
                    if pd.notna(row.get("psal")) and float(row.get("psal", -999)) > -9
                    else None
                )
                measurements.append((
                    wmo_id, cycle_number,
                    pres, temp, psal,
                    str(row.get("temp_qc", "1")).strip(),
                    str(row.get("psal_qc", "1")).strip(),
                ))
            except Exception:
                continue

    return profiles, measurements


# ── Bulk DB insert ─────────────────────────────────────────────────────────────

def bulk_insert(conn, profiles: list, measurements: list) -> int:
    if not profiles:
        return 0

    try:
        with conn.cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO argo_profiles
                    (wmo_id, cycle_number, profile_datetime,
                     latitude, longitude, data_mode, source_file)
                VALUES %s
                ON CONFLICT DO NOTHING
                RETURNING id, wmo_id, cycle_number
                """,
                profiles,
            )

            id_map = {(int(row[1]), int(row[2])): row[0] for row in cur.fetchall()}
            inserted = len(id_map)

            if not id_map:
                conn.rollback()
                return 0

            meas_values = [
                (id_map[(m[0], m[1])], m[2], m[3], m[4], m[5], m[6])
                for m in measurements
                if (m[0], m[1]) in id_map
            ]

            if meas_values:
                execute_values(
                    cur,
                    """
                    INSERT INTO argo_measurements
                        (profile_id, pressure, temp_adjusted,
                         psal_adjusted, temp_qc, psal_qc)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                    """,
                    meas_values,
                )

        conn.commit()
        return inserted

    except Exception as e:
        conn.rollback()
        log.error(f"Bulk insert failed: {e}")
        return 0


# ── Corpus auto-update ─────────────────────────────────────────────────────────

def update_corpus_stats(conn):
    log.info("Updating RAG corpus...")

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM argo_profiles")
        total_profiles = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM argo_measurements")
        total_measurements = cur.fetchone()[0]

        cur.execute("SELECT COUNT(DISTINCT wmo_id) FROM argo_profiles")
        unique_floats = cur.fetchone()[0]

        cur.execute(
            "SELECT MIN(profile_datetime), MAX(profile_datetime) FROM argo_profiles"
        )
        date_min, date_max = cur.fetchone()

        cur.execute("SELECT COUNT(*) FROM argo_profiles WHERE data_mode = 'D'")
        delayed_count = cur.fetchone()[0]

        # Year-wise breakdown for historical queries
        cur.execute("""
            SELECT
                EXTRACT(YEAR FROM profile_datetime)::int AS year,
                COUNT(*) AS cnt
            FROM argo_profiles
            GROUP BY year ORDER BY year
        """)
        yearly = cur.fetchall()

        cur.execute("""
            SELECT
                CASE
                    WHEN latitude BETWEEN 5  AND 25  AND longitude BETWEEN 50 AND 78
                        THEN 'Arabian Sea'
                    WHEN latitude BETWEEN 5  AND 23  AND longitude BETWEEN 80 AND 100
                        THEN 'Bay of Bengal'
                    WHEN latitude BETWEEN -40 AND 5  AND longitude BETWEEN 40 AND 100
                        THEN 'Indian Ocean'
                    ELSE 'Other'
                END AS region,
                COUNT(*) AS cnt
            FROM argo_profiles
            GROUP BY region ORDER BY cnt DESC
        """)
        regions = cur.fetchall()

        cur.execute("""
            SELECT
                ROUND(AVG(m.temp_adjusted)::numeric, 2),
                ROUND(MIN(m.temp_adjusted)::numeric, 2),
                ROUND(MAX(m.temp_adjusted)::numeric, 2),
                ROUND(AVG(m.psal_adjusted)::numeric, 3)
            FROM argo_measurements m
            WHERE m.temp_qc = '1' AND m.pressure < 10
        """)
        ss = cur.fetchone()

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    stats_md = f"""# FloatChat Live Data Statistics
*Auto-generated: {now_str}*

## Overview
- **Total Profiles:** {total_profiles:,}
- **Total Measurements:** {total_measurements:,}
- **Unique Argo Floats:** {unique_floats:,}
- **Date Range:** {date_min.strftime('%Y-%m-%d') if date_min else 'N/A'} to {date_max.strftime('%Y-%m-%d') if date_max else 'N/A'}
- **Quality-Controlled (Delayed-Mode D):** {delayed_count:,} ({100 * delayed_count // max(total_profiles, 1)}%)
- **Data Source:** Argovis API (University of Colorado)
- **Focus:** India-First (Arabian Sea, Bay of Bengal, Indian Ocean)

## Year-wise Profile Coverage
| Year | Profiles |
|------|---------|
{''.join(f'| {y} | {c:,} |{chr(10)}' for y, c in yearly)}

## Surface Statistics (pressure < 10 dbar, QC flag = 1)
- Average Temperature: {ss[0] if ss else 'N/A'} °C
- Temperature Range: {ss[1] if ss else 'N/A'} °C to {ss[2] if ss else 'N/A'} °C
- Average Salinity: {ss[3] if ss else 'N/A'} PSU

## Regional Profile Coverage
| Region | Profiles |
|--------|---------|
{''.join(f'| {r} | {c:,} |{chr(10)}' for r, c in regions)}

## Critical SQL Rules
- ALWAYS use `temp_adjusted` — never raw `temp`
- ALWAYS use `psal_adjusted` — never raw `psal`
- ALWAYS filter `temp_qc = '1'` for valid data
- ALWAYS JOIN: `argo_measurements m JOIN argo_profiles p ON m.profile_id = p.id`
- Prefer `data_mode = 'D'` for highest accuracy
- For year queries: `WHERE EXTRACT(YEAR FROM p.profile_datetime) = 2023`
- For date range: `WHERE p.profile_datetime BETWEEN '2023-01-01' AND '2023-12-31'`
"""

    coverage_md = f"""# FloatChat Float & Region Coverage
*Auto-generated: {now_str}*

## Database Summary
{total_profiles:,} profiles · {unique_floats:,} floats · {date_min.strftime('%Y') if date_min else '?'}–{date_max.strftime('%Y') if date_max else '?'}

## Historical Data Available
This database contains year-wise Argo data from {BACKFILL_START_YEAR} to present.
Users can query any year: "salinity in Arabian Sea in 2023" works.

## Year-wise Breakdown
| Year | Profiles |
|------|---------|
{''.join(f'| {y} | {c:,} |{chr(10)}' for y, c in yearly)}

## Region Coordinate Reference (for SQL WHERE clauses)
| Region | SQL Constraint |
|--------|---------------|
| Arabian Sea | `latitude BETWEEN 5 AND 25 AND longitude BETWEEN 50 AND 78` |
| Bay of Bengal | `latitude BETWEEN 5 AND 23 AND longitude BETWEEN 80 AND 100` |
| Indian Ocean North | `latitude BETWEEN -10 AND 5 AND longitude BETWEEN 40 AND 100` |
| Indian Ocean South | `latitude BETWEEN -40 AND -10 AND longitude BETWEEN 40 AND 100` |

## Depth Reference
| Layer | Pressure Range | Approx Depth |
|-------|---------------|-------------|
| Surface | < 10 dbar | ~10 m |
| Shallow | 10–200 dbar | 10–200 m |
| Mid-depth | 200–1000 dbar | 200–1000 m |
| Deep | > 1000 dbar | > 1000 m |
| Max Argo depth | ~2000 dbar | ~2000 m |

## Example Queries the LLM Can Handle
- "Average salinity in Arabian Sea in 2023"
- "Temperature trend in Bay of Bengal from 2020 to 2025"
- "Compare salinity levels between 2021 and 2024"
- "Deepest temperature reading in Indian Ocean last year"
"""

    CORPUS_PATH.mkdir(parents=True, exist_ok=True)
    (CORPUS_PATH / "data_stats.md").write_text(stats_md, encoding="utf-8")
    (CORPUS_PATH / "float_coverage.md").write_text(coverage_md, encoding="utf-8")
    log.info("Corpus updated: data_stats.md + float_coverage.md written")


# ── FAISS rebuild ──────────────────────────────────────────────────────────────

def rebuild_faiss_index():
    try:
        import subprocess

        r = subprocess.run(
            [sys.executable, "rag/build_index.py"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if r.returncode == 0:
            log.info("FAISS index rebuilt successfully")
        else:
            log.warning(f"FAISS rebuild issue: {r.stderr[:200]}")
    except Exception as e:
        log.warning(f"FAISS rebuild failed: {e}")


# ── Health check karne ke liye ──────────────────────────────────────────────────────────

def test_argovis():
    log.info("Testing Argovis API connectivity...")
    try:
        resp = SESSION.get(f"{ARGOVIS_API}/ping", timeout=15)
        log.info(f"  Argovis API: HTTP {resp.status_code}")
        return resp.status_code == 200
    except Exception as e:
        log.error(f"  Argovis API unreachable: {e}")
        return False


# ═══════════════════════════════════════════════════════════════════════════════
#  MODE 1: HISTORICAL BACKFILL (2020–2025, month by month)
# ═══════════════════════════════════════════════════════════════════════════════

def run_backfill() -> dict:
    """
    One-time historical pull: fetches 2020–2025 data month by month.
    Run this ONCE to populate historical data.
    After this, the scheduler only needs daily mode.

    Usage: python auto_ingest_v2.py backfill
    """
    start = datetime.now(timezone.utc)
    log.info(f"=== BACKFILL MODE: {BACKFILL_START_YEAR}–{BACKFILL_END_YEAR} ===")
    log.info(f"=== India-First: Arabian Sea + Bay of Bengal + Indian Ocean ===")

    if not test_argovis():
        log.error("Cannot reach Argovis API. Aborting.")
        return {"status": "api_unreachable", "profiles_added": 0}

    conn = get_conn()
    current_count = get_profile_count(conn)

    if current_count >= MAX_TOTAL_PROFILES:
        log.info(f"Ceiling reached ({current_count:,}). Skipping.")
        conn.close()
        return {"status": "ceiling_reached", "total_profiles": current_count}

    existing_keys  = get_existing_keys(conn)
    total_inserted = 0
    total_failed   = 0

    # Walk through each year → each month → each region
    for year in range(BACKFILL_START_YEAR, BACKFILL_END_YEAR + 1):
        for month in range(1, 13):

            now = datetime.now(timezone.utc)
            if year == now.year and month > now.month:
                break

            current_count = get_profile_count(conn)
            if current_count >= MAX_TOTAL_PROFILES:
                log.info(f"Ceiling reached ({current_count:,}). Stopping backfill.")
                break

            # Build month window
            month_start = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                month_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

            log.info(f"── {year}-{month:02d} ──────────────────────────────")

            for region_name, lat_min, lat_max, lon_min, lon_max in REGIONS:
                df = fetch_argovis(
                    region_name, lat_min, lat_max, lon_min, lon_max,
                    start_date=month_start,
                    end_date=month_end,
                )

                if df is None:
                    total_failed += 1
                    time.sleep(BACKFILL_THROTTLE)
                    continue

                if df.empty:
                    time.sleep(BACKFILL_THROTTLE)
                    continue

                profiles, measurements = argovis_df_to_db_rows(df, existing_keys)

                if not profiles:
                    log.info(f"    {region_name}: all already in DB")
                    time.sleep(BACKFILL_THROTTLE)
                    continue

                inserted = bulk_insert(conn, profiles, measurements)
                total_inserted += inserted
                log.info(f"    {region_name}: +{inserted:,} profiles (total: {current_count + total_inserted:,})")

                for p in profiles:
                    existing_keys.add((p[0], p[1]))

                time.sleep(BACKFILL_THROTTLE)

        if get_profile_count(conn) >= MAX_TOTAL_PROFILES:
            break

    # Update corpus + FAISS after backfill
    update_corpus_stats(conn)
    conn.close()
    rebuild_faiss_index()

    duration = (datetime.now(timezone.utc) - start).total_seconds()
    result = {
        "status":           "backfill_complete",
        "profiles_added":   total_inserted,
        "regions_failed":   total_failed,
        "total_profiles":   current_count + total_inserted,
        "duration_seconds": round(duration, 1),
        "years_covered":    f"{BACKFILL_START_YEAR}–{BACKFILL_END_YEAR}",
    }
    log.info(f"=== Backfill Done: {result} ===")
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  MODE 2: DAILY INCREMENTAL (last 30 days — for scheduler)
# ═══════════════════════════════════════════════════════════════════════════════

def run_daily(max_profiles: int = 5000) -> dict:
    """
    Daily incremental pull: fetches last 30 days of data.
    Scheduler runs this automatically.

    Usage: python auto_ingest_v2.py daily
    """
    start = datetime.now(timezone.utc)
    log.info(f"=== DAILY MODE: last 30 days ===")

    if not test_argovis():
        log.error("Cannot reach Argovis API. Aborting.")
        return {"status": "api_unreachable", "profiles_added": 0}

    conn = get_conn()
    current_count = get_profile_count(conn)

    if current_count >= MAX_TOTAL_PROFILES:
        log.info(f"Ceiling reached ({current_count:,}). Skipping.")
        conn.close()
        return {"status": "ceiling_reached", "total_profiles": current_count}

    remaining     = min(max_profiles, MAX_TOTAL_PROFILES - current_count)
    existing_keys = get_existing_keys(conn)
    log.info(f"DB has {current_count:,} profiles. Targeting {remaining:,} new ones.")

    end_date   = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)

    total_inserted = 0
    total_failed   = 0

    for region_name, lat_min, lat_max, lon_min, lon_max in REGIONS:
        if total_inserted >= remaining:
            log.info(f"Target reached ({total_inserted:,}). Stopping.")
            break

        df = fetch_argovis(
            region_name, lat_min, lat_max, lon_min, lon_max,
            start_date=start_date,
            end_date=end_date,
        )

        if df is None:
            total_failed += 1
            continue

        if df.empty:
            continue

        profiles, measurements = argovis_df_to_db_rows(df, existing_keys)

        if not profiles:
            log.info(f"  {region_name}: all profiles already in DB")
            continue

        inserted = bulk_insert(conn, profiles, measurements)
        total_inserted += inserted
        log.info(f"  {region_name}: inserted {inserted:,} new profiles")

        for p in profiles:
            existing_keys.add((p[0], p[1]))

        time.sleep(THROTTLE_SECONDS)

    update_corpus_stats(conn)
    conn.close()
    rebuild_faiss_index()

    duration = (datetime.now(timezone.utc) - start).total_seconds()
    result = {
        "status":           "success",
        "profiles_added":   total_inserted,
        "regions_failed":   total_failed,
        "total_profiles":   current_count + total_inserted,
        "duration_seconds": round(duration, 1),
    }
    log.info(f"=== Daily Done: {result} ===")
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  CLI — pick mode from command line
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "daily"

    if mode == "backfill":
        print("\n🔄 Starting historical backfill (2020–2025)...")
        print("   This will take a while. You can Ctrl+C and resume later.\n")
        result = run_backfill()
    elif mode == "daily":
        result = run_daily(max_profiles=5000)
    else:
        print(f"Unknown mode: {mode}")
        print("Usage:")
        print("  python auto_ingest_v2.py backfill   # One-time: 2020–2025")
        print("  python auto_ingest_v2.py daily      # Scheduler: last 30 days")
        sys.exit(1)

    print(result)