#!/usr/bin/env python3

import polars as pl
from features import run_feature_extraction

def generate_training_data(input_parquet: str, output_parquet: str):
    print(f"Loading structurally clean data from {input_parquet}...")
    df = pl.read_parquet(input_parquet)

    print("Running mathematical feature extraction (Haversine, Time Lags)...")
    featured_df = run_feature_extraction(df)

    print(f"Writing fully featured ML dataset to {output_parquet}...")
    featured_df.write_parquet(output_parquet)
    print("Batch Feature Extraction Complete.")

if __name__ == "__main__":
    generate_training_data("clean_training_batch.parquet", "final_ml_features.parquet")
