
export const TIME_ZONE = 'Europe/Stockholm';
const OPEN = 360, CLOSE = 1020;
const dates = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
export const formatDate = date => dates.format(date);

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

function minutes(time) {
  if (typeof time !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d(?::00(?:\.0+)?)?$/.test(time)) {
    throw new Error('Invalid time format');
  }
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

const printTime = n =>
  `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

function checkSessions(n) {
  if (!Number.isInteger(n) || n < 1 || n > 2) {
    throw new Error('Choose 1 or 2 sessions');
  }
}

export function calculateEndTime(start, sessions) {
  checkSessions(sessions);
  const from = minutes(start), to = from + sessions * 20;
  if (from < OPEN || (from - OPEN) % 20 !== 0 || to > CLOSE) {
    throw new Error('Choose a 20-minute slot between 06:00 and 17:00');
  }
  return printTime(to);
}

export function validateBooking(date, start, sessions, now = new Date()) {
  if (!validDate(date)) throw new Error('Choose a valid date');
  const end = calculateEndTime(start, sessions);
  const today = formatDate(now);
  if (date < today ||
      (date === today && minutes(start) <= minutes(clock.format(now)))) {
    throw new Error('Cannot book a time in the past');
  }
  return end;
}

export async function generateTimeSlots(
  date, selectedTime = null, sessions = 1, bookings = [], now = new Date()
) {
  void selectedTime;
  checkSessions(sessions);
  if (!validDate(date)) return [];
  const today = formatDate(now);
  const current = minutes(clock.format(now));
  const intervals = bookings.filter(b => b.date === date).map(b => ({
    start: minutes(b.start_time), end: minutes(b.end_time), name: b.name
  }));
  return Array.from({length: (CLOSE - OPEN) / 20}, (_, i) => {
    const from = OPEN + i * 20, to = from + sessions * 20;
    const past = date < today || (date === today && from <= current);
    const booked = intervals.find(b => from < b.end && to > b.start);
    const reason = past ? (booked ? 'past_booked' : 'past_unbooked')
      : booked ? 'booked' : to > CLOSE ? 'invalid_duration' : undefined;
    return {
      time: printTime(from),
      isAvailable: !reason,
      unavailableReason: reason,
      bookedBy: booked?.name,
      tooltip: booked
        ? `This time slot is booked by ${booked.name || 'another user'}`
        : past ? 'This time has passed'
        : reason ? 'Booking must end by 17:00' : undefined
    };
  });
}
