#!/usr/bin/env node
/**
 * Add Festa Major del Camp d'en Grassot events to Google Calendar (Tontitos)
 * Source: WhatsApp (Lluís), Feb 2025
 *
 * Events:
 * - Festa Major: June 26-28, 2026 (Fri-Sun)
 * - Sopar de carmanyola: June 27, 2026 at Pge. Alió (tentative)
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const HOME = process.env.HOME || '';
const TOKEN_PATH =
  process.env.GOOGLE_CALENDAR_MCP_TOKEN_PATH ||
  process.env.MCP_CALENDAR_TOKEN_PATH ||
  path.join(HOME, '.config', 'google-calendar-mcp', 'tokens.json');
const CREDENTIALS_PATHS = [
  process.env.GOOGLE_OAUTH_CREDENTIALS,
  path.join(REPO_ROOT, '.creds', 'gcp-oauth.keys.json'),
  path.join(HOME, '.gmail-mcp', 'gcp-oauth.keys.json'),
].filter(Boolean);
const TONTITOS_CALENDAR_ID =
  'kce7ml7l9bjtbj9ndsatnaf87o@group.calendar.google.com';

async function loadTokens() {
  try {
    const content = await fs.readFile(TOKEN_PATH, 'utf-8');
    const tokens = JSON.parse(content);
    if (tokens.normal) return tokens.normal;
    return tokens;
  } catch (error) {
    throw new Error(`Error loading tokens: ${error.message}`);
  }
}

async function loadCredentials() {
  let lastError;
  for (const credPath of CREDENTIALS_PATHS) {
    try {
      const content = await fs.readFile(credPath, 'utf-8');
      const keys = JSON.parse(content);
      if (keys.installed) {
        return {
          clientId: keys.installed.client_id,
          clientSecret: keys.installed.client_secret,
          redirectUri:
            keys.installed.redirect_uris[0] || 'http://localhost:3500/oauth2callback',
        };
      }
      if (keys.client_id && keys.client_secret) {
        return {
          clientId: keys.client_id,
          clientSecret: keys.client_secret,
          redirectUri: keys.redirect_uris?.[0] || 'http://localhost:3500/oauth2callback',
        };
      }
      lastError = new Error('Invalid credentials format');
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`Error loading credentials: ${lastError?.message || 'no valid path'}. Tried: ${CREDENTIALS_PATHS.join(', ')}`);
}

async function addEvents() {
  try {
    const credentials = await loadCredentials();
    const tokens = await loadTokens();

    const oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );
    oauth2Client.setCredentials(tokens);

    if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
      const { credentials: newTokens } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(newTokens);
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const events = [
      {
        summary: "Festa Major del Camp d'en Grassot",
        description: `Main activities Friday 26 to Sunday 28 June 2026.
Program to be prepared. Brainstorming at Association premises.
People: Lluís, Victor, Bjorn, Montse. Source: WhatsApp Feb 2025.`,
        location: "Camp d'en Grassot, Barcelona",
        start: { date: '2026-06-26' },
        end: { date: '2026-06-29' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 * 7 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
      {
        summary: 'Sopar de carmanyola (Festa Major)',
        description: `Potluck dinner at Pge. Alió. TENTATIVE - to be confirmed.
Last year: Victor, Bjorn, Montse organized. ~monsi64escp offered to help again.
Source: WhatsApp Feb 2025.`,
        location: 'Pge. Alió',
        start: {
          dateTime: '2026-06-27T20:00:00',
          timeZone: 'Europe/Madrid',
        },
        end: {
          dateTime: '2026-06-27T23:00:00',
          timeZone: 'Europe/Madrid',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
    ];

    for (const event of events) {
      const response = await calendar.events.insert({
        calendarId: TONTITOS_CALENDAR_ID,
        requestBody: event,
        sendUpdates: 'none',
      });
      console.log(`Created: ${event.summary}`);
      console.log(`  ID: ${response.data.id}`);
      console.log(`  URL: ${response.data.htmlLink}`);
    }

    console.log('\nDone. Calendar: Tontitos');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

addEvents();
