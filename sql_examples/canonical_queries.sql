-- 1. Total number of Argo profiles ingested
SELECT COUNT(*) AS total_profiles
FROM argo_profiles;
sql
Copy code
-- 2. Total number of measurements
SELECT COUNT(*) AS total_measurements
FROM argo_measurements;
sql
Copy code
-- 3. Average surface temperature (upper 10 dbar)
SELECT AVG(m.temp_adjusted) AS avg_surface_temp
FROM argo_measurements m
JOIN argo_profiles p ON p.id = m.profile_id
WHERE m.pressure < 10;
sql
Copy code
-- 4. Average salinity at surface (upper 10 dbar)
SELECT AVG(m.psal_adjusted) AS avg_surface_salinity
FROM argo_measurements m
JOIN argo_profiles p ON p.id = m.profile_id
WHERE m.pressure < 10;
sql
Copy code
-- 5. Temperature profile for a single Argo cycle
SELECT
    m.pressure,
    m.temp_adjusted
FROM argo_measurements m
JOIN argo_profiles p ON p.id = m.profile_id
WHERE p.cycle_number = 1
ORDER BY m.pressure;
sql
Copy code
-- 6. Profiles inside a latitude-longitude box
SELECT COUNT(*) AS profiles_in_region
FROM argo_profiles
WHERE latitude BETWEEN 10 AND 20
  AND longitude BETWEEN 70 AND 90;
sql
Copy code
-- 7. Deep ocean temperature (>1000 dbar)
SELECT AVG(m.temp_adjusted) AS deep_ocean_temp
FROM argo_measurements m
WHERE m.pressure > 1000;
sql
Copy code
-- 8. Number of delayed-mode profiles
SELECT COUNT(*) AS delayed_mode_profiles
FROM argo_profiles
WHERE data_mode = 'D';