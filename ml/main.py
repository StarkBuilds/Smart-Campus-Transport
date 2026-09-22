#!/usr/bin/env python3
"""
Flask HTTP Service for Smart Campus Transport ML Delay Prediction.

Exposes REST endpoints:
- POST /predict: Predict upcoming bus delay based on real-time telemetry
- GET /health: Service and model readiness health check
- GET /metadata: Model architecture, version, features, and metrics
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request
from pydantic import ValidationError

# Ensure workspace root is on sys.path so ml imports work reliably
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from ml.inference import DelayPredictor
from ml.schemas import (
    ModelHealthStatus,
    PredictionRequest,
    PredictionResponse,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ml_service")

app = Flask(__name__)

# Initialize model predictor on startup
predictor = DelayPredictor()


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint for service observability and container readiness probes."""
    health_resp = predictor.get_health()
    status_code = 200 if health_resp.status == ModelHealthStatus.HEALTHY else 503
    return jsonify(health_resp.model_dump(by_alias=True, mode="json")), status_code


@app.route("/metadata", methods=["GET"])
def metadata():
    """Model metadata reporting deployed architecture, version, metrics, and manifest."""
    meta_resp = predictor.get_metadata()
    return jsonify(meta_resp.model_dump(by_alias=True, mode="json")), 200


@app.route("/validate", methods=["POST", "GET"])
def validate_model():
    """Re-run evaluation on the held-out validation split using existing training data."""
    result = predictor.run_validation()
    status = 200 if not result.error or result.sample_count > 0 else 503
    return jsonify(result.model_dump(by_alias=True, mode="json")), status


@app.route("/predict", methods=["POST"])
def predict():
    """
    Main prediction endpoint.
    Accepts PredictionRequest, returns PredictionResponse.
    Validates payload against canonical Pydantic schema.
    """
    json_data = request.get_json(silent=True)
    if json_data is None:
        return jsonify({"error": "Invalid JSON body or missing application/json Content-Type"}), 400

    try:
        req = PredictionRequest.model_validate(json_data)
    except ValidationError as err:
        logger.warning("Validation failed for predict request: %s", err.errors())
        return jsonify({
            "error": "Validation error",
            "details": err.errors(include_url=False),
        }), 422
    except Exception as exc:
        logger.warning("Malformed predict request: %s", exc)
        return jsonify({"error": f"Invalid request format: {exc}"}), 422

    try:
        response: PredictionResponse = predictor.predict(req)
        # Serialize with camelCase aliases for Spring Boot Jackson compatibility
        return jsonify(response.model_dump(by_alias=True, mode="json")), 200
    except Exception as exc:
        logger.error("Unhandled error during prediction: %s", exc, exc_info=True)
        bus_id = req.telemetry.bus_id if req and req.telemetry else "UNKNOWN"
        route_id = req.telemetry.route_id if req and req.telemetry else "UNKNOWN"
        fallback = PredictionResponse.unavailable(
            bus_id=bus_id,
            route_id=route_id,
            error="Internal prediction engine error",
        )
        return jsonify(fallback.model_dump(by_alias=True, mode="json")), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(500)
def internal_error(e):
    logger.error("Internal server error: %s", e)
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() in ("true", "1")
    logger.info("Starting ML Inference Service on port %d...", port)
    app.run(host="0.0.0.0", port=port, debug=debug)
