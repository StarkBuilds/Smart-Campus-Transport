#!/usr/bin/env python3
"""
Pydantic Data Contracts for Smart Campus Transport ML Service.

Defines the official, type-safe API contract between:
1. Spring Boot Ingestion / Orchestration Backend (DTOs and REST endpoints).
2. ML Pipeline (ETL, geospatial feature extraction, and model inference).
3. Frontend Client (live bus tracking and ML delay prediction display).
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BusStatus(str, Enum):
    """Canonical operational status for a transit vehicle."""
    IN_SERVICE = "IN_SERVICE"
    OUT_OF_SERVICE = "OUT_OF_SERVICE"
    AT_STOP = "AT_STOP"
    DELAYED = "DELAYED"


class BusTelemetry(BaseModel):
    """
    Canonical real-time vehicle telemetry observation.

    Matches the canonical fields emitted by GPS trackers, processed by ETL,
    and ingested by the Spring Boot backend.
    """
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        populate_by_name=True,
    )

    bus_id: str = Field(..., min_length=1, description="Unique vehicle identifier")
    route_id: str = Field(..., min_length=1, description="Assigned route identifier")
    trip_id: str = Field(..., min_length=1, description="Active trip/run identifier")
    timestamp: datetime = Field(..., description="ISO-8601 UTC timestamp of the observation")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 latitude coordinate [-90.0, 90.0]")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 longitude coordinate [-180.0, 180.0]")
    bearing: Optional[float] = Field(None, ge=0.0, lt=360.0, description="Clockwise heading in degrees [0.0, 360.0)")
    speed_kmh: Optional[float] = Field(default=0.0, ge=0.0, description="Vehicle speed in km/h")
    accuracy_m: Optional[float] = Field(None, ge=0.0, description="GPS horizontal accuracy radius in meters")
    status: BusStatus = Field(default=BusStatus.IN_SERVICE, description="Current vehicle operational status")
    next_stop_id: Optional[str] = Field(None, description="Stop ID the vehicle is currently approaching")


# Canonical alias for compatibility
BusEvent = BusTelemetry


class PredictionRequest(BaseModel):
    """
    Inference request payload supplied to the ML delay prediction engine.

    Contains all legitimate inputs available at inference time without future ground-truth leakage.
    Strictly forbids unmodeled/future target fields (e.g., delay_next_stop_minutes, actual_next_stop_arrival).
    """
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        populate_by_name=True,
    )

    telemetry: BusTelemetry = Field(..., description="Current real-time vehicle telemetry observation")
    recent_telemetry: Optional[List[BusTelemetry]] = Field(
        default=None,
        description="Chronological sequence of recent telemetry pings prior to the current observation",
    )
    route_length_km: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Total road distance of the assigned route in kilometers",
    )
    road_distance_to_next_stop_km: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Remaining road distance to the upcoming stop in kilometers",
    )
    scheduled_trip_start: Optional[datetime] = Field(
        default=None,
        description="Scheduled departure timestamp for the active trip",
    )

    @model_validator(mode="after")
    def validate_chronological_order(self) -> PredictionRequest:
        """Ensures all pings in recent_telemetry are strictly historical relative to telemetry."""
        if self.recent_telemetry:
            current_ts = self.telemetry.timestamp
            for idx, ping in enumerate(self.recent_telemetry):
                if ping.timestamp > current_ts:
                    raise ValueError(
                        f"recent_telemetry[{idx}] timestamp ({ping.timestamp.isoformat()}) "
                        f"cannot be after current telemetry timestamp ({current_ts.isoformat()})"
                    )
        return self


class PredictionResponse(BaseModel):
    """
    Prediction response DTO compatible with Spring Boot Jackson serialization.

    Supports both snake_case Python access and camelCase JSON serialization/deserialization.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    bus_id: str = Field(..., alias="busId", description="Vehicle identifier")
    route_id: str = Field(..., alias="routeId", description="Route identifier")
    predicted_delay_minutes: Optional[int] = Field(
        default=None,
        alias="predictedDelayMinutes",
        description="Estimated delay in minutes",
    )
    predicted_eta: Optional[str] = Field(
        default=None,
        alias="predictedEta",
        description="ISO-8601 formatted predicted arrival time",
    )
    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Confidence score bounded in [0.0, 1.0]",
    )
    model_version: Optional[str] = Field(
        default=None,
        alias="modelVersion",
        description="Version identifier of the active ML model",
    )
    error: Optional[str] = Field(
        default=None,
        description="Error or fallback reason message if prediction is unavailable",
    )

    @classmethod
    def success(
        cls,
        bus_id: str,
        route_id: str,
        predicted_delay_minutes: Optional[int],
        predicted_eta: Optional[str] = None,
        confidence: Optional[float] = None,
        model_version: Optional[str] = None,
    ) -> PredictionResponse:
        """Factory constructor for successful predictions."""
        return cls(
            busId=bus_id,
            routeId=route_id,
            predictedDelayMinutes=predicted_delay_minutes,
            predictedEta=predicted_eta,
            confidence=confidence,
            modelVersion=model_version,
            error=None,
        )

    @classmethod
    def unavailable(
        cls,
        bus_id: str,
        route_id: str,
        error: str,
    ) -> PredictionResponse:
        """Factory constructor for unavailable predictions / fallback scenarios."""
        return cls(
            busId=bus_id,
            routeId=route_id,
            predictedDelayMinutes=None,
            predictedEta=None,
            confidence=None,
            modelVersion=None,
            error=error,
        )


class ModelHealthStatus(str, Enum):
    """Operational health state of the ML inference service."""
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNHEALTHY = "UNHEALTHY"


class ModelHealthResponse(BaseModel):
    """Health check response for observability and load balancing."""
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    status: ModelHealthStatus = Field(default=ModelHealthStatus.HEALTHY, description="Service health state")
    service: str = Field(default="smart-campus-ml", description="Service name identifier")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Current UTC timestamp of health check",
    )
    version: Optional[str] = Field(default=None, description="Deployed service version")


class ModelMetadataResponse(BaseModel):
    """Metadata detailing active model architecture, version, and training features."""
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    model_name: str = Field(..., description="Name of the deployed ML model")
    model_version: str = Field(..., description="Semantic version or artifact hash of the model")
    model_type: str = Field(..., description="Model architecture type (e.g., XGBoostRegressor)")
    features_used: List[str] = Field(default_factory=list, description="List of feature names consumed by the model")
    trained_at: Optional[datetime] = Field(default=None, description="Timestamp when the model was trained")
    metrics: Optional[Dict[str, float]] = Field(default=None, description="Evaluation metrics on validation set")
    prediction_target: str = Field(
        default="delay_next_stop_minutes",
        description="Regression target predicted by the model",
    )
    validation_size: Optional[int] = Field(default=None, description="Number of validation samples used at train time")


class ModelValidationResponse(BaseModel):
    """Result of re-running evaluation on the held-out validation split."""
    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    mae: float = Field(..., description="Mean absolute error on validation split (minutes)")
    rmse: float = Field(..., description="Root mean squared error on validation split (minutes)")
    r2: float = Field(..., description="Coefficient of determination on validation split")
    sample_count: int = Field(..., description="Number of validation samples evaluated")
    actual: List[float] = Field(default_factory=list, description="Actual delay values (sampled for chart)")
    predicted: List[float] = Field(default_factory=list, description="Predicted delay values (sampled for chart)")
    model_type: str = Field(default="XGBoostRegressor")
    prediction_target: str = Field(default="delay_next_stop_minutes")
    error: Optional[str] = Field(default=None, description="Error message if validation could not run")
