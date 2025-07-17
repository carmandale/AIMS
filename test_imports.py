#!/usr/bin/env python3
"""Test script to verify imports work correctly"""

try:
    from src.api.main import app
    print("✅ Application imports successfully")
    
    from src.api.auth import get_current_user
    print("✅ Authentication module imports successfully")
    
    from src.api.routes.auth import router as auth_router
    print("✅ Authentication routes import successfully")
    
    from src.api.routes.portfolio_secure import router as portfolio_secure_router
    print("✅ Secure portfolio routes import successfully")
    
    from src.api.schemas.portfolio import PerformanceMetricsRequest
    print("✅ Portfolio schemas import successfully")
    
    from src.db.models import User
    print("✅ User model imports successfully")
    
    print("\n🎉 All imports successful!")
    
except Exception as e:
    print(f"❌ Import error: {e}")
    import traceback
    traceback.print_exc()