#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt

DOMAIN="web01.cloud.solutionsedge.io"
EMAIL="your-email@domain.com"  # Update this!

echo "Setting up SSL certificates for $DOMAIN..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Check if certificate already exists
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Certificate already exists for $DOMAIN"
    echo "Checking certificate status..."
    sudo certbot certificates
    
    echo ""
    echo "To renew the certificate manually, run:"
    echo "sudo certbot renew"
else
    echo "Obtaining new certificate for $DOMAIN..."
    
    # Stop nginx temporarily to use standalone mode
    echo "Stopping Nginx temporarily..."
    sudo systemctl stop nginx
    
    # Get certificate
    sudo certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --domains "$DOMAIN" \
        --keep-until-expiring \
        --expand
    
    # Start nginx again
    echo "Starting Nginx..."
    sudo systemctl start nginx
fi

# Setup auto-renewal
echo "Setting up auto-renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Create a post-renewal hook to reload nginx
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null <<'EOF'
#!/bin/bash
systemctl reload nginx
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Copy Nginx configuration
echo ""
echo "To enable the site configuration:"
echo "1. Update the email in this script and re-run if needed"
echo "2. Copy the Nginx configuration:"
echo "   sudo cp /home/alex/alecs-mcp-server-akamai/nginx/web01-cloud-solutionsedge.conf /etc/nginx/sites-available/"
echo "3. Enable the site:"
echo "   sudo ln -s /etc/nginx/sites-available/web01-cloud-solutionsedge.conf /etc/nginx/sites-enabled/"
echo "4. Test Nginx configuration:"
echo "   sudo nginx -t"
echo "5. Reload Nginx:"
echo "   sudo systemctl reload nginx"
echo ""
echo "Certificate status:"
sudo certbot certificates | grep -A 3 "$DOMAIN"