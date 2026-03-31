/**
 * Google Calendar Integration — Zero-OAuth approach
 * Uses the universal "add to calendar" deep-link that works on:
 *  - Google Calendar web + Android
 *  - Apple Calendar (via .ics export)
 *  - Outlook (via .ics export)
 */

export interface CalendarEvent {
  title: string
  notes?: string
  startDate: Date
  endDate?: Date          // defaults to startDate + 1h
  location?: string
  company?: string
}

/** Format date to Google Calendar's format: 20260401T143000Z */
function toGcalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Format date to RFC 5545 iCal format: 20260401T143000Z */
function toIcsDate(d: Date): string {
  return toGcalDate(d)
}

/**
 * Build a Google Calendar deep-link URL for a single event.
 * Opens in Google Calendar web (or Android app) — no login required for the link itself.
 */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const start = toGcalDate(event.startDate)
  const end = event.endDate
    ? toGcalDate(event.endDate)
    : toGcalDate(new Date(event.startDate.getTime() + 60 * 60 * 1000))

  const details = [
    event.notes || '',
    event.company ? `Cliente: ${event.company}` : '',
    'CRM LimpioSur SPA'
  ].filter(Boolean).join('\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details,
    location: event.location || event.company || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate an .ics file content for ONE event.
 */
export function generateIcsContent(event: CalendarEvent): string {
  const start = toIcsDate(event.startDate)
  const end = event.endDate
    ? toIcsDate(event.endDate)
    : toIcsDate(new Date(event.startDate.getTime() + 60 * 60 * 1000))
  const now = toIcsDate(new Date())
  const uid = `crm-${Date.now()}@limpiospaspa.cl`

  const description = [
    event.notes || '',
    event.company ? `Cliente: ${event.company}` : '',
    'Generado por CRM LimpioSur SPA'
  ].filter(Boolean).join('\\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CRM LimpioSur SPA//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${description}`,
    event.location ? `LOCATION:${event.location}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

/**
 * Generate .ics for MULTIPLE events — for bulk export of all activities.
 */
export function generateBulkIcs(events: CalendarEvent[]): string {
  const now = toIcsDate(new Date())
  const vevents = events.map((event, i) => {
    const start = toIcsDate(event.startDate)
    const end = event.endDate
      ? toIcsDate(event.endDate)
      : toIcsDate(new Date(event.startDate.getTime() + 60 * 60 * 1000))

    const description = [
      event.notes || '',
      event.company ? `Cliente: ${event.company}` : '',
      'CRM LimpioSur SPA'
    ].filter(Boolean).join('\\n')

    return [
      'BEGIN:VEVENT',
      `UID:crm-${now}-${i}@limpiospaspa.cl`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${description}`,
      event.location ? `LOCATION:${event.location}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CRM LimpioSur SPA//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * Trigger a browser download of an .ics file.
 */
export function downloadIcs(icsContent: string, filename = 'agenda-crm.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
