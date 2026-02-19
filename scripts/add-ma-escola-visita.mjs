#!/usr/bin/env node
/**
 * Add MA Escola Montessori visit to Google Calendar (Tontitos calendar)
 * Event: Tuesday, March 3, 2026 at 9:30 (proposed; confirmation from Naïs pending)
 */

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const TOKEN_PATH = process.env.GOOGLE_CALENDAR_MCP_TOKEN_PATH || process.env.MCP_CALENDAR_TOKEN_PATH || path.join(REPO_ROOT, '.creds', 'google-calendar-token.json');
const CREDENTIALS_PATH = process.env.GOOGLE_OAUTH_CREDENTIALS || path.join(REPO_ROOT, '.creds', 'gcp-oauth.keys.json');
const TONTITOS_CALENDAR_ID = 'kce7ml7l9bjtbj9ndsatnaf87o@group.calendar.google.com';

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
    } else if (keys.client_id && keys.client_secret) {
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

const EVENT_DETAILS = {
  summary: 'Visita MA Escola Montessori',
  description: 'Visita Niu i Cau a MA Caseta – Curs 2026-27.\n\nContacte: Naïs Cortinat (MA Escola Montessori).\nAna disponible el 3 de març. Hora 9:30 proposada per Naïs; confirmació final de Naïs pendent.',
  location: 'c/ Encarnación 32',
  start: { dateTime: '2026-03-03T09:30:00', timeZone: 'Europe/Madrid' },
  end: { dateTime: '2026-03-03T10:30:00', timeZone: 'Europe/Madrid' },
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'email', minutes: 24 * 60 },
      { method: 'popup', minutes: 15 },
    ],
  },
};

function eventMatchesMarch(existing) {
  const summary = (existing.summary || '').toLowerCase();
  const location = (existing.location || '').toLowerCase();
  const matchSummary = summary.includes('ma escola') || summary.includes('montessori') || summary.includes('visita');
  const matchLocation = location.includes('encarnación') || location.includes('encarnacio');
  const start = existing.start?.dateTime || existing.start?.date;
  const matchDate = start && String(start).startsWith('2026-03');
  return (matchSummary || matchLocation) && matchDate;
}

function eventMatchesSameVisit(existing) {
  const summary = (existing.summary || '').toLowerCase();
  const location = (existing.location || '').toLowerCase();
  const matchSummary = summary.includes('ma escola') || summary.includes('montessori') || (summary.includes('visita') && (location.includes('encarnación') || location.includes('encarnacio')));
  const matchLocation = location.includes('encarnación') || location.includes('encarnacio');
  return matchSummary || matchLocation;
}

async function ensureEvent() {
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

    // Remove superseded old dates (e.g. Feb 17) so only March 3 remains
    const febMin = '2026-02-15T00:00:00Z';
    const febMax = '2026-02-23T00:00:00Z';
    const febRes = await calendar.events.list({
      calendarId: TONTITOS_CALENDAR_ID,
      timeMin: febMin,
      timeMax: febMax,
      singleEvents: true,
    });
    for (const evt of febRes.data.items || []) {
      if (eventMatchesSameVisit(evt)) {
        await calendar.events.delete({ calendarId: TONTITOS_CALENDAR_ID, eventId: evt.id });
        console.log('Removed superseded event:', evt.summary, evt.start?.dateTime || evt.start?.date);
      }
    }

    const timeMin = '2026-03-01T00:00:00Z';
    const timeMax = '2026-03-06T00:00:00Z';
    const listRes = await calendar.events.list({
      calendarId: TONTITOS_CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const existing = (listRes.data.items || []).find(eventMatchesMarch);

    if (existing) {
      const response = await calendar.events.patch({
        calendarId: TONTITOS_CALENDAR_ID,
        eventId: existing.id,
        requestBody: EVENT_DETAILS,
        sendUpdates: 'none',
      });
      console.log('Existing event updated.');
      console.log('Event ID:', response.data.id);
      console.log('Event URL:', response.data.htmlLink);
      console.log('Start:', response.data.start?.dateTime || response.data.start?.date);
      console.log('Summary:', response.data.summary);
      console.log('Calendar: Tontitos');
      return response.data;
    }

    const response = await calendar.events.insert({
      calendarId: TONTITOS_CALENDAR_ID,
      requestBody: EVENT_DETAILS,
      sendUpdates: 'none',
    });
    console.log('Event created successfully!');
    console.log('Event ID:', response.data.id);
    console.log('Event URL:', response.data.htmlLink);
    console.log('Start:', response.data.start?.dateTime || response.data.start?.date);
    console.log('Summary:', response.data.summary);
    console.log('Calendar: Tontitos');
    return response.data;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

ensureEvent();
