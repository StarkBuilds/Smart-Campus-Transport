#!/usr/bin/env python3
import json
import numpy as np
import polars as pl
from sklearn.ensemble import RandomForestClassifier
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
from features import run_feature_extraction

def train_and_export():
    print("Reading synthetic_buses.json for ground-truth telemetry...")
    with open("synthetic_buses.json", "r") as f:
        raw_data = json.load(f)

    print(f"Loaded {len(raw_data)} records. Running physics pipeline with Polars...")
    df = pl.DataFrame(raw_data)

    if df["timestamp"].dtype == pl.String:
        df = df.with_columns(
            pl.col("timestamp").str.to_datetime("%Y-%m-%dT%H:%M:%SZ").alias("timestamp")
        )

    # Execute full feature extraction to produce calculated_velocity_mps, lags, etc.
    df = run_feature_extraction(df)

    # Feature contract: Contextual features without direct target leakage
    feature_cols = ["hour_of_day", "day_of_week", "is_morning_rush", "calculated_velocity_mps"]
    X = df.select(feature_cols).to_numpy().astype(np.float32)

    # Target: 1 if crawling (< 15 km/h), 0 if free-flowing
    y = (df["speed_kmh"] < 15.0).to_numpy().astype(int)

    print(f"Training regularized RandomForestClassifier on {len(X)} samples...")
    # min_samples_leaf prevents pure 0.0/1.0 leaf collapses and produces gradual probabilities
    model = RandomForestClassifier(
        n_estimators=60,
        max_depth=6,
        min_samples_leaf=30,
        random_state=42
    )
    model.fit(X, y)

    print("Serializing trained model into ONNX format...")
    initial_type = [('float_input', FloatTensorType([None, len(feature_cols)]))]
    onx = convert_sklearn(model, initial_types=initial_type)

    with open("traffic_model.onnx", "wb") as f:
        f.write(onx.SerializeToString())

    print("SUCCESS: 'traffic_model.onnx' generated with smooth probability splits.")

if __name__ == "__main__":
    train_and_export()
