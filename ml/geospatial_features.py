#!/usr/bin/env python3

import math
import polars as pl
import networkx as nx
import osmnx as ox

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Fallback straight-line geographic distance calculation."""
    if any(v is None or math.isnan(v) for v in [lat1, lon1, lat2, lon2]):
        return None

    r_earth_km = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return r_earth_km * c

def calculate_geospatial_features(df: pl.DataFrame, road_graph: nx.DiGraph, route_metadata: dict = None) -> pl.DataFrame:
    """
    Produces dynamic spatial features from live bus telemetry.
    Expects df to contain: 'latitude', 'longitude', 'next_stop_latitude', 'next_stop_longitude', 'route_id'
    """
    if route_metadata is None:
        route_metadata = {}

    # Overwrites static ETL calculations with highly accurate dynamic live-to-stop distances
    df = df.with_columns([
        pl.struct(["latitude", "longitude", "next_stop_latitude", "next_stop_longitude"]).map_elements(
            lambda x: haversine_distance_km(x["latitude"], x["longitude"], x["next_stop_latitude"], x["next_stop_longitude"]),
            return_type=pl.Float64
        ).alias("distance_to_next_stop_km")
    ])

    road_distances = []

    for row in df.iter_rows(named=True):
        lat, lon = row.get("latitude"), row.get("longitude")
        stop_lat, stop_lon = row.get("next_stop_latitude"), row.get("next_stop_longitude")

        if any(v is None or math.isnan(v) for v in [lat, lon, stop_lat, stop_lon]):
            road_distances.append(None)
            continue

        try:
            # Dynamically snap the live bus coordinate and the stop to the nearest physical asphalt
            u = ox.distance.nearest_nodes(road_graph, X=lon, Y=lat)
            v = ox.distance.nearest_nodes(road_graph, X=stop_lon, Y=stop_lat)

            # Execute Dijkstra's shortest path
            length_meters = nx.shortest_path_length(road_graph, u, v, weight="length")
            road_distances.append(length_meters / 1000.0)

        except (nx.NetworkXNoPath, Exception):
            # Graceful Fallback: If graph is disconnected/fails, use Haversine * 1.35 standard detour penalty
            fallback = haversine_distance_km(lat, lon, stop_lat, stop_lon)
            road_distances.append(fallback * 1.35 if fallback else None)

    df = df.with_columns(pl.Series("road_distance_km", road_distances))

    df = df.with_columns([
        pl.col("route_id").map_elements(
            lambda route: route_metadata.get(route, None),
            return_type=pl.Float64
        ).alias("route_length_km")
    ])

    # ==========================================
    # TODO: EXTENSIBILITY MARKERS FOR DOWNSTREAM ML PIPELINE
    # ==========================================
    # Contextual geographic/temporal features to be joined here in subsequent PRs.
    #
    # df = join_traffic_api(df)       -> 'traffic_level' (Categorical)
    # df = join_weather_data(df)      -> 'rainfall' (Float mm/hr)
    # df = join_city_calendar(df)     -> 'event_active', 'festival_type'
    # df = join_municipal_feeds(df)   -> 'road_closure' (Boolean)
    # df = join_historical_db(df)     -> 'historical_route_delay' (Rolling mean)
    # ==========================================

    return df
