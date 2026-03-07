/**
 * PROJECT VALKYRIE: MISSION-CRITICAL MCP SERVER
 * ---------------------------------------------
 * This server implements the Model Context Protocol to bridge real-time
 * crisis data with a structured Notion Command Center.
 *
 * Built for the Notion MCP Challenge 2026
 *
 * Technical Highlights:
 * - Relational Asset Resolver: Maps coordinates to Notion Page IDs
 * - Human-in-the-Loop: Stages incidents with "Awaiting Approval" status
 * - March 2026 Markdown API: Rich content injection into Notion pages
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();
import { ensureAssetPage } from './lib/assets.js';

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Direct HTTP query function for Notion databases
async function queryNotionDatabase(databaseId: string, filter?: any): Promise<any[]> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify(filter ? { filter } : {}),
  });

  if (!response.ok) {
    throw new Error(`Notion API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

// Configuration
const DASHBOARD_DB_ID = process.env.DASHBOARD_DB_ID!;
const LOGISTICS_DB_ID = process.env.LOGISTICS_DB_ID!;
const MOCK_API_URL = process.env.MOCK_API_URL || 'http://localhost:8000';

/**
 * TECHNICAL INNOVATION: RELATIONAL ASSET RESOLVER
 * Standard Notion integrations often just post text. Valkyrie implements a
 * "Coordinate-to-Asset" resolver that maps external telemetry to existing
 * database entities in Notion. This maintains relational integrity
 * across the workspace.
 */
async function resolveAssetByLocation(coordinates: string): Promise<string | null> {
  try {
    const results = await queryNotionDatabase(LOGISTICS_DB_ID, {
      property: 'Coordinates',
      rich_text: { contains: coordinates },
    });
    return results.length > 0 ? results[0].id : null;
  } catch (error) {
    console.error('[Valkyrie] Error resolving asset by location:', error);
    return null;
  }
}

/**
 * Resolve asset by name - looks up asset in Logistics database by name
 */
async function resolveAssetByName(assetName: string): Promise<string | null> {
  try {
    const results = await queryNotionDatabase(LOGISTICS_DB_ID, {
      property: 'Asset Name',
      title: { contains: assetName },
    });
    return results.length > 0 ? results[0].id : null;
  } catch (error) {
    console.error('[Valkyrie] Error resolving asset by name:', error);
    return null;
  }
}

/**
 * Get all assets from the Logistics database
 */
async function getAllAssets(): Promise<
  Array<{ id: string; name: string; coordinates: string; risk: number }>
