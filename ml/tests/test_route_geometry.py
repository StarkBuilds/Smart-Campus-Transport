"""
Unit tests for Route Geometry Pipeline (build_route_geometry.py).
"""

import json
import math
import os
import pytest

from ml.scripts.build_route_geometry import (
    DEFAULT_CACHE_GRAPH_PATH,
    compute_route_geometry,
    extract_path_geometry,
    haversine_distance_m,
    load_or_build_graph,
)


def test_haversine_distance_m():
    """Verify haversine distance calculation matches expected physical distances."""
    # Behala Chowrasta (22.48735, 88.31338) to Manton (22.49486, 88.31661) ~ 890m straight-line
    dist = haversine_distance_m(22.4873548, 88.3133794, 22.4948629, 88.3166069)
    assert 800.0 < dist < 1000.0

    # Same point distance should be 0
    assert haversine_distance_m(22.50, 88.30, 22.50, 88.30) == pytest.approx(0.0, abs=1e-3)


def test_route_geometry_schema_and_integrity():
    """Verify generated route_geometry.json complies with schema, GeoJSON standards, and extensibility requirements."""
    geom_path = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "route_geometry.json")
    geom_path = os.path.abspath(geom_path)
    assert os.path.exists(geom_path), "route_geometry.json must exist"

    with open(geom_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Check top-level metadata
    assert "metadata" in data
    assert "routes" in data
    meta = data["metadata"]
    assert meta["total_routes"] == 2
    assert meta["total_network_distance_km"] > 0
    assert meta["network_type"] == "drive"

    for route in data["routes"]:
        assert "route_id" in route
        assert "route_name" in route
        assert "route_length_km" in route
        assert "route_length_m" in route
        assert route["route_length_km"] > 0
        assert route["route_length_m"] > 0

        # Validate GeoJSON LineString
        geom = route["geometry"]
        assert geom["type"] == "LineString"
        assert isinstance(geom["coordinates"], list)
        assert len(geom["coordinates"]) > 10
        for coord in geom["coordinates"]:
            assert len(coord) == 2
            lon, lat = coord[0], coord[1]
            # Must fall within Kolkata bounding box
            assert 88.20 <= lon <= 88.50
            assert 22.35 <= lat <= 22.70

        # Validate Waypoints
        waypoints = route["waypoints"]
        assert len(waypoints) >= 2
        for wp in waypoints:
            assert "waypoint_type" in wp
            assert "point_id" in wp
            assert "snapped_node" in wp
            assert "cumulative_distance_km" in wp
            # Verify snapping distance is reasonable (< 250m for institutional/urban road nodes)
            assert wp["snapped_node"]["snapping_distance_m"] < 250.0

        # Validate Segments
        segments = route["segments"]
        assert len(segments) == len(waypoints) - 1
        segment_dist_sum = sum(s["road_distance_km"] for s in segments)
        assert route["route_length_km"] == pytest.approx(segment_dist_sum, abs=0.01)

        # Validate Extensibility Sections
        assert "extensibility" in route
        route_ext = route["extensibility"]
        for key in ["traffic_monitoring", "weather_impact", "festival_event_management", "road_closure_management", "historical_delay_baselines", "geographic_features"]:
            assert key in route_ext, f"Missing route extensibility key: {key}"

        for seg in segments:
            assert "extensibility" in seg
            seg_ext = seg["extensibility"]
            for key in ["traffic_factors", "weather_factors", "festival_events", "road_closures", "historical_delays", "geographic_features"]:
                assert key in seg_ext, f"Missing segment extensibility key: {key}"


def test_graph_loading_and_path_extraction():
    """Verify graph loading and path geometry extraction from GraphML cache."""
    if not os.path.exists(DEFAULT_CACHE_GRAPH_PATH):
        pytest.skip("Graph cache not found, skipping graph loading test.")

    G = load_or_build_graph(cache_path=DEFAULT_CACHE_GRAPH_PATH)
    assert len(G.nodes) > 10000
    assert len(G.edges) > 20000

    # Test path extraction for a 2-node sequence
    sample_nodes = list(G.nodes)[:2]
    coords, length_m, attrs = extract_path_geometry(G, sample_nodes)
    assert len(coords) >= 2
    assert length_m >= 0.0
