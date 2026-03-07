/* eslint-disable @typescript-eslint/no-explicit-any */

export declare function queryNotionDatabase(
  databaseId: string,
  filter?: Record<string, unknown>
): Promise<unknown[]>;

export declare function ensureAssetPage(
  assetName: string,
  coordinates: string,
  notionClient?: unknown
): Promise<string>;
declare const _default: {
  ensureAssetPage: typeof ensureAssetPage;
  queryNotionDatabase: typeof queryNotionDatabase;
};
