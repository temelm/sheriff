# Sheriff: goal post (v1)

Status: agreed 2026-09-29. No design or code detail here on purpose.

## What Sheriff is

A free, open-source library that lets a team define tracking contracts in their app code, catches broken tracking before and after release, feeds their existing tag manager, and gives analysts a spec they can read.

## Why

Data layer specs live in messy Confluence pages, drift from what actually ships, and bad tracking is found weeks later. Tealium and similar tools don't solve that part.

## Success

- **Aim:** somewhere between "use it at work" and "open source". Build for real use. Keep the repo public, but take on no open-source obligations (docs for strangers, support) until someone else uses it.
- **v1 is done when** one realistic website ships its tracking through Sheriff, and analysts review from the generated spec instead of Confluence.

## Principles agreed so far

1. **Contract layer, not a tag manager.** Sheriff owns the schema (the shape of context and events). It hands valid events to whatever already exists (digitalData, GTM dataLayer, Tealium). Vendor mappings stay in the tag manager.
2. **Framework-agnostic.** Plain JavaScript that works on standard websites and single-page apps. It is not tied to React or Next.js.
3. **Web first, client first.** Mobile and a server-side collector come later. v1 keeps the door open cheaply: each event has an id, a timestamp and a schema version, and "send to a server" would be just another output.
4. **One enforced way to track.** App code talks to one Sheriff instance. Every event gets a snapshot of the context, never a live reference.
5. **Page view is one step.** After the page content loads: reset all context, set the full context, fire the page view. Everything is reset on every page view, on standard sites and single-page apps alike. Interactions inherit that context until the next page view.
6. **Complete or rejected.** An event (including a page view) missing required data fails validation. This also catches timing bugs, such as firing before API data has arrived.

## v1 features

1. Define events and their rules in code: required fields, types, patterns (e.g. a 7-digit SKU).
2. Catch bad events before release: editor errors and failing unit tests.
3. Catch bad events at runtime: loud in development, reported in production, never breaking the site.
4. Hand valid events to the existing data layer.
5. Show what fired and whether it passed. Your Chrome extension may cover most of this, by listening to a Sheriff event.
6. Generate a readable spec from the code for analysts.

## Not in v1

Consent (the tag manager and CMP already handle it downstream), vendor destinations (Meta, TikTok), server-side collector, mobile, identity, PII checks, schema versioning rules, auditing an existing data layer without Sheriff (a good later feature for the extension).

## Open

- How the readable spec for analysts looks and where it lives (feature 6).
