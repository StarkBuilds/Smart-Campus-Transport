#!/usr/bin/env python3
"""
Unit and Integration Tests for Geospatial Feature Engineering.

Validates:
1. Mathematical utilities (Haversine distance, compass bearing, angular delta).
2. Route geometry parsing and waypoint indexing (`RouteGeometryManager`).
3. Point-to-polyline projection and road-distance calibration.
4. Feature enrichment on canonical ETL DataFrames.
5. Strict missing value and quality flag handling (no 1.35x heuristic fallbacks).
6. End-to-end integration: `bus_events.jsonl` -> `build_etl()` -> Parquet -> `enrich_geospatial_features()`.
"""

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from etl_pipeline import build_etl
from geospatial_features import (
    RouteGeometryManager,
    calculate_bearing_deg,
    calculate_bearing_difference_deg,
    calculate_haversine_km,
    enrich_geospatial_features,
    is_valid_coordinates,
    project_point_to_route,
)


@pytest.fixture
def sample_route_geometry_dict():
    """Generates an isolated, deterministic route geometry for testing."""
    return {
        "routes": [
            {
                "route_id": "R01",
                "route_name": "Test Campus Route 1",
                "route_length_km": 10.0,
                "waypoints": [
                    {
                        "point_id": "R01_START",
                        "name": "Start Terminal",
                        "waypoint_type": "START",
                        "sequence": 0,
                        "cumulative_distance_km": 0.0,
                        "original_coordinates": {"latitude": 22.500, "longitude": 88.300},
                    },
                    {
                        "point_id": "R01_S01",
                        "name": "Midpoint Stop",
                        "waypoint_type": "STOP",
                        "sequence": 1,
                        "cumulative_distance_km": 4.0,
                        "original_coordinates": {"latitude": 22.540, "longitude": 88.300},
                    },
                    {
                        "point_id": "R01_END",
                        "name": "Campus Gate End",
                        "waypoint_type": "END",
                        "sequence": 2,
                        "cumulative_distance_km": 10.0,
                        "original_coordinates": {"latitude": 22.600, "longitude": 88.300},
                    },
                ],
                "segments": [
                    {
                        "segment_index": 1,
                        "from_point": {"point_id": "R01_START"},
                        "to_point": {"point_id": "R01_S01"},
                        "road_distance_km": 4.0,
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [
                                [88.300, 22.500],
                                [88.300, 22.520],
                                [88.300, 22.540],
                            ],
                        },
                    },
                    {
                        "segment_index": 2,
                        "from_point": {"point_id": "R01_S01"},
                        "to_point": {"point_id": "R01_END"},
                        "road_distance_km": 6.0,
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [
                                [88.300, 22.540],
                                [88.300, 22.600],
                            ],
                        },
                    },
                ],
            }
        ]
    }


