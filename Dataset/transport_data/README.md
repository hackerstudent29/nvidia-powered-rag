# MSAJCEA Bus Route Data — RAG-ready

## Files
- **bus_stops_master.json** — every unique stop (175 of them) across all routes, deduplicated, with `stop_id`, canonical `name`, `lat`/`lng`, a `confidence` flag (`landmark` = well-known place, `approx` = estimated), and `aliases` (spelling variants seen in the source doc, e.g. "S.R.P. Tool" vs "S.R.P. Tools").
- **bus_routes.json** — all 19 routes (10 college AR/N3/R22 routes + 9 public MTC routes, onward and return legs separated), each an ordered list of stops referencing `stop_id`, with the scheduled time where the source gave one.
- **route_finder.py** — the query engine. Zero dependencies (stdlib only). Drop it straight into your bot backend.
- **routes_map.html** — interactive Leaflet map to visually sanity-check every route against real geography (open it in a browser, click a route in the sidebar, or search a stop by name).

## Why this shape
Bus stop names in the source doc are inconsistent ("SRP Tool" / "S.R.P. Tools" / "S.R.P. Tool"). A RAG bot matching on raw text will miss half of these. So instead of embedding route text directly, this splits the data into:
1. One **deduplicated stop list** with coordinates (so "nearest stop" is a real geometry question, not a string-matching guess).
2. **Routes as ordered references** into that stop list (so every route sees the same canonical stop, regardless of how it was spelled originally).

## The "nearest stop" behavior you asked for
```python
from route_finder import RouteFinder
rf = RouteFinder("bus_stops_master.json", "bus_routes.json")

# 1. Try to match what the user typed
result = rf.resolve("perungudi junction")
# -> {"status": "exact"/"fuzzy"/"not_found"/"nearest_by_location", ...}

# 2. If you have (or can geocode) the user's actual location and no
#    name match was found, snap to the closest known, served stop:
nearest = rf.nearest_stop(lat=12.93, lng=80.24, k=3)
# -> [(stop_dict, distance_km), ...] closest first

# 3. Once you have a stop_id, get every route through it + timings:
rf.buses_from("perungudi")

# 4. Most common student question — "which college bus from my area":
rf.college_route_between("Sholinganallur")
```
`find_stop()` does exact match → alias match → fuzzy string match (typo-tolerant) in that order, so "Velachry" still resolves to Velachery. `nearest_stop()` is pure geometry (haversine distance) for when the name doesn't match anything at all — e.g. the user names a landmark that isn't itself a bus stop, and you want "closest stop to there."

## ⚠️ Before production: fix the coordinates
This sandbox has no live geocoding API access, so all 175 coordinates were assigned **by hand from general knowledge of the OMR / GST Road / ECR / city-core corridors** — good enough to place a stop on the right road and in the right sequence, but not GPS-accurate. Each stop has a `"confidence"` field:
- `"landmark"` — a well-known place (CMBT, Velachery, Sholinganallur, etc.) — coordinates are reasonably trustworthy.
- `"approx"` — a minor/local stop between two landmarks — treat these as rough placements, worth re-geocoding.

To fix this properly: loop over `bus_stops_master.json`, geocode `name + ", Chennai, India"` through Google Maps Geocoding API or OSM Nominatim, and overwrite `lat`/`lng`. The JSON shape doesn't need to change — it's a pure value swap. I'd recommend doing this before the "nearest stop" feature goes live, since fuzzy coordinates matter more for that than for the route-lookup features.

## Sanity-checking visually
Open `routes_map.html` in any browser. Click a route name in the sidebar to draw it; click any stop dot to see every route (college + public) serving that stop. Use this to spot-check whether a stop landed on the wrong road before trusting the data.
