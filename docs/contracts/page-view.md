# Contract: global page view

Issue: [#1](https://github.com/temelm/sheriff/issues/1) · Status: draft

Every page view must carry this context, on every site. Page types (search results, product, and so on) add their own rules on top in separate contracts.

## How it's used

```
sheriff = {
  context,     // read-only: the current page, user and site data below
  trackPage,   // after page content loads: reset all context, set it, send the page event
  trackEvent,  // interactions: inherit the current context, add event data, send
}
```

- On every page view the whole context is reset, then set again in full. Nothing carries over from the previous page, on standard sites and single-page apps alike.
- Interactions sent with `trackEvent` get a snapshot of this context, taken at the moment they fire.
- A page view with missing or invalid required data fails validation.

## Shape

```ts
context = {
  page: {
    viewId:   string   // Sheriff
    url:      string   // Sheriff
    path:     string   // Sheriff
    referrer: string   // Sheriff
    title:    string   // Sheriff
    name:     string   // app
    type:     string   // app (allowed values agreed per business)
    locale:   string   // app
  },
  user: {
    isLoggedIn:  boolean // app
    customerId?: string  // app, only when logged in
  },
  site: {
    name:        string  // config
    environment: 'production' | 'staging' | 'development' // config
    appVersion:  string  // config
  }
}
```

## Who sets what

| Set by | Meaning |
|---|---|
| **Sheriff** | Read from the browser or generated, automatically, on every page view. Developers can't forget it or get it wrong. |
| **Config** | Set once when Sheriff starts. The same on every page. |
| **App** | Passed in with each `trackPage` call. Only the app knows it. |

## Rules

| Name | Type | Set by | Rule | Notes |
|---|---|---|---|---|
| `page.viewId` | string | Sheriff | UUID, new on every page view | Ties each interaction back to its page view. |
| `page.url` | string | Sheriff | Full URL | Captured at page-view time. |
| `page.path` | string | Sheriff | Starts with `/`, no query string | |
| `page.referrer` | string | Sheriff | URL, or empty | In single-page apps this is the previous page's URL, because `document.referrer` never changes there. |
| `page.title` | string | Sheriff | Non-empty | Read at page-view time, after content has loaded, because titles often update late in single-page apps. |
| `page.name` | string | App | Non-empty | A stable business name, e.g. `product detail`. Not the title. |
| `page.type` | string | App | One of the business's agreed values | Suggested default: `home`, `category`, `searchResults`, `product`, `cart`, `checkout`, `orderConfirmation`, `account`, `content`, `error`. Drives page-type contracts. |
| `page.locale` | string | App | BCP 47, e.g. `en-GB` | Can move to config on single-locale sites. |
| `user.isLoggedIn` | boolean | App | Always required | |
| `user.customerId` | string | App | **Required when** `user.isLoggedIn` is true. **Must be absent when** it's false. | A hashed or internal id. Never an email address. |
| `site.name` | string | Config | Non-empty | E.g. `shop-uk`. |
| `site.environment` | enum | Config | `production`, `staging` or `development` | Keeps test data out of reports. |
| `site.appVersion` | string | Config | Non-empty | The release version. Ties a tracking break to the release that caused it. |

## Deliberately left out

- **Consent state:** the tag manager and consent platform own this in v1.
- **Device, browser, screen size, UTM parameters:** analytics tools collect these themselves.
- **Currency, basket, products:** ecommerce-specific, so they belong in page-type or event contracts.
- **Site section or category hierarchy:** common, but every business shapes it differently.

## Open questions

1. `page.type`: agreed per business, with the suggested default above?
2. `site.appVersion`: does this match how releases work in practice?
3. Anything on every page of a real data layer that's missing here?
