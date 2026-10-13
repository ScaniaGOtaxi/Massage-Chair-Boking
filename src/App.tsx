import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Timer, LogOut, List, Settings, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { generateTimeSlots, formatDate, calculateEndTime } from './utils';
import { supabase, getSession } from './supabase';
import { Auth } from './components/Auth';
import { BookingsList } from './components/BookingsList';
import { UserSettings } from './components/UserSettings';
import { UserList } from './components/UserList';
import type { BookingFormData, Booking, TimeSlot } from './types';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  date: z.string().refine((date) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, 'Cannot book dates in the past'),
  timeSlot: z.string().min(1, 'Time slot is required').regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  sessions: z.number().min(1).max(2, 'Maximum 2 sessions (40 minutes) allowed'),
});

export default function App() {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showBookingsList, setShowBookingsList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<BookingFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      sessions: 1,
      date: formatDate(new Date()),
    },
  });

  const selectedDate = watch('date');
  const sessions = watch('sessions');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await getSession();
        if (error?.message === 'session_not_found' || !session) {
          setUser(null);
          return;
        }

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUser(null);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setIsAdmin(!!adminData);
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    const channel = supabase
      .channel('bookings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          if (selectedDate) {
            fetchBookings(selectedDate);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const fetchBookings = async (date: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('date', date)
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (!navigator.onLine) {
        alert('Unable to fetch bookings. Please check your internet connection.');
      } else {
        alert('Error fetching bookings. Please try again later.');
      }
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchBookings(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const updateTimeSlots = async () => {
      const slots = await generateTimeSlots(selectedDate, selectedTime, sessions, bookings);
      setTimeSlots(slots);
      
      if (selectedTime && !slots.find(slot => slot.time === selectedTime && slot.isAvailable)) {
        setSelectedTime(null);
        setValue('timeSlot', '');
      }
    };
    updateTimeSlots();
  }, [selectedDate, selectedTime, sessions, bookings, setValue]);

  const onSubmit = async (data: BookingFormData) => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error('You must be logged in to book a session');
      }

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }

      // Validate time slot format
      if (!data.timeSlot || !/^\d{2}:\d{2}$/.test(data.timeSlot)) {
        throw new Error('Invalid time format. Please select a valid time slot.');
      }

      // Parse the date components
      const [year, month, day] = data.date.split('-').map(Number);
      const [hours, minutes] = data.timeSlot.split(':').map(Number);

      // Validate all date and time components
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error('Invalid date format. Please select a valid date.');
      }

      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error('Invalid time format. Please select a valid time slot.');
      }

      // Validate ranges
      if (month < 1 || month > 12) {
        throw new Error('Invalid month value.');
      }

      if (day < 1 || day > 31) {
        throw new Error('Invalid day value.');
      }

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error('Invalid time values.');
      }

      // Create a date object with the correct components
      const selectedDateTime = new Date(year, month - 1, day, hours, minutes);

      // Validate the created date object
      if (isNaN(selectedDateTime.getTime())) {
        throw new Error('Invalid date/time combination.');
      }

      const now = new Date();

      if (selectedDateTime < now) {
        throw new Error('Cannot book a time slot in the past');
      }

      const endTime = calculateEndTime(data.timeSlot, data.sessions);

      // Format times with seconds for PostgreSQL time type
      const startTimeWithSeconds = `${data.timeSlot}:00`;
      const endTimeWithSeconds = `${endTime}:00`;

      // Call the Edge Function to create the booking
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            name: data.name,
            email: data.email,
            date: data.date,
            startTime: startTimeWithSeconds,
            endTime: endTimeWithSeconds,
            sessions: data.sessions,
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create booking');
      }

      const result = await response.json();

      alert(`Booking successful!\nTime: ${data.timeSlot} - ${endTime}\nDuration: ${data.sessions * 20} minutes`);
      reset({
        date: selectedDate,
        sessions: 1,
      });
      setSelectedTime(null);
      await fetchBookings(selectedDate);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert(error instanceof Error ? error.message : 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setValue('timeSlot', time);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Auth onAuthSuccess={() => {}} />
      </div>
    );
  }

  const showBookingForm = !showBookingsList && !showSettings && !showUserList;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('app.title')}</h1>
            <p className="text-gray-600">{t('app.subtitle')}</p>
          </div>
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-md bg-white shadow-sm hover:bg-gray-50"
          >
            <List size={24} />
          </button>

          <div className={`
            ${isMobileMenuOpen ? 'flex' : 'hidden'} 
            sm:flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4
            w-full sm:w-auto
          `}>
            <button
              onClick={() => {
                setShowBookingsList(false);
                setShowUserList(false);
                setShowSettings(!showSettings);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 bg-white rounded-md shadow-sm hover:shadow"
            >
              <Settings size={18} />
              {showSettings ? t('app.makeBooking') : t('app.settings')}
            </button>
            <button
              onClick={() => {
                setShowSettings(false);
                setShowUserList(false);
                setShowBookingsList(!showBookingsList);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 bg-white rounded-md shadow-sm hover:shadow"
            >
              <List size={18} />
              {showBookingsList ? t('app.makeBooking') : t('app.viewBookings')}
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowBookingsList(false);
                  setShowUserList(!showUserList);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 bg-white rounded-md shadow-sm hover:shadow"
              >
                <Users size={18} />
                {showUserList ? t('app.makeBooking') : t('app.users')}
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 bg-white rounded-md shadow-sm hover:shadow"
            >
              <LogOut size={18} />
              {t('app.signOut')}
            </button>
          </div>
        </div>

        {showSettings ? (
          <UserSettings />
        ) : showBookingsList ? (
          <BookingsList />
        ) : showUserList ? (
          <UserList />
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <User size={18} />
                      Name
                    </span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Mail size={18} />
                      Email
                    </span>
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Calendar size={18} />
                      Date
                    </span>
                  </label>
                  <input
                    type="date"
                    {...register('date')}
                    min={formatDate(new Date())}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <Timer size={18} />
                      Number of Sessions
                    </span>
                  </label>
                  <select
                    {...register('sessions', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[...Array(2)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} session{i > 0 ? 's' : ''} ({(i + 1) * 20} minutes)
                      </option>
                    ))}
                  </select>
                  {errors.sessions && (
                    <p className="mt-1 text-sm text-red-600">{errors.sessions.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <Clock size={18} />
                    Time Slot
                  </span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {timeSlots.map((slot) => (
                    <label
                      key={slot.time}
                      className="relative flex items-center justify-center"
                    >
                      <input
                        type="radio"
                        value={slot.time}
                        {...register('timeSlot')}
                        className="sr-only peer"
                        onChange={() => handleTimeSelect(slot.time)}
                        checked={selectedTime === slot.time}
                        disabled={!slot.isAvailable}
                      />
                      <span 
                        className={`
                          relative w-full text-center px-2 py-2 text-sm border rounded-md
                          ${slot.isAvailable 
                            ? slot.isSuggested
                              ? 'cursor-pointer bg-green-100 hover:bg-green-200 text-green-800 border-green-300 animate-pulse'
                              : slot.isSelected
                                ? 'bg-blue-500 text-white'
                                : 'cursor-pointer hover:bg-blue-50'
                            : 'cursor-not-allowed bg-red-100 text-red-700 line-through'
                          }
                          transition-colors duration-200
                        `}
                      >
                        {slot.time}
                        {slot.isSuggested && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                            Recommended slot!
                          </div>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                {timeSlots.length === 0 && (
                  <p className="mt-2 text-sm text-red-600">No available time slots for the selected date and duration</p>
                )}
                {errors.timeSlot && (
                  <p className="mt-2 text-sm text-red-600">{errors.timeSlot.message}</p>
                )}
              </div>

              {selectedTime && (
                <div className="bg-blue-50 p-4 rounded-md">
                  <p className="text-blue-800">
                    Selected time: {selectedTime} - {calculateEndTime(selectedTime, sessions)}
                    <br />
                    Duration: {sessions * 20} minutes
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-300"
              >
                {loading ? 'Booking...' : 'Book Sessions'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}