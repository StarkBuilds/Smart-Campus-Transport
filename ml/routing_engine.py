#!/usr/bin/env python3

import networkx as nx

def format_geojson(city_graph, node_list):
    """Converts a list of graph nodes into the GeoJSON format the frontend demands."""
    coordinates = []
    for node_id in node_list:
        lon = city_graph.nodes[node_id]['x']
        lat = city_graph.nodes[node_id]['y']
        coordinates.append([lon, lat])

    return {
        "type": "Feature",
        "properties": {"route_type": "alternate"},
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates
        }
    }

def find_best_routes(city_graph, source_node, target_node):
    """Finds the best routes using NetworkX."""
    try:
        sample_node = list(city_graph.nodes)[0]
        if isinstance(sample_node, int):
            source_node = int(source_node)
            target_node = int(target_node)
        elif isinstance(sample_node, str):
            source_node = str(source_node)
            target_node = str(target_node)

        route_generator = nx.shortest_simple_paths(
            G=city_graph,
            source=source_node,
            target=target_node,
            weight="length"
        )

        routes = []
        for i, route in enumerate(route_generator):
            if i >= 2: break
            routes.append(format_geojson(city_graph, route))

        return {"routes": routes}

    except Exception as e:
        return {"error": str(e)}
