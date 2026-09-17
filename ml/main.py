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

# --- Global Map Boot Sequence ---
print("Loading Kolkata map into memory...please wait.")
raw_graph = ox.load_graphml("kolkata_drive.graphml")
KOLKATA_GRAPH = ox.convert.to_digraph(raw_graph)
# Safely prune narrow alleys from the graph without destroying intersections
print("Pruning narrow para lanes and pedestrian paths for heavy bus routing...")
EXCLUDED_HIGHWAYS = {'living_street', 'pedestrian', 'footway', 'service', 'steps', 'path'}

edges_to_remove = []
for u, v, data in KOLKATA_GRAPH.edges(data=True):
    hw = data.get('highway', '')
    hw_list = hw if isinstance(hw, list) else [hw]
    if any(h in EXCLUDED_HIGHWAYS for h in hw_list):
        edges_to_remove.append((u, v))

KOLKATA_GRAPH.remove_edges_from(edges_to_remove)
print(f"Map Loaded & Filtered! {len(KOLKATA_GRAPH.nodes)} intersections ready.")
# --- Route Planning Endpoint ---
class RouteRequest(BaseModel):
    source_lat: float
    source_lon: float
    target_lat: float
    target_lon: float

@app.post("/alternate_routes")
async def get_routes(request: RouteRequest):
    result = find_best_routes(
        KOLKATA_GRAPH,
        request.source_lat,
        request.source_lon,
        request.target_lat,
        request.target_lon
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
            confidence_score = calculate_ml_confidence(bus, current_time)

            # Inject the exact nested schema the frontend React map requires
            bus["features"] = {
                "ml_confidence": confidence_score
            }
            final_response.append(bus)

        # 4. Shoot it back over the network
        return final_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
