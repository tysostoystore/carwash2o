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

# Запуск по имени процесса (используется process groups в fly.toml)
case "$1" in
  app)
    echo "START.SH: launching backend/server.js"
    exec node backend/server.js
    ;;
  bot)
    echo "START.SH: launching bot.js"
    exec node bot.js
    ;;
  *)
    echo "START.SH: default -> backend/server.js (arg='$1')"
    exec node backend/server.js
    ;;
esac