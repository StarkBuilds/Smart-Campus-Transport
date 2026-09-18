#!/usr/bin/env python3
"""
Route Geometry Builder for Campus Transit.

This utility reads `route_config_resolved.json`, loads/builds the Kolkata drive
road network graph using OSMnx/NetworkX, snaps all route start, end, and stop
coordinates to the nearest road network nodes, computes high-fidelity road paths
between sequential stops, calculates road distances, generates GeoJSON LineString
geometries, and outputs `ml/data/processed/route_geometry.json`.

The output schema provides full extensibility for future traffic conditions,
weather variables, festival/event diversions, road closures, historical delay
baselines, and physical road characteristics.
"""

import argparse
import json
import logging
import math
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

try:
    import networkx as nx
    import osmnx as ox
    import shapely.geometry
    import shapely.wkt
except ImportError as e:
    sys.exit(f"Required geospatial dependencies missing: {e}. Run in ml/venv environment.")

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("route_geometry_builder")

# Default Kolkata Transit Bounding Box: (min_lon, min_lat, max_lon, max_lat)
DEFAULT_KOLKATA_BBOX = (88.29, 22.45, 88.37, 22.56)
DEFAULT_CACHE_GRAPH_PATH = "/home/arghadeep/Projects/Smart Campus Transport/ml/data/cache/kolkata_drive_network.graphml"


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two points on the Earth in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def load_or_build_graph(
    cache_path: str = DEFAULT_CACHE_GRAPH_PATH,
    bbox: Tuple[float, float, float, float] = DEFAULT_KOLKATA_BBOX,
    force_download: bool = False
) -> nx.MultiDiGraph:
    """
    Loads the drive network graph from local GraphML cache or downloads
    it from OSMnx Overpass API and caches it.
    """
    if os.path.exists(cache_path) and not force_download:
        logger.info(f"Loading road network graph from cache: {cache_path}...")
        G = ox.load_graphml(cache_path)
        logger.info(f"Loaded road network graph: {len(G.nodes)} nodes, {len(G.edges)} edges.")
        return G

    logger.info(f"Downloading Kolkata drive network within bbox={bbox} via OSMnx...")
    os.makedirs(os.path.dirname(os.path.abspath(cache_path)), exist_ok=True)
    G = ox.graph_from_bbox(bbox=bbox, network_type="drive", retain_all=True)
    ox.save_graphml(G, cache_path)
    logger.info(f"Saved road network graph to {cache_path} ({len(G.nodes)} nodes, {len(G.edges)} edges).")
    return G


def extract_path_geometry(G: nx.MultiDiGraph, path_nodes: List[int]) -> Tuple[List[List[float]], float, List[Dict[str, Any]]]:
    """
    Extracts the continuous [lon, lat] coordinate list, exact road distance (meters),
    and edge attributes for a sequence of graph nodes.
    """
    if not path_nodes:
        return [], 0.0, []

    if len(path_nodes) == 1:
        single_node = path_nodes[0]
        node_data = G.nodes[single_node]
        lon = float(node_data.get("x", 0.0))
        lat = float(node_data.get("y", 0.0))
        return [[lon, lat]], 0.0, []

    coordinates: List[List[float]] = []
    total_length_m = 0.0
    edge_attributes: List[Dict[str, Any]] = []

    for u, v in zip(path_nodes[:-1], path_nodes[1:]):
        edge_data_dict = G.get_edge_data(u, v)
        if not edge_data_dict:
            # Fallback if edge in directed graph doesn't exist directly (e.g. undirected lookup)
            u_pt = [float(G.nodes[u]["x"]), float(G.nodes[u]["y"])]
            v_pt = [float(G.nodes[v]["x"]), float(G.nodes[v]["y"])]
            dist_m = haversine_distance_m(u_pt[1], u_pt[0], v_pt[1], v_pt[0])
            total_length_m += dist_m
            if not coordinates or coordinates[-1] != u_pt:
                coordinates.append(u_pt)
            coordinates.append(v_pt)
            edge_attributes.append({
                "highway": "unclassified",
                "length_m": dist_m,
                "name": None,
                "oneway": False
            })
            continue

        # Choose the shortest edge if multiple parallel edges exist
        best_k, best_edge = min(
            edge_data_dict.items(),
            key=lambda item: float(item[1].get("length", float("inf")))
        )
        edge_len = float(best_edge.get("length", 0.0))
        total_length_m += edge_len

        edge_attr = {
            "highway": best_edge.get("highway", "residential"),
            "length_m": edge_len,
            "name": best_edge.get("name"),
            "maxspeed": best_edge.get("maxspeed"),
            "lanes": best_edge.get("lanes"),
            "oneway": best_edge.get("oneway", False)
        }
        edge_attributes.append(edge_attr)

        geom = best_edge.get("geometry")
        if geom is not None:
            if isinstance(geom, str):
                try:
                    geom = shapely.wkt.loads(geom)
                except Exception:
                    geom = None

            if isinstance(geom, shapely.geometry.LineString):
                coords = list(geom.coords)
                for pt in coords:
                    pt_coords = [round(float(pt[0]), 7), round(float(pt[1]), 7)]
                    if not coordinates or coordinates[-1] != pt_coords:
                        coordinates.append(pt_coords)
                continue

        # Fallback to straight line between u and v
        u_pt = [round(float(G.nodes[u]["x"]), 7), round(float(G.nodes[u]["y"]), 7)]
        v_pt = [round(float(G.nodes[v]["x"]), 7), round(float(G.nodes[v]["y"]), 7)]
        if not coordinates or coordinates[-1] != u_pt:
            coordinates.append(u_pt)
        coordinates.append(v_pt)

    return coordinates, total_length_m, edge_attributes


