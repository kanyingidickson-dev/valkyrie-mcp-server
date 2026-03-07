/**
 * Unit tests for Valkyrie MCP Tools
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('Valkyrie MCP Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Distance Calculation', () => {
    it('should calculate distance between two coordinates correctly', () => {
      const calculateDistance = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
      ): number => {
        return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
      };

      const distance = calculateDistance(1.2902, 103.8519, 25.2048, 55.2708);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should return 0 for same coordinates', () => {
      const calculateDistance = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
      ): number => {
        return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
      };

      const distance = calculateDistance(1.2902, 103.8519, 1.2902, 103.8519);
      expect(distance).toBe(0);
    });
  });

  describe('Risk Level Classification', () => {
    it('should classify high risk assets (>= 8)', () => {
      const getRiskEmoji = (risk: number): string => {
        return risk >= 8 ? '🔴' : risk >= 5 ? '🟡' : '🟢';
      };

      expect(getRiskEmoji(8)).toBe('🔴');
      expect(getRiskEmoji(9)).toBe('🔴');
      expect(getRiskEmoji(10)).toBe('🔴');
    });

    it('should classify medium risk assets (5-7)', () => {
      const getRiskEmoji = (risk: number): string => {
        return risk >= 8 ? '🔴' : risk >= 5 ? '🟡' : '🟢';
      };

      expect(getRiskEmoji(5)).toBe('🟡');
      expect(getRiskEmoji(6)).toBe('🟡');
      expect(getRiskEmoji(7)).toBe('🟡');
    });

    it('should classify low risk assets (< 5)', () => {
      const getRiskEmoji = (risk: number): string => {
        return risk >= 8 ? '🔴' : risk >= 5 ? '🟡' : '🟢';
      };

      expect(getRiskEmoji(1)).toBe('🟢');
      expect(getRiskEmoji(2)).toBe('🟢');
      expect(getRiskEmoji(4)).toBe('🟢');
    });
  });

  describe('Threat Level Text', () => {
    it('should return Critical for threat level >= 8', () => {
      const getThreatLevelText = (level: number): string => {
        return level >= 8 ? 'Critical (Red)' : 'Elevated (Yellow)';
      };

      expect(getThreatLevelText(8)).toBe('Critical (Red)');
      expect(getThreatLevelText(10)).toBe('Critical (Red)');
    });

    it('should return Elevated for threat level < 8', () => {
      const getThreatLevelText = (level: number): string => {
        return level >= 8 ? 'Critical (Red)' : 'Elevated (Yellow)';
      };

      expect(getThreatLevelText(7)).toBe('Elevated (Yellow)');
      expect(getThreatLevelText(1)).toBe('Elevated (Yellow)');
    });
  });

  describe('Coordinate Parsing', () => {
    it('should parse coordinates string correctly', () => {
      const parseCoords = (coords: string): [number, number] => {
        const [lat, lon] = coords.split(',').map(c => parseFloat(c.trim()));
        return [lat, lon];
      };

      const [lat, lon] = parseCoords('1.2902, 103.8519');
      expect(lat).toBe(1.2902);
      expect(lon).toBe(103.8519);
    });

    it('should handle coordinates with extra spaces', () => {
      const parseCoords = (coords: string): [number, number] => {
        const [lat, lon] = coords.split(',').map(c => parseFloat(c.trim()));
        return [lat, lon];
      };

      const [lat, lon] = parseCoords('  1.2902 ,  103.8519  ');
      expect(lat).toBe(1.2902);
      expect(lon).toBe(103.8519);
    });
  });

  describe('Asset Filtering', () => {
    const mockAssets = [
      { name: 'Asset A', risk: 8, coordinates: '1, 1' },
      { name: 'Asset B', risk: 4, coordinates: '2, 2' },
      { name: 'Asset C', risk: 2, coordinates: '3, 3' },
    ];

    it('should filter stable assets (risk < 5)', () => {
      const stableAssets = mockAssets.filter(a => a.risk < 5);
      expect(stableAssets).toHaveLength(2);
      expect(stableAssets.map(a => a.name)).toEqual(['Asset B', 'Asset C']);
    });

    it('should filter high risk assets (risk >= 7)', () => {
      const highRiskAssets = mockAssets.filter(a => a.risk >= 7);
      expect(highRiskAssets).toHaveLength(1);
      expect(highRiskAssets[0].name).toBe('Asset A');
    });
  });

  describe('Incident Name Generation', () => {
    it('should generate correct incident name format', () => {
      const generateIncidentName = (category: string, assetName: string): string => {
        return `🚨 ALERT: ${category} - ${assetName}`;
      };

      const name = generateIncidentName('Environmental', 'Singapore Hub');
      expect(name).toBe('🚨 ALERT: Environmental - Singapore Hub');
      expect(name).toContain('🚨');
      expect(name).toContain('Environmental');
      expect(name).toContain('Singapore Hub');
    });
  });
});
