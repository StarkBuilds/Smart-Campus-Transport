#!/usr/bin/env python3
import json
import urllib.request
import sys

JSON_FILENAME = "synthetic_buses.json"

def demo_routing():
    # 1. Load the synthetic dataset
    try:
        with open(JSON_FILENAME, 'r') as f:
            buses = json.load(f)
    except FileNotFoundError:
        print(f"Error: Run the converter script to generate {JSON_FILENAME} first.", file=sys.stderr)
        return

    # 2. Extract raw coordinates for the demo
    # We take the first row as the start, and the 10th row as the destination
    source_lat, source_lon = buses[0]["latitude"], buses[0]["longitude"]
    target_lat, target_lon = buses[10]["latitude"], buses[10]["longitude"]

    print(f"--- DEMO ROUTING ENGINE ---", file=sys.stderr)
    print(f"Source Coordinates: {source_lat}, {source_lon}", file=sys.stderr)
    print(f"Target Coordinates: {target_lat}, {target_lon}", file=sys.stderr)
    print(f"Calculating spatial KD-Tree snap and dynamic traversal...", file=sys.stderr)

    # 3. Build the payload matching the new RouteRequest schema
    payload = {
        "source_lat": source_lat,
        "source_lon": source_lon,
        "target_lat": target_lat,
        "target_lon": target_lon
    }

    url = "http://127.0.0.1:8000/alternate_routes"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    # 4. Execute and dump the GeoJSON
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))

            # THE FIX: Check if the server sent an error instead of a route array
            if "error" in result:
                print("\n--- BACKEND ALGORITHM FAILURE ---", file=sys.stderr)
                print("The API intercepted the request, but the graph math failed:")
                print(f"Error: {result['error']}", file=sys.stderr)
                return

            print("\n--- ROUTE GENERATED ---", file=sys.stderr)
            # Print the first route segment to show the traffic color logic
            print(json.dumps(result["routes"][0], indent=2))
            print(f"\n... plus {len(result['routes'][0]['features']) - 1} more segments.", file=sys.stderr)

    except urllib.error.HTTPError as e:
        print(f"\n--- SERVER REJECTED PAYLOAD (HTTP {e.code}) ---", file=sys.stderr)
        print(e.read().decode("utf-8"), file=sys.stderr)
    except Exception as e:
        print(f"\n--- NETWORK FAILURE ---", file=sys.stderr)
        print(str(e), file=sys.stderr)

if __name__ == "__main__":
    demo_routing()
