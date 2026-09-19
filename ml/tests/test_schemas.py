#!/usr/bin/env python3
"""
Unit and Integration Tests for Pydantic V2 ML Schemas.

Validates:
1. BusStatus enum values and constraints.
2. BusTelemetry / BusEvent validation (coordinates, bearing < 360, non-negative speed/accuracy, extra="forbid").
3. PredictionRequest inference contract (legitimate inputs, extra="forbid" anti-leakage, chronological ordering).
4. PredictionResponse Spring Boot interoperability (camelCase/snake_case serialization, factory constructors, confidence bounds).
5. ModelHealthResponse and ModelMetadataResponse observability schemas.
"""

from datetime import datetime, timedelta, timezone
import json
import pytest
from pydantic import ValidationError

from schemas import (
    BusEvent,
    BusStatus,
    BusTelemetry,
    ModelHealthResponse,
    ModelHealthStatus,
    ModelMetadataResponse,
    PredictionRequest,
    PredictionResponse,
)


# ==============================================================================
# 1. BusStatus Enum Tests
# ==============================================================================

def test_bus_status_enum_values():
    """Validates allowed operational statuses matching ETL canonical pipeline."""
    assert BusStatus.IN_SERVICE == "IN_SERVICE"
    assert BusStatus.OUT_OF_SERVICE == "OUT_OF_SERVICE"
    assert BusStatus.AT_STOP == "AT_STOP"
    assert BusStatus.DELAYED == "DELAYED"

    # Rejection of invalid status string
    with pytest.raises(ValueError):
        BusStatus("UNKNOWN_STATUS")


# ==============================================================================
# 2. BusTelemetry / BusEvent Tests
# ==============================================================================

def test_bus_telemetry_valid_full():
    """Validates complete canonical telemetry parsing."""
    payload = {
        "bus_id": "BUS_001",
        "route_id": "R01",
        "trip_id": "TRIP_001",
        "timestamp": "2026-08-03T07:15:00+00:00",
        "latitude": 22.502,
        "longitude": 88.318,
        "bearing": 185.5,
        "speed_kmh": 28.4,
        "accuracy_m": 4.5,
        "status": "IN_SERVICE",
        "next_stop_id": "R01_S05",
    }
    telemetry = BusTelemetry(**payload)
    assert telemetry.bus_id == "BUS_001"
    assert telemetry.route_id == "R01"
    assert telemetry.trip_id == "TRIP_001"
    assert telemetry.latitude == 22.502
    assert telemetry.longitude == 88.318
    assert telemetry.bearing == 185.5
    assert telemetry.speed_kmh == 28.4
    assert telemetry.accuracy_m == 4.5
    assert telemetry.status == BusStatus.IN_SERVICE
    assert telemetry.next_stop_id == "R01_S05"


def test_bus_telemetry_alias_and_defaults():
    """Validates BusEvent alias and default field values."""
    assert BusEvent is BusTelemetry

    minimal_payload = {
        "bus_id": "  BUS_002  ",
        "route_id": "R02",
        "trip_id": "TRIP_002",
        "timestamp": "2026-08-03T08:00:00Z",
        "latitude": 22.522,
        "longitude": 88.349,
    }
    event = BusEvent(**minimal_payload)
    assert event.bus_id == "BUS_002"  # Verifies string whitespace stripping
    assert event.speed_kmh == 0.0
    assert event.status == BusStatus.IN_SERVICE
    assert event.bearing is None
    assert event.accuracy_m is None
    assert event.next_stop_id is None


def test_bus_telemetry_missing_required_fields():
    """Validates that missing mandatory fields raise ValidationError."""
    base = {
        "bus_id": "BUS_001",
        "route_id": "R01",
        "trip_id": "TRIP_001",
        "timestamp": "2026-08-03T07:00:00Z",
        "latitude": 22.50,
        "longitude": 88.30,
    }
    for field in ["bus_id", "route_id", "trip_id", "timestamp", "latitude", "longitude"]:
        invalid_data = dict(base)
        del invalid_data[field]
        with pytest.raises(ValidationError) as exc_info:
            BusTelemetry(**invalid_data)
        assert field in str(exc_info.value)


def test_bus_telemetry_empty_id_strings():
    """Validates that empty strings for identifiers are rejected."""
    base = {
        "bus_id": "",
        "route_id": "R01",
        "trip_id": "TRIP_001",
        "timestamp": "2026-08-03T07:00:00Z",
        "latitude": 22.50,
        "longitude": 88.30,
    }
    with pytest.raises(ValidationError):
        BusTelemetry(**base)


