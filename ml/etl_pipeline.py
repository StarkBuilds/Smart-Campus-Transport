#!/usr/bin/env python3

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

STALE_GPS_MINUTES = 5.0
MAX_SPEED_KMH = 126.0

CANONICAL_FIELDS = [
    "bus_id",
    "route_id",
    "trip_id",
    "timestamp",
    "latitude",
    "longitude",
    "bearing",
    "speed_kmh",
    "accuracy_m",
    "status",
    "next_stop_id",
]

VALID_STATUSES = {
    "IN_SERVICE",
    "OUT_OF_SERVICE",
    "AT_STOP",
    "DELAYED",
}


# ============================================================
# ID NORMALIZATION
# ============================================================

def normalize_id(value):
    """
    Normalize an ID for lookup purposes.

    The original value in the telemetry is preserved.
    """

    if pd.isna(value):
        return None

    value = str(value).strip()

    if not value:
        return None

    return value.lower().replace("-", "_")


# ============================================================
# LOAD ROUTE CONFIGURATION
# ============================================================

def load_route_config(route_config_path):
    """
    Load static route and stop information.

    Returns:

        stop_lookup:
            (route_id, stop_id) -> stop metadata

        route_lookup:
            route_id -> route metadata
    """

    with open(route_config_path, "r", encoding="utf-8") as file:
        config = json.load(file)

    campus_id = config.get("campus_id")

    stop_lookup = {}
    route_lookup = {}

    for route in config.get("routes", []):

        route_id = route.get("route_id")

        if not route_id:
            continue

        route_key = normalize_id(route_id)

        route_lookup[route_key] = {
            "campus_id": campus_id,
            "route_id": route_id,
            "route_name": route.get("name"),
        }

        for stop in route.get("stops", []):

            stop_id = stop.get("stop_id")

            if not stop_id:
                continue

            stop_key = normalize_id(stop_id)

            stop_lookup[(route_key, stop_key)] = {
                "campus_id": campus_id,
                "route_id": route_id,
                "next_stop_id": stop_id,
                "next_stop_name": stop.get("name"),
                "next_stop_sequence": stop.get("sequence"),
                "next_stop_latitude": stop.get("latitude"),
                "next_stop_longitude": stop.get("longitude"),
            }

    return stop_lookup, route_lookup


# ============================================================
# LOAD ROUTE GEOMETRY
# ============================================================

def load_route_geometry(route_geometry_path):
    """
    Load precomputed route geometry.

    The geometry was already generated using OSMnx/
    NetworkX by build_route_geometry.py.

    ETL does not run OSMnx again.
    """

    with open(route_geometry_path, "r", encoding="utf-8") as file:
        geometry_data = json.load(file)

    route_lookup = {}

    # Normal route_geometry.json structure:
    # {
    #     "routes": [...]
    # }
    if isinstance(geometry_data, dict):
        routes = geometry_data.get("routes", [])

        # Also support a single route object.
        if not routes and geometry_data.get("route_id"):
            routes = [geometry_data]

    elif isinstance(geometry_data, list):
        routes = geometry_data

    else:
        routes = []

    for route in routes:

        route_id = route.get("route_id")

        if not route_id:
            continue

        route_lookup[normalize_id(route_id)] = route

    return route_lookup


# ============================================================
# BUILD ROAD DISTANCE LOOKUP
# ============================================================

def build_road_distance_lookup(route_geometry):
    """
    Build a lookup:

        (route_id, destination_stop_id)
            -> road_distance_km

    This uses the already calculated route geometry.

    It does NOT calculate a new route.
    """

    lookup = {}

    for route_key, route in route_geometry.items():

        for segment in route.get("segments", []):

            to_point = segment.get("to_point") or {}

            stop_id = (
                to_point.get("point_id")
                or to_point.get("stop_id")
            )

            if not stop_id:
                continue

            distance = segment.get("road_distance_km")

            if distance is None:
                continue

            lookup[
                (
                    route_key,
                    normalize_id(stop_id)
                )
            ] = float(distance)

    return lookup


# ============================================================
# HAVERSINE DISTANCE
# ============================================================

def haversine_km(
    latitude_1,
    longitude_1,
    latitude_2,
    longitude_2,
):
    """
    Calculate straight-line geographic distance.

    This is NOT road distance.
    """

    earth_radius_km = 6371.0

    lat1 = math.radians(latitude_1)
    lon1 = math.radians(longitude_1)

    lat2 = math.radians(latitude_2)
    lon2 = math.radians(longitude_2)

    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.asin(math.sqrt(a))

    return earth_radius_km * c


# ============================================================
# EXTRACT
# ============================================================

def extract_data(source_file_path):
    """
    Read raw NDJSON telemetry.
    """

    return pd.read_json(
        source_file_path,
        lines=True
    )


