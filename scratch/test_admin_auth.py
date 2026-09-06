import sys
import os
sys.path.insert(0, os.path.abspath("."))
from fastapi.testclient import TestClient
from backend.server import app

sys.stdout.reconfigure(encoding='utf-8')
client = TestClient(app)

print("1. Testing Admin Login with valid credentials...")
login_res = client.post("/api/admin/login", json={"username": "admin", "password": "msajcea_secure_admin_2026"})
print(f"Status: {login_res.status_code}")
print(f"Body: {login_res.json()}")
print(f"Cookies: {login_res.cookies}")

assert login_res.status_code == 200
token = login_res.json()["token"]

print("\n2. Testing /api/admin/metrics with Bearer Authorization Header...")
metrics_res = client.get("/api/admin/metrics", headers={"Authorization": f"Bearer {token}"})
print(f"Status: {metrics_res.status_code}")
print(f"Metrics: {metrics_res.json()}")
assert metrics_res.status_code == 200

print("\n3. Testing /api/admin/sessions with Cookie...")
sessions_res = client.get("/api/admin/sessions", cookies={"admin_token": token})
print(f"Status: {sessions_res.status_code}")
print(f"Sessions count: {len(sessions_res.json())}")
assert sessions_res.status_code == 200

print("\n4. Testing /api/admin/cache with Bearer Authorization Header...")
cache_res = client.get("/api/admin/cache", headers={"Authorization": f"Bearer {token}"})
print(f"Status: {cache_res.status_code}")
print(f"Cache count: {len(cache_res.json().get('cache', []))}")
assert cache_res.status_code == 200

print("\n5. Testing with invalid credentials...")
bad_login = client.post("/api/admin/login", json={"username": "admin", "password": "wrongpassword"})
print(f"Bad Login Status: {bad_login.status_code}")
assert bad_login.status_code == 401

print("\n6. Testing /api/admin/metrics without auth on a clean client...")
fresh_client = TestClient(app)
unauth_res = fresh_client.get("/api/admin/metrics")
print(f"Unauth Status: {unauth_res.status_code}")
assert unauth_res.status_code == 401

print("\n🎉 ALL ADMIN AUTHENTICATION TESTS PASSED SUCCESSFULLY!")
