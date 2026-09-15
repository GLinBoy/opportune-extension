# Send to Opportune (browser extension)

Right-click a job posting you are viewing and send the fully-loaded page to an
[Opportune](https://github.com/GLinBoy/opportune) instance, where it is parsed
and saved as an application.

Built with [WXT](https://wxt.dev/) + Vue 3. Manifest V3 for Chrome, Edge and
Firefox. **Safari is out of scope.**

## Requirements

- A running Opportune instance (default dev URL `http://localhost:8080`).
- A **webhook token** created in the web app under **Profile → API & Webhooks**.
  Each token has its own endpoint URL:
  `https://your-opportune-host/api/webhook/{endpointId}`.

## Install (unpacked, for development)

1. `bun install`
2. `bun run build` (Chrome/Edge) or `bun run build:firefox`
3. Load the build:
   - **Chrome/Edge**: `chrome://extensions` → enable Developer mode → *Load
     unpacked* → select `.output/chrome-mv3`.
   - **Firefox**: `about:debugging#/runtime/this-firefox` → *Load Temporary
     Add-on* → select any file in `.output/firefox-mv3`.

Packaged zips are produced by `bun run zip` / `bun run zip:firefox` into
`.output/`.

## Configure a target

1. Open the extension's options page (toolbar icon → **Open settings**, or
   right-click a page with no targets and choose *Send to Opportune — set up a
   target…*).
2. **Add target** and paste the full endpoint URL (or enter the server base URL
   and endpoint ID manually), plus a label and the token.
3. Accept the host-access prompt for your Opportune origin. Without it, sending
   fails.

Targets and tokens are stored only in `browser.storage.local` on this machine.
Tokens are masked in the UI by default and are never written to the console or
sent anywhere except your Opportune instance.

## Usage

Right-click anywhere on a job posting (context menu → **Send to Opportune**).
The extension waits for the page to finish loading, captures its HTML, and POSTs
it to the selected target. A toast reports the result:

- **Success** — the application appears in Opportune as `INITIATED` and is then
  AI-enriched.
- **Already exists** — the page URL is already saved for that profile.
- **Invalid/revoked token** — generate a new token and update the target.

With one target the menu is a single item; with two or more, a submenu lists
each target by label.

## Permissions

| Permission | Why |
|------------|-----|
| `contextMenus` | Adds the *Send to Opportune* right-click item. |
| `activeTab` | Temporary access to the current tab on user gesture, to read the page. |
| `scripting` | Injects the HTML capture and the result toast into that tab. |
| `storage` | Stores targets/tokens locally. |
| *optional* `http(s)://*/*` | Requested per target so the POST can reach your Opportune origin. |

No `notifications`, no `<all_urls>`, no remote code.

## Development

```sh
bun run dev            # Chrome dev
bun run dev:firefox    # Firefox dev
bun run compile        # type-check (vue-tsc)
bun run build          # Chrome/Edge MV3
bun run build:firefox  # Firefox MV3
bun run zip            # Chrome/Edge zip
bun run zip:firefox    # Firefox zip
```
