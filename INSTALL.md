# Installing Google Calendar MCP Server in Repo

The Google Calendar MCP server is installed in the repo's `mcp/google-calendar/` directory as a git submodule.

## Installation Steps

1. **Initialize the submodule:**
   ```bash
   cd /Users/markmhendrickson/repos/personal
   git submodule update --init mcp/google-calendar
   ```

   Or if the submodule isn't configured yet, add it:
   ```bash
   git submodule add https://github.com/markmhendrickson/mcp-server-google-calendar.git mcp/google-calendar
   ```

2. **Install dependencies and build:**
   
   This is a Node.js/TypeScript project:
   ```bash
   cd /Users/markmhendrickson/repos/personal/mcp/google-calendar
   npm install
   npm run build
   ```

3. **Verify installation:**
   ```bash
   test -f build/index.js && echo "✓ Server built successfully"
   ```

## Configuration

The wrapper script (`run-google-calendar-mcp.sh`) automatically:
- Loads environment variables from `.env` file
- Sets `MCP_CALENDAR_CREDENTIALS_PATH` to `.creds/gcp-oauth.keys.json` (repo)
- Sets `MCP_CALENDAR_TOKEN_PATH` to `.creds/google-calendar-token.json` (repo)
- Uses Node.js to run the server
- Auto-builds if `build/index.js` doesn't exist

All credentials and tokens are stored in the repo's `.creds/` directory, never in `~/.local/`.

## Troubleshooting

### npm Permission Issues

If you see npm permission errors:
```bash
sudo chown -R $(whoami) ~/.npm
```

Then retry:
```bash
npm install
npm run build
```

### Auto-Build

The wrapper script will automatically try to build if `build/index.js` doesn't exist. If npm permissions are fixed, this will work automatically on first server start.
