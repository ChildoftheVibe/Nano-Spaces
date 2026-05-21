'use client'

import { useEffect } from 'react'

const TOUR_KEY = 'ns_tour_done'

function hasDoneTour(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === '1'
  } catch {
    return true
  }
}

function markTourDone() {
  try {
    localStorage.setItem(TOUR_KEY, '1')
  } catch {
    // localStorage not available
  }
}

// Tour steps — data-tour-* attributes must exist on the target elements
const STEPS = [
  {
    attachTo: { element: '[data-tour="nav"]', on: 'bottom' as const },
    title: 'Navigate Nano Spaces',
    text: 'Use the top nav to switch between the calendar, settings, and admin panels.',
  },
  {
    attachTo: { element: '[data-tour="calendar"]', on: 'top' as const },
    title: 'The booking calendar',
    text: 'Click any time slot to make a booking. Your reservations appear in blue; others are in light blue.',
  },
  {
    attachTo: { element: '[data-tour="search"]', on: 'bottom' as const },
    title: 'Global search',
    text: 'Press Cmd+K (or Ctrl+K) to instantly search reservations, rooms, and people.',
  },
  {
    attachTo: { element: '[data-tour="notifications"]', on: 'bottom' as const },
    title: 'Notifications',
    text: 'The bell icon shows booking confirmations, approvals, and waitlist updates in real time.',
  },
]

export default function AppTour() {
  useEffect(() => {
    if (hasDoneTour()) return

    // Dynamic import keeps shepherd.js out of the initial bundle
    import('shepherd.js').then((mod) => {
      // Shepherd requires a small stylesheet for positioning
      if (!document.getElementById('shepherd-styles')) {
        const link = document.createElement('link')
        link.id = 'shepherd-styles'
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/shepherd.js@15/dist/css/shepherd.css'
        document.head.appendChild(link)
      }

      const tour = new mod.default.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          cancelIcon: { enabled: true },
          classes: 'shepherd-theme-default',
          scrollTo: { behavior: 'smooth', block: 'center' },
        },
      })

      STEPS.forEach((step, i) => {
        const isLast = i === STEPS.length - 1
        tour.addStep({
          id: `step-${i}`,
          title: step.title,
          text: step.text,
          attachTo: step.attachTo,
          buttons: [
            ...(i > 0 ? [{ text: 'Back', action: tour.back, secondary: true }] : []),
            {
              text: isLast ? 'Done' : 'Next',
              action: isLast ? tour.complete : tour.next,
            },
          ],
          when: {
            show() {
              // Skip steps whose target element doesn't exist yet
              const el = document.querySelector(step.attachTo.element)
              if (!el) isLast ? tour.complete() : tour.next()
            },
          },
        })
      })

      tour.on('complete', markTourDone)
      tour.on('cancel', markTourDone)

      // Slight delay so the page has fully rendered before attaching tooltips
      const timer = setTimeout(() => tour.start(), 1200)

      return () => {
        clearTimeout(timer)
        if (tour.isActive()) tour.cancel()
      }
    })

    // Cleanup is handled inside the .then callback above; return nothing from outer effect
  }, [])

  return null
}
