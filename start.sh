#!/bin/sh
echo "START.SH: launching backend/server.js"
node backend/server.js &
echo "START.SH: launching bot.js"
node bot.js