#!/usr/bin/env python3

import networkx as nx
import osmnx as ox
import datetime
import random

def format_geojson_segmented(city_graph, node_list):
    """
    Slices the route into physical segments and assigns a traffic color.
    """
    features = []

    for i in range(len(node_list) - 1):
        u = node_list[i]
        v = node_list[i+1]

        lon_u, lat_u = city_graph.nodes[u]['x'], city_graph.nodes[u]['y']
        lon_v, lat_v = city_graph.nodes[v]['x'], city_graph.nodes[v]['y']

        # Hackathon Heuristic: Generate synthetic traffic severity for the frontend.
        # Once your ML model predicts edge weights, you will inject those here instead.
        status = random.choice(["green", "green", "green", "amber", "red"])

        segment_feature = {
            "type": "Feature",
            "properties": {
                "route_type": "alternate",
                "traffic_status": status # Frontend reads this to color the polyline
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[lon_u, lat_u], [lon_v, lat_v]]
            }
        }
        features.append(segment_feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }

def rush_hour_weight(u, v, edge_data):
    """
    Applies a mathematical penalty to specific roads during rush hour.
    """
    base_length = edge_data.get('length', 1.0)
    current_hour = datetime.datetime.now().hour

    # Penalize primary arterial roads heavily between 8 AM - 10 AM and 5 PM - 8 PM
    if (8 <= current_hour <= 10) or (17 <= current_hour <= 20):
        highway_type = edge_data.get("highway", "")
        # Handle cases where highway is a list of strings
        if isinstance(highway_type, list):
            highway_type = highway_type[0]

        if highway_type in ["primary", "secondary", "trunk"]:
            return base_length * 3.5  # 3.5x penalty (Avoid main roads)
        return base_length * 1.5      # 1.5x penalty (Standard traffic)

    return base_length

def find_best_routes(city_graph, source_lat, source_lon, target_lat, target_lon):
    """Finds optimal routes based on dynamic time-of-day traffic weights."""
    try:
        # Translates raw floating-point coordinates into graph integer pointers
        source_node = ox.distance.nearest_nodes(city_graph, X=source_lon, Y=source_lat)
        target_node = ox.distance.nearest_nodes(city_graph, X=target_lon, Y=target_lat)

        # Execute Yen's algorithm using our dynamic datetime weight function
        route_generator = nx.shortest_simple_paths(
            G=city_graph,
            source=source_node,
            target=target_node,
            weight=rush_hour_weight
        )

        routes = []
        for i, route in enumerate(route_generator):
            if i >= 2: break
            # Hand the raw node list to the GeoJSON formatter
            routes.append(format_geojson_segmented(city_graph, route))

        return {"routes": routes}

    except Exception as e:
        return {"error": str(e)}
