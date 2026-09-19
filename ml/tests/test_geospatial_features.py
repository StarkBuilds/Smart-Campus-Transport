#!/usr/bin/env python3

import pandas as pd
import numpy as np
import networkx as nx
import pytest
from geospatial_features import enrich_geospatial_features, calculate_haversine_km

@pytest.fixture
def mock_graph():
    """Generates an isolated, deterministic spatial graph for testing."""
    G = nx.DiGraph()
    G.graph["crs"] = "epsg:4326"

    G.add_node(1, x=88.360, y=22.570)
    G.add_node(2, x=88.365, y=22.575)

    G.add_node(3, x=88.380, y=22.590)

    G.add_edge(1, 2, length=2500.0)
    return G

@pytest.fixture
def canonical_schema_df():
    """Mocks the output schema produced by etl_pipeline.py."""
    return pd.DataFrame({
        "bus_id": ["BUS-1", "BUS-2", "BUS-3", "BUS-4"],
        "latitude": [22.570, 22.570, np.nan, 22.570],
        "longitude": [88.360, 88.360, np.nan, 88.360],
        "next_stop_latitude": [22.575, 22.590, 22.575, np.nan],
        "next_stop_longitude": [88.365, 88.380, 88.365, np.nan],
        "route_length_km": [15.2, 15.2, 12.0, 15.2]
    })

def test_correct_distance_calculation(canonical_schema_df, mock_graph):
    """Validates the exact road segment distance is extracted from the graph."""
    result = enrich_geospatial_features(canonical_schema_df, mock_graph)

    assert result.loc[0, "road_distance_km"] == 2.5
    assert result.loc[0, "route_length_km"] == 15.2

def test_road_graph_failure_fallback(canonical_schema_df, mock_graph):
    """Validates the 1.35x Haversine penalty when no physical road connects the nodes."""
    result = enrich_geospatial_features(canonical_schema_df, mock_graph)

    fallback_dist = result.loc[1, "road_distance_km"]
    haversine_dist = result.loc[1, "distance_to_next_stop_km"]

    assert pd.notna(fallback_dist)
    assert np.isclose(fallback_dist, haversine_dist * 1.35)

def test_invalid_coordinates_handling(canonical_schema_df, mock_graph):
    """Ensures the server does not panic on GPS dead zones."""
    result = enrich_geospatial_features(canonical_schema_df, mock_graph)

    assert pd.isna(result.loc[2, "distance_to_next_stop_km"])
    assert pd.isna(result.loc[2, "road_distance_km"])

def test_missing_next_stop_handling(canonical_schema_df, mock_graph):
    """Ensures the pipeline survives unassigned terminal stops."""
    result = enrich_geospatial_features(canonical_schema_df, mock_graph)

    assert pd.isna(result.loc[3, "distance_to_next_stop_km"])
    assert pd.isna(result.loc[3, "road_distance_km"])
