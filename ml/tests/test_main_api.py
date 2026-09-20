#!/usr/bin/env python3
"""
Unit and integration tests for Flask REST API (ml/main.py).

Verifies /predict, /health, /metadata, and error handlers.
"""

from __future__ import annotations

import datetime
import pytest
from flask.testing import FlaskClient

from ml.main import app


@pytest.fixture
def client() -> FlaskClient:
    """Provides a Flask test client with testing mode enabled."""
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


@pytest.fixture
def valid_payload() -> dict:
    """Returns a valid JSON payload for POST /predict."""
    t0 = datetime.datetime(2026, 9, 20, 14, 15, 0, tzinfo=datetime.timezone.utc)
    t1 = t0 + datetime.timedelta(seconds=15)
    t2 = t1 + datetime.timedelta(seconds=15)

    return {
        "telemetry": {
            "bus_id": "BUS_001",
            "route_id": "R02",
            "trip_id": "TRIP_BUS_001_20260920_01",
            "timestamp": t2.isoformat(),
            "latitude": 22.52187,
            "longitude": 88.34945,
            "bearing": 192.15,
            "speed_kmh": 17.72,
            "accuracy_m": 6.62,
            "status": "IN_SERVICE",
            "next_stop_id": "R02_S01",
        },
        "recent_telemetry": [
            {
                "bus_id": "BUS_001",
                "route_id": "R02",
                "trip_id": "TRIP_BUS_001_20260920_01",
                "timestamp": t0.isoformat(),
                "latitude": 22.52285,
                "longitude": 88.35003,
                "bearing": 273.41,
                "speed_kmh": 22.38,
                "accuracy_m": 8.29,
                "status": "IN_SERVICE",
                "next_stop_id": "R02_S01",
            },
            {
                "bus_id": "BUS_001",
                "route_id": "R02",
                "trip_id": "TRIP_BUS_001_20260920_01",
                "timestamp": t1.isoformat(),
                "latitude": 22.52252,
                "longitude": 88.34960,
                "bearing": 229.44,
                "speed_kmh": 13.74,
                "accuracy_m": 6.0,
                "status": "IN_SERVICE",
                "next_stop_id": "R02_S01",
            },
        ],
    }


def test_health_endpoint(client: FlaskClient):
    """GET /health returns 200 with service health info."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "HEALTHY"
    assert data["service"] == "smart-campus-ml"
    assert data["version"] == "1.0.0"


def test_metadata_endpoint(client: FlaskClient):
    """GET /metadata returns 200 with model architecture and manifest."""
    resp = client.get("/metadata")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["model_name"] == "delay_xgb"
    assert data["model_version"] == "1.0.0"
    assert data["model_type"] == "XGBoostRegressor"
    assert len(data["features_used"]) == 26


def test_predict_endpoint_success(client: FlaskClient, valid_payload: dict):
    """POST /predict executes inference and returns camelCase fields for Spring Boot."""
    resp = client.post("/predict", json=valid_payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["busId"] == "BUS_001"
    assert data["routeId"] == "R02"
    assert data["predictedDelayMinutes"] is not None
    assert isinstance(data["predictedDelayMinutes"], int)
    assert data["modelVersion"] == "1.0.0"
    assert data.get("error") is None
    # Verify no fabricated values
    assert data.get("confidence") is None
    assert data.get("predictedEta") is None


def test_predict_endpoint_validation_error(client: FlaskClient):
    """POST /predict rejects invalid payload with 422 and structured details."""
    invalid_payload = {
        "telemetry": {
            "bus_id": "BUS_001",
            # Missing route_id, trip_id, timestamp, latitude, longitude
        }
    }
    resp = client.post("/predict", json=invalid_payload)
    assert resp.status_code == 422
    data = resp.get_json()
    assert data["error"] == "Validation error"
    assert "details" in data


def test_predict_endpoint_empty_body(client: FlaskClient):
    """POST /predict with empty body returns 400."""
    resp = client.post("/predict", data="", content_type="application/json")
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data


def test_predict_endpoint_anti_leakage(client: FlaskClient, valid_payload: dict):
    """POST /predict rejects forbidden target / ground-truth fields with 422."""
    leaked_payload = dict(valid_payload)
    leaked_payload["delay_next_stop_minutes"] = 3.5
    resp = client.post("/predict", json=leaked_payload)
    assert resp.status_code == 422


def test_not_found(client: FlaskClient):
    """Undefined route returns 404 with structured JSON."""
    resp = client.get("/nonexistent")
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["error"] == "Endpoint not found"
