#!/usr/bin/env python3

import pandas as pd
import networkx as nx
import osmnx as ox
import math
import numpy as np

def _is_valid_coords(lat, lon) -> bool:
    """Range-check GPS coordinates (-90..90, -180..180). Mirrors ETL validation."""
    if pd.isna(lat) or pd.isna(lon):
        return False
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return False
    return -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0

def calculate_haversine_km(lat1, lon1, lat2, lon2):
    """Fallback straight-line geographic distance calculation."""
    if not _is_valid_coords(lat1, lon1) or not _is_valid_coords(lat2, lon2):
        return np.nan

    r_earth_km = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return r_earth_km * c

def enrich_geospatial_features(df: pd.DataFrame, road_graph: nx.DiGraph) -> pd.DataFrame:
    """
    Consumes the canonical CampusRide DataFrame and dynamically calculates
    live geographic routing features for downstream XGBoost consumption.
    """
    # Create a copy to prevent SettingWithCopy warnings from Pandas
    enriched_df = df.copy()

    # --- 1. Dynamic Geographic Distance ---
    # Replaces the static ETL distance with the actual distance from current GPS
    enriched_df["distance_to_next_stop_km"] = enriched_df.apply(
        lambda row: calculate_haversine_km(
            row.get("latitude"), row.get("longitude"),
            row.get("next_stop_latitude"), row.get("next_stop_longitude")
        ), axis=1
    )

    # --- 2. Live Road Network Traversal ---
    dynamic_road_distances = []

    for _, row in enriched_df.iterrows():
        lat, lon = row.get("latitude"), row.get("longitude")
        stop_lat, stop_lon = row.get("next_stop_latitude"), row.get("next_stop_longitude")

        # Handle missing / invalid canonical geography gracefully
        if not _is_valid_coords(lat, lon) or not _is_valid_coords(stop_lat, stop_lon):
            dynamic_road_distances.append(np.nan)
            continue

        try:
            # Snap live GPS to nearest physical road nodes
            u = ox.distance.nearest_nodes(road_graph, X=lon, Y=lat)
            v = ox.distance.nearest_nodes(road_graph, X=stop_lon, Y=stop_lat)

            # Calculate physical road path distance
            length_meters = nx.shortest_path_length(road_graph, u, v, weight="length")
            dynamic_road_distances.append(length_meters / 1000.0)

        except (nx.NetworkXNoPath, nx.NodeNotFound, Exception):
            # Graceful Fallback: Graph disconnected or coordinate out of bounds.
            # Apply standard urban detour penalty (1.35x) to the Haversine distance.
            fallback = calculate_haversine_km(lat, lon, stop_lat, stop_lon)
            dynamic_road_distances.append(fallback * 1.35 if pd.notna(fallback) else np.nan)

    # Overwrite the static ETL approximation with the true physical traversal distance
    enriched_df["road_distance_km"] = dynamic_road_distances

    # --- 3. Route Configuration Validation ---
    # Ensure route_length_km exists from the static config, fallback to NaN if missing
    if "route_length_km" not in enriched_df.columns:
        enriched_df["route_length_km"] = np.nan

    # ==========================================
    # TODO: CONTEXTUAL FEATURE EXTENSIBILITY
    # ==========================================
    # Downstream data engineers should mount API integrations here.
    # Do NOT append predictive ML logic or classifiers in this module.
    #
    # enriched_df = join_live_traffic(enriched_df)       -> 'traffic_level' (Enum/Int)
    # enriched_df = join_weather_station(enriched_df)    -> 'rainfall' (mm/hr)
    # enriched_df = join_campus_calendar(enriched_df)    -> 'event_active', 'festival_type'
    # enriched_df = check_municipal_feeds(enriched_df)   -> 'road_closure' (Boolean)
    # enriched_df = join_historical_db(enriched_df)      -> 'historical_route_delay' (Float)
    # ==========================================

    return enriched_df
