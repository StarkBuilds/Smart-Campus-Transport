#!/usr/bin/env python3

import osmnx as ox

print("Downloading street network for Kolkata... (This takes 1-2 minutes)")
# We use the 'drive' network to only get roads buses can actually use
city_graph = ox.graph_from_place("Kolkata, West Bengal, India", network_type="drive")

print("Saving graph to local disk as kolkata_drive.graphml...")
ox.save_graphml(city_graph, "kolkata_drive.graphml")
print("Done! You can delete this script now.")
