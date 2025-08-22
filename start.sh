#!/bin/sh
set -x
echo "START.SH: PID=$$ (main shell PID)"
echo "START.SH: ENVIRONMENT VARIABLES:"
env | sort

# Логируем открытые порты перед запуском
if command -v netstat >/dev/null 2>&1; then
  echo "START.SH: Open ports before launch (netstat):"
  netstat -tulpn || true
elif command -v lsof >/dev/null 2>&1; then
  echo "START.SH: Open ports before launch (lsof):"
  lsof -i || true
else
  echo "START.SH: No netstat/lsof available for port listing."
fi

# Единый запуск: backend и bot вместе (для одной машины на Free tier)
# Если переданы явные аргументы, поддерживаем старый режим для совместимости
case "$1" in
  app)
    echo "START.SH: launching backend/server.js (legacy single-process mode)"
    # Explicitly set HOST to 0.0.0.0 for Fly.io
    HOST=0.0.0.0 PORT=3000 exec node backend/server.js
    ;;
  bot)
    echo "START.SH: launching bot.js (legacy single-process mode)"
    exec node bot.js
    ;;
  *)
    echo "START.SH: launching BOTH: backend/server.js + bot.js via concurrently"
    # Explicitly set HOST to 0.0.0.0 for Fly.io
    HOST=0.0.0.0 PORT=3000 exec concurrently "node backend/server.js" "node bot.js"
    ;;
esac