<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import {
  buildWebhookUrl,
  webhookTargets,
  type WebhookTarget,
} from '@/utils/webhookTargets';

const targets = ref<WebhookTarget[]>([]);
const loaded = ref(false);

onMounted(async () => {
  targets.value = (await webhookTargets.getValue()) ?? [];
  loaded.value = true;
});
</script>

<template>
  <main class="settings">
    <header>
      <h1>Send to Opportune</h1>
      <p>Manage the webhook targets this extension can send captured pages to.</p>
    </header>

    <section aria-labelledby="targets-heading">
      <h2 id="targets-heading">Webhook targets</h2>

      <p v-if="!loaded" class="muted">Loading…</p>
      <p v-else-if="targets.length === 0" class="empty">
        No targets yet — connect one.
      </p>
      <ul v-else class="target-list">
        <li v-for="target in targets" :key="target.id" class="target">
          <span class="target-label">{{ target.label }}</span>
          <code class="target-url">{{ buildWebhookUrl(target) }}</code>
        </li>
      </ul>
    </section>
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
  margin: 1.75rem 0 0.75rem;
  font-size: 1.05rem;
}

header p {
  margin: 0;
  color: #6b7280;
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
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.target-label {
  font-weight: 600;
}

.target-url {
  font-size: 0.8rem;
  color: #475569;
  word-break: break-all;
}
</style>