def compute_route_geometry(
    route: Dict[str, Any],
    G: nx.MultiDiGraph,
    Gu: Optional[nx.MultiGraph] = None
) -> Dict[str, Any]:
    """
    Processes a single route configuration, snaps all stops/start/end to road nodes,
    computes sequential road paths, road distances, GeoJSON LineStrings, and extensibility blocks.
    """
    route_id = route.get("route_id", "UNKNOWN")
    route_name = route.get("route_name", "Unknown Route")
    logger.info(f"Computing road geometry for route {route_id}: {route_name}...")

    # Build sequential list of waypoints
    raw_waypoints: List[Dict[str, Any]] = []

    # Start waypoint
    start_info = route.get("start", {})
    raw_waypoints.append({
        "waypoint_type": "START",
        "point_id": f"{route_id}_START",
        "name": start_info.get("name", "Start"),
        "latitude": start_info.get("latitude"),
        "longitude": start_info.get("longitude"),
        "sequence": 0
    })

    # Intermediate stops (ordered by sequence)
    stops = sorted(route.get("stops", []), key=lambda s: s.get("sequence", 0))
    for stop in stops:
        raw_waypoints.append({
            "waypoint_type": "STOP",
            "point_id": stop.get("stop_id", f"{route_id}_S{stop.get('sequence', 0):02d}"),
            "name": stop.get("stop_name", "Stop"),
            "latitude": stop.get("latitude"),
            "longitude": stop.get("longitude"),
            "sequence": stop.get("sequence", 0)
        })

    # End destination
    end_info = route.get("end", {})
    raw_waypoints.append({
        "waypoint_type": "END",
        "point_id": f"{route_id}_END",
        "name": end_info.get("name", "Destination"),
        "latitude": end_info.get("latitude"),
        "longitude": end_info.get("longitude"),
        "sequence": len(stops) + 1
    })

    # Snap all waypoints to nearest drive nodes
    snapped_waypoints: List[Dict[str, Any]] = []
    for wp in raw_waypoints:
        lat = wp["latitude"]
        lon = wp["longitude"]
        if lat is None or lon is None:
            raise ValueError(f"Missing coordinates for waypoint {wp['point_id']} ({wp['name']}) in route {route_id}")

        # OSMnx nearest_nodes expects X=lon, Y=lat
        nearest_node = int(ox.nearest_nodes(G, X=lon, Y=lat))
        node_lon = float(G.nodes[nearest_node]["x"])
        node_lat = float(G.nodes[nearest_node]["y"])
        snap_dist_m = haversine_distance_m(lat, lon, node_lat, node_lon)

        snapped_waypoints.append({
            "waypoint_type": wp["waypoint_type"],
            "point_id": wp["point_id"],
            "name": wp["name"],
            "sequence": wp["sequence"],
            "original_coordinates": {
                "latitude": round(lat, 7),
                "longitude": round(lon, 7)
            },
            "snapped_node": {
                "node_id": nearest_node,
                "latitude": round(node_lat, 7),
                "longitude": round(node_lon, 7),
                "snapping_distance_m": round(snap_dist_m, 2)
            }
        })

    # Compute road paths between sequential waypoints
    segments: List[Dict[str, Any]] = []
    full_route_coordinates: List[List[float]] = []
    total_route_length_m = 0.0
    cumulative_distance_m = 0.0

    # Assign cumulative distance to first waypoint
    snapped_waypoints[0]["cumulative_distance_km"] = 0.0

    for i in range(len(snapped_waypoints) - 1):
        wp_from = snapped_waypoints[i]
        wp_to = snapped_waypoints[i + 1]

        u_node = wp_from["snapped_node"]["node_id"]
        v_node = wp_to["snapped_node"]["node_id"]

        path_nodes: List[int] = []
        routing_mode = "DIRECTED_SHORTEST_PATH"

        if u_node == v_node:
            path_nodes = [u_node]
            routing_mode = "ZERO_DISTANCE_COINCIDENT"
        else:
            try:
                path_nodes = [int(n) for n in nx.shortest_path(G, source=u_node, target=v_node, weight="length")]
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                # Fallback to undirected graph for complex traffic routing or one-ways
                if Gu is None:
                    Gu = G.to_undirected()
                try:
                    path_nodes = [int(n) for n in nx.shortest_path(Gu, source=u_node, target=v_node, weight="length")]
                    routing_mode = "UNDIRECTED_FALLBACK"
                except Exception:
                    path_nodes = [u_node, v_node]
                    routing_mode = "EUCLIDEAN_INTERPOLATION"

        seg_coords, seg_length_m, edge_attrs = extract_path_geometry(G, path_nodes)
        total_route_length_m += seg_length_m
        cumulative_distance_m += seg_length_m

        wp_to["cumulative_distance_km"] = round(cumulative_distance_m / 1000.0, 3)

        # Merge coordinates into full route geometry
        for pt in seg_coords:
            if not full_route_coordinates or full_route_coordinates[-1] != pt:
                full_route_coordinates.append(pt)

        # Segment Extensibility Block
        segment_extensibility = {
            "traffic_factors": {
                "base_speed_kmh": 25.0,
                "peak_hour_multiplier": 1.40,
                "off_peak_multiplier": 1.00,
                "congestion_hotspots": []
            },
            "weather_factors": {
                "monsoon_waterlogging_risk": "moderate" if "Thakurpukur" in wp_to["name"] or "Behala" in wp_to["name"] else "low",
                "rain_speed_reduction_factor": 0.85
            },
            "festival_events": {
                "durga_puja_diversion_eligible": True,
                "special_event_restrictions": []
            },
            "road_closures": {
                "active_closure": False,
                "alternate_path_available": True
            },
            "historical_delays": {
                "baseline_traversal_seconds": round((seg_length_m / 1000.0 / 25.0) * 3600, 1),
                "expected_variance_seconds": round((seg_length_m / 1000.0 / 25.0) * 3600 * 0.25, 1)
            },
            "geographic_features": {
                "road_names": list({e["name"] for e in edge_attrs if e.get("name")}),
                "road_types": list({e["highway"] for e in edge_attrs if e.get("highway")})
            }
        }

        segments.append({
            "segment_index": i + 1,
            "from_point": {
                "point_id": wp_from["point_id"],
                "name": wp_from["name"],
                "waypoint_type": wp_from["waypoint_type"]
            },
            "to_point": {
                "point_id": wp_to["point_id"],
                "name": wp_to["name"],
                "waypoint_type": wp_to["waypoint_type"]
            },
            "road_distance_m": round(seg_length_m, 2),
            "road_distance_km": round(seg_length_m / 1000.0, 3),
            "routing_mode": routing_mode,
            "path_node_count": len(path_nodes),
            "path_node_ids": path_nodes,
            "geometry": {
                "type": "LineString",
                "coordinates": seg_coords
            },
            "extensibility": segment_extensibility
        })

    # Route Bounding Box
    all_lons = [pt[0] for pt in full_route_coordinates]
    all_lats = [pt[1] for pt in full_route_coordinates]
    route_bbox = {
        "min_longitude": min(all_lons) if all_lons else None,
        "min_latitude": min(all_lats) if all_lats else None,
        "max_longitude": max(all_lons) if all_lons else None,
        "max_latitude": max(all_lats) if all_lats else None
    }

    # Route-level Extensibility Block
    route_extensibility = {
        "traffic_monitoring": {
            "rush_hour_windows": ["08:30-11:30", "16:30-20:00"],
            "historical_congestion_index": 1.35
        },
        "weather_impact": {
            "monsoon_vulnerability_level": "moderate",
            "heat_wave_slowdown_factor": 1.05
        },
        "festival_event_management": {
            "annual_pandal_zones": ["Behala Chowrasta", "Hazra Crossing", "Kalighat"],
            "event_detour_protocol_active": False
        },
        "road_closure_management": {
            "active_construction_zones": [],
            "emergency_evacuation_priority": "high"
        },
        "historical_delay_baselines": {
            "typical_total_duration_minutes": round((total_route_length_m / 1000.0 / 22.0) * 60, 1),
            "peak_total_duration_minutes": round((total_route_length_m / 1000.0 / 15.0) * 60, 1)
        },
        "geographic_features": {
            "primary_corridors": ["Diamond Harbour Road", "Alipore Road", "Belvedere Road", "Ashutosh Mukherjee Road"],
            "terrain": "flat_urban_plain"
        }
    }

    return {
        "route_id": route_id,
        "route_name": route_name,
        "route_length_km": round(total_route_length_m / 1000.0, 3),
        "route_length_m": round(total_route_length_m, 2),
        "total_stops": len(stops),
        "start": route.get("start"),
        "end": route.get("end"),
        "bounding_box": route_bbox,
        "waypoints": snapped_waypoints,
        "segments": segments,
        "geometry": {
            "type": "LineString",
            "coordinates": full_route_coordinates
        },
        "extensibility": route_extensibility
    }


