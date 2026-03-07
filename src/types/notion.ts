/**
 * TypeScript interfaces for Notion API responses
 * Used throughout Valkyrie MCP Server for type safety
 */

// ============= Database Query Responses =============

export interface NotionPageObject {
  id: string;
  object: 'page';
  created_time: string;
  last_edited_time: string;
  properties: Record<string, NotionProperty>;
  url: string;
}

export interface NotionDatabaseObject {
  id: string;
  object: 'database';
  title: NotionRichText[];
  properties: Record<string, NotionPropertySchema>;
}

// ============= Property Types =============

export interface NotionProperty {
  id?: string;
  type: string;
  title?: NotionRichText[];
  rich_text?: NotionRichText[];
  number?: number | null;
  select?: NotionSelectOption | null;
  status?: NotionSelectOption | null;
  date?: NotionDate | null;
  relation?: NotionRelation[];
  people?: NotionUser[];
  checkbox?: boolean;
  url?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

export interface NotionPropertySchema {
  id: string;
  name: string;
  type: string;
  options?: NotionSelectOption[];
}

// ============= Value Types =============

export interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  plain_text: string;
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  mention?: {
    type: string;
    [key: string]: unknown;
  };
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
}

export interface NotionSelectOption {
  id?: string;
  name: string;
  color?: string;
}

export interface NotionDate {
  start: string;
  end?: string | null;
  time_zone?: string | null;
}

export interface NotionRelation {
  id: string;
}

export interface NotionUser {
  id: string;
  object: 'user';
  name?: string;
  type: string;
  person?: {
    email: string;
  };
}

// ============= Block Types =============

export interface NotionBlock {
  object: 'block';
  id?: string;
  type: string;
  [key: string]: unknown;
}

export interface NotionHeadingBlock extends NotionBlock {
  type: 'heading_1' | 'heading_2' | 'heading_3';
  heading_1?: { rich_text: NotionRichText[] };
  heading_2?: { rich_text: NotionRichText[] };
  heading_3?: { rich_text: NotionRichText[] };
}

export interface NotionParagraphBlock extends NotionBlock {
  type: 'paragraph';
  paragraph: { rich_text: NotionRichText[] };
}

export interface NotionToDoBlock extends NotionBlock {
  type: 'to_do';
  to_do: {
    rich_text: NotionRichText[];
    checked: boolean;
  };
}

// ============= Asset Types (Valkyrie Specific) =============

export interface AssetProperties {
  'Asset Name': { title: [{ plain_text: string }] };
  Coordinates?: { rich_text: [{ plain_text: string }] };
  'Risk Sensitivity'?: { number: number };
  Status?: { select: NotionSelectOption };
  'Last Audit'?: { date: NotionDate };
  'Primary Contact'?: { rich_text: [{ plain_text: string }] };
  'Primary Phone'?: { rich_text: [{ plain_text: string }] };
  'Primary Email'?: { rich_text: [{ plain_text: string }] };
  'Facility Manager'?: { rich_text: [{ plain_text: string }] };
  'Facility Type'?: { select: NotionSelectOption };
}

export interface IncidentProperties {
  'Incident Name': { title: [{ text: { content: string } }] };
  Status: { status: { name: string } };
  'Threat Level': { select: { name: string } };
  'Affected Assets': { relation: { id: string }[] };
  'AI Assessments'?: { rich_text: [{ text: { content: string } }] };
}

export interface LogisticsProperties {
  'Asset Name'?: { title: Array<{ plain_text: string }> };
  Coordinates?: { rich_text: Array<{ plain_text: string }> };
  'Risk Sensitivity'?: { number: number };
  Status?: { select: { name: string } };
  'Last Audit'?: { date: { start: string } };
  'Primary Contact'?: { rich_text: Array<{ plain_text: string }> };
  'Primary Phone'?: { phone_number: string };
  'Primary Email'?: { email: string };
  'Facility Manager'?: { rich_text: Array<{ plain_text: string }> };
  'Facility Type'?: { select: { name: string } };
}

export interface DashboardProperties {
  'Incident Name'?: { title: Array<{ plain_text: string }> };
  Status?: { status: { name: string } };
  'Threat Level'?: { select: { name: string } };
  'Affected Assets'?: { relation: Array<{ id: string }> };
  'AI Assessments'?: { rich_text: Array<{ plain_text: string }> };
}

// ============= API Response Types =============

export interface NotionQueryResponse {
  object: 'list';
  results: NotionPageObject[];
  next_cursor: string | null;
  has_more: boolean;
  type: 'page' | 'database';
}

export interface NotionErrorResponse {
  object: 'error';
  status: number;
  code: string;
  message: string;
}

// ============= Helper Types =============

export interface ParsedAsset {
  id: string;
  name: string;
  coordinates: string;
  risk: number;
  status?: string;
  lastAudit?: string;
}

export interface ThreatData {
  location: string;
  status: 'Stable' | 'Alert';
  threat_level: number;
  category?: string;
  summary?: string;
  mitigation?: string;
  timestamp: string;
  affected_systems?: string[];
}
