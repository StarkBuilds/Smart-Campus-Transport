#!/usr/bin/env python3

import os
import polars as pl
import math
import datetime
import onnxruntime as rt
import numpy as np

# Global session cache (initialized lazily)
_SESS = None
_INPUT_NAME = None

def get_inference_session():
    """Lazily loads the ONNX runtime session on first inference request."""
    global _SESS, _INPUT_NAME
    if _SESS is None:
        model_path = "traffic_model.onnx"
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"'{model_path}' not found! Run 'python train_model.py' to generate the binary."
            )
        _SESS = rt.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        _INPUT_NAME = _SESS.get_inputs()[0].name
    return _SESS, _INPUT_NAME

def append_ml_confidence_vectorized(df: pl.DataFrame) -> pl.DataFrame:
    """
    Fires the feature batch across the ONNX C++ boundary in a single SIMD pass.
    """
    sess, input_name = get_inference_session()

    # Must match the EXACT order and features used in train_model.py
    feature_cols = ["hour_of_day", "day_of_week", "is_morning_rush", "calculated_velocity_mps"]
    X_batch = df.select(feature_cols).to_numpy().astype(np.float32)

    raw_probs = sess.run(None, {input_name: X_batch})[1]

    if isinstance(raw_probs, list):
        congestion_scores = [float(p.get(1, 0.0)) for p in raw_probs]
    else:
        congestion_scores = [float(p[1]) for p in raw_probs]

    return df.with_columns(pl.Series("ml_confidence", congestion_scores))

def extract_time_features(df: pl.DataFrame) -> pl.DataFrame:
    """Extracts numerical time features from the timestamp."""
    return df.with_columns([
        pl.col("timestamp").dt.hour().alias("hour_of_day"),
        pl.col("timestamp").dt.weekday().alias("day_of_week"),
        ((pl.col("timestamp").dt.hour() >= 7) & (pl.col("timestamp").dt.hour() <= 10)).alias("is_morning_rush")
    ])

def create_lag_features(df: pl.DataFrame) -> pl.DataFrame:
    """Gets the previous coordinate and timestamp for the same bus."""
    df = df.sort(["bus_id", "timestamp"])
    return df.with_columns([
        pl.col("latitude").shift(1).over("bus_id").alias("prev_lat"),
        pl.col("longitude").shift(1).over("bus_id").alias("prev_lon"),
        pl.col("timestamp").shift(1).over("bus_id").alias("prev_timestamp"),
    ])

def calculate_physics(df: pl.DataFrame) -> pl.DataFrame:
    """Calculates physical distance and velocity to filter telemetry anomalies."""
    deg2rad = math.pi / 180.0
    r_earth_meters = 6371000.0

    df = df.with_columns([
        (pl.col("latitude") * deg2rad).alias("lat_rad"),
        (pl.col("prev_lat") * deg2rad).alias("prev_lat_rad"),
        (pl.col("longitude") * deg2rad).alias("lon_rad"),
        (pl.col("prev_lon") * deg2rad).alias("prev_lon_rad"),
    ])

    dlat = pl.col("lat_rad") - pl.col("prev_lat_rad")
    dlon = pl.col("lon_rad") - pl.col("prev_lon_rad")

    a = (dlat / 2).sin()**2 + pl.col("prev_lat_rad").cos() * pl.col("lat_rad").cos() * (dlon / 2).sin()**2
    c = 2 * a.sqrt().arcsin()

    df = df.with_columns([
        (r_earth_meters * c).alias("distance_from_last_ping_meters"),
        (pl.col("timestamp") - pl.col("prev_timestamp")).dt.total_seconds().alias("time_delta_seconds")
    ])

    df = df.with_columns([
        (pl.col("distance_from_last_ping_meters") / pl.col("time_delta_seconds")).alias("calculated_velocity_mps")
    ])
    return df.drop(["lat_rad", "prev_lat_rad", "lon_rad", "prev_lon_rad"])

def run_feature_extraction(df: pl.DataFrame) -> pl.DataFrame:
    """Master pipeline executing temporal, spatial, and kinematic transformations."""
    df = extract_time_features(df)
    df = create_lag_features(df)
    df = calculate_physics(df)

    df = df.drop_nulls(subset=["prev_lat"])
    df = df.filter(pl.col("calculated_velocity_mps") < 35.0)

    # Calculates speed_ratio required by the ONNX feature contract
    df = df.with_columns(
        (pl.col("speed_kmh") / 40.0).alias("speed_ratio")
    )
    return df
