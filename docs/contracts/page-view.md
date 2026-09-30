# Contract: global page view

Issue: [#1](https://github.com/temelm/sheriff/issues/1) · Status: agreed 2026-09-30

Every page view carries this context, on every site. It's deliberately small. Sites add their own global variables and rules on top, and page types (search results, product, and so on) get their own contracts.

## How it's used

```
sheriff = {
  context,     // read-only: the current context below
  trackPage,   // after page content loads: reset all context, set it, send the page event
  trackEvent,  // interactions: inherit the current context, add event data, send
}
```

- On every page view the whole context is reset and set again. Nothing carries over from the previous page.
- Events sent with `trackEvent` get a snapshot of the context, taken at the moment they fire.
- A page view with missing or invalid required data fails validation.

## Shape

```ts
context = {
  page: {
    path:     string  // Sheriff
    referrer: string  // Sheriff
  },
  site: {
    environment: 'production' | 'staging' | 'development'  // config
  },
  user: {
    loginStatus: 'guest' | 'loggedIn'  // app
  }
}
```

## Rules

| Name | Type | Set by | Rule | Why it's in the core |
|---|---|---|---|---|
| `page.path` | string | Sheriff | Starts with `/`, no query string | Rules and reports key off it. A server-side collector later has no `window.location`. |
| `page.referrer` | string | Sheriff | URL, or empty on the first page | In single-page apps `document.referrer` never changes, so Sheriff sets it to the previous page instead. |
| `site.environment` | enum | Config | `production`, `staging` or `development` | Keeps test data out of reports. Sheriff can also be strict in development and lenient in production. |
| `user.loginStatus` | enum | App | `guest` or `loggedIn` | Nearly universal. A string reads better in reports than true/false, and can grow later (e.g. `recognised`). |

**Set by:** Sheriff means read automatically on every page view. Config means set once when Sheriff starts. App means passed in with each `trackPage` call.

## Considered and left out

| Candidate | Why not |
|---|---|
| `page.url` | Meaningful query parameters (search term, filters) belong as named fields in page-type contracts. Raw query strings are where emails and tokens leak. |
| URL parameters (UTMs etc.) | Analytics tools read them from the URL themselves. Revisit when server-side needs them for attribution. |
| `page.title` | Changes with copy, SEO and A/B tests, and can contain personal data. Tools collect it themselves. |
| `page.name` | Useful, but not needed for a lean core. |
| `page.type` | Likely needed once page-type contracts start ([#2](https://github.com/temelm/sheriff/issues/2)). Deferred until then. |
| `site.name`, language | The same value on every page of a single site. Custom variables where needed. |
| `user.customerId` | Not every site has accounts. The first example of a custom conditional rule: required when `loginStatus` is `loggedIn`, absent otherwise. |
| Consent state | Owned by the tag manager and consent platform in v1. |
| Device, browser, screen size | Analytics tools collect these themselves. |

## Custom global variables

Every business needs more than this core, so Sheriff must let a site add its own global variables and rules. How that works is for the architecture draft ([#6](https://github.com/temelm/sheriff/issues/6)).
