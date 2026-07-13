#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import subprocess
import sys
from pathlib import Path


def _venv_python():
    return Path(__file__).resolve().parent / ".venv" / "Scripts" / "python.exe"


def _reexec_with_venv():
    """Always use project .venv when present (portable SSD / multi-PC workflow)."""
    if os.environ.get("KEDI_VENV_REEXEC"):
        return False

    venv_python = _venv_python()
    if not venv_python.exists():
        return False

    env = os.environ.copy()
    env["KEDI_VENV_REEXEC"] = "1"
    result = subprocess.call([str(venv_python), str(Path(__file__).resolve()), *sys.argv[1:]], env=env)
    sys.exit(result)


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    if _reexec_with_venv():
        return

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Run: ..\\scripts\\bootstrap.ps1 "
            "(or setup-local.ps1) to create the project virtual environment."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