@pytest.mark.parametrize(
    "lat,lon,is_valid",
    [
        (22.5, 88.3, True),
        (-90.0, 0.0, True),
        (90.0, 0.0, True),
        (0.0, -180.0, True),
        (0.0, 180.0, True),
        (-90.1, 88.3, False),
        (90.1, 88.3, False),
        (22.5, -180.1, False),
        (22.5, 180.1, False),
    ],
)
def test_bus_telemetry_coordinate_bounds(lat, lon, is_valid):
    """Validates WGS84 geographic coordinate boundaries."""
    payload = {
        "bus_id": "BUS_001",
        "route_id": "R01",
        "trip_id": "TRIP_001",
        "timestamp": "2026-08-03T07:00:00Z",
        "latitude": lat,
        "longitude": lon,
    }
    if is_valid:
        t = BusTelemetry(**payload)
        assert t.latitude == lat
        assert t.longitude == lon
    else:
        with pytest.raises(ValidationError):
            BusTelemetry(**payload)


@pytest.mark.parametrize(
    "bearing,is_valid",
    [
        (0.0, True),
        (180.0, True),
        (359.99, True),
        (None, True),
        (-0.01, False),
        (360.0, False),  # Strictly < 360.0 because 360° is equivalent to 0°
        (360.1, False),
    ],
)
def test_bus_telemetry_bearing_bounds(bearing, is_valid):
    """Validates bearing bounds [0.0, 360.0)."""
    payload = {
        "bus_id": "BUS_001",
        "route_id": "R01",
        "trip_id": "TRIP_001",
        "timestamp": "2026-08-03T07:00:00Z",
        "latitude": 22.50,
        "longitude": 88.30,
        "bearing": bearing,
    }
    if is_valid:
        t = BusTelemetry(**payload)
        assert t.bearing == bearing
    else:
        with pytest.raises(ValidationError):
            BusTelemetry(**payload)


@pytest.mark.parametrize(
    "speed,accuracy,is_valid",
    [
        (0.0, 0.0, True),
        (45.5, 5.2, True),
        (None, None, True),
        (-0.1, 5.0, False),
        (25.0, -1.0, False),
    ],
)
def test_bus_telemetry_speed_and_accuracy_non_negative(speed, accuracy, is_valid):
    """Validates that speed and accuracy must be non-negative."""
    payload = {
        "bus_id": "BUS_001",
        "route_id": "R01",
        "trip_id": "TRIP_001",
        "timestamp": "2026-08-03T07:00:00Z",
        "latitude": 22.50,
        "longitude": 88.30,
    }
    if speed is not None:
        payload["speed_kmh"] = speed
    if accuracy is not None:
        payload["accuracy_m"] = accuracy

    if is_valid:
        t = BusTelemetry(**payload)
        if speed is not None:
            assert t.speed_kmh == speed
        if accuracy is not None:
            assert t.accuracy_m == accuracy
    else:
        with pytest.raises(ValidationError):
            BusTelemetry(**payload)


def test_bus_telemetry_extra_forbid():
    """Validates that BusTelemetry strictly forbids unknown/target fields."""
    payload = {
        "bus_id": "BUS_001",
        "route_id": "R01",
        "trip_id": "TRIP_001",
        "timestamp": "2026-08-03T07:00:00Z",
        "latitude": 22.50,
        "longitude": 88.30,
        "delay_next_stop_minutes": 4.5,  # Forbidden target field
    }
    with pytest.raises(ValidationError) as exc_info:
        BusTelemetry(**payload)
    assert "extra_forbidden" in str(exc_info.value)


# ==============================================================================
# 3. PredictionRequest Tests
# ==============================================================================

@pytest.fixture
def sample_telemetry():
    return BusTelemetry(
        bus_id="BUS_001",
        route_id="R01",
        trip_id="TRIP_001",
        timestamp=datetime(2026, 8, 3, 7, 30, 0, tzinfo=timezone.utc),
        latitude=22.502,
        longitude=88.318,
        bearing=180.0,
        speed_kmh=25.0,
        accuracy_m=5.0,
        status=BusStatus.IN_SERVICE,
        next_stop_id="R01_S05",
    )


