#!/bin/bash

echo "🚀 Stopping all ALECS Node Server Instances!"
echo "============================================"
echo ""
echo "If you see this messsage, ALECS will self-destruct in 5 seconds."
echo ""


pkill -f "node.*server\.js" || true
