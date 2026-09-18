#!/usr/bin/env python3

import datetime
from fastapi import FastAPI, HTTPException
import networkx as nx
import osmnx as ox
from pydantic import BaseModel
from typing import List
import polars as pl
from features import append_ml_confidence_vectorized, run_feature_extraction
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
        request.target_lon,
        LIVE_EDGE_SPEEDS
    )
    return result

# --- Telemetry Processing Endpoint ---
LIVE_EDGE_SPEEDS = {}

@app.post("/clean_telemetry")
async def process_telemetry(payload: List[BusEvent]):
    try:
        valid_events = [event.model_dump() for event in payload]
        df = pl.DataFrame(valid_events)

        # Extract features and run the bulk ONNX C++ inference
        processed_df = run_feature_extraction(df)
        final_df = append_ml_confidence_vectorized(processed_df)

        # THE FIX: Vectorized Spatial Snapping
        # Extract Polars columns directly into Python lists
        lons = final_df["longitude"].to_list()
        lats = final_df["latitude"].to_list()
        speeds = final_df["speed_kmh"].to_list()

        # Fire all 25,000 coordinates into the scikit-learn KD-Tree in a single shot
        nearest_nodes = ox.distance.nearest_nodes(KOLKATA_GRAPH, X=lons, Y=lats)

        # Quickly zip the results into the global dictionary in native Python
        for node, speed in zip(nearest_nodes, speeds):
            LIVE_EDGE_SPEEDS[node] = speed

        return final_df.to_dicts()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
