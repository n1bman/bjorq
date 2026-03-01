#!/bin/bash
echo "Installing bjorQ Dashboard server dependencies..."
cd server
npm install --omit=dev
cd ..
echo "Done! Run ./start.sh to launch."
