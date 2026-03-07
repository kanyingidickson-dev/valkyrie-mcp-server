# Project Valkyrie Diagrams (Mermaid)

## 1. High-Level Core MCP Connection

```mermaid
flowchart LR
  subgraph Local
    A[AI Agent / IDE] -->|MCP Tools| B[Valkyrie MCP Server]
    B --> C[Python Threat Simulator]
    B --> D[Notion API]
  end
  subgraph Cloud
    D --> E[Notion Workspace]
  end
```

## 2. Data Flow & Human-in-the-Loop Sequence

```mermaid
sequenceDiagram
  participant User
  participant AI
  participant MCP
  participant Simulator
  participant Notion

  User->>AI: "Check threats near Singapore Hub"
  AI->>MCP: call analyze_global_threats
  MCP->>Simulator: GET /status/Singapore Hub
  Simulator-->>MCP: Alert/Stable
  MCP->>Notion: create Incident (Awaiting Approval)
  Notion-->>User: Notification (Awaiting Approval)
```

## 3. Technical Component Stack

```mermaid
graph TD
  A[Local Machine] --> B[Docker Compose]
  B --> C[Valkyrie MCP Container]
  B --> D[Python Threat Simulator Container]
  C --> E[Notion API (Cloud)]
  C --> F[AI IDE]
```

```

```
