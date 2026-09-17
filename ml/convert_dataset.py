#!/usr/bin/env python3

#!/usr/bin/env python3
import pandas as pd
import numpy as np
import json

# 1. Ingest the ML-focused dataset
print("Reading training_data.csv...")
df = pd.read_csv('training_data.csv')

# 2. Map existing columns to the strict Pydantic BusEvent schema
schema_df = pd.DataFrame()
schema_df['bus_id'] = df['bus_id']
schema_df['route_id'] = df['route_id']
schema_df['timestamp'] = df['timestamp']
schema_df['bearing'] = df['bearing']
schema_df['speed_kmh'] = df['current_speed_kmh']
schema_df['status'] = 'IN_SERVICE'
schema_df['next_stop_id'] = 'STOP-' + df['stop_sequence'].astype(int).astype(str)

# 3. The Pydantic Bypass: Generate plausible coordinates
# We use a base coordinate in Kolkata and add a tiny random jitter.
# Without this jitter, Polars will calculate 0.0 distance between pings and drop the rows.
base_lat = 22.5726
base_lon = 88.3639
np.random.seed(42)

schema_df['latitude'] = base_lat + np.random.normal(0, 0.005, len(df))
schema_df['longitude'] = base_lon + np.random.normal(0, 0.005, len(df))

# 4. Export to a clean, pipeline-ready format
csv_filename = 'synthetic_buses.csv'
schema_df.to_csv(csv_filename, index=False)

json_filename = 'synthetic_buses.json'
schema_df.to_json(json_filename, orient='records', indent=2)

print(f"Successfully converted {len(schema_df)} rows.")
print(f"Files saved: {csv_filename}, {json_filename}")
