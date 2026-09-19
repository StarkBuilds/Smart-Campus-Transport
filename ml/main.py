#!/usr/bin/env python3

import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException
import networkx as nx
import osmnx as ox
from pydantic import BaseModel
from typing import List
import polars as pl
from contextlib import asynccontextmanager

try:
    from features import run_feature_extraction
    from routing_engine import find_best_routes
    from schemas import BusEvent
except ImportError:  # support `python -m ml.main` / pytest `import ml.main`
    from ml.features import run_feature_extraction
    from ml.routing_engine import find_best_routes
    from ml.schemas import BusEvent

GRAPHML_PATH = Path(__file__).resolve().parent / "kolkata_drive.graphml"

# Initialize Global State as None to protect RAM during imports
KOLKATA_GRAPH = None
LIVE_EDGE_SPEEDS = {}

# --- Safe Memory Boot Sequence ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global KOLKATA_GRAPH
    print("Loading Kolkata map into memory...please wait.")
    raw_graph = ox.load_graphml(GRAPHML_PATH)
    KOLKATA_GRAPH = ox.convert.to_digraph(raw_graph)

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

    yield # The web server runs here

    KOLKATA_GRAPH.clear()
    print("Map memory released.")

app = FastAPI(title="Smart Campus Transit API", lifespan=lifespan)

class RouteRequest(BaseModel):
    source_lat: float
    source_lon: float
    target_lat: float
    target_lon: float

@app.post("/alternate_routes")
async def get_routes(request: RouteRequest):
    if KOLKATA_GRAPH is None:
        raise HTTPException(status_code=503, detail="Routing graph not initialized.")

    result = find_best_routes(
        KOLKATA_GRAPH,
        request.source_lat,
        request.source_lon,
        request.target_lat,
        request.target_lon,
        LIVE_EDGE_SPEEDS
    )
    return result

@app.post("/clean_telemetry")
async def process_telemetry(payload: List[BusEvent]):
    try:
        valid_events = [event.model_dump() for event in payload]
        df = pl.DataFrame(valid_events)

        processed_df = run_feature_extraction(df)

        lons = processed_df["longitude"].to_list()
        lats = processed_df["latitude"].to_list()
        speeds = processed_df["speed_kmh"].to_list()

        # Update global memory state
        if KOLKATA_GRAPH is not None:
            nearest_nodes = ox.distance.nearest_nodes(KOLKATA_GRAPH, X=lons, Y=lats)
            for node, speed in zip(nearest_nodes, speeds):
                LIVE_EDGE_SPEEDS[node] = speed

        return processed_df.to_dicts()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
