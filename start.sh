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
    cd server && npm ci --omit=dev && cd ..
    echo "  Dependencies installed."
fi

PORT=${PORT:-3000}
echo ""
echo "  Starting server..."
echo "  -------------------"
echo "  Local:   http://localhost:$PORT"
echo "  Data:    $(pwd)/data"
echo "  (Set PORT=8080 before running to change port)"
echo ""

node server/server.js
