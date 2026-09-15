export type ToastTone = 'success' | 'error';

export async function capturePageHtml(): Promise<string> {
  const MAX_WAIT_MS = 10000;

  if (document.readyState !== 'complete') {
    await new Promise<void>((resolve) => {
      let timer = 0;
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        document.removeEventListener('readystatechange', onReadyStateChange);
        window.removeEventListener('load', finish);
        window.clearTimeout(timer);
        resolve();
      };

      const onReadyStateChange = () => {
        if (document.readyState === 'complete') finish();
      };

      timer = window.setTimeout(finish, MAX_WAIT_MS);
      document.addEventListener('readystatechange', onReadyStateChange);
      window.addEventListener('load', finish);
    });
  }

  return document.documentElement.outerHTML;
}

export function showResultToast(message: string, tone: ToastTone): void {
  const TOAST_ROOT_ID = 'opportune-toast-root';
  const existing = document.getElementById(TOAST_ROOT_ID);
  if (existing) existing.remove();

  const host = document.body ?? document.documentElement;
  if (!host) return;

  const root = document.createElement('div');
  root.id = TOAST_ROOT_ID;
  root.setAttribute('role', 'status');
  root.textContent = message;
  root.style.cssText = [
    'position:fixed',
    'top:16px',
    'right:16px',
    'z-index:2147483647',
    'max-width:360px',
    'padding:12px 16px',
    'border-radius:8px',
    'box-shadow:0 8px 24px rgba(0,0,0,0.25)',
    'font:600 14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    'color:#ffffff',
    `background:${tone === 'success' ? '#166534' : '#b91c1c'}`,
    'opacity:0',
    'transform:translateY(-8px)',
    'transition:opacity 150ms ease,transform 150ms ease',
    'pointer-events:none',
  ].join(';');

  host.appendChild(root);

  window.requestAnimationFrame(() => {
    root.style.opacity = '1';
    root.style.transform = 'translateY(0)';
  });

  window.setTimeout(() => {
    root.style.opacity = '0';
    root.style.transform = 'translateY(-8px)';
    window.setTimeout(() => root.remove(), 200);
  }, 3500);
}
