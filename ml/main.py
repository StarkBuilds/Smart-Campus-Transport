#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException
import networkx as nx
import osmnx as ox
from pydantic import BaseModel
from routing_engine import find_best_routes
from typing import List
import polars as pl
from schemas import BusEvent
from features import run_feature_extraction

# Initialize the web server daemon
app = FastAPI(title="Smart Campus Transit API")

KOLKATA_GRAPH=None

#@app.on_event("startup")
#async def startup_event():
print ("Loading Kolkata map into memory...please wait.")
raw_graph=ox.load_graphml("kolkata_drive.graphml")
KOLKATA_GRAPH=ox.convert.to_digraph(raw_graph)
print(f"Map Loaded! {len(KOLKATA_GRAPH.nodes)} intersections ready.")

class RouteRequest(BaseModel):
    source_node:str
    target_node:str

@app.post("/alternate_routes")
async def get_routes(request:RouteRequest):
    #if not KOLKATA_GRAPH:
        #raise HTTPException(status_code=500,detail="Map not loaded yet")

    result=find_best_routes(
        KOLKATA_GRAPH,
        request.source_node,
        request.target_node
    )
    return result

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
