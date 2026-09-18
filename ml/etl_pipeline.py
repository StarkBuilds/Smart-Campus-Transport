#!/usr/bin/env python3

import polars as pl
from datetime import datetime, timezone

def build_lazy_etl(source_file_path: str, output_parquet_path: str):
    """
    The master Extract, Transform, Load pipeline.
    Uses Polars LazyFrame for zero-copy, optimized execution.
    """

    lazy_df = pl.scan_ndjson(source_file_path)

    lazy_df = lazy_df.with_columns([
        pl.col("next_stop_id").str.to_lowercase().str.strip_chars().str.replace_all("-", "_").alias("clean_stop_id"),

        pl.col("timestamp").str.to_datetime(format="%Y-%m-%dT%H:%M:%SZ").dt.replace_time_zone("UTC").alias("timestamp")
    ])

    current_time = datetime.now(timezone.utc)
    lazy_df = lazy_df.with_columns([
        ((current_time - pl.col("timestamp")).dt.total_minutes() > 5.0).alias("is_stale_gps")
    ])

    lazy_df = lazy_df.filter(pl.col("speed_kmh") < 126.0)

    print(f"Executing ETL query plan and writing to {output_parquet_path}...")

    lazy_df.collect().write_parquet(output_parquet_path)

    print("ETL Handoff Complete.")

if __name__ == "__main__":
    build_lazy_etl("raw_bus_stream.ndjson", "clean_training_batch.parquet")
