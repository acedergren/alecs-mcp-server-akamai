#!/bin/bash

# ALECS Server Management Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

case "$1" in
  start)
    echo "Starting ALECS server..."
    cd "$PROJECT_ROOT"
    node dist/index.js "$@"
    ;;
    
  start-silent)
    echo "Starting ALECS server in silent mode..."
    cd "$PROJECT_ROOT"
    nohup node dist/index.js --silent > /dev/null 2>&1 &
    echo "Server started in background with PID: $!"
    ;;
    
  stop)
    echo "Stopping all ALECS server instances..."
    ps aux | grep -E "node.*alecs|node.*dist/index.js" | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null
    echo "All server instances stopped."
    ;;
    
  restart)
    $0 stop
    sleep 1
    $0 start
    ;;
    
  status)
    echo "ALECS Server Status:"
    echo "==================="
    PROCS=$(ps aux | grep -E "node.*alecs|node.*dist/index.js" | grep -v grep)
    if [ -z "$PROCS" ]; then
      echo "No ALECS server instances running."
    else
      echo "Running instances:"
      echo "$PROCS" | awk '{printf "PID: %s, CPU: %s%%, MEM: %s%%, Started: %s %s\n", $2, $3, $4, $9, $10}'
    fi
    ;;
    
  logs)
    echo "ALECS Server Logs:"
    echo "=================="
    if [ -f "$PROJECT_ROOT/logs/alecs.log" ]; then
      tail -f "$PROJECT_ROOT/logs/alecs.log"
    else
      echo "No log file found. Run with --debug to enable logging."
    fi
    ;;
    
  *)
    echo "ALECS Server Management"
    echo "======================="
    echo "Usage: $0 {start|start-silent|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start         - Start server in foreground"
    echo "  start-silent  - Start server in background (silent mode)"
    echo "  stop          - Stop all running instances"
    echo "  restart       - Restart the server"
    echo "  status        - Show running instances"
    echo "  logs          - Tail server logs"
    echo ""
    echo "Examples:"
    echo "  $0 start --section production"
    echo "  $0 start-silent"
    echo "  $0 status"
    exit 1
    ;;
esac