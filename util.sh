#!/bin/bash
echo Running Script 1...
python3 tool_generate_xls.py
echo ""
sleep 3 # seconds
echo Running Script 2...
python3 tool_generate_tts.py