# ============================================================
# SCHEMA VALIDATION
# ============================================================

def validate_schema(df):
    """
    Make sure every canonical field exists.

    Missing fields are added as empty values instead of
    crashing the entire ETL.
    """

    for field in CANONICAL_FIELDS:

        if field not in df.columns:
            df[field] = pd.NA

    return df


# ============================================================
# CLEAN TELEMETRY
# ============================================================

def clean_telemetry(df):
    """
    Clean identifiers, numeric fields and timestamps.
    """

    # --------------------------------------------------------
    # String fields
    # --------------------------------------------------------

    string_fields = [
        "bus_id",
        "route_id",
        "trip_id",
        "next_stop_id",
        "status",
    ]

    for field in string_fields:

        df[field] = (
            df[field]
            .astype("string")
            .str.strip()
        )

    # --------------------------------------------------------
    # Numeric fields
    # --------------------------------------------------------

    numeric_fields = [
        "latitude",
        "longitude",
        "bearing",
        "speed_kmh",
        "accuracy_m",
    ]

    for field in numeric_fields:

        df[field] = pd.to_numeric(
            df[field],
            errors="coerce"
        )

    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce",
        utc=True
    )

    return df


# ============================================================
# DATA QUALITY FLAGS
# ============================================================

def add_quality_flags(df):
    """
    Detect data-quality problems without silently deleting
    the problematic records.
    """

    # --------------------------------------------------------
    # Missing identifiers
    # --------------------------------------------------------

    df["missing_bus_id"] = (
        df["bus_id"].isna()
        | df["bus_id"].eq("")
    )

    df["missing_route_id"] = (
        df["route_id"].isna()
        | df["route_id"].eq("")
    )

    df["missing_trip_id"] = (
        df["trip_id"].isna()
        | df["trip_id"].eq("")
    )

    df["missing_next_stop_id"] = (
        df["next_stop_id"].isna()
        | df["next_stop_id"].eq("")
    )

    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    df["invalid_timestamp"] = (
        df["timestamp"].isna()
    )

    # --------------------------------------------------------
    # Missing coordinates
    # --------------------------------------------------------

    df["missing_latitude"] = (
        df["latitude"].isna()
    )

    df["missing_longitude"] = (
        df["longitude"].isna()
    )

    # --------------------------------------------------------
    # Invalid coordinates
    # --------------------------------------------------------

    df["invalid_latitude"] = (
        df["latitude"].notna()
        & (
            (df["latitude"] < -90)
            | (df["latitude"] > 90)
        )
    )

    df["invalid_longitude"] = (
        df["longitude"].notna()
        & (
            (df["longitude"] < -180)
            | (df["longitude"] > 180)
        )
    )

    # --------------------------------------------------------
    # Invalid speed
    # --------------------------------------------------------

    df["invalid_speed"] = (
        df["speed_kmh"].notna()
        & (
            (df["speed_kmh"] < 0)
            | (df["speed_kmh"] > MAX_SPEED_KMH)
        )
    )

    # --------------------------------------------------------
    # Invalid status
    # --------------------------------------------------------

    df["invalid_status"] = (
        df["status"].notna()
        & ~df["status"].isin(VALID_STATUSES)
    )

    # --------------------------------------------------------
    # Duplicate telemetry
    # --------------------------------------------------------

    duplicate_columns = [
        "bus_id",
        "route_id",
        "trip_id",
        "timestamp",
        "latitude",
        "longitude",
    ]

    df["duplicate_event"] = (
        df.duplicated(
            subset=duplicate_columns,
            keep=False
        )
    )

    # --------------------------------------------------------
    # Stale GPS
    # --------------------------------------------------------

    current_time = pd.Timestamp.now(tz="UTC")

    gps_age_minutes = (
        current_time - df["timestamp"]
    ).dt.total_seconds() / 60

    df["is_stale_gps"] = (
        gps_age_minutes > STALE_GPS_MINUTES
    ).fillna(False)

    # --------------------------------------------------------
    # Future timestamp
    # --------------------------------------------------------

    df["future_timestamp"] = (
        df["timestamp"] > current_time
    ).fillna(False)

    return df


# ============================================================
# STATIC STOP / ROUTE ENRICHMENT
# ============================================================