def test_prediction_request_valid_minimal(sample_telemetry):
    """Validates inference request with single telemetry observation."""
    req = PredictionRequest(telemetry=sample_telemetry)
    assert req.telemetry.bus_id == "BUS_001"
    assert req.recent_telemetry is None
    assert req.route_length_km is None
    assert req.road_distance_to_next_stop_km is None
    assert req.scheduled_trip_start is None


def test_prediction_request_valid_full(sample_telemetry):
    """Validates inference request with historical pings and route context."""
    t_prev1 = BusTelemetry(
        bus_id="BUS_001",
        route_id="R01",
        trip_id="TRIP_001",
        timestamp=datetime(2026, 8, 3, 7, 29, 30, tzinfo=timezone.utc),
        latitude=22.500,
        longitude=88.317,
        bearing=180.0,
        speed_kmh=24.0,
    )
    t_prev2 = BusTelemetry(
        bus_id="BUS_001",
        route_id="R01",
        trip_id="TRIP_001",
        timestamp=datetime(2026, 8, 3, 7, 29, 45, tzinfo=timezone.utc),
        latitude=22.501,
        longitude=88.3175,
        bearing=180.0,
        speed_kmh=25.0,
    )

    req = PredictionRequest(
        telemetry=sample_telemetry,
        recent_telemetry=[t_prev1, t_prev2],
        route_length_km=10.5,
        road_distance_to_next_stop_km=1.8,
        scheduled_trip_start=datetime(2026, 8, 3, 7, 0, 0, tzinfo=timezone.utc),
    )
    assert len(req.recent_telemetry) == 2
    assert req.route_length_km == 10.5
    assert req.road_distance_to_next_stop_km == 1.8
    assert req.scheduled_trip_start == datetime(2026, 8, 3, 7, 0, 0, tzinfo=timezone.utc)


def test_prediction_request_extra_forbid(sample_telemetry):
    """Validates that extra="forbid" rejects ground truth target fields in root request."""
    # Target fields that must never leak into inference request
    forbidden_payloads = [
        {"telemetry": sample_telemetry, "delay_next_stop_minutes": 5.2},
        {"telemetry": sample_telemetry, "actual_next_stop_arrival": "2026-08-03T07:45:00Z"},
        {"telemetry": sample_telemetry, "scheduled_next_stop_arrival": "2026-08-03T07:40:00Z"},
        {"telemetry": sample_telemetry, "scenario": "rush"},
        {"telemetry": sample_telemetry, "arbitrary_extra_field": 123},
    ]
    for payload in forbidden_payloads:
        with pytest.raises(ValidationError) as exc_info:
            PredictionRequest(**payload)
        assert "extra_forbidden" in str(exc_info.value)


def test_prediction_request_chronological_ordering(sample_telemetry):
    """Validates that recent_telemetry cannot contain timestamps from the future."""
    # Historical ping: valid (t <= current)
    valid_ping = BusTelemetry(
        bus_id="BUS_001",
        route_id="R01",
        trip_id="TRIP_001",
        timestamp=sample_telemetry.timestamp - timedelta(seconds=15),
        latitude=22.501,
        longitude=88.317,
    )
    # Future ping: invalid (t > current)
    future_ping = BusTelemetry(
        bus_id="BUS_001",
        route_id="R01",
        trip_id="TRIP_001",
        timestamp=sample_telemetry.timestamp + timedelta(seconds=15),
        latitude=22.503,
        longitude=88.319,
    )

    # Valid: historical pings
    req = PredictionRequest(telemetry=sample_telemetry, recent_telemetry=[valid_ping])
    assert len(req.recent_telemetry) == 1

    # Invalid: future ping raises ValidationError
    with pytest.raises(ValidationError) as exc_info:
        PredictionRequest(telemetry=sample_telemetry, recent_telemetry=[valid_ping, future_ping])
    assert "cannot be after current telemetry timestamp" in str(exc_info.value)


# ==============================================================================
# 4. PredictionResponse Tests
# ==============================================================================

def test_prediction_response_success_factory():
    """Validates factory constructor for successful predictions."""
    res = PredictionResponse.success(
        bus_id="BUS_001",
        route_id="R01",
        predicted_delay_minutes=4,
        predicted_eta="2026-08-03T07:45:00+00:00",
        confidence=0.88,
        model_version="xgboost_v1.0.0",
    )
    assert res.bus_id == "BUS_001"
    assert res.route_id == "R01"
    assert res.predicted_delay_minutes == 4
    assert res.predicted_eta == "2026-08-03T07:45:00+00:00"
    assert res.confidence == 0.88
    assert res.model_version == "xgboost_v1.0.0"
    assert res.error is None


