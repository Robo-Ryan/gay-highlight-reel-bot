# Deployment Guide: Gay Highlight Reel Bot

## System Architecture

- Telegram bot receives video messages
- Videos stored in queue with metadata
- Final rendering on command with approval workflow
- Deployed on old Mac with Tailscale remote access

## Deployment Strategy

### Git-based Deployment (Recommended)

1. **Code Updates**:
   ```bash
   ssh ryanmerlini@100.86.4.92 "cd ~/Video-stitcher-bot && git pull && pm2 reload highlightreel"
   ```

2. **Benefits**:
   - Version control and audit trail
   - Easy rollback to previous versions
   - Clear change management
   - Reproducible deployments

### Tailscale Operations

1. **Direct Access**:
   ```bash
   ssh ryanmerlini@100.86.4.92
   ```

2. **Use Cases**:
   - Monitoring and troubleshooting
   - Log file access and analysis
   - Immediate process management
   - File transfer and media management

## Hybrid Approach

Combine both methods for maximum reliability:

1. Use Git for all code deployments
2. Use Tailscale SSH for operations and monitoring
3. Keep both methods available as fallbacks

## Security Considerations

- All communication encrypted via Tailscale
- SSH key authentication only
- Bot token stored in environment variables
- Repository does not contain secrets

## Recovery Procedures

### Git Deployment Failure
1. Verify connectivity: `ping 100.86.4.92`
2. Check Tailscale status on both ends
3. Fallback to direct file transfer via Tailscale file sharing

### Service Failure
1. Check status: `pm2 status`
2. View logs: `pm2 logs highlightreel`
3. Restart: `pm2 restart highlightreel`

## Future Projects

All future video processing projects should follow this pattern:
- Git for code deployment
- Tailscale for operations
- PM2 for process management
- Environment variables for configuration
- Feature flags for phased rollouts