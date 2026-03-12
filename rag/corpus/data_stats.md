# FloatChat Live Data Statistics
*Auto-generated: 2026-03-07 09:23 UTC*

## Overview
- **Total Profiles:** 1,418
- **Total Measurements:** 47,886
- **Unique Argo Floats:** 483
- **Date Range:** 2025-12-30 to 2026-03-07
- **Quality-Controlled (Delayed-Mode D):** 1,417 (99%)
- **Data Source:** Argovis API (University of Colorado)
- **Focus:** India-First (Arabian Sea, Bay of Bengal, Indian Ocean)

## Year-wise Profile Coverage
| Year | Profiles |
|------|---------|
| 2025 | 3 |
| 2026 | 1,415 |


## Surface Statistics (pressure < 10 dbar, QC flag = 1)
- Average Temperature: 27.33 °C
- Temperature Range: 13.68 °C to 30.26 °C
- Average Salinity: 35.061 PSU

## Regional Profile Coverage
| Region | Profiles |
|--------|---------|
| Indian Ocean | 977 |
| Arabian Sea | 240 |
| Bay of Bengal | 114 |
| Other | 87 |


## Critical SQL Rules
- ALWAYS use `temp_adjusted` — never raw `temp`
- ALWAYS use `psal_adjusted` — never raw `psal`
- ALWAYS filter `temp_qc = '1'` for valid data
- ALWAYS JOIN: `argo_measurements m JOIN argo_profiles p ON m.profile_id = p.id`
- Prefer `data_mode = 'D'` for highest accuracy
- For year queries: `WHERE EXTRACT(YEAR FROM p.profile_datetime) = 2023`
- For date range: `WHERE p.profile_datetime BETWEEN '2023-01-01' AND '2023-12-31'`
