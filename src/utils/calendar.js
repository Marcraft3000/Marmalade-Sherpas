// Calendar reminders for the day 3 and day 30 check-ins, as an .ics download or a Google Calendar link.
const DAY = 24 * 60 * 60 * 1000;
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, match => `\\${match}`);

function checkInLink(day) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}?checkin=${day}`;
}

// Each check-in is a 15-minute slot at 9:00 local time, on day 3 and day 30 after accepting.
export function checkInEvents(mission, from = mission?.acceptedAt) {
  const start = new Date(from || Date.now());
  return (mission?.checkpoints || []).map(({ day, prompt }) => {
    const date = new Date(start.getTime() + day * DAY);
    date.setHours(9, 0, 0, 0);
    return {
      day,
      start: date,
      end: new Date(date.getTime() + 15 * 60 * 1000),
      title: `Plan check-in (day ${day}): ${mission.title}`,
      details: `${prompt}\n\nOpen your check-in: ${checkInLink(day)}`,
    };
  });
}

export function calendarFile(mission) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Plan Audit//Check-ins//EN', 'CALSCALE:GREGORIAN'];
  for (const event of checkInEvents(mission)) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:plan-audit-${event.day}-${event.start.getTime()}@theplanaudit`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(event.start)}`,
      `DTEND:${stamp(event.end)}`,
      `SUMMARY:${escape(event.title)}`,
      `DESCRIPTION:${escape(event.details)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escape(event.title)}`, 'TRIGGER:-PT0M', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadCalendar(mission) {
  const blob = new Blob([calendarFile(mission)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: 'plan-check-ins.ics' });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarLink(event) {
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${stamp(event.start)}/${stamp(event.end)}`, details: event.details });
  return `https://calendar.google.com/calendar/render?${params}`;
}
