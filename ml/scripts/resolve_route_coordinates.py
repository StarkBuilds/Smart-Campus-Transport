#!/usr/bin/env python3
"""
Route Coordinate Resolver for Campus Transit.

This utility reads `route_config.json`, resolves every route start, end,
and stop coordinate via OpenStreetMap Nominatim with strict rate limiting (1 req/s),
proper User-Agent headers, geographic bounding box restrictions (Kolkata),
persistent local caching, and ambiguity reporting.

Outputs:
  - ml/data/processed/route_config_resolved.json
  - ml/data/processed/geocoding_report.json
"""

import argparse
import copy
import json
import logging
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger("coordinate_resolver")

# Kolkata Metropolitan Geographic Bounding Box
KOLKATA_BBOX = {
    "min_lat": 22.35,
    "max_lat": 22.70,
    "min_lon": 88.20,
    "max_lon": 88.50,
}

DEFAULT_USER_AGENT = "SmartCampusTransport-CoordinateResolver/1.0 (transit-routing@semicolons.edu; Nominatim-Client)"
DEFAULT_MIN_INTERVAL_SEC = 1.15

# Standardized Kolkata Transit Landmark Query Aliases
# Refines common vernacular and local abbreviations into canonical OSM searchable entities
KOLKATA_TRANSIT_ALIASES: Dict[str, List[str]] = {
    "Behala Chowrasta": [
        "Behala Chowrasta, Diamond Harbour Road, Kolkata",
        "Behala Chowrasta, Kolkata"
    ],
    "Vivekananda College": [
        "Vivekananda College, Diamond Harbour Road, Thakurpukur, Kolkata",
        "Vivekananda College, Thakurpukur, Kolkata"
    ],
    "Simultala Bazaar": [
        "Simulatala Bazar, Diamond Harbour Road, Behala, Kolkata",
        "Simulatala Bazar, Kolkata",
        "Simultala, Diamond Harbour Road, Behala, Kolkata"
    ],
    "Manton Super Market": [
        "Manton, Diamond Harbour Road, Behala, Kolkata",
        "Manton Super Market, Diamond Harbour Road, Behala, Kolkata"
    ],
    "Behala Tram Depot": [
        "Behala Tram Depot, Diamond Harbour Road, Behala, Kolkata",
        "Behala Tram Depot, Kolkata"
    ],
    "Behala 14 No. Bus Stand": [
        "14 No Bus Stop, Diamond Harbour Road, Behala, Kolkata",
        "14 No. Bus Stand, Behala, Kolkata"
    ],
    "Behala Thana": [
        "Behala Thana, Diamond Harbour Road, Behala, Kolkata",
        "Behala Police Station, Diamond Harbour Road, Kolkata"
    ],
    "Pathak Para": [
        "Pathakpara Road, Behala, Kolkata",
        "Pathak Para, Diamond Harbour Road, Kolkata"
    ],
    "Taratala": [
        "Taratala, Diamond Harbour Road, Kolkata",
        "Taratala Crossing, Kolkata"
    ],
    "Mint": [
        "India Government Mint, Mominpur, Kolkata",
        "India Government Mint, Alipore, Kolkata"
    ],
    "Burdwan Road": [
        "Burdwan Road, Alipore, Kolkata",
        "Burdwan Road, Kolkata"
    ],
    "Remount Road": [
        "Remount Road, Alipore, Kolkata",
        "Remount Road, Kolkata"
    ],
    "Mominpore": [
        "Mominpore, Judges Court Road, Alipore, Kolkata",
        "Mominpore, Kolkata"
    ],
    "Mayurbhanj": [
        "Mayurbhanj Road, Alipore, Kolkata",
        "Mayurbhanj, Kolkata"
    ],
    "Ekbalpore Crossing": [
        "Ekbalpore, Diamond Harbour Road, Alipore, Kolkata",
        "Ekbalpore Crossing, Kolkata"
    ],
    "Alipore Bodyguard Line": [
        "Alipore Road, Alipore, Kolkata",
        "Alipore Bodyguard Lines, Kolkata"
    ],
    "St. Thomas' College of Engineering and Technology": [
        "St Thomas College of Engineering and Technology, Diamond Harbour Road, Kidderpore, Kolkata",
        "St. Thomas College of Engineering and Technology, Kolkata",
        "4 Diamond Harbour Road, Kidderpore, Kolkata"
    ],
    "Hazra Crossing": [
        "Hazra, Kolkata",
        "Hazra Crossing, Kolkata"
    ],
    "Kalighat": [
        "Kalighat, Kolkata",
        "Kalighat Metro Station, Kolkata"
    ],
    "Gopal Nagar": [
        "Gopalnagar Road, Alipore, Kolkata",
        "Gopal Nagar, Alipore, Kolkata"
    ],
    "Hastings Park Road": [
        "Hastings Park Road, Alipore, Kolkata",
        "Hastings Park Road, Kolkata"
    ],
    "Alipore - Bhabani Bhawan": [
        "Belvedere Road, Alipore, Kolkata",
        "Bhabani Bhawan, Alipore, Kolkata"
    ],
    "Central Quarter": [
        "Belvedere Road, Alipore, Kolkata",
        "Alipore, Kolkata"
    ],
    "Jail Gate": [
        "Alipore Central Jail, Street 7, Alipore, Kolkata",
        "Alipore Jail, Kolkata"
    ],
    "National Library": [
        "National Library, Belvedere Road, Alipore, Kolkata",
        "National Library, Kolkata"
    ],
    "Kothari Hospital": [
        "Kothari Medical Research Centre, 8/3, Alipore Road, Alipore, Kolkata",
        "Kothari Medical Centre, Alipore, Kolkata"
    ],
    "BM Birla Heart Hospital": [
        "BM Birla Heart Research Centre, Sterndale Road, Alipore, Kolkata",
        "BM Birla Hospital, Kolkata"
    ]
}


