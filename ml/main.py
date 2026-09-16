#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException
from typing import List
import polars as pl
from schemas import BusEvent
from features import run_feature_extraction

# Initialize the web server daemon
app = FastAPI(title="Smart Campus Transit ML Gatekeeper")

# This endpoint listens for HTTP POST requests from the backend
@app.post("/clean_telemetry")
async def process_live_telemetry(events: List[BusEvent]):
    try:

        valid_events = [event.model_dump() for event in events]

        df = pl.DataFrame(valid_events)

        processed_df = run_feature_extraction(df)

        return processed_df.to_dicts()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
