#!/usr/bin/env python3
"""
CampusRide Geospatial Feature Engineering Module.

This module consumes the validated and cleaned DataFrame from `ml/etl_pipeline.py`
and enriches it with high-precision, dynamic geospatial features derived from
precomputed route geometry (`ml/data/processed/route_geometry.json`).

Key Architectural Principles:
1. No Redundant ETL Calculations: Preserves ETL's static fields (`road_distance_km`,
   `route_length_km`, `distance_to_next_stop_km`).
2. Vectorized Polyline Snapping: Computes along-track progress and perpendicular
   cross-track error using pure NumPy / geometry math, eliminating runtime OSMnx
   graph traversal.
3. Road-Distance Calibrated Projection: Calibrates along-track progress to the
   physical road distances stored in `route_geometry.json`, ensuring
   `progress_along_route_km`, `remaining_route_distance_km`, and
   `road_distance_to_next_stop_km` are physically consistent.
4. Explicit Missing Value & Quality Flagging: Returns `np.nan` and sets explicit
   validation flags when coordinates or geometry are missing or invalid, avoiding
   arbitrary heuristic fallbacks (e.g. Haversine x 1.35).
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd


# Default path to precomputed route geometry
DEFAULT_GEOMETRY_PATH = (
    Path(__file__).resolve().parent / "data" / "processed" / "route_geometry.json"
)

# Standard Earth radius in kilometers
EARTH_RADIUS_KM = 6371.0088


def normalize_id(value: Any) -> Optional[str]:
    """Normalize route and stop IDs for deterministic lookups."""
    if pd.isna(value):
        return None
    val_str = str(value).strip()
    if not val_str:
        return None
    return val_str.lower().replace("-", "_")


def is_valid_coordinates(lat: Any, lon: Any) -> bool:
    """Validate latitude and longitude ranges (-90..90, -180..180)."""
    if pd.isna(lat) or pd.isna(lon):
        return False
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return False
    if math.isnan(lat_f) or math.isnan(lon_f):
        return False
    return -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0


def calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two GPS points in kilometers."""
    if not is_valid_coordinates(lat1, lon1) or not is_valid_coordinates(lat2, lon2):
        return np.nan

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    )
    c = 2.0 * math.asin(min(1.0, math.sqrt(a)))
    return EARTH_RADIUS_KM * c


