export default defineBackground(() => {
  console.log('Send to Opportune background ready', { id: browser.runtime.id });
});
