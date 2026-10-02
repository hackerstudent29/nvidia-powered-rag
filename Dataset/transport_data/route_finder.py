"""
Query engine for the MSAJCEA bus RAG bot.

Load once at startup:
    from route_finder import RouteFinder
    rf = RouteFinder("bus_stops_master.json", "bus_routes.json")

Typical bot flow for "which bus stops near X" / "does route Y stop at X":
    1. rf.find_stop("Sholinganallur")        -> exact/alias/fuzzy name match
    2. If no confident match, and you have a lat/lng (e.g. from user's
       shared location or a geocoded free-text place), call:
       rf.nearest_stop(lat, lng)             -> nearest known stop + distance
    3. rf.routes_through(stop_id)            -> every route serving that stop
    4. rf.buses_from(stop_id)                -> departure times at that stop,
                                                 sorted, per route

This intentionally has zero third-party dependencies (stdlib only) so it
drops into any bot backend.
"""
import json, re, math
from difflib import SequenceMatcher

def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())

def _haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dlmb/2)**2
    return 2*R*math.asin(math.sqrt(a))

class RouteFinder:
    def __init__(self, stops_path="bus_stops_master.json", routes_path="bus_routes.json"):
        with open(stops_path, encoding="utf-8") as f:
            self.stops = {s["stop_id"]: s for s in json.load(f)}
        with open(routes_path, encoding="utf-8") as f:
            self.routes = json.load(f)

        # alias -> stop_id, for O(1) exact/alias lookups
        self._alias_index = {}
        for sid, s in self.stops.items():
            for label in [s["name"]] + s.get("aliases", []):
                self._alias_index[_norm(label)] = sid

        # stop_id -> list of (route, index_in_route) for reverse lookups
        self._stop_to_routes = {}
        for route in self.routes:
            for i, st in enumerate(route["stops"]):
                self._stop_to_routes.setdefault(st["stop_id"], []).append((route, i))

    # ---------- name-based lookup ----------
    def find_stop(self, query: str, fuzzy_threshold: float = 0.72):
        """
        Returns (stop_dict, match_type) where match_type is
        'exact' | 'fuzzy' | None. On 'fuzzy', also check the returned
        stop makes sense before trusting it blindly for critical answers.
        """
        key = _norm(query)
        if key in self._alias_index:
            sid = self._alias_index[key]
            return self.stops[sid], "exact"

        # fuzzy fallback: best SequenceMatcher ratio across all names+aliases
        best_sid, best_ratio = None, 0.0
        for sid, s in self.stops.items():
            for label in [s["name"]] + s.get("aliases", []):
                r = SequenceMatcher(None, key, _norm(label)).ratio()
                if r > best_ratio:
                    best_ratio, best_sid = r, sid
        if best_sid and best_ratio >= fuzzy_threshold:
            return self.stops[best_sid], "fuzzy"
        return None, None

    # ---------- geographic fallback (the "nearest stop" behavior) ----------
    def nearest_stop(self, lat: float, lng: float, k: int = 1):
        """
        Returns the k nearest known stops to a (lat, lng), each as
        (stop_dict, distance_km), sorted closest-first. Use this when
        a requested place isn't in our stop list at all (e.g. user names
        a street or apartment, not a recognized stop) — geocode their
        text first, then call this to snap to the nearest served stop.
        """
        ranked = sorted(
            self.stops.values(),
            key=lambda s: _haversine_km(lat, lng, s["lat"], s["lng"])
        )
        return [(s, round(_haversine_km(lat, lng, s["lat"], s["lng"]), 2)) for s in ranked[:k]]

    def resolve(self, query: str, fallback_lat=None, fallback_lng=None, k=3):
        """
        One-call convenience for the bot: try name match first; if that
        fails and coordinates are available, fall back to nearest stops.
        Returns a dict describing what happened, so the bot can phrase
        an honest answer ("closest match" vs "nearest stop instead").
        """
        stop, match_type = self.find_stop(query)
        if match_type == "exact":
            return {"status": "exact", "stop": stop}
        if match_type == "fuzzy":
            return {"status": "fuzzy", "stop": stop}
        if fallback_lat is not None and fallback_lng is not None:
            nearest = self.nearest_stop(fallback_lat, fallback_lng, k=k)
            return {"status": "nearest_by_location", "candidates": nearest}
        return {"status": "not_found"}

    # ---------- route lookups ----------
    def routes_through(self, stop_id: str):
        """All routes (college + public) that serve a given stop."""
        return [route for route, _ in self._stop_to_routes.get(stop_id, [])]

    def buses_from(self, stop_id: str):
        """Departure info at a stop, across every route serving it."""
        out = []
        for route, idx in self._stop_to_routes.get(stop_id, []):
            st = route["stops"][idx]
            out.append({
                "route_id": route["route_id"],
                "route_name": route["name"],
                "category": route["category"],
                "time_at_stop": st.get("time"),
                "meta": route.get("meta", {}),
            })
        out.sort(key=lambda x: (x["time_at_stop"] is None, x["time_at_stop"] or ""))
        return out

    def college_route_between(self, origin_query: str, dest_query: str = None):
        """
        Convenience for the most common student question: 'which college
        bus should I take from X'. Returns matching college routes (and,
        if dest given, only routes serving both).
        """
        origin, _ = self.find_stop(origin_query)
        if not origin:
            return []
        candidates = [r for r in self.routes_through(origin["stop_id"]) if r["category"] == "college"]
        if dest_query:
            dest, _ = self.find_stop(dest_query)
            if dest:
                dest_ids = {r["route_id"] for r in self.routes_through(dest["stop_id"])}
                candidates = [r for r in candidates if r["route_id"] in dest_ids]
        return candidates


if __name__ == "__main__":
    rf = RouteFinder()
    # quick smoke tests
    print("Exact:", rf.find_stop("Sholinganallur")[0]["name"])
    print("Alias:", rf.find_stop("SRP Tool")[0]["name"])
    print("Fuzzy (typo):", rf.find_stop("Velachry")[0]["name"])
    print("Not-a-real-stop -> nearest by coords (Thoraipakkam Junction, 12.9430,80.2380):")
    for s, d in rf.nearest_stop(12.9430, 80.2380, k=3):
        print(f"   {s['name']}  ({d} km)")
    print("Buses from Perungudi:")
    for b in rf.buses_from("perungudi")[:5]:
        print("  ", b["route_id"], b["route_name"], b["time_at_stop"])
    print("College routes from Sholinganallur:")
    for r in rf.college_route_between("Sholinganallur"):
        print("  ", r["route_id"], r["name"])