def enrich_stop_metadata(
    df,
    stop_lookup,
    route_lookup,
):
    """
    Join static geographic information using:

        route_id + next_stop_id

    Original live telemetry coordinates remain unchanged.
    """

    next_stop_names = []
    next_stop_sequences = []
    next_stop_latitudes = []
    next_stop_longitudes = []

    campus_ids = []
    route_names = []

    unknown_routes = []
    unknown_stops = []

    for _, row in df.iterrows():

        route_key = normalize_id(
            row["route_id"]
        )

        stop_key = normalize_id(
            row["next_stop_id"]
        )

        route_info = route_lookup.get(
            route_key
        )

        stop_info = None

        if route_key and stop_key:

            stop_info = stop_lookup.get(
                (route_key, stop_key)
            )

        # Route information
        if route_info:

            campus_ids.append(
                route_info.get("campus_id")
            )

            route_names.append(
                route_info.get("route_name")
            )

            unknown_routes.append(False)

        else:

            campus_ids.append(None)
            route_names.append(None)
            unknown_routes.append(True)

        # Stop information
        if stop_info:

            next_stop_names.append(
                stop_info.get("next_stop_name")
            )

            next_stop_sequences.append(
                stop_info.get("next_stop_sequence")
            )

            next_stop_latitudes.append(
                stop_info.get("next_stop_latitude")
            )

            next_stop_longitudes.append(
                stop_info.get("next_stop_longitude")
            )

            unknown_stops.append(False)

        else:

            next_stop_names.append(None)
            next_stop_sequences.append(None)
            next_stop_latitudes.append(None)
            next_stop_longitudes.append(None)

            unknown_stops.append(
                route_info is not None
                and stop_key is not None
            )

    df["campus_id"] = campus_ids
    df["route_name"] = route_names

    df["next_stop_name"] = next_stop_names
    df["next_stop_sequence"] = next_stop_sequences
    df["next_stop_latitude"] = next_stop_latitudes
    df["next_stop_longitude"] = next_stop_longitudes

    df["unknown_route"] = unknown_routes
    df["unknown_stop"] = unknown_stops

    return df


# ============================================================
# DISTANCE TO NEXT STOP
# ============================================================

def calculate_distance_to_next_stop(df):
    """
    Calculate straight-line distance between:

        live bus GPS
                and
        static next-stop GPS

    Uses Haversine formula.
    """

    distances = []

    for _, row in df.iterrows():

        bus_lat = row["latitude"]
        bus_lon = row["longitude"]

        stop_lat = row["next_stop_latitude"]
        stop_lon = row["next_stop_longitude"]

        valid_bus_coordinates = (
            pd.notna(bus_lat)
            and pd.notna(bus_lon)
            and -90 <= bus_lat <= 90
            and -180 <= bus_lon <= 180
        )

        valid_stop_coordinates = (
            pd.notna(stop_lat)
            and pd.notna(stop_lon)
            and -90 <= stop_lat <= 90
            and -180 <= stop_lon <= 180
        )

        if (
            valid_bus_coordinates
            and valid_stop_coordinates
        ):

            distances.append(
                haversine_km(
                    bus_lat,
                    bus_lon,
                    stop_lat,
                    stop_lon,
                )
            )

        else:

            distances.append(None)

    df["distance_to_next_stop_km"] = distances

    return df


# ============================================================
# ROUTE GEOMETRY FEATURES
# ============================================================

def add_route_geometry_features(
    df,
    route_geometry,
    road_distance_lookup,
):
    """
    Add information already calculated by
    build_route_geometry.py.

    No routing calculation happens here.
    """

    route_lengths = []
    road_distances = []

    for _, row in df.iterrows():

        route_key = normalize_id(
            row["route_id"]
        )

        stop_key = normalize_id(
            row["next_stop_id"]
        )

        route = route_geometry.get(
            route_key
        )

        if route is None:

            route_lengths.append(None)
            road_distances.append(None)

        else:

            route_lengths.append(
                route.get("route_length_km")
            )

            if stop_key:

                road_distances.append(
                    road_distance_lookup.get(
                        (route_key, stop_key)
                    )
                )

            else:

                road_distances.append(None)

    df["route_length_km"] = route_lengths
    df["road_distance_km"] = road_distances

    return df


# ============================================================
# GEOGRAPHIC VALIDATION
# ============================================================

def add_geographic_validation(df):
    """
    Add flags for missing static geographic information.
    """

    df["missing_stop_geography"] = (
        df["next_stop_id"].notna()
        & df["next_stop_latitude"].isna()
    )

    df["missing_route_geometry"] = (
        df["route_id"].notna()
        & df["route_length_km"].isna()
    )

    validation_columns = [
        "missing_bus_id",
        "missing_route_id",
        "missing_trip_id",
        "invalid_timestamp",
        "invalid_latitude",
        "invalid_longitude",
        "invalid_speed",
        "invalid_status",
        "duplicate_event",
        "future_timestamp",
        "unknown_route",
        "unknown_stop",
        "missing_stop_geography",
        "missing_route_geometry",
    ]

    df["has_validation_issue"] = (
        df[validation_columns]
        .fillna(False)
        .any(axis=1)
    )

    return df


