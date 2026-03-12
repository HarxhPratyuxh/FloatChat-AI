# FloatChat: Domain Knowledge and General Concepts

## What is an Argo Float?
An Argo float is a battery-powered autonomous buoyancy glider used to observe temperature, salinity, and ocean currents. It spends most of its life drifting below the ocean surface, typically descending to a "parking depth" of 1,000 meters, drifting for about 9 days, and then descending further to 2,000 meters before ascending to the surface. During the continuous ascent, it measures the temperature and salinity of the water column (this is called a "profile"). Once at the surface, it transmits its data and GPS position to satellites before beginning the next cycle.

## Core Oceanographic Concepts

### PSU (Practical Salinity Unit)
Salinity in the ocean is typically measured in Practical Salinity Units (PSU). It represents the mass of dissolved salts in water. A typical ocean surface salinity is around 35 PSU, meaning there are 35 grams of salt per kilogram of seawater.

### dbar (Decibars)
Pressure in the ocean is measured in decibars (dbar). Because the density of seawater is relatively constant, 1 dbar of pressure is roughly equivalent to 1 meter of depth. Therefore, a measurement at 1,000 dbar is approximately 1,000 meters deep.

### Data Modes (Real-time vs Delayed-Mode)
Argo data has two primary quality modes:
1. **Real-time (R)**: Data transmitted directly from the float and subjected only to automated quality control tests. This data is available within 24 hours of collection but may contain sensor drift or errors.
2. **Delayed-Mode (D)**: Data that has been thoroughly evaluated by scientific oceanographic experts who apply complex calibrations to correct for long-term sensor drift (especially for salinity sensors). This is the gold standard for scientific analysis.

### Quality Control (QC) Flags
Every measurement is accompanied by a QC flag. A flag of `1` means the data is "Good" and has passed all quality checks. Other numbers indicate potentially bad, interpolated, or unverified data.

## What is FloatChat?
FloatChat is an open-source Retrieval-Augmented Generation (RAG) platform that allows users to query millions of rows of Argo oceanographic data using natural language. It translates user questions into complex PostgreSQL queries, executes them against a Supabase backend, and summarizes the statistical results using advanced LLMs like Llama 3 and Gemini. It also includes an immutable blockchain audit log to verify that the returned data has not been hallucinated by the AI.
