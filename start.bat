@echo off
rem One command to run hand control on Windows:   start.bat
rem Makes a private Python environment in .venv, installs what it needs once, and starts.
cd /d "%~dp0"
if not exist .venv (
  echo Creating a private environment in .venv ...
  python -m venv .venv
)
call .venv\Scripts\activate.bat
python -c "import mediapipe, cv2, aiohttp" 2>nul
if errorlevel 1 (
  echo Installing the hand tracking packages (first time only, about 150 MB) ...
  pip install -q -r requirements.txt
)
python jarvis.py %*
