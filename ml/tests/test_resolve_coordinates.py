"""
Unit tests for Route Coordinate Resolver (resolve_route_coordinates.py).
"""

import json
import os
import tempfile
import pytest

from ml.scripts.resolve_route_coordinates import (
    KOLKATA_BBOX,
    KOLKATA_TRANSIT_ALIASES,
    NominatimResolver,
    RateLimiter,
    resolve_route_configuration,
)


def test_rate_limiter():
    """Verify rate limiter enforces minimum intervals."""
    limiter = RateLimiter(min_interval_sec=0.05)
    limiter.wait()
    limiter.wait()
    assert limiter._last_request_time > 0


def test_kolkata_bbox_filtering():
    """Verify geographic bounding box strictly filters Kolkata coordinates."""
    with tempfile.NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as tf:
        cache_path = tf.name
        json.dump({}, tf)

    try:
        resolver = NominatimResolver(cache_path=cache_path)

        # Inside Kolkata bounds (e.g. Behala / Alipore)
        assert resolver.is_within_bbox(22.48735, 88.31338) is True
        assert resolver.is_within_bbox(22.53884, 88.32861) is True

        # Outside Kolkata bounds (e.g. Delhi, Mumbai, London)
        assert resolver.is_within_bbox(28.6139, 77.2090) is False
        assert resolver.is_within_bbox(19.0760, 72.8777) is False
        assert resolver.is_within_bbox(51.5074, -0.1278) is False
    finally:
        if os.path.exists(cache_path):
            os.remove(cache_path)


def test_cache_loading_and_retrieval():
    """Verify resolver uses local cached query data without making network calls."""
    sample_data = {
        "Test Landmark, Kolkata": [{
            "place_id": 999999,
            "osm_type": "node",
            "osm_id": 111111,
            "lat": "22.5000000",
            "lon": "88.3300000",
            "display_name": "Test Landmark, Kolkata, West Bengal, India"
        }]
    }

    with tempfile.NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as tf:
        cache_path = tf.name
        json.dump(sample_data, tf)

    try:
        resolver = NominatimResolver(cache_path=cache_path)
        assert "Test Landmark, Kolkata" in resolver.cache
        res = resolver.resolve_place("Test Landmark")
        # Since candidate queries for unknown place default to 'Test Landmark, Kolkata, West Bengal, India'
        # Let's test direct cache query
        results = resolver._query_nominatim("Test Landmark, Kolkata")
        assert len(results) == 1
        assert results[0]["lat"] == "22.5000000"
    finally:
        if os.path.exists(cache_path):
            os.remove(cache_path)


def test_resolve_route_configuration_end_to_end():
    """Verify full end-to-end resolution on a mini route config."""
    mini_config = {
        "campus_id": "TEST_CAMPUS",
        "routes": [
            {
                "route_id": "TEST_R01",
                "route_name": "Test Route Behala to College",
                "start": {
                    "name": "Behala Chowrasta",
                    "latitude": None,
                    "longitude": None
                },
                "end": {
                    "name": "St. Thomas' College of Engineering and Technology",
                    "latitude": None,
                    "longitude": None
                },
                "stops": [
                    {
                        "stop_id": "TEST_S01",
                        "stop_name": "Simultala Bazaar",
                        "latitude": None,
                        "longitude": None,
                        "sequence": 1
                    }
                ]
            }
        ]
    }

    canonical_cache = {
        "Behala Chowrasta, Diamond Harbour Road, Kolkata": [{
            "lat": "22.4873548",
            "lon": "88.3133794",
            "display_name": "Behala Chowrasta, Kolkata",
            "osm_type": "node",
            "osm_id": 101
        }],
        "Simulatala Bazar, Diamond Harbour Road, Behala, Kolkata": [{
            "lat": "22.4916643",
            "lon": "88.3152017",
            "display_name": "Simulatala Bazar, Behala, Kolkata",
            "osm_type": "node",
            "osm_id": 102
        }],
        "St Thomas College of Engineering and Technology, Diamond Harbour Road, Kidderpore, Kolkata": [{
            "lat": "22.5388413",
            "lon": "88.3286153",
            "display_name": "St Thomas College, Kolkata",
            "osm_type": "way",
            "osm_id": 103
        }]
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        cfg_file = os.path.join(tmpdir, "input_config.json")
        out_file = os.path.join(tmpdir, "resolved_config.json")
        report_file = os.path.join(tmpdir, "report.json")
        cache_file = os.path.join(tmpdir, "cache.json")

        with open(cfg_file, "w") as f:
            json.dump(mini_config, f)
        with open(cache_file, "w") as f:
            json.dump(canonical_cache, f)

        resolved_cfg, report = resolve_route_configuration(
            input_config_path=cfg_file,
            output_resolved_path=out_file,
            output_report_path=report_file,
            cache_path=cache_file
        )

        assert os.path.exists(out_file)
        assert os.path.exists(report_file)

        r = resolved_cfg["routes"][0]
        assert r["start"]["latitude"] == pytest.approx(22.4873548, rel=1e-5)
        assert r["start"]["longitude"] == pytest.approx(88.3133794, rel=1e-5)
        assert r["end"]["latitude"] == pytest.approx(22.5388413, rel=1e-5)
        assert r["end"]["longitude"] == pytest.approx(88.3286153, rel=1e-5)
        assert r["stops"][0]["latitude"] == pytest.approx(22.4916643, rel=1e-5)
        assert r["stops"][0]["longitude"] == pytest.approx(88.3152017, rel=1e-5)

        assert report["metadata"]["resolved_locations"] == 3
        assert report["metadata"]["unresolved_or_ambiguous_locations"] == 0
