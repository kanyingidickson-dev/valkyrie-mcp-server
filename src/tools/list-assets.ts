/**
 * Tool: list_all_assets
 * Lists all assets currently tracked in the Logistics database
 */

import { LOGISTICS_DB_ID } from '../config.js';
import { queryNotionDatabase } from '../lib/assets.js';
import { LogisticsProperties } from '../types/notion.js';

export const listAssetsDefinition = {
  name: 'list_all_assets',
  description: 'Lists all assets currently tracked in the Notion Logistics database.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export async function handleListAssets() {
  try {
    const results = await queryNotionDatabase(LOGISTICS_DB_ID, {});
    const assets = results.map(page => {
      const props = page.properties as LogisticsProperties;
      return {
        name: props['Asset Name']?.title?.[0]?.plain_text || 'Unknown',
        coordinates: props.Coordinates?.rich_text?.[0]?.plain_text || 'N/A',
        risk: props['Risk Sensitivity']?.number || 0,
      };
    });

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
        return `${riskEmoji} ${a.name} (Risk: ${a.risk}) - ${a.coordinates}`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `📋 Global Assets & Logistics (${assets.length} total)\n\n${assetList}`,
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
