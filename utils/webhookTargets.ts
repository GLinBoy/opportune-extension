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

export function buildWebhookUrl(
  target: Pick<WebhookTarget, 'serverBaseUrl' | 'endpointId'>,
): string {
  const base = target.serverBaseUrl.replace(/\/+$/, '');
  return `${base}/api/webhook/${target.endpointId}`;
}
