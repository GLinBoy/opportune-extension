import { browser, type Browser } from 'wxt/browser';
import {
  buildWebhookUrl,
  webhookTargets,
  type WebhookTarget,
} from '@/utils/webhookTargets';
import {
  capturePageHtml,
  showResultToast,
  type ToastTone,
} from '@/utils/inPageScripts';

const MENU_ROOT_ID = 'sto:root';
const MENU_OPTIONS_ID = 'sto:options';
const TARGET_MENU_PREFIX = 'sto:target:';

function targetMenuId(targetId: string): string {
  return `${TARGET_MENU_PREFIX}${targetId}`;
}

function targetIdFromMenuId(menuItemId: string | number): string | null {
  const id = String(menuItemId);
  return id.startsWith(TARGET_MENU_PREFIX)
    ? id.slice(TARGET_MENU_PREFIX.length)
    : null;
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    void rebuildMenus();
  });

  webhookTargets.watch(() => {
    void rebuildMenus();
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    void handleMenuClick(info, tab);
  });

  void rebuildMenus();
});

async function rebuildMenus(): Promise<void> {
  try {
    await browser.contextMenus.removeAll();
  } catch {
    // Nothing to clear yet.
  }

  const targets = (await webhookTargets.getValue()) ?? [];

  if (targets.length === 0) {
    browser.contextMenus.create({
      id: MENU_OPTIONS_ID,
      title: 'Send to Opportune — set up a target…',
      contexts: ['page'],
    });
    return;
  }

  if (targets.length === 1) {
    browser.contextMenus.create({
      id: targetMenuId(targets[0].id),
      title: 'Send to Opportune',
      contexts: ['page'],
    });
    return;
  }

  browser.contextMenus.create({
    id: MENU_ROOT_ID,
    title: 'Send to Opportune',
    contexts: ['page'],
  });

  for (const target of targets) {
    browser.contextMenus.create({
      id: targetMenuId(target.id),
      title: target.label,
      contexts: ['page'],
      parentId: MENU_ROOT_ID,
    });
  }
}

async function handleMenuClick(
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab,
): Promise<void> {
  if (info.menuItemId === MENU_OPTIONS_ID) {
    await browser.runtime.openOptionsPage();
    return;
  }

  const targetId = targetIdFromMenuId(info.menuItemId);
  if (!targetId) return;

  const targets = (await webhookTargets.getValue()) ?? [];
  const target = targets.find((item) => item.id === targetId);

  if (!target) {
    void rebuildMenus();
    if (tab?.id != null) {
      await showToast(
        tab.id,
        'That target no longer exists. Open the extension settings.',
        'error',
      );
    }
    return;
  }

  await sendToTarget(target, tab);
}

async function sendToTarget(
  target: WebhookTarget,
  tab?: Browser.tabs.Tab,
): Promise<void> {
  const tabId = tab?.id;
  if (tabId == null) return;

  const pageUrl = tab?.url ?? '';

  let html: string;
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: capturePageHtml,
    });
    html = results[0]?.result ?? '';
  } catch {
    await showToast(tabId, 'Could not read this page.', 'error');
    return;
  }

  let response: Response;
  try {
    response = await fetch(buildWebhookUrl(target), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${target.token}`,
      },
      body: JSON.stringify({
        url: pageUrl,
        html,
        capturedAt: new Date().toISOString(),
      }),
    });
  } catch {
    await showToast(
      tabId,
      `Could not reach “${target.label}”. Check your connection and host access.`,
      'error',
    );
    return;
  }

  await showToast(tabId, responseMessage(target, response.status), toneForStatus(response.status));
}

function responseMessage(target: WebhookTarget, status: number): string {
  switch (status) {
    case 201:
      return `Sent to “${target.label}”.`;
    case 409:
      return `This page is already in “${target.label}”.`;
    case 401:
      return `Token for “${target.label}” is invalid or revoked. Check the target.`;
    case 400:
      return `“${target.label}” rejected the captured page.`;
    case 404:
      return `Endpoint for “${target.label}” was not found. Check the target.`;
    default:
      return `Sending to “${target.label}” failed (${status}).`;
  }
}

function toneForStatus(status: number): ToastTone {
  return status === 201 ? 'success' : 'error';
}

async function showToast(
  tabId: number,
  message: string,
  tone: ToastTone,
): Promise<void> {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: showResultToast,
      args: [message, tone],
    });
  } catch {
    // Restricted pages (e.g. browser UI) cannot host the toast overlay.
  }
}
