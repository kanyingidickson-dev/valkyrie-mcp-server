/**
 * Tool: get_asset_details
 * Retrieves full details of a specific asset
 */

import { LOGISTICS_DB_ID } from '../config.js';
import { queryNotionDatabase } from '../lib/assets.js';
import { LogisticsProperties } from '../types/notion.js';

export const getAssetDetailsDefinition = {
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
};

export async function handleGetAssetDetails(args: { asset_name: string }) {
  const { asset_name } = args;

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

    const asset = results[0] as { id: string; properties: LogisticsProperties };
    const props = asset.properties;

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
            `📍 Asset Details: ${details.name}\n\n` +
            `ID: ${details.id}\n` +
            `Coordinates: ${details.coordinates}\n` +
            `Risk Sensitivity: ${details.riskSensitivity}/10\n` +
            `Status: ${details.status}\n` +
            `Facility Type: ${details.facilityType}\n` +
            `Last Audit: ${details.lastAudit}\n\n` +
            `📞 Contact Information:\n` +
            `   Primary Contact: ${details.primaryContact}\n` +
            `   Phone: ${details.primaryPhone}\n` +
            `   Email: ${details.primaryEmail}\n` +
            `   Facility Manager: ${details.facilityManager}`,
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
