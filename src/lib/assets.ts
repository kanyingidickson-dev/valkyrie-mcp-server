import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { NotionPageObject } from '../types/notion.js';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const LOGISTICS_DB_ID = process.env.LOGISTICS_DB_ID as string;

export async function queryNotionDatabase(
  databaseId: string,
  filter?: Record<string, unknown>
): Promise<NotionPageObject[]> {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(filter ? { filter } : {}),
  });

  if (!res.ok) {
    throw new Error(`Notion API error: ${res.status}`);
  }

  const data = await res.json();
  return data.results || [];
}

export async function ensureAssetPage(
  assetName: string,
  coordinates: string,
  notionClient?: Client
): Promise<string> {
  const client = notionClient || notion;

  // Check if asset already exists
  const existing = await queryNotionDatabase(LOGISTICS_DB_ID, {
    property: 'Asset Name',
    title: { contains: assetName },
  });

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new asset page
  const response = await client.pages.create({
    parent: { database_id: LOGISTICS_DB_ID },
    properties: {
      'Asset Name': { title: [{ text: { content: assetName } }] },
      Coordinates: { rich_text: [{ text: { content: coordinates } }] },
      'Risk Sensitivity': { number: 5 }, // Default medium risk
    },
  });

  return response.id;
}

export default { ensureAssetPage, queryNotionDatabase };
