/**
 * Tool: find_nearest_safe_asset
 * Finds the nearest stable asset for rerouting during crisis
 */

import { LOGISTICS_DB_ID } from '../config.js';
import { queryNotionDatabase } from '../lib/assets.js';
import { LogisticsProperties } from '../types/notion.js';

export const findNearestSafeDefinition = {
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
};

export async function handleFindNearestSafe(args: { location_coords: string }) {
  const { location_coords } = args;

  try {
    const [lat1, lon1] = location_coords.split(',').map(c => parseFloat(c.trim()));
    const results = await queryNotionDatabase(LOGISTICS_DB_ID, {});

    const assets = results.map(page => {
      const p = page as { properties: LogisticsProperties };
      const props: LogisticsProperties = p.properties;
      return {
        name: props['Asset Name']?.title?.[0]?.plain_text || 'Unknown',
        coordinates: props['Coordinates']?.rich_text?.[0]?.plain_text || 'N/A',
        risk: props['Risk Sensitivity']?.number || 0,
      };
    });

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
      const [lat2, lon2] = asset.coordinates.split(',').map((c: string) => parseFloat(c.trim()));
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
            `🎯 Nearest Stable Asset for Rerouting\n\n` +
            `Name: ${nearest.name}\n` +
            `Coordinates: ${nearest.coordinates}\n` +
            `Risk Level: ${nearest.risk}/10 🟢\n` +
            `Distance: ~${(nearest.distance * 111).toFixed(0)} km\n\n` +
            `Recommended for resource reallocation.`,
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