> {
  try {
    const results = await queryNotionDatabase(LOGISTICS_DB_ID);
    const assetMap = new Map<
      string,
      { id: string; name: string; coordinates: string; risk: number }
    >();
    for (const page of results) {
      const props = page.properties;
      const name = props['Asset Name']?.title?.[0]?.plain_text || 'Unknown';
      if (!assetMap.has(name)) {
        assetMap.set(name, {
          id: page.id,
          name,
          coordinates: props['Coordinates']?.rich_text?.[0]?.plain_text || '0, 0',
          risk: props['Risk Sensitivity']?.number || 5,
        });
      }
    }
    return Array.from(assetMap.values());
  } catch (error) {
    console.error('[Valkyrie] Error fetching all assets:', error);
    return [];
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

  try {
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

    // Update AI Assessments via direct HTTP PATCH (more reliable than SDK create)
    console.error(`[Valkyrie] Attempting to set AI Assessments for: ${incidentPage.id}`);
    console.error(`[Valkyrie] Summary content: ${summary.substring(0, 50)}...`);

    try {
      const patchUrl = `https://api.notion.com/v1/pages/${incidentPage.id}`;
      const patchBody = JSON.stringify({
        properties: {
          'AI Assessments': {
            rich_text: [{ type: 'text', text: { content: summary } }],
          },
        },
      });

      console.error(`[Valkyrie] PATCH URL: ${patchUrl}`);

      const patchResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: patchBody,
      });

      console.error(`[Valkyrie] PATCH response status: ${patchResponse.status}`);

      if (patchResponse.ok) {
        const result = await patchResponse.json();
        console.error(`[Valkyrie] AI Assessments set successfully for: ${incidentPage.id}`);
      } else {
        const errorText = await patchResponse.text();
        console.error(
          `[Valkyrie] AI Assessments PATCH failed (${patchResponse.status}): ${errorText}`
        );
      }
    } catch (patchError) {
      console.error('[Valkyrie] Failed to set AI Assessments:', patchError);
    }

    // Add content blocks using the children parameter
    try {
      await notion.blocks.children.append({
        block_id: incidentPage.id,
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: 'AI Threat Assessment' } }],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: summary } }],
            },
          },
          {
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [{ type: 'text', text: { content: 'Proposed Mitigation' } }],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content:
                      "Move status to 'In Progress' to initiate the Crisis Response Playbook.",
                  },
                },
              ],
            },
          },
          {
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [{ type: 'text', text: { content: 'Immediate Action Checklist' } }],
            },
          },
          {
            object: 'block',
            type: 'to_do',
            to_do: {
              rich_text: [
                { type: 'text', text: { content: 'Verify AI data with local sensor feeds' } },
              ],
              checked: false,
            },
          },
          {
            object: 'block',
            type: 'to_do',
            to_do: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: 'Set alert level: Confirm Critical or downgrade' },
                },
              ],
              checked: false,
            },
          },
          {
            object: 'block',
            type: 'to_do',
            to_do: {
              rich_text: [{ type: 'text', text: { content: 'Notify local lead via Slack/Email' } }],
              checked: false,
            },
          },
          {
            object: 'block',
            type: 'to_do',
            to_do: {
              rich_text: [
                { type: 'text', text: { content: 'Review resource reallocation options' } },
              ],
              checked: false,
            },
          },
        ],
      });
      console.error(`[Valkyrie] Content blocks added successfully to incident: ${incidentPage.id}`);
    } catch (contentError) {
      console.error('[Valkyrie] Failed to add content blocks:', contentError);
    }

    console.error(`[Valkyrie] Incident created: ${incidentPage.id}`);
    return incidentPage.id;
  } catch (error) {
    console.error('[Valkyrie] Failed to create incident page:', error);
    throw error;
  }
}

// Initialize MCP Server
const server = new Server({
  name: 'valkyrie-engine',
  version: '1.0.0',
  capabilities: { tools: {} },
});

