#!/usr/bin/env python3
"""
Delay Prediction Inference Engine for Smart Campus Transport.

Loads the trained XGBoost model artifact (delay_xgb.json), the feature manifest
(feature_manifest.json), and model metadata (model_metadata.json).
Reuses the finalized FeatureEngineer.transform_realtime() pipeline for feature extraction.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
import xgboost as xgb

from ml.features import FeatureEngineer
from ml.schemas import (
    ModelHealthResponse,
    ModelHealthStatus,
    ModelMetadataResponse,
    ModelValidationResponse,
    PredictionRequest,
    PredictionResponse,
)

logger = logging.getLogger(__name__)

DEFAULT_ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


class DelayPredictor:
    """
    Production inference engine for bus delay predictions.

    Loads XGBoost artifacts, enforces manifest feature order, and reuses
    transform_realtime() from features.py for complete feature parity.
    """

    def __init__(self, artifacts_dir: Optional[Path] = None):
        self.artifacts_dir = Path(artifacts_dir) if artifacts_dir else DEFAULT_ARTIFACTS_DIR
        self.model: Optional[Any] = None
        self.feature_manifest: Optional[List[str]] = None
        self.metadata: Dict[str, Any] = {}
        self.model_version: str = "unknown"
        self.fe: Optional[FeatureEngineer] = None
        self.is_ready: bool = False

        self.load()

    def load(self) -> None:
        """
        Load model artifact, feature manifest, and model metadata from disk.
        """
        model_path = self.artifacts_dir / "delay_xgb.json"
        manifest_path = self.artifacts_dir / "feature_manifest.json"
        metadata_path = self.artifacts_dir / "model_metadata.json"

        if not model_path.is_file():
            logger.warning("Model artifact not found at %s", model_path)
            self.is_ready = False
            return

        if not manifest_path.is_file():
            logger.warning("Feature manifest not found at %s", manifest_path)
            self.is_ready = False
            return

        try:
            # 1. Load Feature Manifest
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
            self.feature_manifest = manifest_data.get("feature_columns", [])
            logger.info("Loaded %d features from manifest", len(self.feature_manifest))

            # 2. Load Model Metadata
            if metadata_path.is_file():
                with open(metadata_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                self.model_version = self.metadata.get("model_version", "1.0.0")
            else:
                self.model_version = "1.0.0"

            # 3. Load XGBoost Model
            # Using XGBRegressor / Booster
            try:
                regressor = xgb.XGBRegressor()
                regressor.load_model(str(model_path))
                self.model = regressor
            except Exception as e:
                logger.warning("Failed to load as XGBRegressor, falling back to Booster: %s", e)
                booster = xgb.Booster()
                booster.load_model(str(model_path))
                self.model = booster

            # 4. Initialize FeatureEngineer with locked feature manifest
            self.fe = FeatureEngineer()
            self.fe.feature_manifest = self.feature_manifest
            self.is_ready = True
            logger.info("DelayPredictor initialized successfully (model_version=%s)", self.model_version)

        except Exception as exc:
            logger.error("Error loading model artifacts: %s", exc, exc_info=True)
            self.is_ready = False

    def predict(self, request: PredictionRequest) -> PredictionResponse:
        """
        Execute delay prediction for the provided telemetry and context.

        Reuses features.py transform_realtime() for feature extraction.
        Never fabricates route length, road distance, schedule values, ETA inputs, or confidence.
        """
        bus_id = request.telemetry.bus_id
        route_id = request.telemetry.route_id

        if not self.is_ready or self.model is None or self.fe is None:
            return PredictionResponse.unavailable(
                bus_id=bus_id,
                route_id=route_id,
                error="ML model is not loaded or artifacts are missing",
            )

        try:
            # 1. Extract features using the finalized transform_realtime() pipeline
            X: pd.DataFrame = self.fe.transform_realtime(request)

            # 2. Enforce manifest ordering strictly
            if self.feature_manifest:
                missing_cols = [c for c in self.feature_manifest if c not in X.columns]
                if missing_cols:
                    return PredictionResponse.unavailable(
                        bus_id=bus_id,
                        route_id=route_id,
                        error=f"Feature matrix missing manifest columns: {missing_cols}",
                    )
                X = X[self.feature_manifest]

            # 3. Execute inference
            if isinstance(self.model, xgb.Booster):
                dmatrix = xgb.DMatrix(X)
                raw_preds = self.model.predict(dmatrix)
            else:
                raw_preds = self.model.predict(X)

            predicted_delay = int(round(float(raw_preds[0])))

            # 4. Construct response without fabricating values
            # Confidence is omitted (None) as point prediction does not provide defensible score
            # ETA is omitted (None) unless legitimately computable without fabrication
            return PredictionResponse.success(
                bus_id=bus_id,
                route_id=route_id,
                predicted_delay_minutes=predicted_delay,
                predicted_eta=None,
                confidence=None,
                model_version=self.model_version,
            )

        except Exception as exc:
            logger.error("Inference failed for bus %s: %s", bus_id, exc, exc_info=True)
            return PredictionResponse.unavailable(
                bus_id=bus_id,
                route_id=route_id,
                error=f"Inference error: {exc}",
            )

    def get_health(self) -> ModelHealthResponse:
        """Return service health status based on artifact availability."""
        status = ModelHealthStatus.HEALTHY if self.is_ready else ModelHealthStatus.UNHEALTHY
        return ModelHealthResponse(
            status=status,
            service="smart-campus-ml",
            timestamp=datetime.now(timezone.utc),
            version=self.model_version if self.is_ready else None,
        )

    def get_metadata(self) -> ModelMetadataResponse:
        """Return active model metadata."""
        metrics = None
        if "model_metrics" in self.metadata:
            # Prefer validation metrics for admin analytics.
            val_metrics = self.metadata["model_metrics"].get("validation") or {}
            test_metrics = self.metadata["model_metrics"].get("test") or {}
            source = val_metrics if val_metrics else test_metrics
            metrics = {k: float(v) for k, v in source.items()}

        trained_at = None
        if "trained_at" in self.metadata:
            try:
                trained_at = datetime.fromisoformat(self.metadata["trained_at"])
            except (ValueError, TypeError):
                trained_at = None

        validation_size = self.metadata.get("validation_size")
        try:
            validation_size = int(validation_size) if validation_size is not None else None
        except (TypeError, ValueError):
            validation_size = None

        return ModelMetadataResponse(
            model_name="delay_xgb",
            model_version=self.model_version,
            model_type="XGBoostRegressor",
            features_used=self.feature_manifest or [],
            trained_at=trained_at,
            metrics=metrics,
            prediction_target="delay_next_stop_minutes",
            validation_size=validation_size,
        )

    def run_validation(self, max_chart_points: int = 80) -> ModelValidationResponse:
        """
        Re-evaluate the loaded model on the chronological validation split
        from the existing processed training parquet (same pipeline as train_model.py).
        """
        if not self.is_ready or self.model is None or self.fe is None:
            return ModelValidationResponse(
                mae=0.0, rmse=0.0, r2=0.0, sample_count=0,
                error="Model artifacts not loaded",
            )

        data_path = Path(__file__).resolve().parent / "data" / "processed" / "clean_bus_events.parquet"
        if not data_path.is_file():
            # Fall back to stored validation metrics when parquet is unavailable.
            stored = (self.metadata.get("model_metrics") or {}).get("validation") or {}
            if stored:
                return ModelValidationResponse(
                    mae=float(stored.get("mae", 0)),
                    rmse=float(stored.get("rmse", 0)),
                    r2=float(stored.get("r2", 0)),
                    sample_count=int(self.metadata.get("validation_size") or 0),
                    actual=[],
                    predicted=[],
                )
            return ModelValidationResponse(
                mae=0.0, rmse=0.0, r2=0.0, sample_count=0,
                error=f"Validation dataset missing at {data_path}",
            )

        try:
            from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
            from ml.geospatial_features import enrich_geospatial_features
            import numpy as np

            df = pd.read_parquet(data_path)
            df = enrich_geospatial_features(df)
            X, y = self.fe.transform_dataframe(df, is_training=True)
            n = len(X)
            train_end = int(n * 0.7)
            val_end = int(n * 0.85)
            X_val = X.iloc[train_end:val_end]
            y_val = y.iloc[train_end:val_end]

            if hasattr(self.model, "predict"):
                y_pred = np.asarray(self.model.predict(X_val), dtype=float)
            else:
                dmat = xgb.DMatrix(X_val)
                y_pred = np.asarray(self.model.predict(dmat), dtype=float)

            y_true = np.asarray(y_val, dtype=float)
            mae = float(mean_absolute_error(y_true, y_pred))
            rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
            r2 = float(r2_score(y_true, y_pred))

            # Downsample for chart payload
            step = max(1, len(y_true) // max_chart_points)
            actual = y_true[::step][:max_chart_points].tolist()
            predicted = y_pred[::step][:max_chart_points].tolist()

            return ModelValidationResponse(
                mae=mae,
                rmse=rmse,
                r2=r2,
                sample_count=int(len(y_true)),
                actual=actual,
                predicted=predicted,
            )
        except Exception as exc:
            logger.error("Validation failed: %s", exc, exc_info=True)
            stored = (self.metadata.get("model_metrics") or {}).get("validation") or {}
            if stored:
                return ModelValidationResponse(
                    mae=float(stored.get("mae", 0)),
                    rmse=float(stored.get("rmse", 0)),
                    r2=float(stored.get("r2", 0)),
                    sample_count=int(self.metadata.get("validation_size") or 0),
                    error=f"Live validation failed ({exc}); showing stored metrics",
                )
            return ModelValidationResponse(
                mae=0.0, rmse=0.0, r2=0.0, sample_count=0,
                error=str(exc),
            )
