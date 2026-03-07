import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client } from '@notionhq/client';
import { notifyIncident } from './notify.js';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DASHBOARD_DB_ID = process.env.DASHBOARD_DB_ID;
const POLL_INTERVAL = parseInt(process.env.WATCHER_INTERVAL_SECONDS || '30', 10);

const DATA_DIR = path.join(process.cwd(), '.data');
const STATUS_FILE = path.join(DATA_DIR, 'statuses.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STATUS_FILE)) fs.writeFileSync(STATUS_FILE, JSON.stringify({}), 'utf8');

function readStatuses() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeStatuses(s) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(s, null, 2), 'utf8');
}

async function fetchDashboardPages() {
  const pages = [];
  let cursor = undefined;
  const headers = {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  do {
    const body = cursor ? { start_cursor: cursor } : {};
    const res = await fetch(`https://api.notion.com/v1/databases/${DASHBOARD_DB_ID}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Notion query failed: ${res.status}`);
    const data = await res.json();
    pages.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

async function checkOnce() {
  try {
    const pages = await fetchDashboardPages();
    const statuses = readStatuses();

    for (const page of pages) {
      const id = page.id;
      const props = page.properties || {};
      const name = props['Incident Name']?.title?.[0]?.plain_text || 'Unknown';
      const statusName = props['Status']?.status?.name || 'Unknown';
      const threat = props['Threat Level']?.select?.name || 'N/A';

      if (statuses[id] !== statusName) {
        // status changed
        statuses[id] = statusName;
        // Only notify when it becomes In Progress or Awaiting Approval
        if (statusName === 'In Progress' || statusName === 'Awaiting Approval') {
          const summary = `Status changed to ${statusName}`;
          await notifyIncident({
            incidentId: id,
            location: name,
            category: threat,
            level: statusName === 'In Progress' ? 9 : 7,
            summary,
            url: `https://www.notion.so/${id}`,
          });
        }
      }
    }

    writeStatuses(statuses);
  } catch (e) {
    console.error('[Watcher] error:', e);
  }
}

async function run() {
  console.log('[Watcher] starting, polling every', POLL_INTERVAL, 's');
  await checkOnce();
  setInterval(checkOnce, POLL_INTERVAL * 1000);
}

run().catch(e => console.error('[Watcher] fatal:', e));
