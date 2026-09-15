import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifestVersion: 3,
  manifest: {
    name: 'Send to Opportune',
    description:
      'Capture a job posting you are viewing and send it to your Opportune instance.',
    version: '0.1.0',
    permissions: ['contextMenus', 'activeTab', 'scripting', 'storage'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    browser_specific_settings: {
      gecko: {
        id: 'send-to-opportune@glinboy.github.io',
        strict_min_version: '109.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
});
