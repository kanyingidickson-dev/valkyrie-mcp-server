/**
 * Tool: analyze_global_threats
 * Checks asset for threats and stages incident if detected
 */

import { DASHBOARD_DB_ID, LOGISTICS_DB_ID, MOCK_API_URL, notion } from '../config.js';
import { queryNotionDatabase } from '../lib/assets.js';

export const analyzeThreatsDefinition = {
  name: 'analyze_global_threats',
  description:
    'Connects to the Valkyrie Simulation Engine to assess risk for a specific asset location. Returns threat data and stages an incident in Notion if threats are detected.',
  inputSchema: {
    type: 'object',
    properties: {
      asset_name: {
        type: 'string',
        description: "Name of the asset to check (e.g., 'Singapore Hub')",
      },
      location_coords: {
        type: 'string',
        description: "Coordinates of the asset (e.g., '1.2902, 103.8519')",
      },
    },
    required: ['location_coords', 'asset_name'],
  },
};

export async function handleAnalyzeThreats(args: { asset_name: string; location_coords: string }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { asset_name, location_coords } = args;

  try {
    const telemetry = await fetch(
      `${MOCK_API_URL}/trigger/${encodeURIComponent(asset_name)}?category=${encodeURIComponent('Cyber')}`
    );

    if (!telemetry.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to fetch threat data for ${asset_name}. Mock API may be offline.`,
          },
        ],
      };
    }

    const data = await telemetry.json();
    console.error(`[Valkyrie] Mock API response for ${asset_name}:`, JSON.stringify(data));

    // TEMPORARY: Force incident creation for Singapore Hub demo
    if (asset_name === 'Singapore Distribution Hub' || data.status === 'Alert') {
      console.error(`[Valkyrie] Threat detected for ${asset_name}:`, data);

      const results = await queryNotionDatabase(LOGISTICS_DB_ID, {
        property: 'Asset Name',
        title: { contains: asset_name },
      });
      const assetPageId = results.length > 0 ? (results[0] as { id: string }).id : null;

      await createIncidentPage({
        assetName: asset_name,
        assetPageId: assetPageId,
        category: data.category,
        summary: data.summary,
        threatLevel: data.threat_level,
      });

      return {
        content: [
          {
            type: 'text',
            text: `🚨 THREAT DETECTED!\n\nAsset: ${asset_name}\nCategory: ${data.category}\nThreat Level: ${data.threat_level}/10\nSummary: ${data.summary}\n\nIncident staged in Notion.\nStatus: Awaiting Approval\nHuman intervention required.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ System stable for ${asset_name}.\nNo immediate action required.\nLast check: ${new Date().toISOString()}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing threats for ${asset_name}: ${error}`,
        },
      ],
    };
  }
}

async function createIncidentPage(params: {
  assetName: string;
  assetPageId: string | null;
  category: string;
  summary: string;
  threatLevel: number;
}): Promise<string> {
  const { assetName, assetPageId, category, summary, threatLevel } = params;
  const threatLevelText = threatLevel >= 8 ? 'Critical (Red)' : 'Elevated (Yellow)';

  const incidentPage = await notion.pages.create({
    parent: { database_id: DASHBOARD_DB_ID },
    properties: {
      'Incident Name': {
        title: [{ text: { content: `🚨 ALERT: ${category} - ${assetName}` } }],
      },
      Status: { status: { name: 'Awaiting Approval' } },
      'Threat Level': { select: { name: threatLevelText } },
      'Affected Assets': { relation: assetPageId ? [{ id: assetPageId }] : [] },
    },
  });

  await fetch(`https://api.notion.com/v1/pages/${incidentPage.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        'AI Assessments': {
          rich_text: [{ type: 'text', text: { content: summary } }],
        },
      },
    }),
  });

  console.error(`[Valkyrie] Incident created: ${incidentPage.id}`);
  return incidentPage.id;
}
