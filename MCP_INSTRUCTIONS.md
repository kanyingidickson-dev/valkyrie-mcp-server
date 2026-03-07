# 🛡️ Valkyrie AI Prompt Library

This file contains pre-defined prompts for interacting with Project Valkyrie via an MCP-enabled AI assistant. Use these prompts to demonstrate the "human-in-the-loop" workflow.

---

## Routine Operations

### Scan All Assets

```
Valkyrie, scan all assets in the Logistics database for new environmental alerts.
```

**Expected AI Action**: Fetches mock API data for each asset, reports any threats found.

### Check Specific Asset

```
Check the Singapore Distribution Hub for any current threats.
```

**Expected AI Action**: Calls `analyze_global_threats` tool, creates Notion incident if alert detected.

### Get Asset Inventory

```
List all assets currently tracked in our global logistics network.
```

**Expected AI Action**: Calls `list_all_assets`, displays assets with risk emoji indicators.

---

## Crisis Response Scenarios

### Incident Triage

```
An alert was detected for Rotterdam Port Terminal. Analyze the impact and stage a response plan in Notion.
```

**Expected AI Action**:

1. Fetches threat details from mock API
2. Creates Notion page with threat analysis
3. Sets status to "Awaiting Approval"
4. Links to affected asset

### Resource Reallocation

```
Find the nearest stable facility to the Tokyo Data Vault for a possible reroute during the current crisis.
```

**Expected AI Action**:

1. Queries Notion for all assets
2. Calculates distance from Tokyo
3. Filters by low risk
4. Returns nearest safe asset

### Full System Scan

```
Run a comprehensive threat assessment across all our global assets and create incident reports for any critical findings.
```

**Expected AI Action**:

1. Scans all assets via `scan_all_assets`
2. Creates individual incident pages for each threat
3. Provides summary of actions taken

---

## Demo Prompt

### Opening Demo

```
Valkyrie, I need a status report on our global logistics network. What assets are we tracking and are there any active threats?
```

### Trigger Demo Threat

_(First trigger a threat via mock API: `curl http://localhost:8000/trigger/Singapore%20Hub`)_

```
Check our Singapore hub for any developing situations.
```

### Human Approval Simulation

```
I've reviewed the incident in Notion. The threat level is confirmed. Please provide details on the nearest safe facility for rerouting.
```

---

## Advanced Prompts

### Multi-Asset Analysis

```
Compare the risk profiles of our Singapore and Tokyo facilities. Which one has higher vulnerability and why?
```

### Historical Context

```
What is the risk sensitivity rating for the Panama Canal Logistics Zone? Should we be concerned about this asset?
```

### Geographic Query

```
Which of our assets are located in the Asia-Pacific region? Show me their coordinates and risk levels.
```

---

## Tips for Best Results

1. **Be Specific**: Use exact asset names from your Notion database
2. **Request Actions**: Ask AI to "create", "stage", or "report" to trigger Notion updates
3. **Verify in Notion**: After AI reports an action, check your Notion dashboard to confirm
4. **Use Coordinates**: For location-based queries, provide coordinates in format "lat, lng"

---

## Troubleshooting Prompts

### If AI Can't Find Assets

```
Refresh your knowledge of the Logistics database schema and list all available assets.
```

### If Mock API Seems Down

```
What is the current status of the threat simulation engine?
```

### To Verify MCP Connection

```
What tools do you have available for crisis management operations?
```
