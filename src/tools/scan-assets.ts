/**
 * Tool: scan_all_assets
 * Batch scans all tracked assets for threats
 */

import { LOGISTICS_DB_ID, MOCK_API_URL } from '../config.js';
import { queryNotionDatabase } from '../lib/assets.js';

export const scanAssetsDefinition = {
  name: 'scan_all_assets',
  description:
    'Scans all assets in the Notion Logistics database for potential threats. Returns a summary of any detected alerts.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function handleScanAssets() {
  try {
    const results = await queryNotionDatabase(LOGISTICS_DB_ID, {});
    const assets = results.map(page => {
      const p = page as { id: string; properties: Record<string, unknown> };
      return {
        id: p.id,
        name:
          (p.properties['Asset Name'] as { title?: Array<{ plain_text?: string }> })?.title?.[0]
            ?.plain_text || 'Unknown',
        coordinates:
          (p.properties['Coordinates'] as { rich_text?: Array<{ plain_text?: string }> })
            ?.rich_text?.[0]?.plain_text || 'N/A',
        risk: (p.properties['Risk Sensitivity'] as { number?: number })?.number || 0,
      };
    });

    let alertCount = 0;
    const alerts: string[] = [];

    for (const asset of assets) {
      try {
        const response = await fetch(`${MOCK_API_URL}/status/${encodeURIComponent(asset.name)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'Alert' && data.category === 'Environmental') {
            alertCount++;
            alerts.push(`🔴 ${asset.name}: ${data.summary}`);
          }
        }
      } catch {
        // Skip if mock API unavailable
      }
    }

    if (alertCount > 0) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ THREATS DETECTED!\n\n${alerts.length} of ${assets.length} assets have alerts:\n\n${alerts.join('\n')}\n\nRun analyze_global_threats on each for details.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ All ${assets.length} assets are stable.\nNo threats detected.`,
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
