import { storage } from 'wxt/utils/storage';

export interface WebhookTarget {
  id: string;
  label: string;
  serverBaseUrl: string;
  endpointId: string;
  token: string;
  createdAt: string;
}

export const webhookTargets = storage.defineItem<WebhookTarget[]>(
  'local:webhookTargets',
  { fallback: [] },
);

function isWebhookTarget(value: unknown): value is WebhookTarget {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WebhookTarget>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.serverBaseUrl === 'string' &&
    typeof candidate.endpointId === 'string' &&
    typeof candidate.token === 'string'
  );
}

export function normalizeWebhookTargets(value: unknown): WebhookTarget[] {
  if (Array.isArray(value)) return value.filter(isWebhookTarget);
  if (isWebhookTarget(value)) return [value];
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).filter(
      isWebhookTarget,
    );
  }
  return [];
}

export async function readWebhookTargets(): Promise<WebhookTarget[]> {
  const stored = await webhookTargets.getValue();
  return normalizeWebhookTargets(stored);
}

export function writeWebhookTargets(
  targets: readonly WebhookTarget[],
): Promise<void> {
  return webhookTargets.setValue(
    targets.map((target) => ({ ...target })),
  );
}

export function buildWebhookUrl(
  target: Pick<WebhookTarget, 'serverBaseUrl' | 'endpointId'>,
): string {
  const base = normalizeServerBaseUrl(target.serverBaseUrl);
  return `${base}/api/webhook/${target.endpointId}`;
}

export function normalizeServerBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function isValidServerBaseUrl(value: string): boolean {
  try {
    const { protocol } = new URL(normalizeServerBaseUrl(value));
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function getOriginPattern(serverBaseUrl: string): string | null {
  try {
    return `${new URL(normalizeServerBaseUrl(serverBaseUrl)).origin}/*`;
  } catch {
    return null;
  }
}

export interface ParsedWebhookUrl {
  serverBaseUrl: string;
  endpointId: string;
}

export function parseWebhookUrl(value: string): ParsedWebhookUrl | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  const match = url.pathname.match(/^(.*)\/api\/webhook\/([^/]+)\/?$/);
  if (!match) return null;

  const serverBaseUrl = normalizeServerBaseUrl(`${url.origin}${match[1]}`);
  let endpointId: string;
  try {
    endpointId = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  if (!endpointId) return null;

  return { serverBaseUrl, endpointId };
}

export function maskToken(token: string): string {
  return token ? '••••••••' : '';
}
