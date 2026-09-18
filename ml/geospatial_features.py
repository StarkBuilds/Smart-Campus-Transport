#!/usr/bin/env python3

import polars as pl
import networkx as nx
import osmnx as ox
import math

def haversine_distance_km(lat1, lon1, lat2, lon2):
    """Fallback straight-line geographic distance calculation."""
    if any(math.isnan(x) or x is None for x in [lat1, lon1, lat2, lon2]):
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
    Enriches the bus telemetry dataframe with geospatial structural features.
    Accepts:
        df: Polars DataFrame containing 'latitude', 'longitude', 'next_stop_lat', 'next_stop_lon', 'route_id'
        road_graph: Projected or unprojected NetworkX/OSMnx graph
        route_metadata: Dictionary mapping route_id to configured total route length
    """
    if route_metadata is None:
        route_metadata = {}

    # --- 1. Vectorized Geographic Distance (distance_to_next_stop_km) ---
    df = df.with_columns([
        pl.struct(["latitude", "longitude", "next_stop_lat", "next_stop_lon"]).map_elements(
            lambda x: haversine_distance_km(x["latitude"], x["longitude"], x["next_stop_lat"], x["next_stop_lon"]),
            return_type=pl.Float64
        ).alias("distance_to_next_stop_km")
    ])

    # --- 2. Graph Traversal (road_distance_km) ---
    road_distances = []

    # We must cross the C-boundary into native Python to traverse the NetworkX graph row-by-row
    for row in df.iter_rows(named=True):
        lat, lon = row.get("latitude"), row.get("longitude")
        stop_lat, stop_lon = row.get("next_stop_lat"), row.get("next_stop_lon")

        # Invalid or missing coordinates handling
        if any(v is None or math.isnan(v) for v in [lat, lon, stop_lat, stop_lon]):
            road_distances.append(None)
            continue

        try:
            # Snap to nearest physical road nodes
            u = ox.distance.nearest_nodes(road_graph, X=lon, Y=lat)
            v = ox.distance.nearest_nodes(road_graph, X=stop_lon, Y=stop_lat)

            # Calculate physical road distance (assumes length attribute exists in meters)
            length_meters = nx.shortest_path_length(road_graph, u, v, weight="length")
            road_distances.append(length_meters / 1000.0)

        except (nx.NetworkXNoPath, Exception) as e:
            # Fallback: If graph is disconnected or unavailable, use Haversine * 1.35 standard penalty
            fallback = haversine_distance_km(lat, lon, stop_lat, stop_lon)
            road_distances.append(fallback * 1.35 if fallback else None)

    df = df.with_columns(pl.Series("road_distance_km", road_distances))

    # --- 3. Configuration Extraction (route_length_km) ---
    df = df.with_columns([
        pl.col("route_id").map_elements(
            lambda route: route_metadata.get(route, None),
            return_type=pl.Float64
        ).alias("route_length_km")
    ])

    # ==========================================
    # TODO: EXTENSIBILITY MARKERS FOR ML PIPELINE
    # ==========================================
    # The following contextual features will be joined here in subsequent PRs
    # by the ML Engineering team. Do not add predictive logic below.
    #
    # df = join_traffic_api(df)       -> generates 'traffic_level' (0-10)
    # df = join_weather_data(df)      -> generates 'rainfall' (mm/hr)
    # df = join_city_calendar(df)     -> generates 'event_active', 'festival_type'
    # df = join_municipal_feeds(df)   -> generates 'road_closure' (boolean)
    # df = join_historical_db(df)     -> generates 'historical_route_delay' (rolling mean)
    # ==========================================

    return df
