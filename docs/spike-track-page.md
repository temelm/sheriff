# Spike: trackPage

Status: spike, 2026-09-30. It exists to test whether the agreed API feels right in real code. It is not the library: no packaging, no publishing, and no runtime dependencies. What we learn feeds the [architecture draft](https://github.com/temelm/sheriff/issues/6).

Code: [`src/index.ts`](../src/index.ts) · Tests: [`test/track-page.test.ts`](../test/track-page.test.ts)

## Usage

```ts
import { createSheriff } from './src/index'

// Once, when the site starts.
const sheriff = createSheriff({ environment: 'production' })

// After each page's content has loaded.
sheriff.trackPage({ user: { loginStatus: 'guest' } })

sheriff.context // read-only snapshot of the current global context
sheriff.events  // ordered history of everything sent
```

`createSheriff` also puts the instance on `window.sheriff`, so a tag manager or the Chrome extension can read it.

## What trackPage does

1. **Reset:** the old context is thrown away. Nothing carries over.
2. **Build** the [global context](contracts/page-view.md):
   - `page.path` from `location.pathname` (Sheriff)
   - `page.referrer` as the previous page's URL, or `document.referrer` on the first page (Sheriff)
   - `site.environment` from setup (config)
   - `user.loginStatus` from the call (app)
3. **Validate.** In `development` an invalid page view throws `SheriffValidationError` and nothing is sent. Anywhere else it is still sent, with `valid: false` and the `errors`.
4. **Freeze** it as the new `sheriff.context`.
5. **Wrap** it as an event:
   ```ts
   { event: 'pageView', eventId, timestamp, context, valid, errors }
   ```
   `eventId` is unique per event (which event it is), and is used for de-duplication and debugging. `timestamp` is when it happened, in ISO 8601.
6. **Deliver** it twice:
   - appended to `sheriff.events`, so listeners that start late (tag managers load asynchronously) still get every event
   - dispatched as one `CustomEvent` named `sheriff:event`, with the event as `detail`, for listeners already running

Sheriff deliberately does not push to `window.dataLayer` (it clashes with GTM) or `window.digitalData` (common elsewhere). It owns the `window.sheriff` namespace instead.

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
