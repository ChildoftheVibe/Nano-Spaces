import dynamic from 'next/dynamic'

const CalendarClient = dynamic(() => import('./calendar-client'), { ssr: false })

export default function CalendarPage() {
  return <CalendarClient />
}
