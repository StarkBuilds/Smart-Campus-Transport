#!/usr/bin/env python3

import polars as pl
import math

def extract_time_features(df: pl.DataFrame) -> pl.DataFrame:
    """Extracts numerical time features from the UTC timestamp."""
    return df.with_columns([
        pl.col("timestamp").dt.hour().alias("hour_of_day"),
        pl.col("timestamp").dt.weekday().alias("day_of_week"),
        # Create a boolean feature for morning rush hour (7 AM to 10 AM)
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
    """Calculates physical distance and velocity to detect impossible jumps."""

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
    """The master pipeline function."""
    df = extract_time_features(df)
    df = create_lag_features(df)
    df = calculate_physics(df)

    df = df.drop_nulls(subset=["prev_lat"])

    df = df.filter(pl.col("calculated_velocity_mps") < 35.0)

    return df
