<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { browser } from 'wxt/browser';
import { webhookTargets } from '@/utils/webhookTargets';

const count = ref(0);

async function openOptions() {
  await browser.runtime.openOptionsPage();
  window.close();
}

onMounted(async () => {
  const targets = (await webhookTargets.getValue()) ?? [];
  count.value = targets.length;
});
</script>

<template>
  <main>
    <h1>Send to Opportune</h1>
    <p v-if="count === 0">
      No targets configured yet. Add one, then right-click a job posting to send
      it.
    </p>
    <p v-else>
      {{ count }} target{{ count === 1 ? '' : 's' }} configured. Right-click a job
      posting to send it.
    </p>
    <button type="button" @click="openOptions">Open settings</button>
  </main>
</template>

<style scoped>
main {
  padding: 1rem 1.25rem;
  min-width: 260px;
}

h1 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
}

p {
  margin: 0 0 1rem;
  color: #6b7280;
  font-size: 0.85rem;
  line-height: 1.4;
}

button {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background-color: #4f46e5;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  background-color: #4338ca;
}
</style>
