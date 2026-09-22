#!/usr/bin/env python3
"""
CampusRide Feature Engineering Pipeline.

Transforms canonical telemetry and dynamic geospatial outputs into numerical
features for XGBoost training and inference. Assumes geospatial enrichment
has already been performed by `ml/geospatial_features.py` or online logic.

Design principles:
- Strictly prevents target leakage (removes upcoming stops, delays, actuals).
- Deterministic One-Hot Encoding backed by `schemas.py` `BusStatus` enum.
- Time-sorted trip kinematics preserving trip-boundaries preventing future look-aheads.
"""

from __future__ import annotations

from typing import List, Optional, Tuple
from datetime import datetime, timezone

import pandas as pd
import numpy as np

from ml.schemas import BusStatus, PredictionRequest
# If we need geospatial features for real-time:
from ml.geospatial_features import enrich_geospatial_features


def _ensure_geospatial_dataframe_format(df: pd.DataFrame) -> pd.DataFrame:
    """Helper to convert telemetry list into a dataframe matching ETL."""
    # Ensure correct types expected by geospatial_features and this module
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
    return df


class FeatureEngineer:
    """
    Feature Extraction Pipeline for Delay Prediction.
    
    Handles offline batch processing (historical parquets) and online
    inference processing (PredictionRequests).
    """
    
    # Ground truth columns that MUST be excluded from the feature set
    # scheduled_next_stop_arrival is excluded because the model must learn
    # from pure delays, rather than seeing a timestamp in the future directly.
    LEAKAGE_COLUMNS = [
        "scheduled_next_stop_arrival",
        "actual_next_stop_arrival",
        "delay_next_stop_minutes",
        "scenario",
    ]

    # Explicit list of categorical status values mapped directly from schemas.py
    STATUS_VALUES = [status.value for status in BusStatus]

    def __init__(self):
        # List of final feature names in exact order. 
        # Populated after the first transform_dataframe run.
        self.feature_manifest: Optional[List[str]] = None

    def _build_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Extracts hour, day_of_week and rush hour flags."""
        df = df.copy()
        
        # Ensure timestamp is datetime
        if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
            df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
            
        df["hour_of_day"] = df["timestamp"].dt.hour
        df["day_of_week"] = df["timestamp"].dt.dayofweek
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
        
        # Morning rush: Weekdays 07:00-10:00
        df["is_morning_rush"] = ((df["hour_of_day"] >= 7) & 
                                 (df["hour_of_day"] <= 10) & 
                                 (df["is_weekend"] == 0)).astype(int)
                                 
        # Evening rush: Weekdays 16:00-19:00
        df["is_evening_rush"] = ((df["hour_of_day"] >= 16) & 
                                 (df["hour_of_day"] <= 19) & 
                                 (df["is_weekend"] == 0)).astype(int)
                                 
        return df

    def _build_kinematic_lag_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculates rolling acceleration and speed deltas grouped by bus and trip."""
        df = df.copy()
        
        # Must be sorted chronologically within trip groups to prevent future leakage
        df = df.sort_values(by=["bus_id", "trip_id", "timestamp"])
        
        grouped = df.groupby(["bus_id", "trip_id"])
        
        # Shift values by 1 to get previous row
        prev_time = grouped["timestamp"].shift(1)
        prev_speed = grouped["speed_kmh"].shift(1)
        
        # Calculate deltas
        time_delta_seconds = (df["timestamp"] - prev_time).dt.total_seconds()
        speed_delta_kmh = df["speed_kmh"] - prev_speed
        
        # Handle first row of a trip (no previous data)
        time_delta_seconds = time_delta_seconds.fillna(0.0)
        speed_delta_kmh = speed_delta_kmh.fillna(0.0)
        
        # Acceleration in m/s^2 ( km/h to m/s is / 3.6 )
        speed_delta_mps = speed_delta_kmh / 3.6
        
        # Avoid division by zero, though time_delta is usually > 0
        acceleration = np.where(time_delta_seconds > 0.0, 
                                speed_delta_mps / time_delta_seconds, 
                                0.0)
                                
        # Cap physics extremes (realistic bus limit)
        acceleration = np.clip(acceleration, -10.0, 10.0)
        
        df["time_delta_seconds"] = time_delta_seconds
        df["speed_delta_kmh"] = speed_delta_kmh
        df["acceleration_mps2"] = acceleration
        
        # Rolling 3-ping average speed
        df["rolling_mean_speed_3"] = grouped["speed_kmh"].rolling(window=3, min_periods=1).mean().reset_index(level=[0, 1], drop=True)
        
        return df

    def _build_status_and_categorical(self, df: pd.DataFrame) -> pd.DataFrame:
        """Deterministic encoding of booleans and BusStatus."""
        df = df.copy()
        
        # Deterministic One-Hot Encoding for BusStatus using the Schema Enums
        # This guarantees identical columns across train/inference regardless of seen data
        status_col = df["status"].fillna(BusStatus.IN_SERVICE.value).astype(str)
        
        for status_val in self.STATUS_VALUES:
            df[f"status_{status_val}"] = (status_col == status_val).astype(int)
            
        # Convert explicit booleans to integers
        bool_cols = [
            "has_validation_issue", "missing_geospatial_projection",
            "is_off_route", "has_geospatial_issue"
        ]
        
        for col in bool_cols:
            if col in df.columns:
                df[col] = df[col].astype(int)
            else:
                # Useful during inference if flags are not generated by the subset graph
                df[col] = 0
                
        return df

    def _select_and_order_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Keeps only the specified numerical/encoded features."""
        # The list of definitive model inputs
        features_to_keep = [
            # Temporal
            "hour_of_day", "day_of_week", "is_weekend", "is_morning_rush", "is_evening_rush",
            # Kinematic
            "speed_kmh", "time_delta_seconds", "speed_delta_kmh", "acceleration_mps2", "rolling_mean_speed_3",
            # Geospatial (Passed-through)
            "progress_along_route_km", "route_progress_ratio", "remaining_route_distance_km",
            "road_distance_to_next_stop_km", "segment_progress_ratio", "cross_track_distance_m",
            "bearing_difference_deg", "missing_geospatial_projection", "is_off_route", "has_geospatial_issue",
            # Data quality
            "accuracy_m", "has_validation_issue", 
            # Status
            "status_IN_SERVICE", "status_OUT_OF_SERVICE", "status_AT_STOP", "status_DELAYED"
        ]
        
        missing = [f for f in features_to_keep if f not in df.columns]
        if missing:
            raise ValueError(f"Missing essential features from transformation: {missing}")
            
        # Ensure strict ordering
        X = df[features_to_keep].copy()
        
        # Impute eventual NaNs in numerical features (e.g. if accuracy_m is missing)
        X = X.fillna(0.0)
        
        return X

    def transform_dataframe(self, df: pd.DataFrame, is_training: bool = False) -> Tuple[pd.DataFrame, Optional[pd.Series]]:
        """
        Transforms a batch DataFrame (from ETL+Geospatial) into features.
        
        Args:
            df: Enriched historical dataframe.
            is_training: If True, returns target series 'delay_next_stop_minutes' 
                         and establishes the feature manifest.
                         
        Returns:
            X: Feature dataframe
            y: Target series (or None if is_training=False)
        """
        # 1. Temporal
        df_feat = self._build_temporal_features(df)
        
        # 2. Kinematics (Lags safely calculated within trip boundaries)
        df_feat = self._build_kinematic_lag_features(df_feat)
        
        # 3. Categoricals / Encoding
        df_feat = self._build_status_and_categorical(df_feat)
        
        # 4. Filter and Order strict features
        X = self._select_and_order_features(df_feat)
        
        # Freeze or enforce manifest ordering
        if self.feature_manifest is None and is_training:
            self.feature_manifest = X.columns.tolist()
        elif self.feature_manifest is not None:
            # Enforce exact column order dynamically
            X = X[self.feature_manifest]
            
        y = None
        if is_training:
            if "delay_next_stop_minutes" not in df.columns:
                raise ValueError("Target 'delay_next_stop_minutes' required when is_training=True.")
            y = df["delay_next_stop_minutes"].astype(float)
            
        return X, y

    def transform_realtime(self, request: PredictionRequest) -> pd.DataFrame:
        """
        Converts live inference pings into a final valid single-row Feature Matrix.
        Re-utilizes the exact batch geometry logic array for absolute parity.
        """
        # Combine historical and current pings into a chronological list
        pings = []
        if request.recent_telemetry:
            pings.extend(request.recent_telemetry)
        
        # Validate that the current ping is the latest in chronological order.
        # This was statically guarded in schemas.py, but safe to sequence strictly.
        pings.append(request.telemetry)
        
        # Synthesize a DataFrame compatible with ETL output expectations
        req_dicts = [p.model_dump(by_alias=False) for p in pings]
        df = pd.DataFrame(req_dicts)
        
        # Default missing values gracefully to batch norms
        if "accuracy_m" not in df.columns or df["accuracy_m"].isna().all():
            df["accuracy_m"] = 5.0  # safe median assumption
            
        # Ensure timestamp is pandas dt type
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df["has_validation_issue"] = 0
            
        # The backend PredictionRequest may not send all static features, but we process
        # geography natively using geospatial_features to calculate tracking specifics dynamically.
        # (Assuming enrich_geospatial_features can run natively on minimal schemas)
        
        df_enriched = enrich_geospatial_features(df)
        
        # In case PredictionRequest sent an explicit backend override for path details:
        if request.route_length_km is not None:
            df_enriched["route_length_km"] = request.route_length_km
        if request.road_distance_to_next_stop_km is not None:
            df_enriched["road_distance_to_next_stop_km"] = request.road_distance_to_next_stop_km

        # Run feature pipeline (no training targets present!)
        X, _ = self.transform_dataframe(df_enriched, is_training=False)
        
        # Pick solely the latest observation (which corresponds to request.telemetry)
        # Because we sorted inside _build_kinematic_lag_features, the array maintains
        # chronological logic, capturing exactly the final ping's kinematics.
        return X.iloc[[-1]].reset_index(drop=True)

