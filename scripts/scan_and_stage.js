import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { notifyIncident } from './notify.js';
import { ensureAssetPage } from '../dist/lib/assets.js';

dotenv.config();

const MOCK_API_URL = process.env.MOCK_API_URL || 'http://localhost:8000';
const DASHBOARD_DB_ID = process.env.DASHBOARD_DB_ID;
const LOGISTICS_DB_ID = process.env.LOGISTICS_DB_ID;

const notion = new Client({ auth: process.env.NOTION_TOKEN });

async function queryNotionDatabase(databaseId, filter) {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(filter ? { filter } : {}),
  });

  if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function resolveAssetByName(assetName) {
  try {
    const results = await queryNotionDatabase(LOGISTICS_DB_ID, {
      property: 'Asset Name',
      title: { contains: assetName },
    });
    return results.length > 0 ? results[0].id : null;
  } catch (e) {
    console.error('Asset name resolution error:', e);
    return null;
  }
}

async function createIncidentPage({ assetName, assetPageId, category, summary, threatLevel }) {
  const threatLevelText = threatLevel >= 8 ? 'Critical (Red)' : 'Elevated (Yellow)';
  const incidentPage = await notion.pages.create({
    parent: { database_id: DASHBOARD_DB_ID },
    properties: {
      'Incident Name': { title: [{ text: { content: `🚨 ALERT: ${category} - ${assetName}` } }] },
      Status: { status: { name: 'Awaiting Approval' } },
      'Threat Level': { select: { name: threatLevelText } },
      'Affected Assets': { relation: assetPageId ? [{ id: assetPageId }] : [] },
      // Populate AI Assessments property when staging incidents
      'AI Assessments': { rich_text: [{ text: { content: summary } }] },
    },
  });

  await notion.blocks.children.append({
    block_id: incidentPage.id,
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: { rich_text: [{ type: 'text', text: { content: 'AI Threat Assessment' } }] },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: summary } }] },
      },
    ],
  });

  return incidentPage.id;
}

async function run() {
  try {
    const resp = await fetch(`${MOCK_API_URL}/batch/scan`);
    if (!resp.ok) {
      console.error('Failed to fetch batch scan');
      return;
    }

    const data = await resp.json();
    console.log(`Scan time: ${data.scan_time} — ${data.alerts} alert(s)`);

    const alerts = data.results.filter(r => r.status === 'Alert');

    if (alerts.length === 0) {
      console.log('No alerts to stage.');
      return;
    }

    for (const a of alerts) {
      console.log(`Processing alert: ${a.location} (${a.category} Level ${a.threat_level})`);
      let assetPageId = await resolveAssetByName(a.location);
      if (!assetPageId) {
        assetPageId = await ensureAssetPage(a.location, '');
      }
      try {
        const incidentId = await createIncidentPage({
          assetName: a.location,
          assetPageId,
          category: a.category,
          summary: a.summary,
          threatLevel: a.threat_level,
        });
        console.log(`Staged incident for ${a.location}: ${incidentId}`);
        await notifyIncident({
          incidentId,
          location: a.location,
          category: a.category,
          level: a.threat_level,
          summary: a.summary,
        });
      } catch (e) {
        console.error(`Failed to stage incident for ${a.location}:`, e);
      }
    }
  } catch (e) {
    console.error('Error during full scan:', e);
  }
}

run().then(() => process.exit(0));
