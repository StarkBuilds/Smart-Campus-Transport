#!/usr/bin/env python3

#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import os
import sys

# Point straight to the pristine JSON payload we generated
JSON_FILENAME = "synthetic_buses.json"

def run_test():
    if not os.path.exists(JSON_FILENAME):
        print(f"Error: Could not find '{JSON_FILENAME}'. Did you run the converter script?")
        return

    print(f"Reading strictly-typed JSON payload from {JSON_FILENAME}...")

    # Load the JSON directly into Python memory. No CSV parsing required.
    with open(JSON_FILENAME, 'r') as f:
        payload = json.load(f)

    print(f"Loaded {len(payload)} validated rows. Firing network payload to FastAPI daemon...")

    # Setup the HTTP POST request to your running server
    url = "http://127.0.0.1:8000/clean_telemetry"
    headers = {"Content-Type": "application/json"}

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        # Hit the server and capture the response
        with urllib.request.urlopen(req) as response:
            response_body = response.read().decode("utf-8")
            result = json.loads(response_body)

            print("\n--- PIPELINE TEST PASSED (200 OK) ---")
            print(f"Successfully processed {len(result)} rows.")
            #print("Sample output from C++ ML Engine (First 2 rows):")
            print(json.dumps(result, indent=2))

    except urllib.error.HTTPError as e:
        print(f"\n--- SERVER REJECTED PAYLOAD (HTTP {e.code}) ---")
        print(e.read().decode("utf-8"))
    except Exception as e:
        print(f"\n--- CONNECTION FAILED ---")
        print(str(e))

if __name__ == "__main__":
    run_test()
