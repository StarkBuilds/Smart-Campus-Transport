import json

import pandas as pd

from ml.etl_pipeline import (
    haversine_km,
    validate_schema,
    clean_telemetry,
    add_quality_flags,
    enrich_stop_metadata,
    calculate_distance_to_next_stop,
)


# ============================================================
# TEST HELPERS
# ============================================================

def make_event(**overrides):
    event = {
        "bus_id": "BUS_001",
        "route_id": "R01",
        "trip_id": "TRIP_001",
        "timestamp": "2026-09-18T10:00:00Z",
        "latitude": 22.4970,
        "longitude": 88.3150,
        "bearing": 90.0,
        "speed_kmh": 30.0,
        "accuracy_m": 10.0,
        "status": "IN_SERVICE",
        "next_stop_id": "R01_S01",
    }

    event.update(overrides)
    return event


def make_dataframe(**overrides):
    return pd.DataFrame([make_event(**overrides)])


# ============================================================
# 1. HAVERSINE TESTS
# ============================================================

def test_haversine_same_point_is_zero():

    distance = haversine_km(
        22.4970,
        88.3150,
        22.4970,
        88.3150,
    )

    assert distance == 0


def test_haversine_distance_is_non_negative():

    distance = haversine_km(
        22.4970,
        88.3150,
        22.5000,
        88.3200,
    )

    assert distance >= 0


# ============================================================
# 2. SCHEMA TEST
# ============================================================

def test_validate_schema_adds_missing_fields():

    df = pd.DataFrame([
        {
            "bus_id": "BUS_001",
            "route_id": "R01",
        }
    ])

    df = validate_schema(df)

    for field in [
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
    ]:
        assert field in df.columns


# ============================================================
# 3. CLEANING TEST
# ============================================================

def test_clean_telemetry_converts_numeric_values():

    df = pd.DataFrame([
        make_event(
            latitude="22.4970",
            longitude="88.3150",
            speed_kmh="30",
        )
    ])

    df = validate_schema(df)
    df = clean_telemetry(df)

    assert pd.api.types.is_numeric_dtype(df["latitude"])
    assert pd.api.types.is_numeric_dtype(df["longitude"])
    assert pd.api.types.is_numeric_dtype(df["speed_kmh"])


def test_clean_telemetry_invalid_numeric_value_becomes_nan():

    df = pd.DataFrame([
        make_event(speed_kmh="not_a_number")
    ])

    df = validate_schema(df)
    df = clean_telemetry(df)

    assert pd.isna(df.iloc[0]["speed_kmh"])


# ============================================================
# 4. MISSING FIELD TESTS
# ============================================================

def test_missing_next_stop_is_flagged():

    df = make_dataframe(next_stop_id=None)

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["missing_next_stop_id"]) is True


def test_missing_bus_id_is_flagged():

    df = make_dataframe(bus_id=None)

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["missing_bus_id"]) is True


# ============================================================
# 5. COORDINATE VALIDATION
# ============================================================

def test_invalid_latitude_is_flagged():

    df = make_dataframe(latitude=200.0)

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["invalid_latitude"]) is True


def test_invalid_longitude_is_flagged():

    df = make_dataframe(longitude=300.0)

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["invalid_longitude"]) is True


def test_valid_coordinates_are_not_flagged():

    df = make_dataframe(
        latitude=22.4970,
        longitude=88.3150,
    )

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["invalid_latitude"]) is False
    assert bool(df.iloc[0]["invalid_longitude"]) is False


# ============================================================
# 6. SPEED VALIDATION
# ============================================================

def test_negative_speed_is_flagged():

    df = make_dataframe(speed_kmh=-10)

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["invalid_speed"]) is True


def test_excessive_speed_is_flagged():

    df = make_dataframe(speed_kmh=200)

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["invalid_speed"]) is True


def test_normal_speed_is_not_flagged():

    df = make_dataframe(speed_kmh=40)

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["invalid_speed"]) is False


# ============================================================
# 7. STATUS VALIDATION
# ============================================================

def test_invalid_status_is_flagged():

    df = make_dataframe(status="FLYING")

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["invalid_status"]) is True


def test_valid_status_is_not_flagged():

    df = make_dataframe(status="IN_SERVICE")

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["invalid_status"]) is False