def test_prediction_response_unavailable_factory():
    """Validates factory constructor for unavailable/fallback predictions."""
    res = PredictionResponse.unavailable(
        bus_id="BUS_001",
        route_id="R01",
        error="Model degraded due to missing GPS lock",
    )
    assert res.bus_id == "BUS_001"
    assert res.route_id == "R01"
    assert res.predicted_delay_minutes is None
    assert res.predicted_eta is None
    assert res.confidence is None
    assert res.model_version is None
    assert res.error == "Model degraded due to missing GPS lock"


@pytest.mark.parametrize(
    "conf,is_valid",
    [
        (0.0, True),
        (0.5, True),
        (1.0, True),
        (None, True),
        (-0.01, False),
        (1.01, False),
    ],
)
def test_prediction_response_confidence_bounds(conf, is_valid):
    """Validates confidence bounds [0.0, 1.0]."""
    payload = {
        "bus_id": "BUS_001",
        "route_id": "R01",
        "confidence": conf,
    }
    if is_valid:
        r = PredictionResponse(**payload)
        assert r.confidence == conf
    else:
        with pytest.raises(ValidationError):
            PredictionResponse(**payload)


def test_prediction_response_json_serialization_camel_case():
    """Validates that JSON dump produces camelCase keys matching Spring Boot DTO."""
    res = PredictionResponse.success(
        bus_id="BUS_001",
        route_id="R01",
        predicted_delay_minutes=3,
        predicted_eta="2026-08-03T07:45:00Z",
        confidence=0.92,
        model_version="v2.1",
    )
    json_str = res.model_dump_json(by_alias=True)
    data = json.loads(json_str)

    # Spring Boot expected field names
    assert "busId" in data and data["busId"] == "BUS_001"
    assert "routeId" in data and data["routeId"] == "R01"
    assert "predictedDelayMinutes" in data and data["predictedDelayMinutes"] == 3
    assert "predictedEta" in data and data["predictedEta"] == "2026-08-03T07:45:00Z"
    assert "confidence" in data and data["confidence"] == 0.92
    assert "modelVersion" in data and data["modelVersion"] == "v2.1"
    assert "error" in data and data["error"] is None


def test_prediction_response_deserialization_from_camel_case():
    """Validates deserialization from camelCase Spring Boot JSON payloads."""
    backend_payload = {
        "busId": "BUS_003",
        "routeId": "R02",
        "predictedDelayMinutes": 7,
        "predictedEta": "2026-08-03T08:15:00Z",
        "confidence": 0.85,
        "modelVersion": "v1.0",
        "error": None,
    }
    res = PredictionResponse(**backend_payload)
    assert res.bus_id == "BUS_003"
    assert res.route_id == "R02"
    assert res.predicted_delay_minutes == 7
    assert res.predicted_eta == "2026-08-03T08:15:00Z"
    assert res.confidence == 0.85
    assert res.model_version == "v1.0"
    assert res.error is None


# ==============================================================================
# 5. ModelHealthResponse & ModelMetadataResponse Tests
# ==============================================================================

def test_model_health_response():
    """Validates health check response model."""
    health = ModelHealthResponse(status=ModelHealthStatus.HEALTHY, version="1.0.0")
    assert health.status == ModelHealthStatus.HEALTHY
    assert health.service == "smart-campus-ml"
    assert isinstance(health.timestamp, datetime)
    assert health.version == "1.0.0"


def test_model_metadata_response():
    """Validates model metadata response model."""
    meta = ModelMetadataResponse(
        model_name="CampusDelayXGBoost",
        model_version="2026.08.03-v1",
        model_type="XGBoostRegressor",
        features_used=[
            "speed_kmh",
            "bearing_difference_deg",
            "cross_track_distance_m",
            "progress_along_route_km",
            "road_distance_to_next_stop_km",
        ],
        metrics={"mae_minutes": 1.25, "rmse_minutes": 1.80, "r2_score": 0.89},
    )
    assert meta.model_name == "CampusDelayXGBoost"
    assert meta.model_version == "2026.08.03-v1"
    assert meta.model_type == "XGBoostRegressor"
    assert len(meta.features_used) == 5
    assert meta.metrics["mae_minutes"] == 1.25
