#!/usr/bin/env python3
"""Verify SnapTrade fix by testing API endpoints directly"""

import requests
import sys

# Test with a known working user
BASE_URL = "http://localhost:8002"

# Login with test user
print("1️⃣ Testing login...")
login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "test@aims.local",
    "password": "password123"
})

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(f"Response: {login_response.text}")
    sys.exit(1)

token = login_response.json()["access_token"]
print("✅ Login successful")

# Test SnapTrade registration endpoint
print("\n2️⃣ Testing SnapTrade registration...")
headers = {"Authorization": f"Bearer {token}"}
register_response = requests.post(f"{BASE_URL}/api/snaptrade/register", headers=headers, json={})

print(f"Status: {register_response.status_code}")
register_data = register_response.json()
print(f"Response: {register_data}")

if register_response.status_code == 200 and register_data.get("status") == "already_registered":
    print("✅ User already registered with SnapTrade")
else:
    print("❌ Unexpected registration response")

# Test SnapTrade connection URL endpoint (THE KEY TEST)
print("\n3️⃣ Testing SnapTrade connection URL...")
connect_response = requests.get(f"{BASE_URL}/api/snaptrade/connect", headers=headers)

print(f"Status: {connect_response.status_code}")
connect_data = connect_response.json()

if connect_response.status_code == 200:
    print("✅ Connection URL retrieved successfully!")
    print(f"URL: {connect_data.get('connection_url', 'N/A')[:50]}...")
    print("\n🎉 FIX VERIFIED - SnapTrade integration is working!")
else:
    print(f"❌ Failed to get connection URL: {connect_data}")
    print("\n❌ FIX NOT WORKING - Still have issues")