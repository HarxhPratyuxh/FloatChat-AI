# FloatChat — Canonical SQL Patterns
# Used by FAISS retriever to ground LLM in correct query patterns

## Always JOIN like this
```sql
SELECT p.wmo_id, p.latitude, p.longitude, p.profile_datetime,
       m.pressure, m.temp_adjusted, m.psal_adjusted
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.id
WHERE m.temp_qc = '1'
  AND m.psal_qc = '1'
  AND p.data_mode = 'D'
```

## Average surface temperature in a region
```sql
SELECT ROUND(AVG(m.temp_adjusted)::numeric, 2) AS avg_surface_temp_c
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.id
WHERE m.pressure < 10
  AND m.temp_qc = '1'
  AND p.latitude BETWEEN 5 AND 25
  AND p.longitude BETWEEN 50 AND 78  -- Arabian Sea
  AND p.data_mode = 'D';
```

## Temperature profile at depth (vertical slice)
```sql
SELECT
    ROUND(m.pressure::numeric, 0) AS depth_dbar,
    ROUND(AVG(m.temp_adjusted)::numeric, 3) AS avg_temp_c,
    COUNT(*) AS sample_count
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.id
WHERE m.temp_qc = '1'
  AND p.latitude BETWEEN -60 AND 30
  AND p.longitude BETWEEN 20 AND 120  -- Indian Ocean
GROUP BY ROUND(m.pressure::numeric, 0)
ORDER BY depth_dbar
LIMIT 50;
```

## Time series — monthly average
```sql
SELECT
    DATE_TRUNC('month', p.profile_datetime) AS month,
    ROUND(AVG(m.temp_adjusted)::numeric, 2) AS avg_temp_c
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.id
WHERE m.pressure < 10
  AND m.temp_qc = '1'
  AND p.profile_datetime >= NOW() - INTERVAL '12 months'
GROUP BY month
ORDER BY month;
```

## Salinity at depth
```sql
SELECT ROUND(AVG(m.psal_adjusted)::numeric, 3) AS avg_salinity_psu
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.id
WHERE m.pressure BETWEEN 490 AND 510  -- ~500m depth
  AND m.psal_qc = '1'
  AND p.data_mode = 'D';
```

## Float track — where has a specific float been?
```sql
SELECT p.wmo_id, p.cycle_number, p.profile_datetime,
       p.latitude, p.longitude
FROM argo_profiles p
WHERE p.wmo_id = 1901234
ORDER BY p.profile_datetime;
```

## Count profiles per region
```sql
SELECT
    CASE
        WHEN latitude BETWEEN 5  AND 25  AND longitude BETWEEN 50 AND 78  THEN 'Arabian Sea'
        WHEN latitude BETWEEN 5  AND 23  AND longitude BETWEEN 80 AND 100 THEN 'Bay of Bengal'
        WHEN latitude BETWEEN -60 AND 30 AND longitude BETWEEN 20 AND 120 THEN 'Indian Ocean'
        WHEN latitude BETWEEN -60 AND 60 AND longitude BETWEEN 120 AND 280 THEN 'Pacific Ocean'
        WHEN latitude BETWEEN -60 AND 70 AND longitude BETWEEN -80 AND 20 THEN 'Atlantic Ocean'
        ELSE 'Other'
    END AS region,
    COUNT(*) AS profile_count
FROM argo_profiles
GROUP BY region
ORDER BY profile_count DESC;
```

## Warmest surface locations
```sql
SELECT
    p.latitude, p.longitude,
    ROUND(AVG(m.temp_adjusted)::numeric, 2) AS avg_surface_temp
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.id
WHERE m.pressure < 10
  AND m.temp_qc = '1'
GROUP BY p.latitude, p.longitude
ORDER BY avg_surface_temp DESC
LIMIT 20;
```

## Compare two regions
```sql
SELECT
    CASE
        WHEN p.latitude BETWEEN 5 AND 25 AND p.longitude BETWEEN 50 AND 78
            THEN 'Arabian Sea'
        WHEN p.latitude BETWEEN 5 AND 23 AND p.longitude BETWEEN 80 AND 100
            THEN 'Bay of Bengal'
    END AS region,
    ROUND(AVG(m.temp_adjusted)::numeric, 2) AS avg_temp,
    ROUND(AVG(m.psal_adjusted)::numeric, 3) AS avg_salinity,
    COUNT(*) AS measurements
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.id
WHERE m.temp_qc = '1'
  AND m.psal_qc = '1'
  AND m.pressure < 10
  AND ((p.latitude BETWEEN 5 AND 25 AND p.longitude BETWEEN 50 AND 78)
    OR (p.latitude BETWEEN 5 AND 23 AND p.longitude BETWEEN 80 AND 100))
GROUP BY region;
```

## NEVER DO THESE (banned by validator)
- SELECT * FROM argo_measurements  -- too large
- Use TEMP instead of TEMP_ADJUSTED
- Use PSAL instead of PSAL_ADJUSTED
- DELETE, DROP, UPDATE, INSERT — read-only system
- Query without LIMIT on large result sets
