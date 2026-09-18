#!/usr/bin/env python3

import networkx as nx
import osmnx as ox
import datetime

def live_traffic_weight(u, v, edge_data, live_speeds):
    """Dynamic routing cost based on actual telemetry pings."""
    base_length = edge_data.get('length', 1.0)
    observed_speed = live_speeds.get(u, 30.0)

    if observed_speed < 15.0:
        return base_length * 5.0  # Avoid this road at all costs
    elif observed_speed < 25.0:
        return base_length * 2.0  # Moderate congestion
    return base_length

def format_geojson_segmented(city_graph, node_list, live_speeds):
    """Renders the actual traffic color based on live telemetry."""
    features = []
    for i in range(len(node_list) - 1):
        u, v = node_list[i], node_list[i+1]
        lon_u, lat_u = city_graph.nodes[u]['x'], city_graph.nodes[u]['y']
        lon_v, lat_v = city_graph.nodes[v]['x'], city_graph.nodes[v]['y']

        observed_speed = live_speeds.get(u, 30.0)

        if observed_speed < 15.0:
            status = "red"
        elif observed_speed < 25.0:
            status = "amber"
        else:
            status = "green"

        segment_feature = {
            "type": "Feature",
            "properties": {"route_type": "alternate", "traffic_status": status},
            "geometry": {"type": "LineString", "coordinates": [[lon_u, lat_u], [lon_v, lat_v]]}
        }
        features.append(segment_feature)

    return {"type": "FeatureCollection", "features": features}

def rush_hour_weight(u, v, edge_data):
    """Applies a mathematical penalty to specific roads during rush hour."""
    base_length = edge_data.get('length', 1.0)
    current_hour = datetime.datetime.now().hour

    if (8 <= current_hour <= 10) or (17 <= current_hour <= 20):
        highway_type = edge_data.get("highway", "")
        if isinstance(highway_type, list):
            highway_type = highway_type[0]

        if highway_type in ["primary", "secondary", "trunk"]:
            return base_length * 3.5
        return base_length * 1.5

    return base_length

def find_best_routes(city_graph, source_lat, source_lon, target_lat, target_lon, live_speeds):
    """Finds optimal routes based on dynamic time-of-day and live traffic weights."""
    try:
        source_node = ox.distance.nearest_nodes(city_graph, X=source_lon, Y=source_lat)
        target_node = ox.distance.nearest_nodes(city_graph, X=target_lon, Y=target_lat)

        # Combine both historical rush hour heuristics and LIVE telemetry state
        route_generator = nx.shortest_simple_paths(
            G=city_graph,
            source=source_node,
            target=target_node,
            weight=lambda u, v, d: rush_hour_weight(u, v, d) + live_traffic_weight(u, v, d, live_speeds)
        )

        routes = []
        for i, route in enumerate(route_generator):
            if i >= 2: break
            routes.append(format_geojson_segmented(city_graph, route, live_speeds))

        return {"routes": routes}

    except Exception as e:
        return {"error": str(e)}
