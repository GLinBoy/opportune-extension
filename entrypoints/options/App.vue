<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { browser } from 'wxt/browser';
import {
  buildWebhookUrl,
  getOriginPattern,
  isValidServerBaseUrl,
  maskToken,
  normalizeServerBaseUrl,
  parseWebhookUrl,
  readWebhookTargets,
  webhookTargets,
  type WebhookTarget,
} from '@/utils/webhookTargets';

const targets = ref<WebhookTarget[]>([]);
const loaded = ref(false);
const permissions = ref<Record<string, boolean>>({});
const revealed = ref<Record<string, boolean>>({});
const savedWarning = ref('');

const dialogOpen = ref(false);
const editingId = ref<string | null>(null);
const formTokenRevealed = ref(false);
const formError = ref('');
const pasteUrl = ref('');
const form = reactive({
  label: '',
  serverBaseUrl: '',
  endpointId: '',
  token: '',
});

const pendingDelete = ref<WebhookTarget | null>(null);

const isEditing = computed(() => editingId.value !== null);
const targetsMissingPermission = computed(() =>
  targets.value.filter((target) => permissions.value[target.id] === false),
);

async function load() {
  targets.value = await readWebhookTargets();
  await refreshPermissions();
  loaded.value = true;
}

async function refreshPermissions() {
  const entries = await Promise.all(
    targets.value.map(async (target) => {
      const pattern = getOriginPattern(target.serverBaseUrl);
      const granted = pattern
        ? await browser.permissions.contains({ origins: [pattern] })
        : false;
      return [target.id, granted] as const;
    }),
  );
  permissions.value = Object.fromEntries(entries);
}

function resetForm() {
  form.label = '';
  form.serverBaseUrl = '';
  form.endpointId = '';
  form.token = '';
  pasteUrl.value = '';
  formTokenRevealed.value = false;
  formError.value = '';
}

function openAdd() {
  resetForm();
  editingId.value = null;
  dialogOpen.value = true;
}

function openEdit(target: WebhookTarget) {
  resetForm();
  editingId.value = target.id;
  form.label = target.label;
  form.serverBaseUrl = target.serverBaseUrl;
  form.endpointId = target.endpointId;
  form.token = target.token;
  dialogOpen.value = true;
}

function closeDialog() {
  dialogOpen.value = false;
  editingId.value = null;
  resetForm();
}

function applyPastedUrl() {
  const parsed = parseWebhookUrl(pasteUrl.value);
  if (!parsed) {
    formError.value =
      'Could not read that endpoint URL. Expected a URL ending in /api/webhook/{endpointId}.';
    return;
  }
  form.serverBaseUrl = parsed.serverBaseUrl;
  form.endpointId = parsed.endpointId;
  formError.value = '';
}

async function save() {
  formError.value = '';

  const pasted = pasteUrl.value.trim();
  if (pasted) {
    const parsed = parseWebhookUrl(pasted);
    if (!parsed) {
      formError.value = 'Could not read the pasted endpoint URL.';
      return;
    }
    form.serverBaseUrl = parsed.serverBaseUrl;
    form.endpointId = parsed.endpointId;
  }

  if (!form.label.trim()) {
    formError.value = 'Label is required.';
    return;
  }
  if (!isValidServerBaseUrl(form.serverBaseUrl)) {
    formError.value = 'Server base URL must be a valid http(s) URL.';
    return;
  }
  if (!form.endpointId.trim()) {
    formError.value = 'Webhook endpoint ID is required.';
    return;
  }
  if (!form.token.trim()) {
    formError.value = 'Token is required.';
    return;
  }

  const serverBaseUrl = normalizeServerBaseUrl(form.serverBaseUrl);
  const originPattern = getOriginPattern(serverBaseUrl);

  let granted = false;
  if (originPattern) {
    granted = await browser.permissions.request({ origins: [originPattern] });
  }

  const values = {
    label: form.label.trim(),
    serverBaseUrl,
    endpointId: form.endpointId.trim(),
    token: form.token.trim(),
  };

  let affectedId: string;
  if (editingId.value) {
    affectedId = editingId.value;
    targets.value = targets.value.map((target) =>
      target.id === affectedId ? { ...target, ...values } : target,
    );
  } else {
    affectedId = crypto.randomUUID();
    targets.value = [
      ...targets.value,
      { id: affectedId, createdAt: new Date().toISOString(), ...values },
    ];
  }

  await webhookTargets.setValue(targets.value);
  permissions.value = { ...permissions.value, [affectedId]: granted };
  closeDialog();

  savedWarning.value = granted
    ? ''
    : `Host access for ${serverBaseUrl} was not granted. Sending to “${values.label}” will fail until you grant access.`;
}

