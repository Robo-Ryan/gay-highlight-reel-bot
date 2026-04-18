#!/bin/bash

# Deployment script for Gay Highlight Reel Bot
# Usage: ./deploy.sh [environment]
# Environments: dev, prod

# Exit on error
set -e

# Default environment is dev
ENVIRONMENT="${1:-dev}"

# Configuration for different environments
if [ "$ENVIRONMENT" = "prod" ]; then
    HOST="ryan@100.86.4.92"
    REMOTE_DIR="/home/ryan/Video-stitcher-bot"
    echo "Deploying to production environment..."
else
    HOST="ryan@100.86.4.92"
    REMOTE_DIR="/home/ryan/Video-stitcher-bot-dev"
    echo "Deploying to development environment..."
fi

# Ensure Tailscale is running
echo "Checking Tailscale connection..."
if ! tailscale status > /dev/null 2>&1; then
    echo "Tailscale is not running. Please start Tailscale and try again."
    exit 1
fi

# Verify SSH connection
echo "Testing SSH connection to $HOST..."
if ! ssh -o ConnectTimeout=5 "$HOST" "exit"; then
    echo "Unable to connect to $HOST. Please check your SSH configuration."
    exit 1
fi

# Build frontend assets if needed
echo "Building frontend assets..."
# npm run build  # Uncomment if you have a build process

# Create deployment package
echo "Creating deployment package..."
DEPLOY_PACKAGE="deployment-$(date +%Y%m%d-%H%M%S).tar.gz"

# Create a list of files to exclude from deployment
cat > .deployignore << 'EOF'
node_modules/
.git/
.vscode/
*.log
*.env
.env*
*.sh
*.md
README.md
DEPLOYMENT_GUIDE.md
EOF

# Create the deployment package
# Use --exclude-from to exclude files listed in .deployignore
tar --exclude-from=.deployignore -czf "$DEPLOY_PACKAGE" .

# Clean up .deployignore
rm .deployignore

# Transfer the deployment package to the remote server
echo "Transferring deployment package to $HOST..."
scp "$DEPLOY_PACKAGE" "$HOST:$REMOTE_DIR/"

# Extract and deploy on the remote server
echo "Deploying on remote server..."
ssh "$HOST" << 'EOF'
set -e
HOSTNAME=$(hostname)

echo "Deploying on $HOSTNAME..."

echo "Creating remote directory if it doesn't exist..."
mkdir -p "$REMOTE_DIR"

echo "Changing to remote directory..."
cd "$REMOTE_DIR"

echo "Extracting deployment package..."
tar -xzf "$DEPLOY_PACKAGE"

echo "Removing deployment package..."
rm "$DEPLOY_PACKAGE"

echo "Installing dependencies..."
npm install --production

echo "Setting up environment variables..."
# Create .env file if it doesn't exist
touch .env
# Ensure environment variables are set
echo "FEATURE_WHO_MADE_PLAY=true" >> .env

echo "Starting PM2 process..."
pm2 start ecosystem.config.js --env "$ENVIRONMENT"

echo "Cleanup old deployment packages..."
ls -t deployment-*.tar.gz | tail -n +6 | xargs rm -f 2>/dev/null || true

echo "Deployment completed successfully!"
EOF

# Remove local deployment package
rm "$DEPLOY_PACKAGE"

echo "Local cleanup completed."
echo "Deployment finished successfully!"
echo "Application is now running on $HOST in $ENVIRONMENT mode."

# Display instructions for monitoring
echo ""
echo "To monitor the application, use one of the following commands:"
echo "  ssh $HOST 'pm2 logs'                   # View logs"
echo "  ssh $HOST 'pm2 status'                 # View process status"
echo "  ssh $HOST 'pm2 monit'                  # Monitor resource usage"
echo ""
echo "To restart the application, use: ssh $HOST 'pm2 restart ecosystem.config.js --env $ENVIRONMENT'"

exit 0