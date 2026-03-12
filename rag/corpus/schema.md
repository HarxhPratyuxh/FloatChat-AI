# FloatChat Database Schema (Semantic Description)

## argo_profiles
Represents a single Argo float profile (one vertical measurement cycle).
Primary Key: `id`

Fields:
- id: Internal Profile ID (Primary Key).
- wmo_id: Unique identifier of the Argo float.
- cycle_number: The measurement cycle number for the float.
- profile_datetime: Timestamp when the profile was recorded.
- latitude, longitude: Geographic location of the float.
- data_mode:
  - 'D' = Delayed-mode (expert quality controlled, preferred).
  - 'R' = Real-time (automated QC only, lower reliability).
- source_file: Original NetCDF file name.

## argo_measurements
Contains vertical measurements associated with an Argo profile.
Foreign Key: `profile_id` references `argo_profiles(id)`

Fields:
- profile_id: Foreign Key linking to `argo_profiles.id`.
- pressure: Pressure in decibars (dbar). Higher pressure = deeper ocean.
- temp_adjusted: Scientifically corrected sea temperature (°C).
- psal_adjusted: Scientifically corrected salinity.
- temp_qc: Quality control flag for temperature (Must be '1'). NOTE: The column is `temp_qc`, NOT `temp_adjusted_qc`.
- psal_qc: Quality control flag for salinity (Must be '1').

## Relationships (Critical for Joins)
- **JOIN Rule**: `argo_measurements` does NOT contain `wmo_id` or `cycle_number`. You MUST join with `argo_profiles` to filter by float ID or location.
- **Correct Join**: `FROM argo_profiles p JOIN argo_measurements m ON p.id = m.profile_id`

Important rule:
Only *_ADJUSTED variables are scientifically valid for analysis.

## Geographic Ocean Basins (Standardized Bounding Boxes)
When a user asks for data in a specific region, use these standard coordinate filters in your `WHERE` clause:
- **Indian Ocean**: `latitude BETWEEN -45 AND 30 AND longitude BETWEEN 20 AND 120`
- **Pacific Ocean**: `latitude BETWEEN -60 AND 60 AND (longitude >= 120 OR longitude <= -70)`
- **Atlantic Ocean**: `latitude BETWEEN -60 AND 60 AND longitude BETWEEN -70 AND 20`
- **Bay of Bengal**: `latitude BETWEEN 5 AND 22 AND longitude BETWEEN 80 AND 95`
- **Arabian Sea**: `latitude BETWEEN 5 AND 25 AND longitude BETWEEN 50 AND 80`
