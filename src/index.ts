// Sheriff spike: global page view context + trackPage.
// See docs/spike-track-page.md for what this does and why.

export type Environment = 'production' | 'staging' | 'development'
export type LoginStatus = 'guest' | 'loggedIn'

export const ENVIRONMENTS: readonly Environment[] = ['production', 'staging', 'development']
export const LOGIN_STATUSES: readonly LoginStatus[] = ['guest', 'loggedIn']

/** The global context every page view carries (docs/contracts/page-view.md). */
export interface Context {
  page: {
    /** Set by Sheriff from the location. */
    path: string
    /** Set by Sheriff: previous page's URL, or document.referrer on the first page. */
    referrer: string
  }
  site: {
    /** Set once at setup. */
    environment: Environment
  }
  user: {
    /** Passed in by the app on each trackPage call. */
    loginStatus: LoginStatus
  }
}

export interface SheriffEvent {
  event: 'pageView'
  /** Unique per event: which event this is. */
  eventId: string
  /** ISO 8601: when it happened. */
  timestamp: string
  context: Context
  /** False when validation failed outside development. */
  valid: boolean
  errors: string[]
}

export interface SheriffConfig {
  environment: Environment
}

/** What the app passes to trackPage. Everything else is set by Sheriff or config. */
export interface TrackPageInput {
  user: { loginStatus: LoginStatus }
}

export interface Sheriff {
  /** Read-only snapshot of the current context. Null before the first page view. */
  readonly context: Readonly<Context> | null
  /** Ordered history of everything sent, for listeners that start late. */
  readonly events: readonly SheriffEvent[]
  /** Reset all context, set it, validate it, and send a page view. */
  trackPage(input: TrackPageInput): SheriffEvent
}

export const EVENT_NAME = 'sheriff:event'

export class SheriffValidationError extends Error {
  constructor(readonly errors: string[]) {
    super(`Sheriff: invalid page view\n- ${errors.join('\n- ')}`)
    this.name = 'SheriffValidationError'
  }
}

export function validateContext(context: Context): string[] {
  const errors: string[] = []
  const { page, site, user } = context

  if (typeof page.path !== 'string' || !page.path.startsWith('/')) {
    errors.push(`page.path must be a string starting with "/", got ${JSON.stringify(page.path)}`)
  }
  if (typeof page.referrer !== 'string' || (page.referrer !== '' && !isUrl(page.referrer))) {
    errors.push(`page.referrer must be a URL or empty, got ${JSON.stringify(page.referrer)}`)
  }
  if (!ENVIRONMENTS.includes(site.environment)) {
    errors.push(`site.environment must be one of ${ENVIRONMENTS.join(', ')}, got ${JSON.stringify(site.environment)}`)
  }
  if (!LOGIN_STATUSES.includes(user?.loginStatus)) {
    errors.push(`user.loginStatus must be one of ${LOGIN_STATUSES.join(', ')}, got ${JSON.stringify(user?.loginStatus)}`)
  }
  return errors
}

export function createSheriff(config: SheriffConfig, win: Window = window): Sheriff {
  if (!ENVIRONMENTS.includes(config?.environment)) {
    throw new Error(`Sheriff: config.environment must be one of ${ENVIRONMENTS.join(', ')}`)
  }

  let context: Readonly<Context> | null = null
  let previousUrl: string | null = null
  const events: SheriffEvent[] = []

  const sheriff: Sheriff = {
    get context() {
      return context
    },
    get events() {
      return events
    },
    trackPage(input) {
      // 1. Reset + 2. build: nothing carries over from the previous page.
      const next: Context = {
        page: {
          path: win.location.pathname,
          referrer: previousUrl ?? win.document.referrer,
        },
        site: { environment: config.environment },
        user: { loginStatus: input?.user?.loginStatus },
      }

      // 3. Validate: strict in development, report-and-send elsewhere.
      const errors = validateContext(next)
      if (errors.length > 0 && config.environment === 'development') {
        throw new SheriffValidationError(errors)
      }

      // 4. Freeze as the new context.
      context = deepFreeze(next)
      previousUrl = win.location.href

      // 5. Wrap as an event.
      const event = deepFreeze<SheriffEvent>({
        event: 'pageView',
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        context,
        valid: errors.length === 0,
        errors,
      })

      // 6. Deliver: history for late listeners, CustomEvent for current ones.
      events.push(event)
      win.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }))
      return event
    },
  }

  ;(win as Window & { sheriff?: Sheriff }).sheriff = sheriff
  return sheriff
}

function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}