class RateLimiter:
    """Enforces a strict minimum interval between successive network requests."""

    def __init__(self, min_interval_sec: float = DEFAULT_MIN_INTERVAL_SEC):
        self.min_interval_sec = min_interval_sec
        self._last_request_time: float = 0.0

    def wait(self) -> None:
        now = time.monotonic()
        elapsed = now - self._last_request_time
        if elapsed < self.min_interval_sec:
            sleep_time = self.min_interval_sec - elapsed
            time.sleep(sleep_time)
        self._last_request_time = time.monotonic()


class NominatimResolver:
    """Resolves geographic coordinates via OpenStreetMap Nominatim API with caching."""

    def __init__(
        self,
        cache_path: str,
        user_agent: str = DEFAULT_USER_AGENT,
        min_interval_sec: float = DEFAULT_MIN_INTERVAL_SEC,
        bbox: Optional[Dict[str, float]] = None
    ):
        self.cache_path = cache_path
        self.user_agent = user_agent
        self.rate_limiter = RateLimiter(min_interval_sec)
        self.bbox = bbox or KOLKATA_BBOX
        self.cache: Dict[str, Any] = self._load_cache()

    def _load_cache(self) -> Dict[str, Any]:
        if os.path.exists(self.cache_path):
            try:
                with open(self.cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        logger.info(f"Loaded {len(data)} cached queries from {self.cache_path}")
                        return data
            except Exception as e:
                logger.warning(f"Could not load cache from {self.cache_path}: {e}")
        return {}

    def _save_cache(self) -> None:
        os.makedirs(os.path.dirname(os.path.abspath(self.cache_path)), exist_ok=True)
        try:
            with open(self.cache_path, "w", encoding="utf-8") as f:
                json.dump(self.cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save cache to {self.cache_path}: {e}")

    def is_within_bbox(self, lat: float, lon: float) -> bool:
        return (
            self.bbox["min_lat"] <= lat <= self.bbox["max_lat"]
            and self.bbox["min_lon"] <= lon <= self.bbox["max_lon"]
        )

    def _query_nominatim(self, query: str, max_retries: int = 3) -> List[Dict[str, Any]]:
        """Sends an authenticated query to Nominatim with rate limiting and exponential backoff."""
        if query in self.cache:
            return self.cache[query]

        url_params = urllib.parse.urlencode({
            "q": query,
            "format": "json",
            "limit": 5,
            "countrycodes": "in",
            "addressdetails": 1
        })
        url = f"https://nominatim.openstreetmap.org/search?{url_params}"
        headers = {"User-Agent": self.user_agent}

        for attempt in range(1, max_retries + 1):
            self.rate_limiter.wait()
            req = urllib.request.Request(url, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    raw_data = resp.read().decode("utf-8")
                    data = json.loads(raw_data)
                    self.cache[query] = data
                    self._save_cache()
                    return data
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    backoff = attempt * 3.0
                    logger.warning(f"HTTP 429 Rate Limit encountered. Backing off for {backoff:.1f}s (Attempt {attempt}/{max_retries})")
                    time.sleep(backoff)
                else:
                    logger.warning(f"HTTP Error {e.code} querying '{query}': {e.reason}")
                    if attempt == max_retries:
                        break
            except Exception as e:
                logger.warning(f"Network error querying '{query}': {e} (Attempt {attempt}/{max_retries})")
                if attempt < max_retries:
                    time.sleep(attempt * 2.0)

        # Cache empty response on repeated failure to prevent repeat hangs
        self.cache[query] = []
        self._save_cache()
        return []

    def resolve_place(self, place_name: str) -> Dict[str, Any]:
        """
        Resolves a place name to coordinates in Kolkata.
        Returns a dict containing coordinates, metadata, confidence, and audit details.
        """
        candidate_queries = KOLKATA_TRANSIT_ALIASES.get(
            place_name,
            [f"{place_name}, Kolkata, West Bengal, India"]
        )

        for query in candidate_queries:
            results = self._query_nominatim(query)
            # Filter results strictly within the Kolkata bounding box
            valid_kolkata_matches = []
            for item in results:
                try:
                    lat = float(item["lat"])
                    lon = float(item["lon"])
                    if self.is_within_bbox(lat, lon):
                        valid_kolkata_matches.append((lat, lon, item))
                except (KeyError, ValueError, TypeError):
                    continue

            if valid_kolkata_matches:
                lat, lon, top_item = valid_kolkata_matches[0]
                confidence = "HIGH" if len(valid_kolkata_matches) == 1 else "VERIFIED"
                return {
                    "place_name": place_name,
                    "query_used": query,
                    "latitude": lat,
                    "longitude": lon,
                    "display_name": top_item.get("display_name"),
                    "confidence_status": confidence,
                    "ambiguous_or_not_found_flag": False,
                    "osm_type": top_item.get("osm_type"),
                    "osm_id": top_item.get("osm_id"),
                    "resolved_at": datetime.now(timezone.utc).isoformat()
                }

        # If no unambiguous match inside Kolkata bounds was found
        return {
            "place_name": place_name,
            "query_used": candidate_queries[0],
            "latitude": None,
            "longitude": None,
            "display_name": None,
            "confidence_status": "NOT_FOUND_OR_AMBIGUOUS",
            "ambiguous_or_not_found_flag": True,
            "osm_type": None,
            "osm_id": None,
            "resolved_at": datetime.now(timezone.utc).isoformat()
        }


def resolve_route_configuration(
    input_config_path: str,
    output_resolved_path: str,
    output_report_path: str,
    cache_path: str
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Processes route_config.json, resolves all coordinates, preserves original structure,
    and outputs the resolved configuration and geocoding report.
    """
    if not os.path.exists(input_config_path):
        raise FileNotFoundError(f"Input configuration not found: {input_config_path}")

    with open(input_config_path, "r", encoding="utf-8") as f:
        original_config = json.load(f)

    resolver = NominatimResolver(cache_path=cache_path)

    # Collect all unique place names across routes
    unique_places: Dict[str, Dict[str, Any]] = {}

    for route in original_config.get("routes", []):
        start_name = route.get("start", {}).get("name")
        if start_name and start_name not in unique_places:
            unique_places[start_name] = resolver.resolve_place(start_name)

        end_name = route.get("end", {}).get("name")
        if end_name and end_name not in unique_places:
            unique_places[end_name] = resolver.resolve_place(end_name)

        for stop in route.get("stops", []):
            stop_name = stop.get("stop_name")
            if stop_name and stop_name not in unique_places:
                unique_places[stop_name] = resolver.resolve_place(stop_name)

    # Build resolved configuration preserving original structure
    resolved_config = copy.deepcopy(original_config)
    for route in resolved_config.get("routes", []):
        start = route.get("start", {})
        if start.get("name") in unique_places:
            res = unique_places[start["name"]]
            start["latitude"] = res["latitude"]
            start["longitude"] = res["longitude"]

        end = route.get("end", {})
        if end.get("name") in unique_places:
            res = unique_places[end["name"]]
            end["latitude"] = res["latitude"]
            end["longitude"] = res["longitude"]

        for stop in route.get("stops", []):
            s_name = stop.get("stop_name")
            if s_name in unique_places:
                res = unique_places[s_name]
                stop["latitude"] = res["latitude"]
                stop["longitude"] = res["longitude"]

    # Build human-auditable geocoding report
    total_locations = len(unique_places)
    resolved_count = sum(1 for p in unique_places.values() if not p["ambiguous_or_not_found_flag"])
    unresolved_count = total_locations - resolved_count

    report_payload = {
        "metadata": {
            "source_config": input_config_path,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_unique_locations": total_locations,
            "resolved_locations": resolved_count,
            "unresolved_or_ambiguous_locations": unresolved_count,
            "kolkata_bounding_box": KOLKATA_BBOX
        },
        "locations": list(unique_places.values())
    }

    # Save output artifacts
    os.makedirs(os.path.dirname(os.path.abspath(output_resolved_path)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(output_report_path)), exist_ok=True)

    with open(output_resolved_path, "w", encoding="utf-8") as f:
        json.dump(resolved_config, f, indent=2, ensure_ascii=False)
    logger.info(f"Wrote resolved route config to {output_resolved_path}")

    with open(output_report_path, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2, ensure_ascii=False)
    logger.info(f"Wrote geocoding audit report to {output_report_path}")

    return resolved_config, report_payload


def main():
    parser = argparse.ArgumentParser(description="Resolve route coordinates using OpenStreetMap Nominatim.")
    parser.add_argument(
        "--config",
        type=str,
        default="/home/arghadeep/Projects/Smart Campus Transport/route_config.json",
        help="Path to route_config.json"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="/home/arghadeep/Projects/Smart Campus Transport/ml/data/processed/route_config_resolved.json",
        help="Path to output resolved route config"
    )
    parser.add_argument(
        "--report",
        type=str,
        default="/home/arghadeep/Projects/Smart Campus Transport/ml/data/processed/geocoding_report.json",
        help="Path to output geocoding report"
    )
    parser.add_argument(
        "--cache",
        type=str,
        default="/home/arghadeep/Projects/Smart Campus Transport/ml/data/cache/nominatim_cache.json",
        help="Path to persistent Nominatim query cache"
    )

    args = parser.parse_args()
    logger.info(f"Starting route coordinate resolution for {args.config}...")
    try:
        resolved_cfg, report = resolve_route_configuration(
            input_config_path=args.config,
            output_resolved_path=args.output,
            output_report_path=args.report,
            cache_path=args.cache
        )
        meta = report["metadata"]
        logger.info(
            f"Resolution complete: {meta['resolved_locations']}/{meta['total_unique_locations']} locations resolved "
            f"({meta['unresolved_or_ambiguous_locations']} flagged for review)."
        )
    except Exception as e:
        logger.error(f"Error resolving coordinates: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
