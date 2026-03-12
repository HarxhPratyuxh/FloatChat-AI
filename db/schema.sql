CREATE TABLE argo_profiles (
    id SERIAL PRIMARY KEY,
    wmo_id INTEGER NOT NULL,
    cycle_number INTEGER NOT NULL,
    profile_datetime TIMESTAMP NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    data_mode CHAR(1) CHECK (data_mode IN ('R', 'D', 'A')),
    source_file TEXT
);

CREATE TABLE argo_measurements (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER REFERENCES argo_profiles(id) ON DELETE CASCADE,
    pressure DOUBLE PRECISION NOT NULL,
    temp_adjusted DOUBLE PRECISION,
    psal_adjusted DOUBLE PRECISION,
    temp_qc CHAR(1),
    psal_qc CHAR(1)
);

CREATE TABLE argo_metadata (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT
);
