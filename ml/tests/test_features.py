import pytest
import pandas as pd
import numpy as np
import datetime
from ml.features import FeatureEngineer, _ensure_geospatial_dataframe_format
from ml.schemas import PredictionRequest, BusTelemetry, BusStatus

@pytest.fixture
def sample_batch_df():
    """Provides a synthetic batch dataframe mapped to geospatial outputs."""
    data = []
    base_time = datetime.datetime(2026, 9, 20, 8, 0, 0, tzinfo=datetime.timezone.utc)
    for i in range(5):
        data.append({
            "bus_id": "BUS1",
            "trip_id": "T01",
            "timestamp": base_time + datetime.timedelta(seconds=i*30),
            "speed_kmh": 20.0 + i*5.0,
            "status": "IN_SERVICE",
            # Simulated Geospatial outputs
            "progress_along_route_km": 1.0 + i*0.2,
            "route_progress_ratio": 0.1 + i*0.02,
            "remaining_route_distance_km": 10.0 - i*0.2,
            "road_distance_to_next_stop_km": 0.5,
            "segment_progress_ratio": 0.5,
            "cross_track_distance_m": 2.0,
            "bearing_difference_deg": 5.0,
            "missing_geospatial_projection": False,
            "is_off_route": False,
            "has_geospatial_issue": False,
            "accuracy_m": 5.0,
            "has_validation_issue": False,
            "delay_next_stop_minutes": 2.0,
            "scheduled_next_stop_arrival": "2026-09-20T08:05:00Z",
            "actual_next_stop_arrival": "2026-09-20T08:07:00Z",
            "scenario": "normal"
        })
    df = pd.DataFrame(data)
    return df

def test_temporal_features(sample_batch_df):
    fe = FeatureEngineer()
    df_temp = fe._build_temporal_features(sample_batch_df)
    
    assert "hour_of_day" in df_temp.columns
    assert "day_of_week" in df_temp.columns
    assert "is_weekend" in df_temp.columns
    assert "is_morning_rush" in df_temp.columns
    
    assert df_temp["hour_of_day"].iloc[0] == 8
    assert df_temp["day_of_week"].iloc[0] == 6  # Sunday 
    assert df_temp["is_weekend"].iloc[0] == 1
    assert df_temp["is_morning_rush"].iloc[0] == 0 # Weekends cant be rush

def test_kinematic_lag_features(sample_batch_df):
    fe = FeatureEngineer()
    df_kin = fe._build_kinematic_lag_features(sample_batch_df)
    
    assert "time_delta_seconds" in df_kin.columns
    assert "speed_delta_kmh" in df_kin.columns
    assert "acceleration_mps2" in df_kin.columns
    
    # First row has no previous logic
    assert df_kin["time_delta_seconds"].iloc[0] == 0.0
    assert df_kin["speed_delta_kmh"].iloc[0] == 0.0
    
    # Second row (30 sec passed, 5 km/h increased)
    assert df_kin["time_delta_seconds"].iloc[1] == 30.0
    assert df_kin["speed_delta_kmh"].iloc[1] == 5.0
    assert np.isclose(df_kin["acceleration_mps2"].iloc[1], (5.0 / 3.6) / 30.0)

def test_trip_boundary_lag_isolation():
    """Verify kinematics respect boundary combinations."""
    data = []
    base_time = datetime.datetime(2026, 9, 20, 8, 0, 0, tzinfo=datetime.timezone.utc)
    # Trip 1
    data.append({"bus_id": "B1", "trip_id": "T1", "timestamp": base_time, "speed_kmh": 20.0})
    data.append({"bus_id": "B1", "trip_id": "T1", "timestamp": base_time + datetime.timedelta(seconds=10), "speed_kmh": 30.0})
    # Trip 2 (should reset)
    data.append({"bus_id": "B1", "trip_id": "T2", "timestamp": base_time + datetime.timedelta(seconds=20), "speed_kmh": 40.0})
    
    df = pd.DataFrame(data)
    fe = FeatureEngineer()
    res = fe._build_kinematic_lag_features(df)
    
    assert res["speed_delta_kmh"].iloc[0] == 0.0
    assert res["speed_delta_kmh"].iloc[1] == 10.0
    assert res["speed_delta_kmh"].iloc[2] == 0.0  # Reset for T2!

def test_anti_leakage_exclusion(sample_batch_df):
    fe = FeatureEngineer()
    X, y = fe.transform_dataframe(sample_batch_df, is_training=True)
    
    assert "delay_next_stop_minutes" not in X.columns
    assert "scheduled_next_stop_arrival" not in X.columns
    assert "actual_next_stop_arrival" not in X.columns
    assert "scenario" not in X.columns
    assert y is not None
    assert len(y) == 5

def test_realtime_prediction_request_parity(sample_batch_df):
    fe = FeatureEngineer()
    # Batch parse to define manifest
    X_train, _ = fe.transform_dataframe(sample_batch_df, is_training=True)
    manifest = fe.feature_manifest
    
    # 2. Build exactly compatible PredictionRequest
    t1 = base_time = datetime.datetime(2026, 9, 20, 8, 0, 0, tzinfo=datetime.timezone.utc)
    
    request = PredictionRequest(
        telemetry=BusTelemetry(
            bus_id="BUS1", route_id="R01", trip_id="T01",
            timestamp=t1 + datetime.timedelta(seconds=30),
            latitude=12.0, longitude=50.0, bearing=90.0, speed_kmh=25.0,
            status=BusStatus.IN_SERVICE
        ),
        recent_telemetry=[
            BusTelemetry(
                bus_id="BUS1", route_id="R01", trip_id="T01",
                timestamp=t1,
                latitude=12.0, longitude=50.0, bearing=90.0, speed_kmh=20.0,
                status=BusStatus.IN_SERVICE
            )
        ]
    )
    
    X_pred = fe.transform_realtime(request)
    
    assert list(X_pred.columns) == manifest
    assert len(X_pred) == 1
    # Check that lag kinematics were applied natively between the two
    assert X_pred["time_delta_seconds"].iloc[0] == 30.0
    assert X_pred["speed_delta_kmh"].iloc[0] == 5.0
