export interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isSuggested?: boolean;
  isSelected?: boolean;
}

export interface BookingFormData {
  name: string;
  email: string;
  date: string;
  timeSlot: string;
  sessions: number;
}

export interface Booking {
  id: string;
  user_id: string;
  name: string;
  email: string;
  date: string;
  start_time: string;
  end_time: string;
  sessions: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
  nickname: string;
}

export interface Admin {
  id: string;
  user_id: string;
  created_at: string;
}

export interface SuperAdmin {
  id: string;
  user_id: string;
  created_at: string;
}

export interface UserRole {
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface ExtendedUser extends User {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  avatarUrl: string | null;
  bookingsCount: number;
}

export interface EditUserForm {
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}