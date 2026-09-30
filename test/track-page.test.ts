import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSheriff, EVENT_NAME, SheriffValidationError, type SheriffEvent } from '../src/index'

const guest = { user: { loginStatus: 'guest' as const } }

function navigate(path: string) {
  window.history.pushState({}, '', path)
}

beforeEach(() => {
  navigate('/')
  delete (window as Window & { sheriff?: unknown }).sheriff
})

describe('trackPage', () => {
  it('builds the global context from the location, config and input', () => {
    navigate('/products/shoes')
    const sheriff = createSheriff({ environment: 'production' })

    sheriff.trackPage({ user: { loginStatus: 'loggedIn' } })

    expect(sheriff.context).toEqual({
      page: { path: '/products/shoes', referrer: document.referrer },
      site: { environment: 'production' },
      user: { loginStatus: 'loggedIn' },
    })
  })

  it('uses document.referrer on the first page and the previous URL after that', () => {
    const sheriff = createSheriff({ environment: 'production' })
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://www.google.com/')

    navigate('/first')
    sheriff.trackPage(guest)
    expect(sheriff.context?.page.referrer).toBe('https://www.google.com/')

    navigate('/second?q=1')
    sheriff.trackPage(guest)
    expect(sheriff.context?.page.referrer).toBe('http://localhost:3000/first')
    expect(sheriff.context?.page.path).toBe('/second')
  })

  it('resets the context on every page view, with nothing carried over', () => {
    const sheriff = createSheriff({ environment: 'production' })

    sheriff.trackPage({ user: { loginStatus: 'loggedIn' } })
    const first = sheriff.context
    sheriff.trackPage(guest)

    expect(sheriff.context).not.toBe(first)
    expect(sheriff.context?.user.loginStatus).toBe('guest')
    expect(first?.user.loginStatus).toBe('loggedIn')
  })

  it('freezes the context so nothing can change it by accident', () => {
    const sheriff = createSheriff({ environment: 'production' })
    sheriff.trackPage(guest)

    expect(() => {
      ;(sheriff.context as { page: { path: string } }).page.path = '/changed'
    }).toThrow(TypeError)
  })

  it('sends a pageView event with a unique id, a timestamp and a snapshot of the context', () => {
    const sheriff = createSheriff({ environment: 'production' })

    const first = sheriff.trackPage(guest)
    const second = sheriff.trackPage(guest)

    expect(first.event).toBe('pageView')
    expect(first.eventId).not.toBe(second.eventId)
    expect(new Date(first.timestamp).toISOString()).toBe(first.timestamp)
    expect(first.context).not.toBe(second.context)
    expect(first.valid).toBe(true)
    expect(first.errors).toEqual([])
  })

  it('appends to the history and dispatches one sheriff:event', () => {
    const sheriff = createSheriff({ environment: 'production' })
    const received: SheriffEvent[] = []
    window.addEventListener(EVENT_NAME, (e) => received.push((e as CustomEvent<SheriffEvent>).detail))

    const event = sheriff.trackPage(guest)

    expect(sheriff.events).toEqual([event])
    expect(received).toEqual([event])
  })

  it('keeps events for listeners that start late, like an async tag manager', () => {
    const sheriff = createSheriff({ environment: 'production' })
    const event = sheriff.trackPage(guest)

    // A tag manager loading after the first page view reads the history.
    const late = (window as Window & { sheriff?: { events: readonly SheriffEvent[] } }).sheriff
    expect(late?.events).toEqual([event])
  })
})

describe('validation', () => {
  const bad = { user: { loginStatus: 'maybe' } } as never

  it('throws in development and sends nothing', () => {
    const sheriff = createSheriff({ environment: 'development' })

    expect(() => sheriff.trackPage(bad)).toThrow(SheriffValidationError)
    expect(sheriff.events).toEqual([])
    expect(sheriff.context).toBeNull()
  })

  it('still sends in production, flagged as invalid with the errors', () => {
    const sheriff = createSheriff({ environment: 'production' })

    const event = sheriff.trackPage(bad)

    expect(event.valid).toBe(false)
    expect(event.errors).toEqual(['user.loginStatus must be one of guest, loggedIn, got "maybe"'])
    expect(sheriff.events).toEqual([event])
  })

  it('rejects an invalid environment at setup', () => {
    expect(() => createSheriff({ environment: 'prod' } as never)).toThrow(/config.environment/)
  })
})
