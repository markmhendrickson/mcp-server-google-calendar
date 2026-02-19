#!/bin/bash
# Run Google Calendar MCP auth with repo .creds paths (same env as run-google-calendar-mcp.sh).
# Use this to re-authenticate when the token is invalid or expired.
# Tokens are written to REPO_ROOT/.creds/google-calendar-token.json

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Load .env so GOOGLE_OAUTH_CREDENTIALS can be used if set
if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

# Credentials: prefer .creds in repo
if [ -z "$GOOGLE_OAUTH_CREDENTIALS" ] || [[ "$GOOGLE_OAUTH_CREDENTIALS" == {* ]]; then
  export GOOGLE_OAUTH_CREDENTIALS="$REPO_ROOT/.creds/gcp-oauth.keys.json"
elif [[ "$GOOGLE_OAUTH_CREDENTIALS" == ./* ]] || [[ "$GOOGLE_OAUTH_CREDENTIALS" != /* ]]; then
  export GOOGLE_OAUTH_CREDENTIALS="$REPO_ROOT/$GOOGLE_OAUTH_CREDENTIALS"
fi

# Token output path (must match run-google-calendar-mcp.sh)
export GOOGLE_CALENDAR_MCP_TOKEN_PATH="$REPO_ROOT/.creds/google-calendar-token.json"

if [ ! -f "$GOOGLE_OAUTH_CREDENTIALS" ]; then
  echo "Error: OAuth credentials not found at $GOOGLE_OAUTH_CREDENTIALS" >&2
  exit 1
fi

echo "Using credentials: $GOOGLE_OAUTH_CREDENTIALS"
echo "Tokens will be saved to: $GOOGLE_CALENDAR_MCP_TOKEN_PATH"
echo ""

cd "$SCRIPT_DIR"
exec node build/index.js auth
