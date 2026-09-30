import { beforeEach, expect, it } from 'vitest'
import { createSheriff } from '../src/index'

beforeEach(() => {
  window.history.pushState({}, '', '/')
})

it('builds the context from the page, the setup and the app', () => {
  window.history.pushState({}, '', '/products/shoes')
  const sheriff = createSheriff('production')

  sheriff.trackPage({ loginStatus: 'loggedIn' })

  expect(sheriff.context).toEqual({
    page: { path: '/products/shoes', referrer: '' },
    site: { environment: 'production' },
    user: { loginStatus: 'loggedIn' },
  })
})

it('uses the previous page as the referrer, and resets everything else', () => {
  const sheriff = createSheriff('production')

  window.history.pushState({}, '', '/first')
  sheriff.trackPage({ loginStatus: 'loggedIn' })
  window.history.pushState({}, '', '/second')
  sheriff.trackPage({ loginStatus: 'guest' })

  expect(sheriff.context?.page.referrer).toBe('http://localhost:3000/first')
  expect(sheriff.context?.user.loginStatus).toBe('guest')
})

it('sends each page view to the history and as a sheriff:event', () => {
  const sheriff = createSheriff('production')
  const heard: unknown[] = []
  window.addEventListener('sheriff:event', (e) => heard.push((e as CustomEvent).detail))

  const first = sheriff.trackPage({ loginStatus: 'guest' })
  const second = sheriff.trackPage({ loginStatus: 'guest' })

  expect(sheriff.events).toEqual([first, second])
  expect(heard).toEqual([first, second])
  expect(first.eventId).not.toBe(second.eventId)
})

it('throws in development when the app passes a bad value', () => {
  const sheriff = createSheriff('development')

  expect(() => sheriff.trackPage({ loginStatus: 'maybe' as any })).toThrow('user.loginStatus')
  expect(sheriff.events).toEqual([])
})

it('still sends in production, with the errors attached', () => {
  const sheriff = createSheriff('production')

  const event = sheriff.trackPage({ loginStatus: 'maybe' as any })

  expect(event.errors).toEqual(['user.loginStatus must be "guest" or "loggedIn", got "maybe"'])
  expect(sheriff.events).toEqual([event])
})