# ============================================================
# 8. DUPLICATE TEST
# ============================================================

def test_duplicate_events_are_detected():

    event = make_event()

    df = pd.DataFrame([
        event,
        event.copy(),
    ])

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert df["duplicate_event"].all()


# ============================================================
# 9. FUTURE TIMESTAMP TEST
# ============================================================

def test_future_timestamp_is_flagged():

    df = make_dataframe(
        timestamp="2099-01-01T10:00:00Z"
    )

    df = validate_schema(df)
    df = clean_telemetry(df)
    df = add_quality_flags(df)

    assert bool(df.iloc[0]["future_timestamp"]) is True


# ============================================================
# 10. STATIC ROUTE ENRICHMENT TEST
# ============================================================

def test_known_route_and_stop_are_enriched():

    df = make_dataframe(
        route_id="R01",
        next_stop_id="R01_S01",
    )

    stop_lookup = {
        ("r01", "r01_s01"): {
            "campus_id": "CAMPUS_01",
            "route_id": "R01",
            "next_stop_id": "R01_S01",
            "next_stop_name": "Test Stop",
            "next_stop_sequence": 1,
            "next_stop_latitude": 22.5000,
            "next_stop_longitude": 88.3200,
        }
    }

    route_lookup = {
        "r01": {
            "campus_id": "CAMPUS_01",
            "route_id": "R01",
            "route_name": "Test Route",
        }
    }

    df = enrich_stop_metadata(
        df,
        stop_lookup,
        route_lookup,
    )

    assert df.iloc[0]["next_stop_name"] == "Test Stop"
    assert df.iloc[0]["next_stop_sequence"] == 1
    assert df.iloc[0]["next_stop_latitude"] == 22.5000
    assert df.iloc[0]["next_stop_longitude"] == 88.3200

    assert bool(df.iloc[0]["unknown_route"]) is False
    assert bool(df.iloc[0]["unknown_stop"]) is False


# ============================================================
# 11. UNKNOWN ROUTE TEST
# ============================================================

def test_unknown_route_is_handled():

    df = make_dataframe(
        route_id="UNKNOWN_ROUTE",
        next_stop_id="R01_S01",
    )

    df = enrich_stop_metadata(
        df,
        {},
        {},
    )

    assert bool(df.iloc[0]["unknown_route"]) is True


# ============================================================
# 12. UNKNOWN STOP TEST
# ============================================================

def test_unknown_stop_is_handled():

    df = make_dataframe(
        route_id="R01",
        next_stop_id="UNKNOWN_STOP",
    )

    route_lookup = {
        "r01": {
            "campus_id": "CAMPUS_01",
            "route_id": "R01",
            "route_name": "Test Route",
        }
    }

    df = enrich_stop_metadata(
        df,
        {},
        route_lookup,
    )

    assert bool(df.iloc[0]["unknown_stop"]) is True


# ============================================================
# 13. MISSING STOP MUST NOT CRASH
# ============================================================

def test_missing_next_stop_does_not_crash():

    df = make_dataframe(
        next_stop_id=None,
    )

    df = enrich_stop_metadata(
        df,
        {},
        {},
    )

    assert len(df) == 1
    assert pd.isna(df.iloc[0]["next_stop_name"])


# ============================================================
# 14. DISTANCE CALCULATION TEST
# ============================================================

def test_distance_to_next_stop_is_calculated():

    df = make_dataframe()

    df["next_stop_latitude"] = 22.5000
    df["next_stop_longitude"] = 88.3200

    df = calculate_distance_to_next_stop(df)

    distance = df.iloc[0]["distance_to_next_stop_km"]

    assert pd.notna(distance)
    assert distance >= 0


# ============================================================
# 15. INVALID GPS SHOULD NOT PRODUCE DISTANCE
# ============================================================

def test_invalid_bus_coordinates_produce_no_distance():

    df = make_dataframe(
        latitude=200.0,
        longitude=300.0,
    )

    df["next_stop_latitude"] = 22.5000
    df["next_stop_longitude"] = 88.3200

    df = calculate_distance_to_next_stop(df)

    assert pd.isna(
        df.iloc[0]["distance_to_next_stop_km"]
    )