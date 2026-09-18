#!/usr/bin/env python3

import polars as pl
import networkx as nx
import pytest
import math
from geospatial_features import calculate_geospatial_features, haversine_distance_km

@pytest.fixture
def mock_graph():
    """Creates a tiny dummy graph for testing without hitting the internet."""
    G = nx.DiGraph()
    # Dummy nodes where X is lon, Y is lat
    G.add_node(1, x=88.36, y=22.57)
    G.add_node(2, x=88.37, y=22.58)
    G.add_node(3, x=88.38, y=22.59) # Disconnected node to test fallback

    # Edge with 1500 meters length
    G.add_edge(1, 2, length=1500.0)
    return G

@pytest.fixture
def sample_df():
    return pl.DataFrame({
        "bus_id": ["B1", "B2", "B3", "B4"],
        "route_id": ["R1", "R1", "R2", "R1"],
        "latitude": [22.57, 22.57, None, 22.57],
        "longitude": [88.36, 88.36, None, 88.36],
        "next_stop_lat": [22.58, 22.59, 22.58, None],
        "next_stop_lon": [88.37, 88.38, 88.37, None],
    })

@pytest.fixture
def route_meta():
    return {"R1": 15.5, "R2": 22.0}

def test_correct_distance_calculation(sample_df, mock_graph, route_meta):
    """Validates road distance parses edge weights correctly."""
    result = calculate_geospatial_features(sample_df, mock_graph, route_meta)

    # Bus 1 is exactly at node 1, stop is at node 2. Edge length is 1500m (1.5km)
    assert result["road_distance_km"][0] == 1.5
    assert result["route_length_km"][0] == 15.5

def test_road_graph_unavailable_fallback(sample_df, mock_graph, route_meta):
    """Bus 2 goes to node 3, which is disconnected. Should trigger Haversine fallback."""
    result = calculate_geospatial_features(sample_df, mock_graph, route_meta)

    # Ensure it didn't crash and calculated a fallback
    fallback_val = result["road_distance_km"][1]
    assert fallback_val is not None
    assert fallback_val > 0.0

def test_invalid_coordinates(sample_df, mock_graph, route_meta):
    """Bus 3 has null coordinates. Should safely return None/Null."""
    result = calculate_geospatial_features(sample_df, mock_graph, route_meta)
    assert result["distance_to_next_stop_km"][2] is None
    assert result["road_distance_km"][2] is None

def test_missing_next_stop(sample_df, mock_graph, route_meta):
    """Bus 4 has no next stop assigned. Should safely return None/Null."""
    result = calculate_geospatial_features(sample_df, mock_graph, route_meta)
    assert result["distance_to_next_stop_km"][3] is None
    assert result["road_distance_km"][3] is None
