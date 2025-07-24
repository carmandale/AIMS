#!/usr/bin/env python3
"""Setup verification script for AIMS

This script verifies that all components of the AIMS system are properly
configured and working correctly. It checks:
- Environment configuration
- Database connectivity
- API endpoints
- Frontend build
- SnapTrade integration
- Required dependencies
"""

import sys
import os
import json
import time
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import requests
from urllib.parse import urljoin

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.utils import (
    setup_logging,
    get_project_root,
    check_python_version,
    check_node_version,
    find_executable,
    run_command,
    check_port_available,
    wait_for_port,
    load_env_file,
    print_header,
    print_success,
    print_error,
    print_warning,
    print_info,
    get_platform_info,
)

logger = setup_logging("verify_setup")


class SetupVerifier:
    """Main setup verification class"""

    def __init__(self):
        self.project_root = get_project_root()
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.skip_backend_start = False

    def run_all_checks(self) -> bool:
        """Run all verification checks"""
        print_header("AIMS Setup Verification")

        checks = [
            ("System Requirements", self.check_system_requirements),
            ("Environment Configuration", self.check_environment),
            ("Python Dependencies", self.check_python_dependencies),
            ("Node.js Dependencies", self.check_node_dependencies),
            ("Database Setup", self.check_database),
            ("Backend API", self.check_backend_api),
            ("Frontend Build", self.check_frontend),
            ("SnapTrade Configuration", self.check_snaptrade_config),
        ]

        all_passed = True
        for check_name, check_func in checks:
            print(f"\n{'=' * 60}")
            print(f"Checking: {check_name}")
            print("=" * 60)

            try:
                passed = check_func()
                if passed:
                    print_success(f"{check_name} verification passed")
                else:
                    print_error(f"{check_name} verification failed")
                    all_passed = False
            except Exception as e:
                print_error(f"{check_name} check failed with error: {e}")
                logger.exception(f"Error in {check_name}")
                all_passed = False

        self.print_summary()
        return all_passed

    def check_system_requirements(self) -> bool:
        """Check system requirements"""
        passed = True

        # Platform info
        platform_info = get_platform_info()
        print_info(f"Platform: {platform_info['system']} ({platform_info['platform']})")
        print_info(f"Python: {platform_info['python_version']}")

        # Python version
        if not check_python_version("3.12"):
            self.errors.append("Python 3.12+ is required")
            passed = False
        else:
            print_success("Python version meets requirements")

        # Node.js version
        if not check_node_version("24.0.0"):
            self.warnings.append("Node.js 24.0.0+ is recommended")
            print_warning("Node.js version check failed")
        else:
            print_success("Node.js version meets requirements")

        # Check required tools
        tools = {
            "uv": "UV package manager",
            "yarn": "Yarn package manager",
            "git": "Git version control",
        }

        for tool, description in tools.items():
            if find_executable(tool):
                print_success(f"{description} found")
            else:
                if tool == "uv":
                    self.errors.append(f"{description} not found")
                    passed = False
                else:
                    self.warnings.append(f"{description} not found")

        return passed

    def check_environment(self) -> bool:
        """Check environment configuration"""
        passed = True

        # Check .env file exists
        env_path = self.project_root / ".env"
        if not env_path.exists():
            self.errors.append(".env file not found - copy from .env.example")
            print_error(".env file not found")
            return False

        # Load and validate environment variables
        env_vars = load_env_file(env_path)
        required_vars = [
            "SECRET_KEY",
            "DATABASE_URL",
            "SNAPTRADE_CLIENT_ID",
            "SNAPTRADE_CONSUMER_KEY",
        ]

        for var in required_vars:
            if var in env_vars and env_vars[var]:
                print_success(f"{var} is set")
            else:
                self.errors.append(f"{var} not set in .env")
                print_error(f"{var} not set")
                passed = False

        # Check for default values
        if env_vars.get("SECRET_KEY") == "your-secret-key-here-change-in-production":
            self.warnings.append("Using default SECRET_KEY - change for production")
            print_warning("Using default SECRET_KEY")

        return passed

    def check_python_dependencies(self) -> bool:
        """Check Python dependencies are installed"""
        try:
            # Check if virtual environment exists
            venv_path = self.project_root / ".venv"
            if not venv_path.exists():
                print_info("No .venv found - using uv managed environment")

            # Try importing key dependencies
            try:
                import fastapi
                import sqlalchemy
                import uvicorn

                print_success("Core Python dependencies installed")
            except ImportError as e:
                self.errors.append(f"Missing Python dependency: {e.name}")
                print_error(f"Missing dependency: {e.name}")
                return False

            # Check uv sync status
            result = run_command(
                ["uv", "sync", "--dry-run"], cwd=self.project_root, capture_output=True, check=False
            )

            if result.returncode == 0:
                print_success("Python dependencies are in sync")
            else:
                self.warnings.append("Python dependencies may need syncing")
                print_warning("Run 'uv sync' to update dependencies")

            return True

        except Exception as e:
            self.errors.append(f"Failed to check Python dependencies: {e}")
            return False

    def check_node_dependencies(self) -> bool:
        """Check Node.js dependencies are installed"""
        frontend_path = self.project_root / "frontend"

        # Check if node_modules exists
        node_modules = frontend_path / "node_modules"
        if not node_modules.exists():
            self.errors.append("Frontend dependencies not installed")
            print_error("node_modules not found - run 'yarn install' in frontend/")
            return False

        # Check package.json exists
        package_json = frontend_path / "package.json"
        if not package_json.exists():
            self.errors.append("frontend/package.json not found")
            return False

        # Verify key dependencies
        try:
            with open(package_json) as f:
                package_data = json.load(f)

            deps = package_data.get("dependencies", {})
            required_deps = ["react", "vite", "@tanstack/react-query"]

            for dep in required_deps:
                if dep in deps:
                    print_success(f"Frontend dependency '{dep}' found")
                else:
                    self.warnings.append(f"Expected frontend dependency '{dep}' not found")

        except Exception as e:
            self.errors.append(f"Failed to check frontend dependencies: {e}")
            return False

        return True

    def check_database(self) -> bool:
        """Check database connectivity and setup"""
        try:
            from sqlalchemy import create_engine, inspect
            from src.core.config import settings

            # Create engine and test connection
            engine = create_engine(settings.database_url)

            # Test connection
            with engine.connect() as conn:
                print_success("Database connection successful")

            # Check tables exist
            inspector = inspect(engine)
            tables = inspector.get_table_names()

            expected_tables = ["users", "positions", "transactions", "task_templates"]

            missing_tables = []
            for table in expected_tables:
                if table in tables:
                    print_success(f"Table '{table}' exists")
                else:
                    missing_tables.append(table)

            if missing_tables:
                self.errors.append(f"Missing database tables: {', '.join(missing_tables)}")
                print_error("Run 'python scripts/init_db.py' to create tables")
                return False

            # Check for test data
            from src.db.session import SessionLocal
            from src.db.models import User

            db = SessionLocal()
            try:
                user_count = db.query(User).count()
                if user_count > 0:
                    print_success(f"Found {user_count} user(s) in database")
                else:
                    self.warnings.append("No users found - run init_db.py to seed data")
                    print_warning("No test data found")
            finally:
                db.close()

            return True

        except Exception as e:
            self.errors.append(f"Database check failed: {e}")
            print_error(f"Database error: {e}")
            return False

    def check_backend_api(self) -> bool:
        """Check if backend API is accessible"""
        # First check if backend is running
        if not self._is_backend_running():
            if self.skip_backend_start:
                print_warning("Backend API not running - skipping API tests")
                self.warnings.append("Backend API not tested (use --no-skip-backend to test)")
                return True
            else:
                print_warning("Backend API not running - starting it for verification")
                if not self._start_backend_for_test():
                    self.warnings.append("Could not start backend API for testing")
                    print_info("Start backend manually with: uv run uvicorn src.api.main:app")
                    return True

        # Test API endpoints
        endpoints = [
            ("/health", "Health check"),
            ("/api/health/detailed", "Detailed health"),
            ("/docs", "API documentation"),
        ]

        all_passed = True
        for endpoint, description in endpoints:
            try:
                url = urljoin(self.backend_url, endpoint)
                response = requests.get(url, timeout=5)

                if response.status_code == 200:
                    print_success(f"{description} endpoint accessible")
                else:
                    self.warnings.append(f"{description} returned {response.status_code}")
                    print_warning(f"{description} returned {response.status_code}")

            except requests.RequestException as e:
                self.errors.append(f"Failed to access {description}: {e}")
                print_error(f"Cannot access {description}")
                all_passed = False

        return all_passed

    def check_frontend(self) -> bool:
        """Check frontend build and configuration"""
        frontend_path = self.project_root / "frontend"

        # Check if build exists
        dist_path = frontend_path / "dist"
        if dist_path.exists():
            print_success("Frontend build directory exists")
        else:
            print_info("No frontend build found - this is normal for development")

        # Check frontend configuration
        vite_config = frontend_path / "vite.config.ts"
        if not vite_config.exists():
            self.errors.append("Frontend vite.config.ts not found")
            return False

        # Check API client configuration
        api_client = frontend_path / "src" / "lib" / "api-client.ts"
        if api_client.exists():
            print_success("API client configuration found")
        else:
            self.warnings.append("API client configuration not found")

        return True

    def check_snaptrade_config(self) -> bool:
        """Check SnapTrade configuration"""
        try:
            from src.core.config import settings

            # Check if credentials are set
            if hasattr(settings, "snaptrade_client_id") and settings.snaptrade_client_id:
                print_success("SnapTrade client ID configured")
            else:
                self.errors.append("SnapTrade client ID not configured")
                return False

            if hasattr(settings, "snaptrade_consumer_key") and settings.snaptrade_consumer_key:
                print_success("SnapTrade consumer key configured")
            else:
                self.errors.append("SnapTrade consumer key not configured")
                return False

            # Check environment setting
            env = getattr(settings, "snaptrade_environment", "sandbox")
            print_info(f"SnapTrade environment: {env}")

            if env == "production":
                self.warnings.append("Using SnapTrade production environment")

            return True

        except Exception as e:
            self.errors.append(f"Failed to check SnapTrade config: {e}")
            return False

    def _is_backend_running(self) -> bool:
        """Check if backend is already running"""
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=2)
            return response.status_code == 200
        except:
            return False

    def _start_backend_for_test(self) -> bool:
        """Start backend temporarily for testing"""
        try:
            # Check if port is already in use
            if not check_port_available(8000):
                print_info("Port 8000 already in use")
                return False

            # Start backend in background
            process = subprocess.Popen(
                ["uv", "run", "uvicorn", "src.api.main:app", "--port", "8000"],
                cwd=self.project_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            # Give it a moment to start
            time.sleep(2)

            # Check if process is still running
            if process.poll() is not None:
                # Process terminated, check error
                stdout, stderr = process.communicate()
                logger.error(f"Backend failed to start: {stderr}")
                return False

            # Wait for it to be ready
            if wait_for_port(8000, timeout=10):
                print_success("Backend API started successfully")
                # Kill it after tests
                process.terminate()
                process.wait(timeout=5)
                return True
            else:
                process.terminate()
                process.wait(timeout=5)
                return False

        except Exception as e:
            logger.error(f"Failed to start backend: {e}")
            return False

    def print_summary(self):
        """Print verification summary"""
        print("\n" + "=" * 60)
        print("VERIFICATION SUMMARY")
        print("=" * 60)

        if not self.errors and not self.warnings:
            print_success("All checks passed! Your AIMS setup is ready.")
        else:
            if self.errors:
                print(f"\n{len(self.errors)} Error(s) found:")
                for error in self.errors:
                    print_error(f"  - {error}")

            if self.warnings:
                print(f"\n{len(self.warnings)} Warning(s) found:")
                for warning in self.warnings:
                    print_warning(f"  - {warning}")

        print("\n" + "=" * 60)

        if self.errors:
            print("\nNext steps to fix errors:")
            if any(".env" in e for e in self.errors):
                print("  1. Copy .env.example to .env and update values")
            if any("database" in e.lower() for e in self.errors):
                print("  2. Run: uv run python scripts/init_db.py")
            if any("dependencies" in e for e in self.errors):
                print("  3. Run: uv sync (for Python) or yarn install (for frontend)")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Verify AIMS setup")
    parser.add_argument("--quick", action="store_true", help="Skip slow checks")
    parser.add_argument("--backend-url", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--frontend-url", default="http://localhost:3000", help="Frontend URL")
    parser.add_argument(
        "--skip-backend", action="store_true", help="Skip backend startup if not running"
    )

    args = parser.parse_args()

    verifier = SetupVerifier()
    if args.backend_url:
        verifier.backend_url = args.backend_url
    if args.frontend_url:
        verifier.frontend_url = args.frontend_url
    if args.skip_backend:
        verifier.skip_backend_start = True

    success = verifier.run_all_checks()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
