#!/bin/bash
# Wrapper script for Google Calendar MCP server that ensures node is available
# This script sources nvm to make node available even when PATH doesn't include it

# Source nvm if it exists
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Expand ${HOME} in GOOGLE_OAUTH_CREDENTIALS if it's set
if [ -n "$GOOGLE_OAUTH_CREDENTIALS" ]; then
  # Replace ${HOME} with actual home directory
  GOOGLE_OAUTH_CREDENTIALS="${GOOGLE_OAUTH_CREDENTIALS//\$\{HOME\}/$HOME}"
  export GOOGLE_OAUTH_CREDENTIALS
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the MCP server
exec node "$SCRIPT_DIR/build/index.js" "$@"

