#!/bin/bash
# Setup script for ALECS nginx configuration

echo "Setting up ALECS nginx configuration..."

# Copy the config to sites-available
sudo cp /home/alex/alecs-mcp-server-akamai/nginx/web01-cloud-solutionsedge.conf /etc/nginx/sites-available/

# Create symlink in sites-enabled
sudo ln -sf /etc/nginx/sites-available/web01-cloud-solutionsedge.conf /etc/nginx/sites-enabled/

# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

# If test passes, reload nginx
if [ $? -eq 0 ]; then
    echo "Configuration test passed. Reloading nginx..."
    sudo systemctl reload nginx
    echo "Nginx reloaded successfully!"
else
    echo "Configuration test failed. Please check the configuration."
    exit 1
fi

echo "Setup complete!"
echo ""
echo "ALECS should now be accessible at:"
echo "  - https://web01.cloud.solutionsedge.io (HTTPS on port 443)"
echo "  - ws://web01.cloud.solutionsedge.io:8082/mcp (WebSocket direct)"