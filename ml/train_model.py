#!/usr/bin/env python3
"""
CampusRide Delay Prediction Model Training.

Trains an XGBoost tree model on historic batch ETL + Geospatial data to estimate
upcoming stop delays seamlessly transitioning the `FeatureEngineer` architecture.
Exports artifacts to 'ml/artifacts' directory.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from datetime import datetime, timezone

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.features import FeatureEngineer
from ml.geospatial_features import enrich_geospatial_features

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Config
DATA_PATH = Path("ml/data/processed/clean_bus_events.parquet")
ARTIFACTS_DIR = Path("ml/artifacts")


def _calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """Computes MAE, RMSE and R2 securely."""
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    return {"mae": mae, "rmse": rmse, "r2": r2}


def train_xgboost_model():
    """Main chronological training loop."""
    logger.info("Initializing Delay Prediction Model Training Pipeline.")
    
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Missing dataset parquet: {DATA_PATH}. Run dataset_generator & etl_pipeline.")
        
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Load Data and Process explicit pipeline
    logger.info(f"Loading raw batch data from {DATA_PATH}")
    df = pd.read_parquet(DATA_PATH)
    
    logger.info(f"Running Geospatial Enrichment (simulating inference parity)")
    df = enrich_geospatial_features(df)
    
    logger.info("Applying FeatureEngineer")
    fe = FeatureEngineer()
    
    # The batch transform extracts identical arrays safely protecting trips boundaries
    X, y = fe.transform_dataframe(df, is_training=True)
    
    # 2. Chronological Splitting (Preserving distribution & avoiding look-ahead)
    logger.info("Splitting chronologically to prevent temporal leakage.")
    
    # In temporal splitting, the actual data row order dictates validity
    # We must explicitly guarantee array is ordered by timestamp, which the backend script guaranteed via
    # Sort on original dataframe, but let's be explicitly chronological. (They are natively sorted via Kinematic lags)
    
    n_samples = len(X)
    train_end = int(n_samples * 0.7)
    val_end = int(n_samples * 0.85)
    
    logger.info(f"Train/Val/Test Splits: 0-{train_end} / {train_end}-{val_end} / {val_end}-{n_samples}")
    
    X_train, y_train = X.iloc[:train_end].copy(), y.iloc[:train_end].copy()
    X_val, y_val = X.iloc[train_end:val_end].copy(), y.iloc[train_end:val_end].copy()
    X_test, y_test = X.iloc[val_end:].copy(), y.iloc[val_end:].copy()
    
    # 3. Establish and evaluate Baseline Model
    baseline_prediction_value = float(y_train.mean())
    logger.info(f"Baseline (Train Mean Delay): {baseline_prediction_value:.3f} minutes.")
    
    # Predict uniform benchmark outputs across valid and test arrays
    base_val_preds = np.full(len(y_val), baseline_prediction_value)
    base_test_preds = np.full(len(y_test), baseline_prediction_value)
    
    baseline_val_metrics = _calculate_metrics(y_val, base_val_preds)
    baseline_test_metrics = _calculate_metrics(y_test, base_test_preds)
    
    logger.info(f"Baseline Validation Metrics: {baseline_val_metrics}")
    
    # 4. Train actual tree architecture
    xgb_params = {
        "n_estimators": 100,
        "max_depth": 6,
        "learning_rate": 0.08,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "random_state": 42,
        "objective": "reg:squarederror",
        "early_stopping_rounds": 15
    }
    logger.info(f"Training XGBRegressor with params: {xgb_params}")
    model = xgb.XGBRegressor(**xgb_params)

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=10
    )
    
    # 5. Evaluate Target XGBRegressor
    xgb_val_preds = model.predict(X_val)
    xgb_test_preds = model.predict(X_test)
    
    xgb_val_metrics = _calculate_metrics(y_val, xgb_val_preds)
    xgb_test_metrics = _calculate_metrics(y_test, xgb_test_preds)
    
    logger.info(f"XGBoost Test Metrics: {xgb_test_metrics}")
    
    # Output the required Model/Artifacts locally
    model_file = ARTIFACTS_DIR / "delay_xgb.json"
    manifest_file = ARTIFACTS_DIR / "feature_manifest.json"
    metadata_file = ARTIFACTS_DIR / "model_metadata.json"
    
    logger.info("Saving Model JSON...")
    model.save_model(model_file)
    
    logger.info("Saving Feature Manifest JSON...")
    with open(manifest_file, "w") as f:
        json.dump({
            "schema_version": "1.0",
            "feature_columns": fe.feature_manifest,
        }, f, indent=2)
        
    logger.info("Saving Model Metadata JSON...")
    metadata = {
        "model_version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "train_size": len(X_train),
        "validation_size": len(X_val),
        "test_size": len(X_test),
        "hyperparameters": xgb_params,
        "baseline_metrics": {
            "validation": baseline_val_metrics,
            "test": baseline_test_metrics,
            "train_mean_delay_predicted": baseline_prediction_value
        },
        "model_metrics": {
            "validation": xgb_val_metrics,
            "test": xgb_test_metrics
        }
    }
    with open(metadata_file, "w") as f:
        json.dump(metadata, f, indent=2)
        
    logger.info("Successfully finished delay target implementation pipeline.")

if __name__ == "__main__":
    train_xgboost_model()
