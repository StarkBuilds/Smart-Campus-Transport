#!/usr/bin/env python3

import polars as pl
import networkx as nx
import pytest
from geospatial_features import calculate_geospatial_features

@pytest.fixture
def mock_graph():
    """Generates an isolated graph topology to test traversal and fallbacks."""
    G = nx.DiGraph()
    # Nodes 1 and 2 are connected. Node 3 is an isolated island.
    G.add_node(1, x=88.360, y=22.570)
    G.add_node(2, x=88.365, y=22.575)
    G.add_node(3, x=88.370, y=22.580)

    # Create an edge with a known physical length (1500 meters)
    G.add_edge(1, 2, length=1500.0)
    return G

@pytest.fixture
def sample_telemetry():
    return pl.DataFrame({
        "bus_id": ["B1", "B2", "B3", "B4", "B5"],
        "route_id": ["R1", "R1", "R2", "R1", "R1"],
        "latitude": [22.570, 22.570, None, 22.570, 22.570],
        "longitude": [88.360, 88.360, None, 88.360, 88.360],
        "next_stop_latitude": [22.575, 22.580, 22.575, None, 22.575],
        "next_stop_longitude": [88.365, 88.370, 88.365, None, 88.365],
    })

@pytest.fixture
def mock_route_meta():
    return {"R1": 15.5, "R2": 22.0}

def test_correct_distance_calculation(sample_telemetry, mock_graph, mock_route_meta):
    """Validates successful Dijkstra edge-weight traversal."""
    result = calculate_geospatial_features(sample_telemetry, mock_graph, mock_route_meta)

    assert result["road_distance_km"][0] == 1.5
    assert result["route_length_km"][0] == 15.5

def test_road_graph_unavailable_fallback(sample_telemetry, mock_graph, mock_route_meta):
    """Tests graceful degradation when the destination node is completely unreachable."""
    result = calculate_geospatial_features(sample_telemetry, mock_graph, mock_route_meta)

    fallback_val = result["road_distance_km"][1]
    assert fallback_val is not None
    assert fallback_val > 0.0

def test_invalid_coordinates(sample_telemetry, mock_graph, mock_route_meta):
    """Ensures missing live coordinates do not crash the spatial engine."""
    result = calculate_geospatial_features(sample_telemetry, mock_graph, mock_route_meta)
    assert result["distance_to_next_stop_km"][2] is None
    assert result["road_distance_km"][2] is None

def test_missing_next_stop(sample_telemetry, mock_graph, mock_route_meta):
    """Ensures missing destination coordinates are handled safely."""
    result = calculate_geospatial_features(sample_telemetry, mock_graph, mock_route_meta)
    assert result["distance_to_next_stop_km"][3] is None
    assert result["road_distance_km"][3] is None

def test_multiple_stops_routes(sample_telemetry, mock_graph, mock_route_meta):
    """Ensures route lengths are mapped cleanly across a batch."""
    result = calculate_geospatial_features(sample_telemetry, mock_graph, mock_route_meta)
    assert result["route_length_km"][0] == 15.5
    assert result["route_length_km"][2] == 22.0
