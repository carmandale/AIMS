"""
Cross-platform utilities for AIMS development setup scripts.

This module provides helper functions for OS detection, path handling,
process management, and other common operations needed across setup scripts.
"""

import os
import sys
import platform
import subprocess
import shutil
import json
import time
from pathlib import Path
from typing import Optional, Dict, List, Tuple, Union


class Colors:
    """ANSI color codes for terminal output."""

    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKCYAN = "\033[96m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


def get_platform_info() -> Dict[str, str]:
    """Get detailed platform information."""
    return {
        "system": platform.system(),  # Windows, Darwin, Linux
        "platform": sys.platform,  # win32, darwin, linux
        "version": platform.version(),
        "architecture": platform.machine(),
        "python_version": platform.python_version(),
        "is_windows": sys.platform == "win32",
        "is_macos": sys.platform == "darwin",
        "is_linux": sys.platform.startswith("linux"),
    }


def get_project_root() -> Path:
    """Get the absolute path to the project root directory."""
    # Navigate up from scripts directory to find project root
    current_file = Path(__file__).resolve()
    scripts_dir = current_file.parent
    project_root = scripts_dir.parent

    # Verify we're in the right place by checking for key files
    if not (project_root / "pyproject.toml").exists():
        raise RuntimeError(f"Cannot find project root. Expected pyproject.toml in {project_root}")

    return project_root


def ensure_directory(path: Union[str, Path]) -> Path:
    """Ensure a directory exists, creating it if necessary."""
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def find_executable(name: str) -> Optional[str]:
    """Find an executable in the system PATH."""
    return shutil.which(name)


def run_command(
    command: List[str],
    cwd: Optional[Union[str, Path]] = None,
    env: Optional[Dict[str, str]] = None,
    capture_output: bool = True,
    check: bool = True,
    shell: bool = False,
) -> subprocess.CompletedProcess:
    """
    Run a command with cross-platform support.

    Args:
        command: Command and arguments as a list
        cwd: Working directory for the command
        env: Environment variables (merged with current environment)
        capture_output: Whether to capture stdout/stderr
        check: Whether to raise exception on non-zero exit
        shell: Whether to run through shell (use carefully)

    Returns:
        CompletedProcess instance
    """
    if env:
        full_env = os.environ.copy()
        full_env.update(env)
    else:
        full_env = None

    # Convert Path objects to strings
    if cwd:
        cwd = str(cwd)

    # Handle Windows-specific command adjustments
    if sys.platform == "win32" and not shell:
        # Convert Unix-style commands to Windows equivalents
        if command[0] == "cp":
            command[0] = "copy"
        elif command[0] == "rm":
            command[0] = "del"
        elif command[0] == "mv":
            command[0] = "move"

    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            env=full_env,
            capture_output=capture_output,
            text=True,
            check=check,
            shell=shell,
        )
        return result
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed: {' '.join(command)}")
        if e.stdout:
            print_error(f"stdout: {e.stdout}")
        if e.stderr:
            print_error(f"stderr: {e.stderr}")
        raise


def check_python_version(required: str = "3.12") -> bool:
    """Check if Python version meets minimum requirement."""
    current = sys.version_info
    required_parts = [int(x) for x in required.split(".")]

    for i, (curr, req) in enumerate(zip(current, required_parts)):
        if curr > req:
            return True
        elif curr < req:
            return False

    return True


def check_node_version(required: str = "24.0.0") -> bool:
    """Check if Node.js version meets minimum requirement."""
    try:
        result = run_command(["node", "--version"], capture_output=True, check=False)
        if result.returncode != 0:
            return False

        version_str = result.stdout.strip().lstrip("v")
        current_parts = [int(x) for x in version_str.split(".")]
        required_parts = [int(x) for x in required.split(".")]

        for curr, req in zip(current_parts, required_parts):
            if curr > req:
                return True
            elif curr < req:
                return False

        return True
    except (FileNotFoundError, ValueError):
        return False


def load_env_file(env_path: Union[str, Path]) -> Dict[str, str]:
    """Load environment variables from a .env file."""
    env_vars = {}
    env_path = Path(env_path)

    if not env_path.exists():
        return env_vars

    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and comments
            if not line or line.startswith("#"):
                continue

            # Parse KEY=VALUE format
            if "=" in line:
                key, value = line.split("=", 1)
                # Remove quotes if present
                value = value.strip('"').strip("'")
                env_vars[key.strip()] = value

    return env_vars


def check_port_available(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a port is available for binding."""
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((host, port))
            return True
        except socket.error:
            return False


def wait_for_port(port: int, host: str = "127.0.0.1", timeout: int = 30) -> bool:
    """Wait for a service to start listening on a port."""
    import socket

    start_time = time.time()
    while time.time() - start_time < timeout:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.connect((host, port))
                return True
            except (socket.error, ConnectionRefusedError):
                time.sleep(0.5)

    return False


def print_header(message: str) -> None:
    """Print a formatted header message."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{message.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 60}{Colors.ENDC}\n")


def print_success(message: str) -> None:
    """Print a success message in green."""
    print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")


def print_error(message: str) -> None:
    """Print an error message in red."""
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")


def print_warning(message: str) -> None:
    """Print a warning message in yellow."""
    print(f"{Colors.WARNING}⚠ {message}{Colors.ENDC}")


def print_info(message: str) -> None:
    """Print an info message in blue."""
    print(f"{Colors.OKBLUE}ℹ {message}{Colors.ENDC}")