@pytest.fixture
def canonical_etl_df():
    """Mocks the standardized schema produced by etl_pipeline.py."""
    return pd.DataFrame({
        "bus_id": ["BUS_001", "BUS_002", "BUS_003", "BUS_004", "BUS_005", "BUS_006"],
        "route_id": ["R01", "R01", "R01", "UNKNOWN_ROUTE", "R01", "R01"],
        "trip_id": ["TRIP_1", "TRIP_2", "TRIP_3", "TRIP_4", "TRIP_5", "TRIP_6"],
        "timestamp": [
            "2026-08-03T07:00:00+00:00",
            "2026-08-03T07:05:00+00:00",
            "2026-08-03T07:10:00+00:00",
            "2026-08-03T07:15:00+00:00",
            "2026-08-03T07:20:00+00:00",
            "2026-08-03T07:25:00+00:00",
        ],
        "latitude": [22.520, 22.520, 22.520, 22.520, np.nan, 22.520],
        "longitude": [88.300, 88.302, 88.300, 88.300, 88.300, 88.300],
        "bearing": [0.0, 0.0, 90.0, 0.0, 0.0, 0.0],
        "speed_kmh": [25.0, 25.0, 25.0, 25.0, 25.0, 0.0],
        "accuracy_m": [5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
        "status": ["IN_SERVICE", "IN_SERVICE", "IN_SERVICE", "IN_SERVICE", "IN_SERVICE", "AT_STOP"],
        "next_stop_id": ["R01_S01", "R01_S01", "R01_S01", "R01_S01", "R01_S01", "UNKNOWN_STOP"],
        "next_stop_name": ["Midpoint Stop", "Midpoint Stop", "Midpoint Stop", "Midpoint Stop", "Midpoint Stop", None],
        "next_stop_sequence": [1, 1, 1, 1, 1, np.nan],
        "next_stop_latitude": [22.540, 22.540, 22.540, 22.540, 22.540, np.nan],
        "next_stop_longitude": [88.300, 88.300, 88.300, 88.300, 88.300, np.nan],
        "distance_to_next_stop_km": [2.22, 2.23, 2.22, 2.22, np.nan, np.nan],
        "road_distance_km": [4.0, 4.0, 4.0, 4.0, 4.0, np.nan],
        "route_length_km": [10.0, 10.0, 10.0, 10.0, 10.0, 10.0],
        "has_validation_issue": [False, False, False, False, True, False],
    })


def test_haversine_and_bearing_calculation():
    """Validates basic spherical distance, compass bearing, and angular differences."""
    lat1, lon1 = 22.500, 88.300
    lat2, lon2 = 22.540, 88.300

    dist = calculate_haversine_km(lat1, lon1, lat2, lon2)
    assert 4.40 < dist < 4.50

    bearing = calculate_bearing_deg(lat1, lon1, lat2, lon2)
    assert np.isclose(bearing, 0.0, atol=1e-3)

    # Angular difference tests
    assert calculate_bearing_difference_deg(10.0, 350.0) == 20.0
    assert calculate_bearing_difference_deg(0.0, 180.0) == 180.0
    assert calculate_bearing_difference_deg(45.0, 45.0) == 0.0

    # Invalid coordinates handling
    assert np.isnan(calculate_haversine_km(np.nan, 88.3, 22.5, 88.3))
    assert np.isnan(calculate_haversine_km(95.0, 88.3, 22.5, 88.3))
    assert np.isnan(calculate_bearing_deg(np.nan, 88.3, 22.5, 88.3))
    assert np.isnan(calculate_bearing_difference_deg(np.nan, 90.0))


def test_route_geometry_manager_parsing(sample_route_geometry_dict):
    """Validates RouteGeometryManager structure, indexing, and segments."""
    mgr = RouteGeometryManager(sample_route_geometry_dict)
    route = mgr.get_route("R01")

    assert route is not None
    assert route.route_id == "R01"
    assert route.route_length_km == 10.0
    assert len(route.segments) == 2
    assert "r01_s01" in route.stops
    assert route.stops["r01_s01"].cumulative_distance_km == 4.0


def test_point_to_route_projection(sample_route_geometry_dict):
    """Validates exact polyline snapping and road-distance calibration."""
    mgr = RouteGeometryManager(sample_route_geometry_dict)
    route = mgr.get_route("R01")

    # Point at exact midpoint of segment 1: lat=22.520, lon=88.300
    progress_km, cross_track_m, seg_bearing = project_point_to_route(22.520, 88.300, route)

    assert np.isclose(progress_km, 2.0, atol=0.05)
    assert cross_track_m < 1.0  # Exactly on the polyline
    assert np.isclose(seg_bearing, 0.0, atol=1.0)


def test_enrich_geospatial_features_on_track(canonical_etl_df, sample_route_geometry_dict):
    """Validates feature enrichment for an on-track vehicle."""
    res = enrich_geospatial_features(canonical_etl_df, sample_route_geometry_dict)

    # Row 0: lat=22.520, lon=88.300 (halfway through segment 1, next_stop = R01_S01 at 4.0km)
    row0 = res.iloc[0]
    assert np.isclose(row0["progress_along_route_km"], 2.0, atol=0.05)
    assert np.isclose(row0["route_progress_ratio"], 0.20, atol=0.01)
    assert np.isclose(row0["remaining_route_distance_km"], 8.0, atol=0.05)
    assert np.isclose(row0["road_distance_to_next_stop_km"], 2.0, atol=0.05)
    assert np.isclose(row0["segment_progress_ratio"], 0.50, atol=0.02)
    assert row0["cross_track_distance_m"] < 5.0
    assert np.isclose(row0["bearing_difference_deg"], 0.0, atol=1.0)
    assert row0["missing_geospatial_projection"] == False
    assert row0["is_off_route"] == False
    assert row0["has_geospatial_issue"] == False

    # Verify static ETL columns are preserved intact
    assert row0["road_distance_km"] == 4.0
    assert row0["route_length_km"] == 10.0
    assert row0["distance_to_next_stop_km"] == 2.22


def test_off_route_detection(canonical_etl_df, sample_route_geometry_dict):
    """Validates off-route detection when perpendicular cross-track error exceeds threshold."""
    # Row 1 has lon=88.302 (~200m away from 88.300)
    res = enrich_geospatial_features(
        canonical_etl_df, sample_route_geometry_dict, off_route_threshold_m=75.0
    )
    row1 = res.iloc[1]

    assert row1["cross_track_distance_m"] > 75.0
    assert row1["is_off_route"] == True
    assert row1["has_geospatial_issue"] == True
    assert row1["missing_geospatial_projection"] == False


def test_stationary_bus_and_bearing_diff(canonical_etl_df, sample_route_geometry_dict):
    """Validates bearing difference calculation and handling of stationary vehicles."""
    res = enrich_geospatial_features(canonical_etl_df, sample_route_geometry_dict)

    # Row 2: heading = 90.0, polyline bearing = 0.0 -> diff = 90.0
    assert np.isclose(res.iloc[2]["bearing_difference_deg"], 90.0, atol=1.0)

    # Row 5: speed_kmh = 0.0 (stationary) -> bearing_difference_deg must be NaN
    assert pd.isna(res.iloc[5]["bearing_difference_deg"])


def test_missing_and_invalid_coordinates(canonical_etl_df, sample_route_geometry_dict):
    """Validates strict NaN propagation and quality flagging for invalid GPS coordinates."""
    res = enrich_geospatial_features(canonical_etl_df, sample_route_geometry_dict)

    # Row 4 has latitude = NaN
    row4 = res.iloc[4]
    assert pd.isna(row4["progress_along_route_km"])
    assert pd.isna(row4["route_progress_ratio"])
    assert pd.isna(row4["remaining_route_distance_km"])
    assert pd.isna(row4["road_distance_to_next_stop_km"])
    assert pd.isna(row4["segment_progress_ratio"])
    assert pd.isna(row4["cross_track_distance_m"])
    assert pd.isna(row4["bearing_difference_deg"])

    assert row4["missing_geospatial_projection"] == True
    assert row4["has_geospatial_issue"] == True


def test_unknown_route_handling(canonical_etl_df, sample_route_geometry_dict):
    """Validates that unknown routes produce explicit NaNs without throwing exceptions."""
    res = enrich_geospatial_features(canonical_etl_df, sample_route_geometry_dict)

    # Row 3 has route_id = UNKNOWN_ROUTE
    row3 = res.iloc[3]
    assert pd.isna(row3["progress_along_route_km"])
    assert row3["missing_geospatial_projection"] == True
    assert row3["has_geospatial_issue"] == True


def test_unknown_stop_handling(canonical_etl_df, sample_route_geometry_dict):
    """Validates unassigned or unknown next_stop_id gracefully sets stop-level NaNs."""
    res = enrich_geospatial_features(canonical_etl_df, sample_route_geometry_dict)

    # Row 5 has next_stop_id = UNKNOWN_STOP
    row5 = res.iloc[5]
    # Route-level features still succeed
    assert pd.notna(row5["progress_along_route_km"])
    assert pd.notna(row5["cross_track_distance_m"])
    # Stop-level features return NaN
    assert pd.isna(row5["road_distance_to_next_stop_km"])
    assert pd.isna(row5["segment_progress_ratio"])


def test_real_chain_etl_to_geospatial_integration(tmp_path):
    """
    End-to-end integration test validating the entire real pipeline:
    bus_events.jsonl -> build_etl() -> Parquet -> pd.read_parquet() -> enrich_geospatial_features().
    """
    repo_root = Path(__file__).resolve().parent.parent
    raw_events_path = repo_root / "data" / "raw" / "bus_events.jsonl"
    route_config_path = repo_root / "data" / "processed" / "route_config_resolved.json"
    route_geom_path = repo_root / "data" / "processed" / "route_geometry.json"

    assert raw_events_path.is_file(), f"Missing raw telemetry at {raw_events_path}"
    assert route_config_path.is_file(), f"Missing route config at {route_config_path}"
    assert route_geom_path.is_file(), f"Missing route geometry at {route_geom_path}"

    out_parquet = tmp_path / "integration_etl.parquet"

    # 1. Run actual ETL pipeline writing to Parquet
    build_etl(
        source_file_path=str(raw_events_path),
        output_parquet_path=str(out_parquet),
        route_config_path=str(route_config_path),
        route_geometry_path=str(route_geom_path),
    )
    assert out_parquet.is_file()

    # 2. Read the Parquet into a DataFrame
    etl_df = pd.read_parquet(out_parquet)
    assert len(etl_df) > 0

    # 3. Pass ETL output into enrich_geospatial_features
    enriched_df = enrich_geospatial_features(etl_df, str(route_geom_path))

    # 4. Verify enriched columns
    expected_cols = [
        "bus_id", "route_id", "trip_id", "timestamp", "latitude", "longitude",
        "bearing", "speed_kmh", "accuracy_m", "status", "next_stop_id",
        "campus_id", "route_name", "next_stop_name", "next_stop_sequence",
        "distance_to_next_stop_km", "road_distance_km", "route_length_km",
        "progress_along_route_km", "route_progress_ratio", "remaining_route_distance_km",
        "road_distance_to_next_stop_km", "segment_progress_ratio",
        "cross_track_distance_m", "bearing_difference_deg",
        "missing_geospatial_projection", "is_off_route", "has_geospatial_issue",
    ]
    for col in expected_cols:
        assert col in enriched_df.columns, f"Missing expected column: {col}"

    # 5. Check mathematical bounds on valid rows
    valid_rows = enriched_df[~enriched_df["missing_geospatial_projection"]]
    assert len(valid_rows) > 0

    assert (valid_rows["progress_along_route_km"] >= 0.0).all()
    assert (valid_rows["route_progress_ratio"].between(0.0, 1.0)).all()
    assert (valid_rows["remaining_route_distance_km"] >= 0.0).all()

    valid_stop_dist = valid_rows["road_distance_to_next_stop_km"].dropna()
    assert (valid_stop_dist >= 0.0).all()

    valid_seg_ratio = valid_rows["segment_progress_ratio"].dropna()
    assert (valid_seg_ratio.between(0.0, 1.0)).all()

    valid_bear_diff = valid_rows["bearing_difference_deg"].dropna()
    assert (valid_bear_diff.between(0.0, 180.0)).all()

    # 6. Verify imperfect telemetry rows produced quality flags
    imperfect_rows = enriched_df[enriched_df["has_geospatial_issue"]]
    assert len(imperfect_rows) > 0
