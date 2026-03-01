#!/bin/bash
echo ""
echo "  bjorQ Dashboard"
echo "  ================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  ERROR: Node.js not found!"
    echo "  Install it: https://nodejs.org/ or 'sudo apt install nodejs'"
    echo ""
    exit 1
fi

echo "  Node.js $(node --version) detected"

# Auto-install server dependencies if missing
if [ ! -d "server/node_modules" ]; then
    echo "  Installing server dependencies..."
    cd server && npm install --omit=dev
    if [ $? -ne 0 ]; then
        echo ""
        echo "  ERROR: Failed to install server dependencies!"
        echo "  Check your internet connection and try again."
        echo ""
        exit 1
    fi
    cd ..
    echo "  Dependencies installed."
fi

PORT=${PORT:-3000}

# Detect network IP
NET_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$NET_IP" ] && NET_IP=$(ipconfig getifaddr en0 2>/dev/null)
[ -z "$NET_IP" ] && NET_IP="<your-ip>"

echo ""
echo "  Starting server..."
echo "  -------------------"
echo "  Local:   http://localhost:$PORT"
echo "  Network: http://$NET_IP:$PORT"
echo "  Data:    $(pwd)/data"
echo ""

# Best-effort browser open (non-fatal)
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT" 2>/dev/null &
elif command -v open &> /dev/null; then
    open "http://localhost:$PORT" 2>/dev/null &
fi

node server/server.js