def get_shell_command() -> List[str]:
    """Get the appropriate shell command for the current platform."""
    if sys.platform == "win32":
        # Try PowerShell first, fall back to cmd
        if find_executable("powershell"):
            return ["powershell", "-Command"]
        else:
            return ["cmd", "/c"]
    else:
        # Unix-like systems
        return ["sh", "-c"]


def get_python_command() -> str:
    """Get the appropriate Python command for the current environment."""
    # First check if we're in a virtual environment
    if hasattr(sys, "real_prefix") or (
        hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix
    ):
        return sys.executable

    # Check for common Python commands
    for cmd in ["python3", "python"]:
        if find_executable(cmd):
            return cmd

    # Fallback to current interpreter
    return sys.executable


def get_package_manager_command(manager: str) -> Optional[List[str]]:
    """Get the appropriate package manager command."""
    commands = {
        "npm": ["npm"],
        "yarn": ["yarn"],
        "pnpm": ["pnpm"],
        "pip": [get_python_command(), "-m", "pip"],
        "uv": ["uv"],
    }

    if manager not in commands:
        return None

    cmd = commands[manager]
    # Check if the command exists
    if find_executable(cmd[0]):
        return cmd

    return None


def format_time_elapsed(seconds: float) -> str:
    """Format elapsed time in a human-readable format."""
    if seconds < 60:
        return f"{seconds:.1f} seconds"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f} minutes"
    else:
        hours = seconds / 3600
        return f"{hours:.1f} hours"


def create_launcher_script(
    script_path: Union[str, Path],
    commands: List[str],
    env_vars: Optional[Dict[str, str]] = None,
    working_dir: Optional[Union[str, Path]] = None,
) -> None:
    """
    Create a platform-specific launcher script.

    Args:
        script_path: Path where the script will be created
        commands: List of commands to execute
        env_vars: Optional environment variables to set
        working_dir: Optional working directory
    """
    script_path = Path(script_path)

    if sys.platform == "win32":
        # Create a batch file for Windows
        content = "@echo off\n"

        if working_dir:
            content += f'cd /d "{working_dir}"\n'

        if env_vars:
            for key, value in env_vars.items():
                content += f"set {key}={value}\n"

        for cmd in commands:
            content += f"{cmd}\n"

        script_path = script_path.with_suffix(".bat")
    else:
        # Create a shell script for Unix-like systems
        content = "#!/bin/bash\n"

        if working_dir:
            content += f'cd "{working_dir}"\n'

        if env_vars:
            for key, value in env_vars.items():
                content += f'export {key}="{value}"\n'

        for cmd in commands:
            content += f"{cmd}\n"

        script_path = script_path.with_suffix(".sh")

    # Write the script
    with open(script_path, "w", newline="\n" if sys.platform != "win32" else None) as f:
        f.write(content)

    # Make it executable on Unix-like systems
    if sys.platform != "win32":
        os.chmod(script_path, 0o755)


def is_process_running(process_name: str) -> bool:
    """Check if a process with the given name is running."""
    try:
        if sys.platform == "win32":
            result = run_command(
                ["tasklist", "/FI", f"IMAGENAME eq {process_name}"],
                capture_output=True,
                check=False,
            )
            return process_name.lower() in result.stdout.lower()
        else:
            result = run_command(["pgrep", "-f", process_name], capture_output=True, check=False)
            return result.returncode == 0
    except Exception:
        return False


def kill_process_on_port(port: int) -> bool:
    """Kill any process listening on the specified port."""
    try:
        if sys.platform == "win32":
            # Find process using netstat
            result = run_command(["netstat", "-ano", "-p", "tcp"], capture_output=True, check=False)

            for line in result.stdout.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    # Extract PID
                    parts = line.split()
                    pid = parts[-1]
                    # Kill the process
                    run_command(["taskkill", "/F", "/PID", pid], check=False)
                    return True
        else:
            # Use lsof on Unix-like systems
            result = run_command(["lsof", "-ti", f":{port}"], capture_output=True, check=False)

            if result.stdout.strip():
                pids = result.stdout.strip().split("\n")
                for pid in pids:
                    run_command(["kill", "-9", pid], check=False)
                return True
    except Exception:
        pass

    return False


def setup_logging(name: str) -> "logging.Logger":
    """Setup logging configuration for scripts."""
    import logging

    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)

    # Format
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(formatter)

    # Add handler
    logger.addHandler(console_handler)

    return logger


def confirm_action(prompt: str) -> bool:
    """Ask user to confirm an action."""
    while True:
        response = input(f"{prompt} [y/N]: ").lower().strip()
        if response in ["y", "yes"]:
            return True
        elif response in ["n", "no", ""]:
            return False
        else:
            print("Please answer 'y' or 'n'.")


if __name__ == "__main__":
    # Quick test of utilities
    print_header("AIMS Setup Utilities Test")

    platform_info = get_platform_info()
    print_info("Platform Information:")
    for key, value in platform_info.items():
        print(f"  {key}: {value}")

    print_info(f"\nProject root: {get_project_root()}")
    print_info(f"Python command: {get_python_command()}")

    if check_python_version("3.12"):
        print_success("Python version meets requirements")
    else:
        print_error("Python version does not meet requirements")

    if check_node_version("24.0.0"):
        print_success("Node.js version meets requirements")
    else:
        print_warning("Node.js version check failed or doesn't meet requirements")
