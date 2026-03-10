#!/usr/bin/env node
/**
 * Add Renata Martins' birthday to Google Calendar (primary / personal).
 * Event: Saturday, March 14, 2026 at 16:00 (save-the-date from WhatsApp).
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const TOKEN_PATH = process.env.GOOGLE_CALENDAR_MCP_TOKEN_PATH || process.env.MCP_CALENDAR_TOKEN_PATH || path.join(REPO_ROOT, '.creds', 'google-calendar-token.json');
const CREDENTIALS_PATH = process.env.GOOGLE_OAUTH_CREDENTIALS || path.join(REPO_ROOT, '.creds', 'gcp-oauth.keys.json');
const CALENDAR_ID = 'primary';

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
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    const keys = JSON.parse(content);
    if (keys.installed) {
      return {
        clientId: keys.installed.client_id,
        clientSecret: keys.installed.client_secret,
        redirectUri: keys.installed.redirect_uris[0] || 'http://localhost:3500/oauth2callback'
      };
    }
    if (keys.client_id && keys.client_secret) {
      return {
        clientId: keys.client_id,
        clientSecret: keys.client_secret,
        redirectUri: keys.redirect_uris?.[0] || 'http://localhost:3500/oauth2callback'
      };
    }
    throw new Error('Invalid credentials format');
  } catch (error) {
    throw new Error(`Error loading credentials: ${error.message}`);
  }
}

async function createEvent() {
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

    const event = {
      summary: "Renata Martins' birthday",
      description: 'Save the date from WhatsApp (Renata Martins): 14/03, 16h.',
      start: {
        dateTime: '2026-03-14T16:00:00',
        timeZone: 'Europe/Madrid',
      },
      end: {
        dateTime: '2026-03-14T17:00:00',
        timeZone: 'Europe/Madrid',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
      sendUpdates: 'none',
    });

    console.log('Event created successfully!');
    console.log('Event ID:', response.data.id);
    console.log('Event URL:', response.data.htmlLink);
    console.log('Start:', response.data.start?.dateTime || response.data.start?.date);
    console.log('Summary:', response.data.summary);
    console.log('Calendar: primary (personal)');

    return response.data;
  } catch (error) {
    console.error('Error creating event:', error.message);
    if (error.response) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

createEvent();
