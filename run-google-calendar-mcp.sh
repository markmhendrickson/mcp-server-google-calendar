#!/bin/bash
# Wrapper script for Google Calendar MCP server (Node.js/TypeScript)
# Loads environment variables from .env file and sets credential paths to repo
# Properly handles git submodule initialization

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if submodule is initialized or has content
# Submodules have a .git file (not directory) pointing to the git dir
if [ ! -f "$SCRIPT_DIR/.git" ] && [ ! -d "$SCRIPT_DIR/.git" ] && [ ! -f "$SCRIPT_DIR/package.json" ]; then
    echo "Error: Google Calendar MCP server submodule not initialized." >&2
    echo "" >&2
    echo "The submodule is defined in .gitmodules but not initialized." >&2
    echo "" >&2
    echo "To initialize:" >&2
    echo "  1. Add submodule to git index (if not already):" >&2
    echo "     git submodule add https://github.com/markmhendrickson/mcp-server-google-calendar.git mcp/google-calendar" >&2
    echo "" >&2
    echo "  2. Or initialize existing submodule:" >&2
    echo "     cd $REPO_ROOT" >&2
    echo "     git submodule update --init mcp/google-calendar" >&2
    echo "" >&2
    echo "  3. Or run the init script:" >&2
    echo "     $REPO_ROOT/scripts/init_submodules.sh" >&2
    exit 1
fi

# Source nvm if it exists (for Node.js)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Load .env file if it exists
if [ -f "$REPO_ROOT/.env" ]; then
    set -a  # Automatically export all variables
    source "$REPO_ROOT/.env"
    set +a
    
    # Map GOOGLE_OAUTH_CREDENTIALS to MCP_CALENDAR_CREDENTIALS_PATH if not already set
    # Only use it if it looks like a file path (not JSON content)
    if [ -n "$GOOGLE_OAUTH_CREDENTIALS" ] && [ -z "$MCP_CALENDAR_CREDENTIALS_PATH" ] && [ -z "$MCP_GOOGLE_CALENDAR_CREDENTIALS_PATH" ]; then
        # Check if it's JSON content (starts with {) or a file path
        if [[ "$GOOGLE_OAUTH_CREDENTIALS" == {* ]]; then
            # It's JSON content, ignore it and use default path below
            unset GOOGLE_OAUTH_CREDENTIALS
        elif [[ "$GOOGLE_OAUTH_CREDENTIALS" == ./* ]] || [[ "$GOOGLE_OAUTH_CREDENTIALS" != /* ]]; then
            # Relative path - resolve to absolute
            export MCP_CALENDAR_CREDENTIALS_PATH="$REPO_ROOT/$GOOGLE_OAUTH_CREDENTIALS"
            export MCP_GOOGLE_CALENDAR_CREDENTIALS_PATH="$REPO_ROOT/$GOOGLE_OAUTH_CREDENTIALS"
        else
            # Absolute path
            export MCP_CALENDAR_CREDENTIALS_PATH="$GOOGLE_OAUTH_CREDENTIALS"
            export MCP_GOOGLE_CALENDAR_CREDENTIALS_PATH="$GOOGLE_OAUTH_CREDENTIALS"
        fi
    fi
fi

# Set credential paths to repo .creds directory (never use ~/.local defaults)
# Use .creds/gcp-oauth.keys.json for OAuth keys (shared with Gmail MCP)
if [ -z "$MCP_CALENDAR_CREDENTIALS_PATH" ] && [ -z "$MCP_GOOGLE_CALENDAR_CREDENTIALS_PATH" ]; then
    export MCP_CALENDAR_CREDENTIALS_PATH="$REPO_ROOT/.creds/gcp-oauth.keys.json"
    export MCP_GOOGLE_CALENDAR_CREDENTIALS_PATH="$REPO_ROOT/.creds/gcp-oauth.keys.json"
fi

# Set token path to repo .creds directory (never use ~/.local defaults)
# The server uses GOOGLE_CALENDAR_MCP_TOKEN_PATH (primary), but also check other variants
if [ -z "$GOOGLE_CALENDAR_MCP_TOKEN_PATH" ] && [ -z "$MCP_CALENDAR_TOKEN_PATH" ] && [ -z "$MCP_GOOGLE_CALENDAR_TOKEN_PATH" ]; then
    export GOOGLE_CALENDAR_MCP_TOKEN_PATH="$REPO_ROOT/.creds/google-calendar-token.json"
    export MCP_CALENDAR_TOKEN_PATH="$REPO_ROOT/.creds/google-calendar-token.json"
    export MCP_GOOGLE_CALENDAR_TOKEN_PATH="$REPO_ROOT/.creds/google-calendar-token.json"
fi

# Server reads credentials from GOOGLE_OAUTH_CREDENTIALS only (getKeysFilePath)
export GOOGLE_OAUTH_CREDENTIALS="${MCP_CALENDAR_CREDENTIALS_PATH:-$REPO_ROOT/.creds/gcp-oauth.keys.json}"

# Check if server is built (Node.js/TypeScript project)
if [ ! -f "$SCRIPT_DIR/build/index.js" ]; then
    # Try to build if dist doesn't exist
    if [ -f "$SCRIPT_DIR/package.json" ]; then
        echo "Building Google Calendar MCP server..." >&2
        cd "$SCRIPT_DIR"
        # Use local cache to avoid npm permission issues with ~/.npm
        npm install --cache .npm-cache 2>&1 || {
            echo "Error: npm install failed. You may need to fix npm permissions:" >&2
            echo "  sudo chown -R $(id -u):$(id -g) ~/.npm" >&2
            exit 1
        }
        npm run build 2>&1 || {
            echo "Error: npm build failed. Check dependencies are installed." >&2
            exit 1
        }
    else
        echo "Error: Google Calendar MCP server not found at $SCRIPT_DIR/build/index.js" >&2
        echo "Please ensure the server is installed and built:" >&2
        echo "  cd $SCRIPT_DIR" >&2
        echo "  npm install" >&2
        echo "  npm run build" >&2
        exit 1
    fi
fi

# Run the MCP server
exec node "$SCRIPT_DIR/build/index.js" "$@"