def build_all_route_geometries(
    resolved_config_path: str,
    output_geometry_path: str,
    cache_graph_path: str = DEFAULT_CACHE_GRAPH_PATH,
    force_download: bool = False
) -> Dict[str, Any]:
    """
    Loads `route_config_resolved.json`, computes geometries for all routes,
    and serializes the result into `route_geometry.json`.
    """
    if not os.path.exists(resolved_config_path):
        raise FileNotFoundError(f"Resolved route configuration not found: {resolved_config_path}")

    with open(resolved_config_path, "r", encoding="utf-8") as f:
        resolved_config = json.load(f)

    G = load_or_build_graph(cache_path=cache_graph_path, force_download=force_download)
    Gu = G.to_undirected()

    processed_routes: List[Dict[str, Any]] = []
    total_network_dist_km = 0.0

    for route in resolved_config.get("routes", []):
        route_geom = compute_route_geometry(route, G, Gu)
        total_network_dist_km += route_geom["route_length_km"]
        processed_routes.append(route_geom)

    output_payload = {
        "metadata": {
            "source_resolved_config": resolved_config_path,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "generator": "build_route_geometry.py",
            "osmnx_version": ox.__version__,
            "networkx_version": nx.__version__,
            "network_type": "drive",
            "total_routes": len(processed_routes),
            "total_network_distance_km": round(total_network_dist_km, 3)
        },
        "routes": processed_routes
    }

    os.makedirs(os.path.dirname(os.path.abspath(output_geometry_path)), exist_ok=True)
    with open(output_geometry_path, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2, ensure_ascii=False)

    logger.info(f"Successfully generated route geometries for {len(processed_routes)} routes at {output_geometry_path}")
    logger.info(f"Total network distance across all routes: {total_network_dist_km:.3f} km")

    return output_payload


def main():
    parser = argparse.ArgumentParser(description="Build OSMnx road network route geometries for campus transit.")
    parser.add_argument(
        "--config",
        type=str,
        default="/home/arghadeep/Projects/Smart Campus Transport/ml/data/processed/route_config_resolved.json",
        help="Path to route_config_resolved.json"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="/home/arghadeep/Projects/Smart Campus Transport/ml/data/processed/route_geometry.json",
        help="Path to output route_geometry.json"
    )
    parser.add_argument(
        "--graph-cache",
        type=str,
        default=DEFAULT_CACHE_GRAPH_PATH,
        help="Path to cached GraphML road network file"
    )
    parser.add_argument(
        "--force-download",
        action="store_true",
        help="Force re-download of OSM road network graph"
    )

    args = parser.parse_args()
    try:
        build_all_route_geometries(
            resolved_config_path=args.config,
            output_geometry_path=args.output,
            cache_graph_path=args.graph_cache,
            force_download=args.force_download
        )
    except Exception as e:
        logger.error(f"Failed to build route geometry: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
