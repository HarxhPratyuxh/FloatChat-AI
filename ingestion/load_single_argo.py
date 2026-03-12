import os
import psycopg2
import xarray as xr
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL")

def main():
# ISE MAT CHHEDNA SAALO
    if __file__.startswith(("R", "D")):
        print("Not an Argo file. Skipping.")
        return

    #Multi File Support Add Karna Baaki Hai
    ds = xr.open_dataset("data/D5901153_260.nc")

    # Check karne ke liye hai ki adjusted variables hain ya nahi
    required_vars = ["PRES_ADJUSTED", "TEMP_ADJUSTED", "PSAL_ADJUSTED"]
    for var in required_vars:
        if var not in ds.variables:
            print("Missing adjusted variables. Skipping file.")
            return

    lat = float(ds["LATITUDE"].values[0])
    lon = float(ds["LONGITUDE"].values[0])
    date = str(ds["JULD"].values[0])
    wmo_id = int(ds["PLATFORM_NUMBER"].values[0])
    cycle = int(ds["CYCLE_NUMBER"].values[0])
    data_mode = "".join(ds["DATA_MODE"].values.astype(str)).strip()[0]

    pres = ds["PRES_ADJUSTED"].values[0]
    temp = ds["TEMP_ADJUSTED"].values[0]
    psal = ds["PSAL_ADJUSTED"].values[0]

    temp_qc = ds["TEMP_ADJUSTED_QC"].values[0]
    psal_qc = ds["PSAL_ADJUSTED_QC"].values[0]

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO argo_profiles
        (wmo_id, cycle_number, profile_datetime, latitude, longitude, data_mode, source_file)
        VALUES (%s, %s, NOW(), %s, %s, %s, %s)
        RETURNING id
        """,
        (wmo_id, cycle, lat, lon, data_mode, "R2902273_135.nc"),
    )

    profile_id = cur.fetchone()[0]

    # Insert measurements with QC checks
    rows = []
    for i in range(len(pres)):
        if temp_qc[i].decode() == "1" and psal_qc[i].decode() == "1":
            rows.append(
                (
                    profile_id,
                    float(pres[i]),
                    float(temp[i]),
                    float(psal[i]),
                    temp_qc[i].decode(),
                    psal_qc[i].decode(),
                )
            )

    cur.executemany(
        """
        INSERT INTO argo_measurements
        (profile_id, pressure, temp_adjusted, psal_adjusted, temp_qc, psal_qc)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        rows,
    )

    conn.commit()
    cur.close()
    conn.close()

    print(f"Ingested profile {profile_id} with {len(rows)} measurements")


if __name__ == "__main__":
    main()
