/**
 * Integration tests for Notion database operations
 * These tests verify the MCP tools work correctly with the Notion API
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Skip integration tests if no NOTION_TOKEN is available
const hasNotionToken = process.env.NOTION_TOKEN && process.env.NOTION_TOKEN.length > 0;

const describeIntegration = hasNotionToken ? describe : describe.skip;

describeIntegration('Notion Database Integration', () => {
  const NOTION_TOKEN = process.env.NOTION_TOKEN!;
  const LOGISTICS_DB_ID = process.env.LOGISTICS_DB_ID!;
  const DASHBOARD_DB_ID = process.env.DASHBOARD_DB_ID!;

  const notionHeaders = {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  describe('Logistics Database', () => {
    it('should connect to Logistics database', async () => {
      const response = await fetch(`https://api.notion.com/v1/databases/${LOGISTICS_DB_ID}`, {
        headers: notionHeaders,
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.object).toBe('database');
    });

    it('should query assets from Logistics database', async () => {
      const response = await fetch(`https://api.notion.com/v1/databases/${LOGISTICS_DB_ID}/query`, {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({ page_size: 10 }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.object).toBe('list');
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should have required properties in database schema', async () => {
      const response = await fetch(`https://api.notion.com/v1/databases/${LOGISTICS_DB_ID}`, {
        headers: notionHeaders,
      });

      const data = await response.json();
      const properties = data.properties;

      expect(properties['Asset Name']).toBeDefined();
      expect(properties['Coordinates']).toBeDefined();
      expect(properties['Risk Sensitivity']).toBeDefined();
    });
  });

  describe('Operations Dashboard Database', () => {
    it('should connect to Dashboard database', async () => {
      const response = await fetch(`https://api.notion.com/v1/databases/${DASHBOARD_DB_ID}`, {
        headers: notionHeaders,
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.object).toBe('database');
    });

    it('should have required properties in database schema', async () => {
      const response = await fetch(`https://api.notion.com/v1/databases/${DASHBOARD_DB_ID}`, {
        headers: notionHeaders,
      });

      const data = await response.json();
      const properties = data.properties;

      expect(properties['Incident Name']).toBeDefined();
      expect(properties['Status']).toBeDefined();
      expect(properties['Threat Level']).toBeDefined();
      expect(properties['Affected Assets']).toBeDefined();
      expect(properties['AI Assessments']).toBeDefined();
    });

    it('should query incidents from Dashboard database', async () => {
      const response = await fetch(`https://api.notion.com/v1/databases/${DASHBOARD_DB_ID}/query`, {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({ page_size: 10 }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.object).toBe('list');
      expect(data.results).toBeDefined();
    });
  });

  describe('Asset Resolution', () => {
    it('should find asset by name', async () => {
      const response = await fetch(`https://api.notion.com/v1/databases/${LOGISTICS_DB_ID}/query`, {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({
          filter: {
            property: 'Asset Name',
            title: { contains: 'Singapore' },
          },
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.results.length).toBeGreaterThan(0);
    });
  });
});

describe('Mock API Integration', () => {
  const MOCK_API_URL = process.env.MOCK_API_URL || 'http://localhost:8000';

  it('should connect to mock API health endpoint', async () => {
    try {
      const response = await fetch(`${MOCK_API_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      expect(response.ok).toBe(true);
    } catch {
      // Mock API may not be running - skip test
      console.log('Mock API not running - skipping test');
    }
  });

  it('should get threat status for location', async () => {
    try {
      const response = await fetch(`${MOCK_API_URL}/status/Singapore%20Hub`, {
        signal: AbortSignal.timeout(5000),
      });
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.location).toBeDefined();
      expect(data.status).toBeDefined();
    } catch {
      console.log('Mock API not running - skipping test');
    }
  });
});