def calculate_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the initial compass bearing from point 1 to point 2 in degrees (0..360)."""
    if not is_valid_coordinates(lat1, lon1) or not is_valid_coordinates(lat2, lon2):
        return np.nan

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lambda = math.radians(lon2 - lon1)

    y = math.sin(d_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lambda)

    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360.0) % 360.0


def calculate_bearing_difference_deg(heading: float, segment_bearing: float) -> float:
    """
    Calculate the minimal absolute angular difference between heading and segment bearing.
    Returns value in range [0.0, 180.0], or np.nan if inputs are invalid.
    """
    if pd.isna(heading) or pd.isna(segment_bearing):
        return np.nan
    try:
        h = float(heading) % 360.0
        sb = float(segment_bearing) % 360.0
    except (TypeError, ValueError):
        return np.nan

    diff = abs((h - sb + 180.0) % 360.0 - 180.0)
    return float(diff)


@dataclass
class SubSegment:
    """A straight-line sub-segment between two consecutive polyline vertices."""
    v0_lat: float
    v0_lon: float
    v1_lat: float
    v1_lon: float
    length_km: float
    bearing_deg: float
    # Start cumulative geometry distance within the parent segment (km)
    geom_start_km: float


@dataclass
class ParsedSegment:
    """Parsed route segment corresponding to an inter-stop / inter-waypoint path."""
    segment_index: int
    from_point_id: str
    to_point_id: str
    road_distance_km: float
    road_start_km: float
    road_end_km: float
    total_geom_length_km: float
    sub_segments: List[SubSegment] = field(default_factory=list)


@dataclass
class StopWaypoint:
    """Metadata for a stop waypoint on the route."""
    stop_id: str
    stop_name: str
    sequence: int
    cumulative_distance_km: float
    latitude: float
    longitude: float


@dataclass
class ParsedRoute:
    """Pre-indexed route geometry for fast point snapping and progress calculation."""
    route_id: str
    route_name: str
    route_length_km: float
    segments: List[ParsedSegment] = field(default_factory=list)
    stops: Dict[str, StopWaypoint] = field(default_factory=dict)
    ordered_stop_ids: List[str] = field(default_factory=list)


class RouteGeometryManager:
    """
    Parses, caches, and indexes precomputed route geometry for fast,
    deterministic polyline projection and distance calibration.
    """

    def __init__(self, geometry_source: Optional[Union[dict, str, Path, "RouteGeometryManager"]] = None):
        if isinstance(geometry_source, RouteGeometryManager):
            self.routes: Dict[str, ParsedRoute] = geometry_source.routes
            return

        self.routes: Dict[str, ParsedRoute] = {}
        geometry_data = self._load_geometry_data(geometry_source)
        self._parse_routes(geometry_data)

    def _load_geometry_data(self, source: Optional[Union[dict, str, Path]]) -> dict:
        if isinstance(source, dict):
            return source

        path = Path(source) if source is not None else DEFAULT_GEOMETRY_PATH
        if not path.is_file():
            # If default path is not found directly, check relative to working directory
            fallback_path = Path("ml/data/processed/route_geometry.json")
            if fallback_path.is_file():
                path = fallback_path
            else:
                raise FileNotFoundError(f"Route geometry file not found at {path}")

        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _parse_routes(self, data: dict) -> None:
        raw_routes = data.get("routes", [])
        if not raw_routes and "route_id" in data:
            raw_routes = [data]

        for r_raw in raw_routes:
            route_id = r_raw.get("route_id")
            if not route_id:
                continue

            norm_route_id = normalize_id(route_id)
            route_name = r_raw.get("route_name", "")
            route_length_km = float(r_raw.get("route_length_km", 0.0))

            # 1. Parse Waypoints
            stops: Dict[str, StopWaypoint] = {}
            ordered_stops: List[StopWaypoint] = []
            for wp in r_raw.get("waypoints", []):
                wp_type = wp.get("waypoint_type")
                point_id = wp.get("point_id")
                if not point_id:
                    continue

                orig_coords = wp.get("original_coordinates", {})
                lat = float(orig_coords.get("latitude", wp.get("latitude", 0.0)))
                lon = float(orig_coords.get("longitude", wp.get("longitude", 0.0)))
                cum_dist = float(wp.get("cumulative_distance_km", 0.0))
                seq = int(wp.get("sequence", 0))

                stop_wp = StopWaypoint(
                    stop_id=point_id,
                    stop_name=wp.get("name", ""),
                    sequence=seq,
                    cumulative_distance_km=cum_dist,
                    latitude=lat,
                    longitude=lon,
                )
                stops[normalize_id(point_id)] = stop_wp
                if wp_type in ("START", "STOP", "END"):
                    ordered_stops.append(stop_wp)

            ordered_stops.sort(key=lambda s: s.sequence)
            ordered_stop_ids = [s.stop_id for s in ordered_stops]

            # 2. Parse Segments and Polyline Coordinates
            segments: List[ParsedSegment] = []
            current_road_cum_km = 0.0

            for seg_raw in r_raw.get("segments", []):
                seg_idx = int(seg_raw.get("segment_index", len(segments) + 1))
                from_pt = seg_raw.get("from_point", {})
                to_pt = seg_raw.get("to_point", {})
                from_id = from_pt.get("point_id", "")
                to_id = to_pt.get("point_id", "")

                seg_road_dist_km = float(seg_raw.get("road_distance_km", 0.0))
                seg_road_start_km = current_road_cum_km
                seg_road_end_km = seg_road_start_km + seg_road_dist_km
                current_road_cum_km = seg_road_end_km

                # Extract GeoJSON LineString coordinates [[lon, lat], ...]
                coords = seg_raw.get("geometry", {}).get("coordinates", [])
                sub_segments: List[SubSegment] = []
                geom_cum_km = 0.0

                for i in range(len(coords) - 1):
                    lon0, lat0 = float(coords[i][0]), float(coords[i][1])
                    lon1, lat1 = float(coords[i + 1][0]), float(coords[i + 1][1])

                    sub_len_km = calculate_haversine_km(lat0, lon0, lat1, lon1)
                    if sub_len_km < 1e-7:
                        # Skip zero-length subsegments
                        continue

                    sub_bearing = calculate_bearing_deg(lat0, lon0, lat1, lon1)
                    sub_segments.append(
                        SubSegment(
                            v0_lat=lat0,
                            v0_lon=lon0,
                            v1_lat=lat1,
                            v1_lon=lon1,
                            length_km=sub_len_km,
                            bearing_deg=sub_bearing,
                            geom_start_km=geom_cum_km,
                        )
                    )
                    geom_cum_km += sub_len_km

                segments.append(
                    ParsedSegment(
                        segment_index=seg_idx,
                        from_point_id=from_id,
                        to_point_id=to_id,
                        road_distance_km=seg_road_dist_km,
                        road_start_km=seg_road_start_km,
                        road_end_km=seg_road_end_km,
                        total_geom_length_km=geom_cum_km,
                        sub_segments=sub_segments,
                    )
                )

            self.routes[norm_route_id] = ParsedRoute(
                route_id=route_id,
                route_name=route_name,
                route_length_km=route_length_km,
                segments=segments,
                stops=stops,
                ordered_stop_ids=ordered_stop_ids,
            )

    def get_route(self, route_id: Any) -> Optional[ParsedRoute]:
        norm_id = normalize_id(route_id)
        if not norm_id:
            return None
        return self.routes.get(norm_id)


def project_point_to_route(
    lat: float,
    lon: float,
    route: ParsedRoute,
) -> Tuple[float, float, float]:
    """
    Projects a GPS point onto the route polyline using local Cartesian approximations.

    Returns:
        progress_along_route_km: Calibrated road distance (km) from route start.
        cross_track_distance_m: Perpendicular deviation from polyline in meters.
        segment_bearing_deg: Compass bearing of the snapped polyline subsegment.
    """
    min_dist_m = float("inf")
    best_progress_km = 0.0
    best_bearing_deg = 0.0

    p_lat, p_lon = float(lat), float(lon)

    for seg in route.segments:
        if not seg.sub_segments:
            continue

        seg_geom_len = seg.total_geom_length_km
        seg_road_dist = seg.road_distance_km
        seg_road_start = seg.road_start_km

        for sub in seg.sub_segments:
            # Planar projection centered at subsegment midpoint
            mid_lat_rad = math.radians((sub.v0_lat + sub.v1_lat) / 2.0)
            kx = 111.3195 * math.cos(mid_lat_rad) * 1000.0  # meters per degree lon
            ky = 111.1329 * 1000.0                          # meters per degree lat

            dx = (sub.v1_lon - sub.v0_lon) * kx
            dy = (sub.v1_lat - sub.v0_lat) * ky
            len_sq = dx * dx + dy * dy

            if len_sq < 1e-6:
                t = 0.0
                dist_m = math.hypot((p_lon - sub.v0_lon) * kx, (p_lat - sub.v0_lat) * ky)
            else:
                px = (p_lon - sub.v0_lon) * kx
                py = (p_lat - sub.v0_lat) * ky
                t = max(0.0, min(1.0, (px * dx + py * dy) / len_sq))
                qx = t * dx
                qy = t * dy
                dist_m = math.hypot(px - qx, py - qy)

            if dist_m < min_dist_m:
                min_dist_m = dist_m
                best_bearing_deg = sub.bearing_deg

                # Calibrate along-track distance to physical road distance model
                sub_geom_dist = sub.geom_start_km + t * sub.length_km
                if seg_geom_len > 1e-7:
                    frac = max(0.0, min(1.0, sub_geom_dist / seg_geom_len))
                else:
                    frac = 0.0

                best_progress_km = seg_road_start + frac * seg_road_dist

    # Bound progress strictly within [0.0, route_length_km]
    best_progress_km = max(0.0, min(route.route_length_km, best_progress_km))
    return best_progress_km, min_dist_m, best_bearing_deg


def enrich_geospatial_features(
    df: pd.DataFrame,
    route_geometry: Optional[Union[dict, str, Path, RouteGeometryManager]] = None,
    off_route_threshold_m: float = 75.0,
) -> pd.DataFrame:
    """
    Enriches the canonical ETL DataFrame with high-precision dynamic geospatial features.

    Parameters:
        df: DataFrame output from `ml/etl_pipeline.py`.
        route_geometry: Precomputed route geometry data, path, or RouteGeometryManager.
        off_route_threshold_m: Perpendicular error threshold (meters) for `is_off_route`.

    Returns:
        DataFrame containing preserved ETL columns plus:
        - `progress_along_route_km`: Cumulative road distance from route start.
        - `route_progress_ratio`: Ratio [0.0, 1.0] of route completion.
        - `remaining_route_distance_km`: Remaining road distance to destination.
        - `road_distance_to_next_stop_km`: Dynamic road distance to next stop.
        - `segment_progress_ratio`: Ratio [0.0, 1.0] of progress in current segment.
        - `cross_track_distance_m`: Perpendicular GPS deviation in meters.
        - `bearing_difference_deg`: Angular heading difference [0.0, 180.0].
        - `missing_geospatial_projection`: Boolean flag for failed projections.
        - `is_off_route`: Boolean flag for cross_track_distance_m > threshold.
        - `has_geospatial_issue`: Aggregate quality flag.
    """
    enriched_df = df.copy()

    # Initialize RouteGeometryManager
    if isinstance(route_geometry, RouteGeometryManager):
        geom_mgr = route_geometry
    else:
        geom_mgr = RouteGeometryManager(route_geometry)

    # Initialize feature output containers
    progress_along_route_list: List[float] = []
    route_progress_ratio_list: List[float] = []
    remaining_route_distance_list: List[float] = []
    road_distance_to_next_stop_list: List[float] = []
    segment_progress_ratio_list: List[float] = []
    cross_track_distance_list: List[float] = []
    bearing_difference_list: List[float] = []

    missing_geospatial_projection_list: List[bool] = []
    is_off_route_list: List[bool] = []
    has_geospatial_issue_list: List[bool] = []

    for _, row in enriched_df.iterrows():
        lat = row.get("latitude")
        lon = row.get("longitude")
        route_id = row.get("route_id")
        next_stop_id = row.get("next_stop_id")
        heading = row.get("bearing")
        speed = row.get("speed_kmh")

        # 1. Coordinate and Route Validation
        valid_coords = is_valid_coordinates(lat, lon)
        route = geom_mgr.get_route(route_id) if pd.notna(route_id) else None

        if not valid_coords or route is None or not route.segments:
            # Missing or invalid projection
            progress_along_route_list.append(np.nan)
            route_progress_ratio_list.append(np.nan)
            remaining_route_distance_list.append(np.nan)
            road_distance_to_next_stop_list.append(np.nan)
            segment_progress_ratio_list.append(np.nan)
            cross_track_distance_list.append(np.nan)
            bearing_difference_list.append(np.nan)

            missing_geospatial_projection_list.append(True)
            is_off_route_list.append(False)
            has_geospatial_issue_list.append(True)
            continue

        # 2. Dynamic Polyline Projection
        progress_km, cross_track_m, seg_bearing = project_point_to_route(
            float(lat), float(lon), route
        )

        progress_along_route_list.append(round(progress_km, 4))
        cross_track_distance_list.append(round(cross_track_m, 2))

        # 3. Route-Level Dynamic Progress
        total_len = route.route_length_km
        if total_len > 0:
            prog_ratio = max(0.0, min(1.0, progress_km / total_len))
            rem_dist = max(0.0, total_len - progress_km)
        else:
            prog_ratio = 1.0
            rem_dist = 0.0

        route_progress_ratio_list.append(round(prog_ratio, 4))
        remaining_route_distance_list.append(round(rem_dist, 4))

        # 4. Stop-Level Dynamic Progress (Target next_stop_id)
        norm_stop_id = normalize_id(next_stop_id)
        target_stop = route.stops.get(norm_stop_id) if norm_stop_id else None

        if target_stop is not None:
            stop_cum_km = target_stop.cumulative_distance_km
            dyn_road_dist_to_stop = max(0.0, stop_cum_km - progress_km)
            road_distance_to_next_stop_list.append(round(dyn_road_dist_to_stop, 4))

            # Determine previous stop cumulative distance
            prev_stop_cum_km = 0.0
            target_seq = target_stop.sequence
            # Search for the waypoint immediately preceding target_seq
            earlier_stops = [
                s for s in route.stops.values() if s.sequence < target_seq
            ]
            if earlier_stops:
                earlier_stops.sort(key=lambda s: s.sequence)
                prev_stop_cum_km = earlier_stops[-1].cumulative_distance_km

            seg_span = stop_cum_km - prev_stop_cum_km
            if seg_span > 1e-6:
                seg_ratio = max(0.0, min(1.0, (progress_km - prev_stop_cum_km) / seg_span))
            else:
                seg_ratio = 1.0 if progress_km >= stop_cum_km else 0.0
            segment_progress_ratio_list.append(round(seg_ratio, 4))
        else:
            road_distance_to_next_stop_list.append(np.nan)
            segment_progress_ratio_list.append(np.nan)

        # 5. Heading vs Polyline Tangent Bearing Difference
        # Stationary bus (speed == 0) or missing bearing produces NaN
        is_stationary = pd.notna(speed) and float(speed) <= 0.0
        if is_stationary or pd.isna(heading):
            bearing_difference_list.append(np.nan)
        else:
            b_diff = calculate_bearing_difference_deg(float(heading), seg_bearing)
            bearing_difference_list.append(round(b_diff, 2))

        # 6. Quality Flags
        is_off = bool(cross_track_m > off_route_threshold_m)
        missing_geospatial_projection_list.append(False)
        is_off_route_list.append(is_off)
        has_geospatial_issue_list.append(is_off)

    # Append new features to DataFrame
    enriched_df["progress_along_route_km"] = progress_along_route_list
    enriched_df["route_progress_ratio"] = route_progress_ratio_list
    enriched_df["remaining_route_distance_km"] = remaining_route_distance_list
    enriched_df["road_distance_to_next_stop_km"] = road_distance_to_next_stop_list
    enriched_df["segment_progress_ratio"] = segment_progress_ratio_list
    enriched_df["cross_track_distance_m"] = cross_track_distance_list
    enriched_df["bearing_difference_deg"] = bearing_difference_list

    enriched_df["missing_geospatial_projection"] = missing_geospatial_projection_list
    enriched_df["is_off_route"] = is_off_route_list
    enriched_df["has_geospatial_issue"] = has_geospatial_issue_list

    return enriched_df


if __name__ == "__main__":
    # Self-test using sample ETL Parquet if available
    parquet_path = Path(__file__).resolve().parent / "data" / "processed" / "clean_bus_events.parquet"
    if parquet_path.is_file():
        print(f"Testing geospatial feature extraction on {parquet_path}...")
        sample_df = pd.read_parquet(parquet_path)
        result_df = enrich_geospatial_features(sample_df)
        print(f"Successfully processed {len(result_df)} records.")
        print(result_df[[
            "bus_id", "route_id", "progress_along_route_km", "route_progress_ratio",
            "road_distance_to_next_stop_km", "cross_track_distance_m", "bearing_difference_deg"
        ]].head(10))
    else:
        print("Precomputed Parquet dataset not found. Run etl_pipeline.py first.")
