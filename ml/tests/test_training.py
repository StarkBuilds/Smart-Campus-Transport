import pytest
import pandas as pd
import numpy as np
import json
from pathlib import Path
from unittest.mock import patch
import xgboost as xgb
from ml.train_model import train_xgboost_model, _calculate_metrics
import ml.train_model as tm

def test_metrics_calculation():
    y_true = np.array([10.0, 5.0, 0.0])
    y_pred = np.array([10.0, 5.0, 0.0])
    
    metrics = _calculate_metrics(y_true, y_pred)
    assert metrics["mae"] == 0.0
    assert metrics["rmse"] == 0.0
    assert metrics["r2"] == 1.0

def test_baseline_calculation():
    y_true = np.array([10.0, 5.0, 0.0])
    y_pred = np.full(3, 5.0)  # Mean is 5.0
    
    metrics = _calculate_metrics(y_true, y_pred)
    assert np.isclose(metrics["mae"], (5.0 + 0.0 + 5.0) / 3)
    assert metrics["r2"] == 0.0
    
def test_chronological_split_and_pipeline(tmp_path):
    # Generate Synthetic Dataset simulating clean parquet
    # Ensure they are cleanly ordered chronologically
    data = []
    base_time = pd.Timestamp("2026-09-20 08:00:00", tz="UTC")
    for i in range(100):
        data.append({
            "bus_id": "BUS1",
            "trip_id": "T01",
            "timestamp": base_time + pd.Timedelta(seconds=i*30),
            "speed_kmh": 20.0 + (i%5),
            "status": "IN_SERVICE",
            # Simulated Geospatial outputs required for Features
            "progress_along_route_km": 1.0,
            "route_progress_ratio": 0.1,
            "remaining_route_distance_km": 10.0,
            "road_distance_to_next_stop_km": 0.5,
            "segment_progress_ratio": 0.5,
            "cross_track_distance_m": 2.0,
            "bearing_difference_deg": 5.0,
            "missing_geospatial_projection": False,
            "is_off_route": False,
            "has_geospatial_issue": False,
            "accuracy_m": 5.0,
            "has_validation_issue": False,
            "delay_next_stop_minutes": 2.0 + (i%3),
            "scheduled_next_stop_arrival": "2026-09-20T08:05:00Z",
            "actual_next_stop_arrival": "2026-09-20T08:07:00Z",
            "scenario": "normal"
        })
    
    df = pd.DataFrame(data)
    
    # We will patch pd.read_parquet internally to return our df
    with patch("ml.train_model.pd.read_parquet", return_value=df):
        with patch.object(Path, "exists", return_value=True):
            # Temporarily modify ARTIFACTS_DIR
            original_artifacts_dir = tm.ARTIFACTS_DIR
            tm.ARTIFACTS_DIR = tmp_path
            try:
                train_xgboost_model()
                
                # Check artifacts are generated
                assert (tmp_path / "delay_xgb.json").exists()
                assert (tmp_path / "feature_manifest.json").exists()
                assert (tmp_path / "model_metadata.json").exists()
                
                # Reload constraints test
                manifest = json.loads((tmp_path / "feature_manifest.json").read_text())
                assert manifest["schema_version"] == "1.0"
                assert isinstance(manifest["feature_columns"], list)
                assert len(manifest["feature_columns"]) == 26
                
                meta = json.loads((tmp_path / "model_metadata.json").read_text())
                assert meta["train_size"] == 70
                assert meta["validation_size"] == 15
                assert meta["test_size"] == 15
                
                booster = xgb.XGBRegressor()
                booster.load_model(tmp_path / "delay_xgb.json")
                # Booster correctly intitializes
                assert booster is not None
            finally:
                tm.ARTIFACTS_DIR = original_artifacts_dir
