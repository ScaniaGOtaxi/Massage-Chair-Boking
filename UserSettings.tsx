import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Mail, Shield, Calendar, Upload, X, Code } from 'lucide-react';
import { supabase } from '../supabase';
import type { User as UserType } from '../types';

export function UserSettings() {
  const [user, setUser] = useState<UserType | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [joinDate, setJoinDate] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUserData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .eq('user_id', authUser.id);

      setUser({
        id: authUser.id,
        email: authUser.email!,
        created_at: authUser.created_at!
      });
      setIsAdmin(adminData !== null);
      setBookingsCount(count || 0);
      setJoinDate(new Date(authUser.created_at!).toLocaleDateString());

      const { data: avatarData } = await supabase
        .storage
        .from('avatars')
        .list(authUser.id);

      if (avatarData && avatarData.length > 0) {
        const { data: { publicUrl } } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(`${authUser.id}/${avatarData[0].name}`);
        setAvatarUrl(publicUrl);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file.');
      }

      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size must be less than 2MB.');
      }

      const { data: existingFiles } = await supabase
        .storage
        .from('avatars')
        .list(user?.id || '');

      if (existingFiles && existingFiles.length > 0) {
        await supabase
          .storage
          .from('avatars')
          .remove(existingFiles.map(f => `${user?.id}/${f.name}`));
      }

      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase
        .storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error uploading avatar');
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);

      const { data: existingFiles } = await supabase
        .storage
        .from('avatars')
        .list(user?.id || '');

      if (existingFiles && existingFiles.length > 0) {
        await supabase
          .storage
          .from('avatars')
          .remove(existingFiles.map(f => `${user?.id}/${f.name}`));
      }

      setAvatarUrl(null);
    } catch (error) {
      alert('Error removing avatar');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center text-gray-600">
        Please sign in to view your settings
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">User Settings</h2>
      
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="relative group">
              {avatarUrl ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden group">
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={20} className="text-white" />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors"
                >
                  <Upload size={24} />
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={uploadAvatar}
                accept="image/*"
                className="hidden"
                disabled={uploading}
              />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
              <p className="text-sm text-gray-500">Your personal account details</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
              <Shield size={18} />
              <span className="font-medium">Admin</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <div className="flex items-center gap-2 text-gray-900">
                <Mail size={18} className="text-gray-400" />
                <span>{user.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-500">Member Since</label>
              <div className="flex items-center gap-2 text-gray-900">
                <Calendar size={18} className="text-gray-400" />
                <span>{joinDate}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="text-lg font-medium text-gray-900 mb-3">Activity Summary</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600 mb-1">{bookingsCount}</div>
              <div className="text-sm text-gray-600">Total Bookings Made</div>
            </div>
          </div>

          {avatarUrl && (
            <div className="flex justify-end">
              <button
                onClick={removeAvatar}
                disabled={uploading}
                className="flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors"
              >
                <X size={18} />
                Remove Photo
              </button>
            </div>
          )}

          <div className="pt-4 mt-6 border-t">
            <div className="flex items-center gap-2 text-gray-600">
              <Code size={18} />
              <span>Created by Piotr Zdeb QFSV 2025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}