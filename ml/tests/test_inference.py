#!/usr/bin/env python3
"""
Unit tests for DelayPredictor inference engine (ml/inference.py).

Mandatory: Includes real-model inference test using actual saved delay_xgb.json artifact.
"""

from __future__ import annotations

import datetime
from pathlib import Path
import pytest
from pydantic import ValidationError

from ml.inference import DelayPredictor
from ml.schemas import (
    BusStatus,
    BusTelemetry,
    ModelHealthStatus,
    PredictionRequest,
    PredictionResponse,
)


@pytest.fixture
def predictor() -> DelayPredictor:
    """Fixture providing a DelayPredictor instance loaded with real artifacts."""
    pred = DelayPredictor()
    assert pred.is_ready, "DelayPredictor must be ready with real artifacts"
    return pred


@pytest.fixture
def valid_prediction_request() -> PredictionRequest:
    """Creates a realistic, canonical prediction request on route R02."""
    t0 = datetime.datetime(2026, 9, 20, 14, 15, 0, tzinfo=datetime.timezone.utc)
    t1 = t0 + datetime.timedelta(seconds=15)
    t2 = t1 + datetime.timedelta(seconds=15)

    current = BusTelemetry(
        bus_id="BUS_001",
        route_id="R02",
        trip_id="TRIP_BUS_001_20260920_01",
        timestamp=t2,
        latitude=22.52187,
        longitude=88.34945,
        bearing=192.15,
        speed_kmh=17.72,
        accuracy_m=6.62,
        status=BusStatus.IN_SERVICE,
        next_stop_id="R02_S01",
    )

    recent = [
        BusTelemetry(
            bus_id="BUS_001",
            route_id="R02",
            trip_id="TRIP_BUS_001_20260920_01",
            timestamp=t0,
            latitude=22.52285,
            longitude=88.35003,
            bearing=273.41,
            speed_kmh=22.38,
            accuracy_m=8.29,
            status=BusStatus.IN_SERVICE,
            next_stop_id="R02_S01",
        ),
        BusTelemetry(
            bus_id="BUS_001",
            route_id="R02",
            trip_id="TRIP_BUS_001_20260920_01",
            timestamp=t1,
            latitude=22.52252,
            longitude=88.34960,
            bearing=229.44,
            speed_kmh=13.74,
            accuracy_m=6.0,
            status=BusStatus.IN_SERVICE,
            next_stop_id="R02_S01",
        ),
    ]

    return PredictionRequest(
        telemetry=current,
        recent_telemetry=recent,
    )


def test_real_model_inference_mandatory(predictor: DelayPredictor, valid_prediction_request: PredictionRequest):
    """
    MANDATORY CONSTRAINT:
    /predict must load delay_xgb.json and actually produce a prediction with the real model artifact.
    Must never fabricate confidence or ETA.
    """
    response = predictor.predict(valid_prediction_request)

    assert isinstance(response, PredictionResponse)
    assert response.bus_id == "BUS_001"
    assert response.route_id == "R02"
    assert response.error is None
    assert response.predicted_delay_minutes is not None
    assert isinstance(response.predicted_delay_minutes, int)
    assert response.model_version == "1.0.0"
    # Never fabricate confidence or ETA when uncalibrated/unmodeled
    assert response.confidence is None
    assert response.predicted_eta is None


def test_feature_manifest_ordering_enforced(predictor: DelayPredictor, valid_prediction_request: PredictionRequest):
    """Verify that transform_realtime outputs columns in exact manifest order."""
    fe = predictor.fe
    assert fe is not None
    assert fe.feature_manifest is not None

    X = fe.transform_realtime(valid_prediction_request)
    assert list(X.columns) == predictor.feature_manifest
    assert len(X) == 1


def test_missing_artifacts_fallback(tmp_path: Path):
    """Verify graceful unavailable response when artifacts are missing."""
    empty_predictor = DelayPredictor(artifacts_dir=tmp_path)
    assert not empty_predictor.is_ready

    now = datetime.datetime.now(datetime.timezone.utc)
    dummy_req = PredictionRequest(
        telemetry=BusTelemetry(
            bus_id="BUS_999",
            route_id="R99",
            trip_id="TRIP_99",
            timestamp=now,
            latitude=22.5,
            longitude=88.3,
        )
    )

    response = empty_predictor.predict(dummy_req)
    assert response.predicted_delay_minutes is None
    assert response.error is not None
    assert "ML model is not loaded" in response.error


def test_anti_leakage_forbidden_fields(valid_prediction_request: PredictionRequest):
    """Verify that ground-truth/training fields cannot be passed into PredictionRequest."""
    dumped = valid_prediction_request.model_dump(by_alias=False)
    # Inject forbidden ground-truth field
    dumped["delay_next_stop_minutes"] = 4.5
    with pytest.raises(ValidationError):
        PredictionRequest.model_validate(dumped)

    dumped.pop("delay_next_stop_minutes")
    dumped["actual_next_stop_arrival"] = "2026-09-20T15:00:00Z"
    with pytest.raises(ValidationError):
        PredictionRequest.model_validate(dumped)


def test_health_and_metadata_endpoints(predictor: DelayPredictor):
    """Verify health and metadata methods report valid data."""
    health = predictor.get_health()
    assert health.status == ModelHealthStatus.HEALTHY
    assert health.service == "smart-campus-ml"
    assert health.version == "1.0.0"

    metadata = predictor.get_metadata()
    assert metadata.model_name == "delay_xgb"
    assert metadata.model_version == "1.0.0"
    assert metadata.model_type == "XGBoostRegressor"
    assert len(metadata.features_used) == 26
    assert metadata.metrics is not None
    assert "mae" in metadata.metrics
    assert "rmse" in metadata.metrics
    assert "r2" in metadata.metrics
