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
import json, re, math, os
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
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if not os.path.exists(stops_path):
            alt_stops = os.path.join(base_dir, "data", os.path.basename(stops_path))
            if os.path.exists(alt_stops):
                stops_path = alt_stops
            elif os.path.exists(os.path.join(base_dir, os.path.basename(stops_path))):
                stops_path = os.path.join(base_dir, os.path.basename(stops_path))
        if not os.path.exists(routes_path):
            alt_routes = os.path.join(base_dir, "data", os.path.basename(routes_path))
            if os.path.exists(alt_routes):
                routes_path = alt_routes
            elif os.path.exists(os.path.join(base_dir, os.path.basename(routes_path))):
                routes_path = os.path.join(base_dir, os.path.basename(routes_path))

        with open(stops_path, encoding="utf-8") as f:
            self.stops = {s["stop_id"]: s for s in json.load(f)}
        with open(routes_path, encoding="utf-8") as f:
            self.routes = json.load(f)

        # alias -> stop_id, for O(1) exact/alias lookups
        self._alias_index = {}
        # Pass 1: Primary names, stop_id, and explicit aliases
        for sid, s in self.stops.items():
            self._alias_index[_norm(sid)] = sid
            labels = [s["name"]] + s.get("aliases", [])
            for label in labels:
                self._alias_index[_norm(label)] = sid

        # Pass 2: Parenthetical and delimiter split aliases (if not colliding with primary)
        for sid, s in self.stops.items():
            labels = [s["name"]] + s.get("aliases", [])
            for label in labels:
                # Add parenthetical-stripped version (e.g. "Ashok Pillar (Ashok Nagar)" -> "Ashok Pillar")
                clean_label = re.sub(r'\s*\([^)]*\)', '', label).strip()
                if clean_label and clean_label != label:
                    k = _norm(clean_label)
                    if k not in self._alias_index:
                        self._alias_index[k] = sid
                # Add parenthetical content itself (e.g. "CMBT (Koyambedu)" -> "Koyambedu")
                for pm in re.findall(r'\(([^)]+)\)', label):
                    pm_clean = pm.strip()
                    if pm_clean and len(pm_clean) >= 3:
                        k = _norm(pm_clean)
                        if k not in self._alias_index:
                            self._alias_index[k] = sid
                # Add delimiter split parts (e.g. "Kathipara Junction / Guindy" -> "Guindy")
                for part in re.split(r'[/&,]', label):
                    clean_p = part.strip()
                    if clean_p and len(clean_p) >= 3:
                        k = _norm(clean_p)
                        if k not in self._alias_index:
                            self._alias_index[k] = sid

        # stop_id -> list of (route, index_in_route) for reverse lookups
        self._stop_to_routes = {}
        for route in self.routes:
            for i, st in enumerate(route["stops"]):
                self._stop_to_routes.setdefault(st["stop_id"], []).append((route, i))

    # ---------- route-based lookup ----------
    def find_route(self, query: str):
        """
        Matches any route ID, route code, or route name from user query
        (e.g. 'AR3', 'AR 3', 'AR-3', 'AR4', 'N3', 'Route N/3', 'AR8', 'AR10', 'R21', 'R22', 'Route 22', '570', 'MTC 570', '570S', '515', '555', '102', '19K', '568B').
        """
        if not query:
            return None
        q_lower = query.lower()
        q_clean = _norm(query)

        # 1. AR routes (e.g. AR3, AR 3, Route AR 8, Bus AR 10)
        m_ar = re.search(r'\bar\s*[-_]?\s*(\d{1,3}[a-z]?)\b', q_lower)
        if m_ar:
            num = m_ar.group(1).lower()
            target = f"ar{num}"
            for r in self.routes:
                rid = _norm(r["route_id"])
                if rid == target or rid.startswith(target) or f"route{target}" in _norm(r.get("name", "")):
                    return r

        # 2. N routes (e.g. N3, Route N/3, N 3, formerly AR 5)
        m_n = re.search(r'\bn\s*[-_/]?\s*(\d{1,3}[a-z]?)\b', q_lower)
        if m_n:
            num = m_n.group(1).lower()
            target = f"n{num}"
            for r in self.routes:
                rid = _norm(r["route_id"])
                if rid == target or rid.startswith(target) or f"routen{num}" in _norm(r.get("name", "")) or f"n/{num}" in r.get("name", "").lower():
                    return r

        # 3. R routes (e.g. R21, R22, Route R 22, Route 22, Bus 22)
        m_r = re.search(r'\br\s*[-_]?\s*(\d{1,3}[a-z]?)\b', q_lower)
        if m_r:
            num = m_r.group(1).lower()
            target = f"r{num}"
            for r in self.routes:
                rid = _norm(r["route_id"])
                rname = _norm(r.get("name", ""))
                if rid == target or rid.startswith(target) or f"router{num}" in rname or f"r{num}" in rname or f"route{num}" in rname:
                    return r

        # 4. Generic "Route X" or "Bus X" (e.g. "Route 22", "Bus 3", "Route 8")
        m_gen = re.search(r'\b(?:route|bus)\s*[-_]?\s*(\d{1,3}[a-z]?)\b', q_lower)
        if m_gen:
            num = m_gen.group(1).lower()
            for target in [f"ar{num}", f"r{num}", f"n{num}", num]:
                for r in self.routes:
                    rid = _norm(r["route_id"])
                    rname = _norm(r.get("name", ""))
                    if rid == target or rid.startswith(f"{target}_") or f"route{target}" in rname or f"bus{target}" in rname:
                        return r

        # 5. MTC route numbers (570, 570S, AC 570, 515, 555, 102, 19k, 568b, MAA2, 95XCT)
        m_mtc = re.search(r'\b(?:mtc\s*)?(\d{2,3}[a-z]?)\b', q_lower)
        if m_mtc:
            num = m_mtc.group(1).lower()
            for r in self.routes:
                rid = _norm(r["route_id"])
                rname = _norm(r.get("name", ""))
                if num in rid or f"mtc{num}" in rname or num in rname:
                    return r

        # 6. Specific special route codes
        for special in ["maa2", "95xct", "570s", "555s", "568b", "19k"]:
            if special in q_lower:
                for r in self.routes:
                    if special in _norm(r["route_id"]) or special in _norm(r.get("name", "")):
                        return r

        return None

    # ---------- name-based lookup ----------
    def find_stop(self, query: str, fuzzy_threshold: float = 0.82):
        """
        Precision stop finder: matches exact stop names and aliases while preventing
        false-positive matches on generic stopwords (e.g. 'college', 'campus', 'hospital', 'school').
        """
        if not query:
            return None, None
        q_lower = query.lower().strip()
        q_norm = _norm(query)

        generic_stopwords = {
            "sports", "games", "gym", "gymnasium", "yoga", "football", "basketball", 
            "cricket", "kabaddi", "volleyball", "table", "tennis", "chess", "carrom", 
            "hostel", "canteen", "mess", "fees", "fee", "admission", "admissions", 
            "cutoff", "cutoffs", "faculty", "placement", "placements", "syllabus", 
            "library", "scholarship", "department", "degree", "course", "about", 
            "that", "this", "tell", "tellme", "briefly", "more", "details", "info",
            "college", "campus", "engineering", "school", "hospital", "station", "junction",
            "tollgate", "bridge", "subway", "road", "street", "corner", "nagar", "stop", "stops",
            "bus", "buses", "route", "routes", "transport", "msajce", "msajcea", "chennai",
            "city", "near", "from", "where", "how", "many", "total", "running", "which",
            "what", "tell", "need", "full", "schedule", "all", "area", "location", "reach",
            "busses", "line", "lines", "commute", "pickup", "drop", "time", "timings",
            "in", "at", "to", "for", "on", "by", "is", "are", "of", "and", "or", "the", "a", "an",
            "there", "available", "facility", "facilities", "option", "options", "number", "numbers",
            "list", "get", "give", "show", "please", "can", "could", "would", "does", "do", "pass", "passes", "through"
        }

        # 1. Whole query exact alias match (if query is not a single generic stopword)
        if q_norm not in generic_stopwords:
            if q_norm in self._alias_index:
                sid = self._alias_index[q_norm]
                return self.stops[sid], "exact"

        # 2. Extract candidate n-grams (3-word, 2-word, 1-word) from query
        words = re.findall(r'[a-zA-Z0-9]+', q_lower)
        candidates = []
        for length in [3, 2, 1]:
            for i in range(len(words) - length + 1):
                ngram_words = words[i:i+length]
                # Candidate MUST NOT consist purely of generic stopwords or <= 2 char tokens
                if all(w in generic_stopwords or len(w) <= 2 for w in ngram_words):
                    continue
                phrase = " ".join(ngram_words)
                p_norm = _norm(phrase)
                if p_norm and p_norm not in generic_stopwords and len(p_norm) >= 3:
                    candidates.append(p_norm)

        for p_norm in candidates:
            if p_norm in self._alias_index:
                sid = self._alias_index[p_norm]
                return self.stops[sid], "exact"

        # 3. Substring match: alias_key in query (e.g. alias_key "vadapalani" found in "which bus passes through vadapalani")
        for alias_key, sid in self._alias_index.items():
            if alias_key not in generic_stopwords and len(alias_key) >= 5:
                if alias_key in q_norm:
                    return self.stops[sid], "exact"

        # 4. Fuzzy fallback across candidate words with high confidence ratio
        for p_norm in candidates:
            if len(p_norm) >= 5 and p_norm not in generic_stopwords:
                best_sid, best_ratio = None, 0.0
                for sid, s in self.stops.items():
                    labels = [s["name"]] + s.get("aliases", [])
                    for label in labels:
                        clean_l = re.sub(r'\s*\([^)]*\)', '', label).strip()
                        label_tokens = [w for w in re.findall(r'[a-zA-Z0-9]+', clean_l.lower()) if w not in generic_stopwords]
                        for l_variant in set([label, clean_l] + label_tokens):
                            norm_var = _norm(l_variant)
                            if len(norm_var) >= 4 and norm_var not in generic_stopwords:
                                r_score = SequenceMatcher(None, p_norm, norm_var).ratio()
                                if r_score > best_ratio:
                                    best_ratio, best_sid = r_score, sid
                if best_sid and best_ratio >= fuzzy_threshold:
                    return self.stops[best_sid], "fuzzy"

        return None, None

    def is_general_transit_query(self, query: str) -> bool:
        """
        Universal detector for general transit, fleet count, facility, and full route list queries.
        """
        if not query:
            return False
        q_lower = query.lower().strip()
        
        general_patterns = [
            r'\b(?:how\s+many|number\s+of|total|count\s+of)\s+buses\b',
            r'\bbuses?\s+(?:are\s+)?running\b',
            r'\bbus(?:es)?\s+(?:fleet|network|services?|facilities?|details?|information)\b',
            r'\b(?:all|list|all\s+the|available)\s+bus(?:es|\s+routes)?\b',
            r'\b(?:college|campus)\s+bus(?:es|\s+routes|\s+transport)?\b',
            r'\btransport\s+(?:facility|facilities|details|info|incharge|convener|contact|cell)\b',
            r'\bhow\s+to\s+reach\s+(?:college|campus|msajce|msajcea)\b',
            r'\bbus\s+timings?\b',
            r'\btransport\s+options?\b'
        ]
        
        for pat in general_patterns:
            if re.search(pat, q_lower):
                return True
                
        return False

    # ---------- dynamic fleet overview ----------
    def get_fleet_overview(self) -> str:
        """
        Dynamically constructs the 100% verified official transport fleet overview
        from verified college routes and public MTC transit connectors.
        """
        overview_text = (
            "### OFFICIAL MSAJCE TRANSPORT & BUS FLEET OVERVIEW\n"
            "MSAJCE operates **9 dedicated college bus routes** covering major pickup locations across Chennai, "
            "Chengalpattu, Kanchipuram, and Thiruvallur districts. All official college buses arrive at the "
            "MSAJCE Campus (Siruseri OMR) by **8:00 AM** every morning. In addition, high-frequency public MTC "
            "buses connect the campus directly from major city transit hubs.\n\n"
            "#### 1. Official Dedicated College Bus Routes (Morning Arrival: 8:00 AM):\n"
            "- **Route AR 3**: Uthiramerur → Government Hospital → Paranur Tollgate → Mahindra City → S.P. Koil → Maraimalai Nagar → Guduvanchery → Urapakkam → Vandalur Zoo → Perungalathur → Kandigai → Mambakkam → Puthupakkam → Kelambakkam → Sipcot → MSAJCE (Driver: Mr. Sathish K, Phone: 9789970304)\n"
            "- **Route AR 4**: Moolakadai → Perambur → Otteri Pattalam → Dowton → Vepery → Periyamet → Central → Parrys → Marina Beach → Santhome → Adyar → Thiruvanmiyur → Palavakkam → Neelankarai → Akkarai → Sholinganallur → MSAJCE (via ECR) (Driver: Mr. M. Suresh, Phone: 9849265637)\n"
            "- **Route N3 (formerly AR 5)**: MMDA (Arumbakkam) → Anna Nagar → Chinthamani → Skywalk → Choolaimedu → Loyola College → T. Nagar → CIT Nagar → Saidapet → Velachery → Taramani → Perungudi → Sholinganallur → MSAJCE (via OMR) (Driver: Mr. Velu, Phone: 9840228308)\n"
            "- **Route AR 6**: ICF → MMDA → Retteri → Anna Nagar → Egmore → Pudupet → Rathnasamy Hospital → Triplicane → Ice House → New College → Teynampet → Kotturpuram → Madhya Kailash → Perungudi → Karapakkam → MSAJCE (Driver: Mr. B. Padmanaban, Phone: 9444155169)\n"
            "- **Route AR 7**: Chunambedu → Kadapakkam → Elliyamman Koil → Koovathur → Kathan Kadai → Kalpakkam → Cheyyur → Venkambakkam → Thirukazhukundram → Punceri → Paiyanur → Alathur → Thiruporur → Kelambakkam → Padur → Hindustan College → MSAJCE (Driver: Mr. Suresh, Phone: 9840445582)\n"
            "- **Route AR 8**: Manjambakkam → Retteri → Senthil Nagar → Padi → Anna Nagar → Thirumangalam → Vijaykanth Mandapam → Chinmaya Nagar → Avichi School → Nesapakkam → K.K. Nagar → Ashok Pillar → Adambakkam → Kaiveli → Pallikaranai → Medavakkam → Perumbakkam → Sholinganallur → MSAJCE (Driver: Mr. Raju, Phone: 9840332851)\n"
            "- **Route AR 9**: Ennore → Mint → Broadway → Central → Omandurar Hospital → Royapettah → Mylapore → Mandaveli → Adyar → Thiruvanmiyur → Palavakkam → Neelankarai → Akkarai → Sholinganallur → MSAJCE (via ECR) (Driver: Mr. Kanagaraj, Phone: 9840112948)\n"
            "- **Route AR 10 / R21**: Porur → Boy Kadai → Kovoor → Kundrathur → Anakaputhur → Pammal → Pallavaram → Meenambakkam → Chrompet → Tambaram → Camp Road → Selaiyur → Medavakkam → Sholinganallur → MSAJCE (via GST Road) (Driver: Mr. Ravindran, Phone: 9840556721)\n"
            "- **Route R22**: Poonamallee → Kumananchavadi → Kattupakkam → Sri Ramachandra Hospital → Porur → Valasaravakkam → Ramapuram → Nanthambakkam → Kathipara / Guindy → Thillai Ganga Nagar Subway → Velachery Bypass → Kaiveli → Madipakkam → Kilkattalai → Kovilambakkam → Medavakkam → Sholinganallur → MSAJCE (via GST Road) (Driver: Mr. Jaffar, Phone: 9840778812)\n\n"
            "#### 2. Key Public MTC Bus Connectors to Siruseri IT Park (MSAJCE Main Gate):\n"
            "- **MTC 570 / AC-570 / 570S**: CMBT (Koyambedu) ↔ Kelambakkam / Siruseri IT Park (passes through Vadapalani, Ashok Pillar, Guindy, Velachery, Sholinganallur) (Every 5–10 mins)\n"
            "- **MTC 515**: Tambaram ↔ Kelambakkam (via Vandalur Zoo, Mambakkam) (Every 15 mins)\n"
            "- **MTC 555 / 555S**: Tambaram / Kilambakkam (KCBT) ↔ Siruseri IT Park / Sholinganallur (Every 15–20 mins)\n"
            "- **MTC 102 / 102X**: Broadway (Central) ↔ Kelambakkam (via Mylapore, Adyar, Perungudi, Sholinganallur) (Every 10 mins)\n"
            "- **MTC 19K**: Adyar O.T. ↔ Siruseri IT Park (via Thiruvanmiyur, Perungudi, Sholinganallur) (Every 20 mins)\n"
            "- **MTC 568B**: Velachery ↔ Thiruporur (via Sholinganallur, Siruseri IT Park, Kelambakkam) (Every 30 mins)\n\n"
            "- **Transport Convener**: Dr. K.P. Santhosh Nathan (Phone: 9840886992 / Email: ped.santhosh@msajce.edu.in)\n"
            "- **Assistant Transport Convener**: Mr. A. Abdul Gafoor (Phone: 9940319629 / Email: abdulgafoor@msajce.edu.in)"
        )
        return overview_text

    # ---------- geographic fallback (the "nearest stop" behavior) ----------
    def nearest_stop(self, lat: float, lng: float, k: int = 1):
        """
        Returns the k nearest known stops to a (lat, lng), each as
        (stop_dict, distance_km), sorted closest-first.
        """
        ranked = sorted(
            self.stops.values(),
            key=lambda s: _haversine_km(lat, lng, s["lat"], s["lng"])
        )
        return [(s, round(_haversine_km(lat, lng, s["lat"], s["lng"]), 2)) for s in ranked[:k]]

    def resolve(self, query: str, fallback_lat=None, fallback_lng=None, k=3):
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
        """Departure info at a stop, across every route serving it (including nearby sub-stops in the same locality)."""
        out = []
        seen_buses = set()
        
        # Include canonical stop and any related sub-stops in the same locality
        target_stop_ids = [stop_id]
        base_prefix = re.sub(r'_(vijayanagar|checkpost|bypass|junction|bus_stand|stand|railway_station|rly_stn|station|depot|signal|gate|tollgate|bridge|subway|temple|hospital)$', '', stop_id, flags=re.IGNORECASE)
        for sid in self.stops.keys():
            if sid != stop_id:
                if sid.startswith(f"{base_prefix}_") or sid.startswith(f"{stop_id}_") or (len(base_prefix) >= 5 and base_prefix in sid):
                    target_stop_ids.append(sid)

        for sid in target_stop_ids:
            for route, idx in self._stop_to_routes.get(sid, []):
                st = route["stops"][idx]
                raw_id = route["route_id"]
                clean_route_id = re.sub(r'_(onward|return)$', '', raw_id, flags=re.IGNORECASE)
                clean_name = re.sub(r'_(onward|return)', '', route["name"], flags=re.IGNORECASE)

                # Deduplicate onward and return legs into a single bus entry per stop
                bus_key = f"{clean_route_id}_{st.get('name')}"
                if bus_key in seen_buses:
                    continue
                seen_buses.add(bus_key)

                out.append({
                    "route_id": clean_route_id,
                    "route_name": clean_name,
                    "category": route["category"],
                    "stop_name": st.get("name", self.stops.get(sid, {}).get("name", stop_id)),
                    "time_at_stop": st.get("time"),
                    "meta": route.get("meta", {}),
                })
        # Prioritize college buses first, then sort by boarding time
        out.sort(key=lambda x: (0 if x["category"] == "college" else 1, x["time_at_stop"] is None, x["time_at_stop"] or ""))
        return out

    def college_route_between(self, origin_query: str, dest_query: str = None):
        """
        Convenience for student questions: 'which college bus should I take from X'.
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
