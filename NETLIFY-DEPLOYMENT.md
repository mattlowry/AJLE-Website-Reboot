# Netlify Deployment Configuration

This document explains the Netlify deployment configuration for the AJ Long Electric website.

## Problem Solved

Netlify was incorrectly looking for a base directory "AJLE-Website-Reboot" that doesn't exist, causing deployment failures. This configuration forces Netlify to deploy from the root directory, overriding any UI settings.

## Configuration Files

### 1. netlify.toml
- **Purpose**: Main Netlify configuration file
- **Key Settings**:
  - `base = ""` - Forces root directory as base
  - `publish = "."` - Publishes from root directory
  - `functions = "netlify/functions"` - Functions directory
  - `ignore = "exit 0"` - Ignores any build commands

### 2. .netlify/state.json
- **Purpose**: Overrides Netlify UI settings
- **Function**: Ensures local configuration takes precedence over web UI settings

### 3. _netlify
- **Purpose**: Deployment marker file
- **Function**: Helps Netlify identify the correct base directory

### 4. .netlifyrc
- **Purpose**: Runtime configuration
- **Function**: Additional configuration for local development and deployment

### 5. verify-netlify-deploy.sh
- **Purpose**: Verification script
- **Function**: Validates that all configuration is correct
- **Usage**: `./verify-netlify-deploy.sh`

## Deployment Process

1. **Automatic Deployment**:
   - Push to main branch triggers automatic deployment
   - Netlify reads `netlify.toml` for configuration
   - Site deploys from root directory

2. **Manual Deployment**:
   ```bash
   netlify deploy --prod
   ```

3. **Local Development**:
   ```bash
   netlify dev
   ```

## Troubleshooting

### If deployment still fails:

1. **Check Netlify UI Settings**:
   - Go to Site Settings > Build & Deploy
   - Ensure Base Directory is empty or set to `/`
   - Ensure Publish Directory is set to `.` or `/`

2. **Clear Netlify Cache**:
   ```bash
   netlify build --clear-cache
   ```

3. **Verify Configuration**:
   ```bash
   ./verify-netlify-deploy.sh
   ```

4. **Manual Override**:
   - In Netlify UI, go to Site Settings > Build & Deploy
   - Set Build Command to: (empty)
   - Set Publish Directory to: `.`
   - Set Functions Directory to: `netlify/functions`

## File Structure

The deployment expects this structure:
```
/
├── index.html                 # Main entry point
├── netlify.toml              # Netlify configuration
├── _netlify                  # Deployment marker
├── .netlify/
│   └── state.json           # UI override settings
├── .netlifyrc               # Runtime configuration
├── netlify/
│   └── functions/           # Serverless functions
└── ... (other site files)
```

## Security Headers

The configuration includes security headers:
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Redirects

Configured redirects:
- `/api/*` → `/.netlify/functions/:splat` (API routes)
- `/dashboard` → `/dashboard/index.html` (Dashboard routing)

## Environment Variables

Set in netlify.toml:
- NODE_VERSION = "18"
- NPM_VERSION = "8"

## Support

If you encounter deployment issues:
1. Run the verification script
2. Check the Netlify deploy logs
3. Ensure all configuration files are committed to git
4. Verify the site is connected to the correct repository and branch

## Last Updated
September 14, 2025