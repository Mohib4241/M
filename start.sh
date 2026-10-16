#!/usr/bin/env bash
# One command to run hand control on macOS or Linux:   ./start.sh
# It makes a private Python environment in .venv, so nothing else on your computer changes
# (your Anaconda or system packages stay as they are), installs what it needs once, and starts.
set -e
cd "$(dirname "$0")"
PY="${PYTHON:-python3}"
if [ ! -d .venv ]; then
  echo "Creating a private environment in .venv ..."
  "$PY" -m venv .venv
fi
. .venv/bin/activate
if ! python -c "import mediapipe, cv2, aiohttp" 2>/dev/null; then
  echo "Installing the hand tracking packages (first time only, about 150 MB) ..."
  pip install -q --upgrade pip
  pip install -q -r requirements.txt
fi
exec python jarvis.py "$@"
