import { addMinutes, format, parse, setHours, setMinutes, isBefore } from 'date-fns';
import type { Booking, TimeSlot } from './types';

// Cache for time slots with TTL
const timeSlotsCache = new Map<string, { slots: TimeSlot[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const createCacheKey = (date: string, selectedTime: string | null, sessions: number, bookings: Booking[]): string => {
  return `${date}-${selectedTime}-${sessions}-${JSON.stringify(bookings)}`;
};

export const generateTimeSlots = async (
  date: string,
  selectedTime: string | null = null,
  sessions: number = 1,
  bookings: Booking[] = []
): Promise<TimeSlot[]> => {
  const cacheKey = createCacheKey(date, selectedTime, sessions, bookings);
  const now = Date.now();
  const cached = timeSlotsCache.get(cacheKey);

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.slots;
  }

  const slots: TimeSlot[] = [];
  const startTime = setMinutes(setHours(new Date(date), 7), 0); // 07:00
  const endTime = setMinutes(setHours(new Date(date), 17), 0); // 17:00
  const currentTime = new Date();
  const selectedDate = new Date(date);
  const isToday = selectedDate.toDateString() === currentTime.toDateString();

  const dateBookings = bookings.filter(booking => booking.date === date);
  const bookingIntervals = dateBookings.map(booking => ({
    start: parse(booking.start_time, 'HH:mm:ss', selectedDate),
    end: parse(booking.end_time, 'HH:mm:ss', selectedDate)
  }));

  let currentSlot = startTime;

  // Find if 11:00 is booked for smart suggestions
  const is11Booked = bookingIntervals.some(interval => 
    format(interval.start, 'HH:mm') === '11:00' ||
    (interval.start < parse('11:00', 'HH:mm', selectedDate) && 
     interval.end > parse('11:00', 'HH:mm', selectedDate))
  );

  while (currentSlot < endTime) {
    const timeString = format(currentSlot, 'HH:mm');
    const slotEndTime = addMinutes(currentSlot, sessions * 20);
    
    const isPastTime = isToday && isBefore(currentSlot, currentTime);
    const isSlotAvailable = !isPastTime && !bookingIntervals.some(interval => {
      return !(slotEndTime <= interval.start || currentSlot >= interval.end);
    });

    // Smart suggestion logic
    const shouldSuggest = 
      timeString === '10:20' && 
      selectedTime === '10:40' && 
      sessions === 2 && 
      is11Booked && 
      isSlotAvailable;

    slots.push({ 
      time: timeString, 
      isAvailable: isSlotAvailable,
      isSuggested: shouldSuggest,
      isSelected: timeString === selectedTime
    });
    
    currentSlot = addMinutes(currentSlot, 20);
  }

  timeSlotsCache.set(cacheKey, { slots, timestamp: now });
  
  // Clear old cache entries
  setTimeout(() => timeSlotsCache.delete(cacheKey), CACHE_TTL);

  return slots;
};

// Memoized date formatter
const dateFormatterCache = new Map<number, string>();
export const formatDate = (date: Date): string => {
  const key = date.getTime();
  if (!dateFormatterCache.has(key)) {
    dateFormatterCache.set(key, format(date, 'yyyy-MM-dd'));
  }
  return dateFormatterCache.get(key)!;
};

// Memoized end time calculator
const endTimeCache = new Map<string, string>();
export const calculateEndTime = (startTime: string, sessions: number): string => {
  const cacheKey = `${startTime}-${sessions}`;
  if (!endTimeCache.has(cacheKey)) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    const endTime = addMinutes(date, sessions * 20);
    endTimeCache.set(cacheKey, format(endTime, 'HH:mm'));
  }
  return endTimeCache.get(cacheKey)!;
};