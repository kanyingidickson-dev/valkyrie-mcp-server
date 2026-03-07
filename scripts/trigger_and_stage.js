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
      // Populate AI Assessments property in the Operations Dashboard
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

  console.log('Incident created:', incidentPage.id);
}

async function run(target) {
  try {
    const resp = await fetch(`${MOCK_API_URL}/trigger/${encodeURIComponent(target)}`);
    if (!resp.ok) {
      console.error('Failed to fetch mock API');
      return;
    }
    const data = await resp.json();
    console.log('Mock API response:', data);

    if (data.status === 'Alert') {
      // Ensure a richer asset page exists and link to it
      let assetPageId = await resolveAssetByName(target);
      if (!assetPageId) {
        assetPageId = await ensureAssetPage(target, '');
      }
      const incidentId = await createIncidentPage({
        assetName: target,
        assetPageId,
        category: data.category,
        summary: data.summary,
        threatLevel: data.threat_level,
      });
      await notifyIncident({
        incidentId,
        location: target,
        category: data.category,
        level: data.threat_level,
        summary: data.summary,
      });
    } else {
      console.log('No alert — nothing to stage.');
    }
  } catch (e) {
    console.error('Error during run:', e);
  }
}

const target = process.argv[2] || 'Tokyo Data Vault';
run(target).then(() => process.exit(0));
