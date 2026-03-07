/**
 * Valkyrie MCP Server Configuration
 * Centralized exports for environment variables and clients
 */

import { Client } from '@notionhq/client';

// Environment variables
export const NOTION_TOKEN = process.env.NOTION_TOKEN!;
export const DASHBOARD_DB_ID = process.env.DASHBOARD_DB_ID!;
export const LOGISTICS_DB_ID = process.env.LOGISTICS_DB_ID!;
export const MOCK_API_URL = process.env.MOCK_API_URL || 'http://localhost:8000';

// Notion client
export const notion = new Client({ auth: NOTION_TOKEN });
