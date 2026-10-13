import React, { useState, useEffect, useCallback, memo } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, Mail, Trash2, Edit2, Shield } from 'lucide-react';
import { supabase } from '../supabase';
import type { Booking } from '../types';

const BookingItem = memo(({ 
  booking, 
  isAdmin, 
  user, 
  onDelete, 
  onEdit 
}: { 
  booking: Booking;
  isAdmin: boolean;
  user: any;
  onDelete: (id: string, userId: string) => void;
  onEdit: (booking: Booking) => void;
}) => {
  const isUpcoming = (date: string) => {
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today;
  };

  const upcoming = isUpcoming(booking.date);
  const canModify = upcoming && (isAdmin || (user && user.id === booking.user_id));

  return (
    <div className={`bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200 ${
      !upcoming ? 'opacity-60' : ''
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-700">
            <User size={18} />
            <span>{booking.name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Mail size={18} />
            <span>{booking.email}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar size={18} />
            <span>{format(new Date(booking.date), 'MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Clock size={18} />
            <span>
              {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
              <span className="ml-2 text-gray-500">
                ({booking.sessions} {booking.sessions === 1 ? 'session' : 'sessions'})
              </span>
            </span>
          </div>
        </div>
      </div>

      {canModify && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => onEdit(booking)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200"
          >
            <Edit2 size={18} />
            Edit
          </button>
          <button
            onClick={() => onDelete(booking.id, booking.user_id)}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors duration-200"
          >
            <Trash2 size={18} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
});

BookingItem.displayName = 'BookingItem';

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchUserAndAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setIsAdmin(adminData !== null);
      }
    };

    fetchUserAndAdminStatus();
    fetchBookings();

    // Set up real-time subscription
    const channel = supabase
      .channel('bookings_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings' 
      }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  const handleDelete = async (bookingId: string, userId: string) => {
    if (!user || (!isAdmin && user.id !== userId)) {
      alert('You can only delete your own bookings');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
      setBookings(bookings.filter(booking => booking.id !== bookingId));
      alert('Booking cancelled successfully');
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to cancel booking. Please try again.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBooking) return;

    try {
      const formData = new FormData(e.currentTarget);
      const updates = {
        name: formData.get('name'),
        email: formData.get('email'),
        date: formData.get('date'),
        start_time: formData.get('start_time'),
        sessions: parseInt(formData.get('sessions') as string, 10),
      };

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', editingBooking.id);

      if (error) throw error;

      await fetchBookings();
      setEditingBooking(null);
      alert('Booking updated successfully');
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">All Bookings</h2>
        {isAdmin && (
          <div className="flex items-center gap-2 text-blue-600">
            <Shield size={18} />
            <span>Admin Mode</span>
          </div>
        )}
      </div>
      
      {editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Edit Booking</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingBooking.name}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingBooking.email}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={editingBooking.date}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  name="start_time"
                  defaultValue={editingBooking.start_time.slice(0, 5)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sessions</label>
                <select
                  name="sessions"
                  defaultValue={editingBooking.sessions}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  {[1, 2].map((num) => (
                    <option key={num} value={num}>
                      {num} session{num > 1 ? 's' : ''} ({num * 20} minutes)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bookings.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No bookings found</p>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <BookingItem
              key={booking.id}
              booking={booking}
              isAdmin={isAdmin}
              user={user}
              onDelete={handleDelete}
              onEdit={setEditingBooking}
            />
          ))}
        </div>
      )}
    </div>
  );
}