async function grantPermission(target: WebhookTarget) {
  const pattern = getOriginPattern(target.serverBaseUrl);
  if (!pattern) return;
  const granted = await browser.permissions.request({ origins: [pattern] });
  permissions.value = { ...permissions.value, [target.id]: granted };
  if (granted) savedWarning.value = '';
}

function askDelete(target: WebhookTarget) {
  pendingDelete.value = target;
}

async function confirmDelete() {
  const target = pendingDelete.value;
  if (!target) return;
  targets.value = targets.value.filter((item) => item.id !== target.id);
  await webhookTargets.setValue(targets.value);
  pendingDelete.value = null;
}

function toggleReveal(id: string) {
  revealed.value = { ...revealed.value, [id]: !revealed.value[id] };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

onMounted(load);
</script>

<template>
  <main class="settings">
    <header>
      <h1>Send to Opportune</h1>
      <p>Manage the webhook targets this extension can send captured pages to.</p>
    </header>

    <p v-if="savedWarning" class="banner warning" role="status">
      {{ savedWarning }}
    </p>
    <p
      v-else-if="targetsMissingPermission.length > 0"
      class="banner warning"
      role="status"
    >
      {{ targetsMissingPermission.length }} target(s) still need host access before
      they can send.
    </p>

    <section aria-labelledby="targets-heading">
      <div class="section-head">
        <h2 id="targets-heading">Webhook targets</h2>
        <button type="button" class="btn primary" @click="openAdd">
          Add target
        </button>
      </div>

      <p v-if="!loaded" class="muted">Loading…</p>
      <p v-else-if="targets.length === 0" class="empty">
        No targets yet — connect one.
      </p>
      <ul v-else class="target-list">
        <li v-for="target in targets" :key="target.id" class="target">
          <div class="target-head">
            <span class="target-label">{{ target.label }}</span>
            <span
              class="badge"
              :class="permissions[target.id] ? 'ok' : 'warn'"
            >
              {{ permissions[target.id] ? 'Access granted' : 'Access needed' }}
            </span>
          </div>

          <dl class="target-meta">
            <dt>Server</dt>
            <dd><code>{{ normalizeServerBaseUrl(target.serverBaseUrl) }}</code></dd>
            <dt>Endpoint</dt>
            <dd><code>{{ buildWebhookUrl(target) }}</code></dd>
            <dt>Token</dt>
            <dd class="token-row">
              <code v-if="revealed[target.id]" class="token">{{
                target.token
              }}</code>
              <code v-else class="token">{{ maskToken(target.token) }}</code>
              <button
                type="button"
                class="btn link"
                @click="toggleReveal(target.id)"
              >
                {{ revealed[target.id] ? 'Hide' : 'Show' }}
              </button>
            </dd>
            <dt>Created</dt>
            <dd>{{ formatDate(target.createdAt) }}</dd>
          </dl>

          <div class="target-actions">
            <button
              v-if="!permissions[target.id]"
              type="button"
              class="btn"
              @click="grantPermission(target)"
            >
              Grant access
            </button>
            <button type="button" class="btn" @click="openEdit(target)">
              Edit
            </button>
            <button type="button" class="btn danger" @click="askDelete(target)">
              Delete
            </button>
          </div>
        </li>
      </ul>
    </section>

    <div v-if="dialogOpen" class="overlay" @click.self="closeDialog">
      <form class="dialog" @submit.prevent="save">
        <h2>{{ isEditing ? 'Edit target' : 'Add target' }}</h2>

        <label class="field">
          <span>Paste full endpoint URL (optional)</span>
          <div class="inline">
            <input
              v-model="pasteUrl"
              type="url"
              placeholder="https://opportune.example.com/api/webhook/abc123"
            />
            <button type="button" class="btn" @click="applyPastedUrl">
              Use
            </button>
          </div>
        </label>

        <label class="field">
          <span>Label</span>
          <input v-model="form.label" type="text" placeholder="Production" />
        </label>

        <label class="field">
          <span>Server base URL</span>
          <input
            v-model="form.serverBaseUrl"
            type="url"
            placeholder="https://opportune.example.com"
          />
        </label>

        <label class="field">
          <span>Webhook endpoint ID</span>
          <input v-model="form.endpointId" type="text" placeholder="abc123" />
        </label>

        <label class="field">
          <span>Token</span>
          <div class="inline">
            <input
              v-model="form.token"
              :type="formTokenRevealed ? 'text' : 'password'"
              autocomplete="off"
            />
            <button
              type="button"
              class="btn"
              @click="formTokenRevealed = !formTokenRevealed"
            >
              {{ formTokenRevealed ? 'Hide' : 'Show' }}
            </button>
          </div>
        </label>

        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

        <div class="dialog-actions">
          <button type="button" class="btn" @click="closeDialog">Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>
    </div>

    <div v-if="pendingDelete" class="overlay" @click.self="pendingDelete = null">
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>Delete target</h2>
        <p>
          Delete “{{ pendingDelete.label }}”? This removes it from this browser
          only.
        </p>
        <div class="dialog-actions">
          <button type="button" class="btn" @click="pendingDelete = null">
            Cancel
          </button>
          <button type="button" class="btn danger" @click="confirmDelete">
            Delete
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.settings {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

h2 {
  margin: 0;
  font-size: 1.05rem;
}

header p {
  margin: 0;
  color: #6b7280;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin: 1.75rem 0 0.75rem;
}

.banner {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.banner.warning {
  border: 1px solid #f59e0b;
  background: #fffbeb;
  color: #92400e;
}

.muted {
  color: #6b7280;
}

.empty {
  padding: 1.25rem;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  color: #6b7280;
  text-align: center;
}

.target-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.target {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.target-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.target-label {
  font-weight: 600;
}

.badge {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
}

.badge.ok {
  background: #dcfce7;
  color: #166534;
}

.badge.warn {
  background: #fef3c7;
  color: #92400e;
}

.target-meta {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.2rem 0.5rem;
  margin: 0;
  font-size: 0.85rem;
}

.target-meta dt {
  color: #6b7280;
}

.target-meta dd {
  margin: 0;
  word-break: break-all;
}

.token-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.token {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.target-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #1f2937;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn:hover {
  border-color: #94a3b8;
}

.btn.primary {
  border-color: #4f46e5;
  background: #4f46e5;
  color: #fff;
}

.btn.primary:hover {
  background: #4338ca;
}

.btn.danger {
  border-color: #dc2626;
  color: #dc2626;
}

.btn.danger:hover {
  background: #fef2f2;
}

.btn.link {
  padding: 0.15rem 0.4rem;
  border-color: transparent;
  background: transparent;
  color: #4f46e5;
}

.overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.45);
}

.dialog {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.25rem;
  border-radius: 10px;
  background: #fff;
  color: #1f2937;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
}

.field > span {
  color: #374151;
  font-weight: 500;
}

.field input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
}

.inline {
  display: flex;
  gap: 0.5rem;
}

.inline input {
  flex: 1;
}

.form-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.85rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

@media (prefers-color-scheme: dark) {
  .target {
    border-color: #334155;
  }

  .btn {
    border-color: #475569;
    background: #1e293b;
    color: #e2e8f0;
  }

  .btn.primary {
    border-color: #6366f1;
    background: #6366f1;
    color: #fff;
  }

  .btn.danger {
    border-color: #ef4444;
    color: #f87171;
  }

  .btn.link {
    background: transparent;
    color: #a5b4fc;
  }

  .dialog {
    background: #1e293b;
    color: #e2e8f0;
  }

  .field > span {
    color: #cbd5e1;
  }

  .field input {
    border-color: #475569;
    background: #0f172a;
    color: #e2e8f0;
  }
}
</style>
