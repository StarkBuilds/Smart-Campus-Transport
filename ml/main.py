#!/usr/bin/env python3

from datetime import datetime, timezone
import polars as pl
from schemas import BusEvent, BusStatus
from features import run_feature_extraction

# 1. Simulate raw incoming telemetry data
raw_data = [
    {
        "bus_id": "bus_101",
        "route_id": "route_A",
        "timestamp": "2026-03-29T08:00:00Z",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "status": "IN_SERVICE",
    },
    {
        "bus_id": "bus_101",
        "route_id": "route_A",
        "timestamp": "2026-03-29T08:00:30Z",
        "latitude": 37.7752,
        "longitude": -122.4189,
        "status": "IN_SERVICE",
    },
    {
        "bus_id": "bus_101",
        "route_id": "route_A",
        "timestamp": "2026-03-29T08:01:00Z",
        "latitude": 37.7758,
        "longitude": -122.4180,
        "status": "IN_SERVICE",
    },
]

# 2. Step 1: Validate data through schemas.py
validated_events = []
for record in raw_data:
    # This will validate constraints (e.g., latitude bounds)
    event = BusEvent(**record)
    validated_events.append(event.model_dump())

print(f"Successfully validated {len(validated_events)} records.")

# 3. Step 2: Convert validated records into a Polars DataFrame
df = pl.DataFrame(validated_events)

# Ensure timestamp is cast to Polars Datetime
#df = df.with_columns(pl.col("timestamp").str.to_datetime())

# 4. Step 3: Run feature extraction via features.py
processed_df = run_feature_extraction(df)

# 5. Inspect the output
print("\nFeature Extraction Complete. Resulting DataFrame:")
print(processed_df.select([
    "bus_id",
    "timestamp",
    "is_morning_rush",
    "distance_from_last_ping_meters",
    "calculated_velocity_mps"
]))
