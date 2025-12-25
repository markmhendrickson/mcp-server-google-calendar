# Google Calendar MCP Server - Setup Guide

## Prerequisites

1. **Google Cloud Project** with Calendar API enabled
2. **OAuth 2.0 Credentials** (Desktop app type)
   - If you already have Gmail OAuth credentials at `~/.gmail-mcp/gcp-oauth.keys.json`, you can use the same file if Calendar API is enabled in the same Google Cloud project

## Setup Steps

### 1. Enable Google Calendar API

If you haven't already enabled the Calendar API in your Google Cloud project:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (same one used for Gmail if reusing credentials)
3. Go to "APIs & Services" > "Library"
4. Search for "Google Calendar API"
5. Click "Enable"

### 2. Configure OAuth Credentials

If using existing Gmail OAuth credentials (`~/.gmail-mcp/gcp-oauth.keys.json`):
- Make sure Calendar API is enabled in the same Google Cloud project
- The same credentials file will work

If creating new credentials:
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Desktop app" as application type
4. Download the JSON file
5. Save to `~/.gmail-mcp/gcp-oauth.keys.json` (or update the path in MCP config)

### 3. Install and Build

Already completed:
```bash
cd mcp-servers/google-calendar
npm install
npm run build
```

### 4. Authenticate

On first use, the MCP server will prompt for authentication. You can also authenticate manually:

```bash
cd mcp-servers/google-calendar
export GOOGLE_OAUTH_CREDENTIALS="$HOME/.gmail-mcp/gcp-oauth.keys.json"
npm run auth
```

Or using the built server directly:
```bash
export GOOGLE_OAUTH_CREDENTIALS="$HOME/.gmail-mcp/gcp-oauth.keys.json"
node build/index.js auth
```

### 5. Configure MCP Client

The server is configured in `mcp-servers/README.md`. Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "node",
      "args": [
        "$REPO_ROOT/mcp-servers/google-calendar/dist/index.js"
      ],
      "env": {
        "GOOGLE_OAUTH_CREDENTIALS": "$HOME/.gmail-mcp/gcp-oauth.keys.json"
      }
    }
  }
}
```

Note: The path uses `dist/` in the config but the build output is in `build/`. Update the config to use `build/index.js` instead.

### 6. Restart MCP Client

After configuration, restart Cursor/Claude Desktop to load the new MCP server.

## Features

- Multi-account support (work, personal calendars)
- Create, update, delete, and search events
- Check availability across calendars
- Respond to event invitations
- Smart event creation from images/text
- Recurring event management

## Troubleshooting

### Authentication Errors

- Verify `GOOGLE_OAUTH_CREDENTIALS` path is correct
- Ensure Calendar API is enabled in Google Cloud Console
- Try re-authenticating: `npm run auth`

### Token Expiration

If in test mode, tokens expire after 7 days. To avoid this:
1. Go to Google Cloud Console → "APIs & Services" → "OAuth consent screen"
2. Click "PUBLISH APP" (app remains unverified but tokens won't expire)

### Build Issues

- Ensure Node.js LTS version is installed
- Run `npm install && npm run build` again
- Delete `node_modules` and `build/` directories and rebuild

## Documentation

- Full README: `README.md`
- Authentication guide: `docs/authentication.md`
- Advanced usage: `docs/advanced-usage.md`