# ============================================================
# OUTPUT COLUMN ORDER
# ============================================================

def prepare_output(df):
    """
    Keep the canonical telemetry fields first,
    followed by geographic information and validation flags.
    """

    canonical = [
        field
        for field in CANONICAL_FIELDS
        if field in df.columns
    ]

    static_geographic = [
        "campus_id",
        "route_name",
        "next_stop_name",
        "next_stop_sequence",
        "next_stop_latitude",
        "next_stop_longitude",
    ]

    derived_geographic = [
        "distance_to_next_stop_km",
        "road_distance_km",
        "route_length_km",
    ]

    quality_columns = [
        "missing_bus_id",
        "missing_route_id",
        "missing_trip_id",
        "missing_next_stop_id",
        "invalid_timestamp",
        "missing_latitude",
        "missing_longitude",
        "invalid_latitude",
        "invalid_longitude",
        "invalid_speed",
        "invalid_status",
        "duplicate_event",
        "is_stale_gps",
        "future_timestamp",
        "unknown_route",
        "unknown_stop",
        "missing_stop_geography",
        "missing_route_geometry",
        "has_validation_issue",
    ]

    ordered_columns = (
        canonical
        + [
            column
            for column in static_geographic
            if column in df.columns
        ]
        + [
            column
            for column in derived_geographic
            if column in df.columns
        ]
        + [
            column
            for column in quality_columns
            if column in df.columns
        ]
    )

    # Preserve any other input columns.
    remaining_columns = [
        column
        for column in df.columns
        if column not in ordered_columns
    ]

    return df[
        ordered_columns + remaining_columns
    ]


# ============================================================
# MASTER ETL PIPELINE
# ============================================================

def build_etl(
    source_file_path,
    output_parquet_path,
    route_config_path,
    route_geometry_path,
):
    """
    Master Extract -> Transform -> Load pipeline.
    """

    print("Starting Smart Campus Transport ETL...")

    # --------------------------------------------------------
    # 1. EXTRACT
    # --------------------------------------------------------

    print("1/8 Extracting raw telemetry...")

    df = extract_data(
        source_file_path
    )

    print(
        f"   Raw records: {len(df)}"
    )

    # --------------------------------------------------------
    # 2. SCHEMA VALIDATION
    # --------------------------------------------------------

    print("2/8 Validating canonical schema...")

    df = validate_schema(df)

    # --------------------------------------------------------
    # 3. CLEAN TELEMETRY
    # --------------------------------------------------------

    print("3/8 Cleaning telemetry...")

    df = clean_telemetry(df)

    # --------------------------------------------------------
    # 4. DATA QUALITY
    # --------------------------------------------------------

    print("4/8 Running data-quality checks...")

    df = add_quality_flags(df)

    # --------------------------------------------------------
    # 5. LOAD STATIC GEOGRAPHIC DATA
    # --------------------------------------------------------

    print(
        "5/8 Loading route configuration "
        "and route geometry..."
    )

    stop_lookup, route_lookup = load_route_config(
        route_config_path
    )

    route_geometry = load_route_geometry(
        route_geometry_path
    )

    road_distance_lookup = (
        build_road_distance_lookup(
            route_geometry
        )
    )

    # --------------------------------------------------------
    # 6. GEOGRAPHIC ENRICHMENT
    # --------------------------------------------------------

    print("6/8 Enriching geographic information...")

    df = enrich_stop_metadata(
        df,
        stop_lookup,
        route_lookup,
    )

    df = calculate_distance_to_next_stop(df)

    df = add_route_geometry_features(
        df,
        route_geometry,
        road_distance_lookup,
    )

    df = add_geographic_validation(df)

    # --------------------------------------------------------
    # 7. PREPARE OUTPUT
    # --------------------------------------------------------

    print("7/8 Preparing processed dataset...")

    df = prepare_output(df)

    # --------------------------------------------------------
    # 8. LOAD
    # --------------------------------------------------------

    print("8/8 Writing Parquet output...")

    output_path = Path(
        output_parquet_path
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    df.to_parquet(
        output_path,
        index=False
    )

    print(
        f"ETL Handoff Complete. "
        f"Processed records: {len(df)}"
    )

    print(
        f"Output written to: {output_path}"
    )

    return df


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    build_etl(
        source_file_path=(
            "ml/data/raw/bus_events.jsonl"
        ),

        output_parquet_path=(
            "ml/data/processed/"
            "clean_bus_events.parquet"
        ),

        route_config_path=(
            "ml/data/processed/"
            "route_config_resolved.json"
        ),

        route_geometry_path=(
            "ml/data/processed/"
            "route_geometry.json"
        ),
    )