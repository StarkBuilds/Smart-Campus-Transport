#!/usr/bin/env python3

import datetime
from fastapi import FastAPI, HTTPException
import networkx as nx
import osmnx as ox
from pydantic import BaseModel
from typing import List
import polars as pl

from features import calculate_ml_confidence, run_feature_extraction
from routing_engine import find_best_routes
from schemas import BusEvent

# Initialize the web server daemon
app = FastAPI(title="Smart Campus Transit API")

# Load map globally on boot
print("Loading Kolkata map into memory...please wait.")
raw_graph = ox.load_graphml("kolkata_drive.graphml")
KOLKATA_GRAPH = ox.convert.to_digraph(raw_graph)
print(f"Map Loaded! {len(KOLKATA_GRAPH.nodes)} intersections ready.")

# --- Route Planning Endpoint ---
class RouteRequest(BaseModel):
    source_node: str
    target_node: str

@app.post("/alternate_routes")
async def get_routes(request: RouteRequest):
    result = find_best_routes(
        KOLKATA_GRAPH,
        request.source_node,
        request.target_node
    )
    return result

# --- Telemetry Processing Endpoint ---
@app.post("/clean_telemetry")
async def process_telemetry(payload: List[BusEvent]):
    try:
        # 1. Validate and convert incoming JSON into a format Polars can read
        valid_events = [event.model_dump() for event in payload]

        # 2. Run existing Physics Engine (Polars)
        df = pl.DataFrame(valid_events)
        processed_df = run_feature_extraction(df)

        # Convert Polars DataFrame back to standard Python dictionaries
        cleaned_bus_data = processed_df.to_dicts()

        # 3. Add the ML Confidence upgrade
        final_response = []
        current_time = datetime.datetime.now()

        for bus in cleaned_bus_data:
            # Generate the prediction
            confidence_score = calculate_ml_confidence(bus["route_id"], current_time)

            # Inject the exact nested schema the frontend React map requires
            bus["features"] = {
                "ml_confidence": confidence_score
            }
            final_response.append(bus)

        # 4. Shoot it back over the network
        return final_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
