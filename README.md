# Sheriff

Tracking contracts in your code, enforced before bad data ships.

Sheriff is a free, open-source library that lets a team define tracking contracts in their app code, catches broken tracking before and after release, feeds their existing tag manager (Tealium, GTM, or a custom data layer), and gives analysts a spec they can read.

## Status

Discovery. There is no code yet. The current work is writing example contracts in plain markdown.

- [Goal post](docs/goal-post.md): what Sheriff is, what v1 must do, and what's out of scope.
- Contracts (coming): `docs/contracts/`
- Tasks: see [issues](../../issues).

## Why

Data layer specs usually live in wiki pages, drift away from what actually ships, and broken tracking gets noticed weeks later. Sheriff moves the contract into the codebase, where it can be reviewed in a pull request and checked by types, tests and runtime validation.
