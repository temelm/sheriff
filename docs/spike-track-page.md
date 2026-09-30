# Spike: trackPage

Status: spike, 2026-09-30. It exists to test whether the agreed API feels right in real code. It is not the library: no packaging, no publishing, and no runtime dependencies. What we learn feeds the [architecture draft](https://github.com/temelm/sheriff/issues/6).

Code: [`src/index.ts`](../src/index.ts) · Tests: [`test/track-page.test.ts`](../test/track-page.test.ts)

## Usage

```ts
import { createSheriff } from './src/index'

// Once, when the site starts.
const sheriff = createSheriff('production')

// After each page's content has loaded.
sheriff.trackPage({ loginStatus: 'guest' })

sheriff.context // the current global context
sheriff.events  // every page view sent so far
```

The instance is also put on `window.sheriff`, so a tag manager or the Chrome extension can find it.

## What trackPage does

1. **Reset and build** a brand new [global context](contracts/page-view.md): `page.path` from the location, `page.referrer` as the previous page's URL (or `document.referrer` on the first page), `site.environment` from setup, and `user.loginStatus` from the call.
2. **Validate** what the app passed in. Sheriff trusts the values it sets itself. In `development` a bad value throws and nothing is sent. Anywhere else the event is still sent, with the `errors` attached.
3. **Save** it as `sheriff.context`, and remember this page as the next page's referrer.
4. **Send** it as `{ event: 'pageView', eventId, timestamp, context, errors }`:
   - added to `sheriff.events`, so tag managers that load late still get every page view
   - dispatched as a `sheriff:event` CustomEvent, for anything already listening

`eventId` says which event it is (unique). `timestamp` says when it happened.

Sheriff doesn't push to `window.dataLayer` (it clashes with GTM) or `window.digitalData`. It owns `window.sheriff` instead.

## Listening

```js
// Catch up on anything sent before this script loaded, then listen for new events.
window.sheriff?.events.forEach(handle)
window.addEventListener('sheriff:event', (e) => handle(e.detail))
```

## Running it

```sh
npm install
npm test
npm run typecheck
```

## Not in the spike yet

- `trackEvent` and the non-page event shape (next)
- More global variables, conditional rules, custom variables
- Schema version on events
