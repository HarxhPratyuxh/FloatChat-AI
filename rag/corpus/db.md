
# Database and File Structure Report

## Overview
This document provides an overview of the database schema, the `.nc` files, and their interconnections. It also explains why the `argo_measurements` table is significantly larger than the `argo_profiles` table.

---

## Database Schema

### Tables

1. **argo_profiles**
   - **Purpose**: Stores metadata about Argo profiles.
   - **Columns**:
     - `id`: Primary key, unique identifier for each profile.
     - `wmo_id`: World Meteorological Organization ID for the float.
     - `cycle_number`: Cycle number of the float.
     - `profile_datetime`: Timestamp of the profile.
     - `latitude`: Latitude of the profile.
     - `longitude`: Longitude of the profile.
     - `data_mode`: Data mode (`R` for real-time, `D` for delayed, `A` for adjusted).
     - `source_file`: Name of the source `.nc` file.

2. **argo_measurements**
   - **Purpose**: Stores detailed measurements for each profile.
   - **Columns**:
     - `id`: Primary key, unique identifier for each measurement.
     - `profile_id`: Foreign key referencing `argo_profiles(id)`.
     - `pressure`: Pressure measurement.
     - `temp_adjusted`: Adjusted temperature measurement.
     - `psal_adjusted`: Adjusted salinity measurement.
     - `temp_qc`: Quality control flag for temperature.
     - `psal_qc`: Quality control flag for salinity.

3. **argo_metadata**
   - **Purpose**: Stores key-value metadata pairs.
   - **Columns**:
     - `id`: Primary key, unique identifier for each metadata entry.
     - `key`: Metadata key (unique).
     - `value`: Metadata value.

---

## `.nc` Files

### Description
- `.nc` files (NetCDF format) are used to store oceanographic data collected by Argo floats.
- Each file contains multiple variables, including:
  - **PRES_ADJUSTED**: Adjusted pressure values.
  - **TEMP_ADJUSTED**: Adjusted temperature values.
  - **PSAL_ADJUSTED**: Adjusted salinity values.
  - **LATITUDE**: Latitude of the float.
  - **LONGITUDE**: Longitude of the float.
  - **JULD**: Julian date of the profile.
  - **PLATFORM_NUMBER**: Unique identifier for the float.
  - **CYCLE_NUMBER**: Cycle number of the float.
  - **DATA_MODE**: Data mode (real-time, delayed, or adjusted).

### Purpose
- These files serve as the raw data source for populating the `argo_profiles` and `argo_measurements` tables.

---

## Connections Between Tables and Files

1. **argo_profiles**
   - Each row corresponds to a single `.nc` file.
   - Metadata such as latitude, longitude, and timestamp are extracted from the file.

2. **argo_measurements**
   - Each row corresponds to a single measurement within a profile.
   - Multiple measurements (e.g., pressure, temperature, salinity) are extracted from the `.nc` file for each profile.
   - This results in a significantly larger table compared to `argo_profiles`.

---

## Why `argo_measurements` is Larger Than `argo_profiles`

- **Granularity**:
  - `argo_profiles` contains one row per profile (i.e., one row per `.nc` file).
  - `argo_measurements` contains multiple rows per profile, with each row representing a single measurement at a specific depth.

- **Example**:
  - A single profile might have 100 depth levels, resulting in 100 rows in `argo_measurements` but only 1 row in `argo_profiles`.

- **Data Volume**:
  - The detailed nature of `argo_measurements` (storing pressure, temperature, salinity, and quality control flags for each depth) leads to its larger size.

---

## Summary
- The database schema is designed to efficiently store and query Argo float data.
- `.nc` files provide the raw data, which is ingested into the database.
- The `argo_measurements` table is larger due to its detailed, row-per-measurement structure, while `argo_profiles` provides a high-level summary of each profile.

## Final
- NetCDF stores measurements.
- PostgreSQL stores facts.
- FAISS stores explanations.
- LLMs create interpretation.