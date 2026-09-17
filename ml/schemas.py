#!/usr/bin/env python3
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class BusStatus(str, Enum):
    IN_SERVICE = "IN_SERVICE"
    OUT_OF_SERVICE = "OUT_OF_SERVICE"
    AT_STOP = "AT_STOP"
    DELAYED = "DELAYED"

class BusEvent(BaseModel):
    bus_id: str=Field(...,description="Unique identifier for the bus")
    route_id: str = Field(..., description="Active route/line identifier")
    trip_id: Optional[str] = Field(None, description="Specific run instance on this route")
    timestamp: datetime=Field(...,description="ISO-8601 UTC timestamp")
    latitude: float=Field(...,ge=-90,le=90)
    longitude: float=Field(...,ge=-180,le=180)
    bearing: Optional[float] = Field(None, ge=0.0, lt=360.0, description="Clockwise heading in degrees from true North")
    speed_kmh: Optional[float]=Field(default=0.0,ge=0.0)
    accuracy_m: Optional[float] = Field(None, ge=0.0, description="GPS horizontal accuracy radius in meters")
    status: BusStatus = Field(default=BusStatus.IN_SERVICE)
    next_stop_id: Optional[str] = Field(None, description="Stop ID the vehicle is currently approaching")
