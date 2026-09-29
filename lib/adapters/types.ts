export type PublishInput = { caption: string; mediaUrls: string[]; settings: Record<string, unknown> };
export type AccountCtx = { externalId: string; accessToken: string | null };
export class NotImplementedError extends Error {}
export interface PlatformAdapter {
  /** Must call the OFFICIAL API and return the platform's post id. Never fake success. */
  publish(input: PublishInput, account: AccountCtx): Promise<{ externalPostId: string }>;
}