/**
 * TOOL DEFINITIONS
 * Exposes Valkyrie capabilities to AI agents via MCP
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze_global_threats',
      description:
        'Connects to the Valkyrie Simulation Engine to assess risk for a specific asset location. Returns threat data and stages an incident in Notion if threats are detected.',
      inputSchema: {
        type: 'object',
        properties: {
          location_coords: {
            type: 'string',
            description: "Coordinates of the asset (e.g., '1.2902, 103.8519')",
          },
          asset_name: {
            type: 'string',
            description: "Name of the asset to check (e.g., 'Singapore Hub')",
          },
        },
        required: ['location_coords', 'asset_name'],
      },
    },
    {
      name: 'scan_all_assets',
      description:
        'Scans all assets in the Notion Logistics database for potential threats. Returns a summary of any detected alerts.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_asset_details',
      description: 'Retrieves full details of a specific asset from the Notion Logistics database.',
      inputSchema: {
        type: 'object',
        properties: {
          asset_name: {
            type: 'string',
            description: 'Name of the asset to retrieve',
          },
        },
        required: ['asset_name'],
      },
    },
    {
      name: 'list_all_assets',
      description: 'Lists all assets currently tracked in the Notion Logistics database.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'find_nearest_safe_asset',
      description:
        'Finds the nearest stable asset to a given location for potential rerouting during a crisis.',
      inputSchema: {
        type: 'object',
        properties: {
          location_coords: {
            type: 'string',
            description: 'Coordinates of the affected location',
          },
        },
        required: ['location_coords'],
      },
    },
  ],
}));

/**
 * TOOL HANDLERS
 * Implements the logic for each exposed tool
 */
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  // Tool: analyze_global_threats
  if (name === 'analyze_global_threats') {
    const { location_coords, asset_name } = args as { location_coords: string; asset_name: string };

    try {
      // 1. DATA AGGREGATION: Fetching from our high-performance Python simulation
      const telemetry = await fetch(`${MOCK_API_URL}/status/${encodeURIComponent(asset_name)}`);

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

      // 2. Check if threat detected
      if (data.status === 'Alert') {
        // 3. RELATIONAL MAPPING: Linking the Incident to the Asset Page ID
        let assetPageId =
          (await resolveAssetByLocation(location_coords)) || (await resolveAssetByName(asset_name));
        if (!assetPageId) {
          assetPageId = await ensureAssetPage(asset_name, location_coords);
        }

        // 4. Create incident in Notion
        const incidentId = await createIncidentPage({
          assetName: asset_name,
          assetPageId,
          category: data.category,
          summary: data.summary,
          threatLevel: data.threat_level,
        });

        return {
          content: [
            {
              type: 'text',
              text:
                `## 🚨 Threat Detected\n\n` +
                `### Threat Details\n` +
                `- **Asset**: ${asset_name}\n` +
                `- **Category**: ${data.category}\n` +
                `- **Threat Level**: ${data.threat_level}/10\n` +
                `- **Summary**: ${data.summary}\n\n` +
                `### Incident Management\n` +
                `- **Incident ID**: ${incidentId}\n` +
                `- **Status**: Awaiting Approval\n\n` +
                `**Human intervention required.**`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text:
              `## ✅ System Status\n\n` +
              `- **Asset**: ${asset_name}\n` +
              `- **Status**: Stable\n` +
              `- **Last Check**: ${data.timestamp || new Date().toISOString()}\n\n` +
              `**No immediate action required.**`,
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

  // Tool: scan_all_assets
  if (name === 'scan_all_assets') {
    try {
      const assets = await getAllAssets();

      if (assets.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `## ⚠️ Asset Scan Issue\n\n**No assets found in the Logistics database.**\n**Action Required**: Run the seed script to populate assets.`,
            },
          ],
        };
      }

      const alerts: Array<{ asset: string; data: any }> = [];

      for (const asset of assets) {
        try {
          const check = await fetch(`${MOCK_API_URL}/status/${encodeURIComponent(asset.name)}`);
          if (check.ok) {
            const data = await check.json();
            if (data.status === 'Alert') {
              alerts.push({ asset: asset.name, data });
            }
          }
        } catch {
          // Continue to next asset if one fails
        }
      }

      if (alerts.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text:
                `## ✅ Asset Scan Results\n\n` +
                `- **Total Assets Scanned**: ${assets.length}\n` +
                `- **Threats Detected**: 0\n\n` +
                `**All systems stable. No immediate action required.**`,
            },
          ],
        };
      }

      // Create incidents for all alerts
      for (const alert of alerts) {
        const asset = assets.find(a => a.name === alert.asset);
        const assetPageId = asset ? asset.id : null;

        await createIncidentPage({
          assetName: alert.asset,
          assetPageId,
          category: alert.data.category,
          summary: alert.data.summary,
          threatLevel: alert.data.threat_level,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text:
              `## 🚨 Threat Scan Results\n\n` +
              `- **Total Assets Scanned**: ${assets.length}\n` +
              `- **Threats Detected**: ${alerts.length}\n\n` +
              `### Detected Threats\n\n` +
              alerts
                .map(
                  a =>
                    `- **${a.asset}**\n  - Category: ${a.data.category}\n  - Threat Level: ${a.data.threat_level}/10\n  - Summary: ${a.data.summary}`
                )
                .join('\n\n') +
              `\n\n### Incident Management\n\nAll incidents staged in Notion with "Awaiting Approval" status.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error scanning assets: ${error}`,
          },
        ],
      };
    }
  }

  // Tool: get_asset_details
  if (name === 'get_asset_details') {
    const { asset_name } = args as { asset_name: string };

    try {
      const results = await queryNotionDatabase(LOGISTICS_DB_ID, {
        property: 'Asset Name',
        title: { contains: asset_name },
      });

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Asset "${asset_name}" not found in the Logistics database.`,
            },
          ],
        };
      }

      const asset = results[0];
      const props = asset.properties as any;

      const details = {
        id: asset.id,
        name: props['Asset Name']?.title?.[0]?.plain_text || 'Unknown',
        coordinates: props['Coordinates']?.rich_text?.[0]?.plain_text || 'N/A',
        riskSensitivity: props['Risk Sensitivity']?.number || 0,
        status: props['Status']?.select?.name || 'Unknown',
        lastAudit: props['Last Audit']?.date?.start || 'N/A',
        primaryContact: props['Primary Contact']?.rich_text?.[0]?.plain_text || 'N/A',
        primaryPhone: props['Primary Phone']?.phone_number || 'N/A',
        primaryEmail: props['Primary Email']?.email || 'N/A',
        facilityManager: props['Facility Manager']?.rich_text?.[0]?.plain_text || 'N/A',
        facilityType: props['Facility Type']?.select?.name || 'N/A',
      };

      return {
        content: [
          {
            type: 'text',
            text:
              `## 📍 Asset Details: ${details.name}\n\n` +
              `### Basic Information\n` +
              `- **ID**: ${details.id}\n` +
              `- **Coordinates**: ${details.coordinates}\n` +
              `- **Risk Sensitivity**: ${details.riskSensitivity}/10\n` +
              `- **Status**: ${details.status}\n` +
              `- **Facility Type**: ${details.facilityType}\n` +
              `- **Last Audit**: ${details.lastAudit}\n\n` +
              `### Contact Information\n` +
              `- **Primary Contact**: ${details.primaryContact}\n` +
              `- **Phone**: ${details.primaryPhone}\n` +
              `- **Email**: ${details.primaryEmail}\n` +
              `- **Facility Manager**: ${details.facilityManager}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving asset details: ${error}`,
          },
        ],
      };
    }
  }

  // Tool: list_all_assets
  if (name === 'list_all_assets') {
    try {
      const assets = await getAllAssets();

      if (assets.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No assets found in the Logistics database. Run the seed script to populate assets.',
            },
          ],
        };
      }

      const assetList = assets
        .map(a => {
          const riskEmoji = a.risk >= 8 ? '🔴' : a.risk >= 5 ? '🟡' : '🟢';
          return `- ${riskEmoji} **${a.name}** (Risk: ${a.risk}) - ${a.coordinates}`;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text:
              `## 📋 Global Assets & Logistics\n\n` +
              `**Total Assets**: ${assets.length}\n\n` +
              `### Asset List\n\n${assetList}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing assets: ${error}`,
          },
        ],
      };
    }
  }

  // Tool: find_nearest_safe_asset
  if (name === 'find_nearest_safe_asset') {
    const { location_coords } = args as { location_coords: string };

    try {
      const [lat1, lon1] = location_coords.split(',').map(c => parseFloat(c.trim()));
      const assets = await getAllAssets();

      // Filter for stable assets (lower risk)
      const stableAssets = assets.filter(a => a.risk < 5);

      if (stableAssets.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No stable assets available for rerouting. All assets have elevated risk levels.',
            },
          ],
        };
      }

      // Calculate distances and find nearest
      const withDistances = stableAssets.map(asset => {
        const [lat2, lon2] = asset.coordinates.split(',').map(c => parseFloat(c.trim()));
        const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
        return { ...asset, distance };
      });

      withDistances.sort((a, b) => a.distance - b.distance);
      const nearest = withDistances[0];

      return {
        content: [
          {
            type: 'text',
            text:
              `## 🎯 Nearest Stable Asset for Rerouting\n\n` +
              `### Asset Details\n` +
              `- **Name**: ${nearest.name}\n` +
              `- **Coordinates**: ${nearest.coordinates}\n` +
              `- **Risk Level**: ${nearest.risk}/10 🟢\n` +
              `- **Distance**: ~${(nearest.distance * 111).toFixed(0)} km\n\n` +
              `**Recommended for resource reallocation.**`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error finding nearest asset: ${error}`,
          },
        ],
      };
    }
  }

  // Unknown tool
  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`,
      },
    ],
  };
});

// Start the server
async function main() {
  console.error('[Valkyrie] Starting MCP Server...');
  console.error('[Valkyrie] Dashboard DB:', DASHBOARD_DB_ID ? '✅ Configured' : '❌ Missing');
  console.error('[Valkyrie] Logistics DB:', LOGISTICS_DB_ID ? '✅ Configured' : '❌ Missing');
  console.error('[Valkyrie] Mock API:', MOCK_API_URL);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[Valkyrie] MCP Server connected and ready.');
}

main().catch(error => {
  console.error('[Valkyrie] Fatal error:', error);
  process.exit(1);
});
