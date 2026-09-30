// Sheriff spike: the global page context and trackPage.

// "type" describes the shape of data. TypeScript checks it while you write code.
type Environment = 'production' | 'staging' | 'development'
type LoginStatus = 'guest' | 'loggedIn'

type Context = {
  page: { path: string; referrer: string } // set by Sheriff
  site: { environment: Environment }        // set once at setup
  user: { loginStatus: LoginStatus }        // passed in by the app
}

type PageViewEvent = {
  event: 'pageView'
  eventId: string   // which event this is (unique)
  timestamp: string // when it happened
  context: Context
  errors: string[]  // empty when the page view is valid
}

export function createSheriff(environment: Environment) {
  let previousUrl = document.referrer // the first page's referrer comes from the browser
  const events: PageViewEvent[] = []  // history, for tag managers that load late

  const sheriff = {
    context: null as Context | null,
    events,

    trackPage(user: { loginStatus: LoginStatus }) {
      // 1. Reset and build: a brand new context, nothing carried over.
      const context: Context = {
        page: { path: location.pathname, referrer: previousUrl },
        site: { environment },
        user: { loginStatus: user.loginStatus },
      }

      // 2. Validate what the app passed in. Sheriff trusts the values it sets itself.
      const errors: string[] = []
      if (context.user.loginStatus !== 'guest' && context.user.loginStatus !== 'loggedIn') {
        errors.push(`user.loginStatus must be "guest" or "loggedIn", got "${context.user.loginStatus}"`)
      }
      if (errors.length > 0 && environment === 'development') {
        throw new Error(errors.join('\n')) // loud in development, nothing is sent
      }

      // 3. Save it, and remember this page as the next page's referrer.
      sheriff.context = context
      previousUrl = location.href

      // 4. Send it: add to the history, and tell anyone already listening.
      const event: PageViewEvent = {
        event: 'pageView',
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        context,
        errors,
      }
      events.push(event)
      window.dispatchEvent(new CustomEvent('sheriff:event', { detail: event }))
      return event
    },
  }

  // Put it on window so a tag manager or the Chrome extension can find it.
  ;(window as any).sheriff = sheriff
  return sheriff
}
