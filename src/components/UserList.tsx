import React, { useState, useEffect, useCallback, memo } from 'react';
import { User, Mail, Calendar, Shield, Search, Trash2, Edit2, X, Star } from 'lucide-react';
import { supabase } from '../supabase';
import { useTranslation } from 'react-i18next';
import type { User as UserType, UserRole } from '../types';

interface ExtendedUser extends UserType {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  avatarUrl: string | null;
  bookingsCount: number;
}

interface EditUserForm {
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const UserItem = memo(({ 
  user,
  currentUserRole,
  onEdit,
  onDelete 
}: { 
  user: ExtendedUser;
  currentUserRole: UserRole;
  onEdit: (user: ExtendedUser) => void;
  onDelete: (user: ExtendedUser) => void;
}) => (
  <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center gap-4">
      <div className="flex-shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={`${user.email}'s avatar`}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>

      <div className="flex-grow">
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-gray-400" />
          <span className="text-gray-900">{user.email}</span>
          <div className="flex gap-2">
            {user.isSuperAdmin && (
              <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Star size={12} />
                Super Admin
              </span>
            )}
            {user.isAdmin && !user.isSuperAdmin && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Shield size={12} />
                Admin
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar size={16} />
            <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="font-medium">{user.bookingsCount}</span> bookings
          </div>
        </div>
      </div>

      {/* Only show edit/delete buttons if current user has appropriate permissions */}
      {(currentUserRole.isSuperAdmin || (currentUserRole.isAdmin && !user.isSuperAdmin)) && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(user)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors duration-200"
            title="Edit user"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(user)}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors duration-200"
            title="Delete user"
            disabled={user.isSuperAdmin && !currentUserRole.isSuperAdmin}
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  </div>
));

UserItem.displayName = 'UserItem';

export function UserList() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>({ isAdmin: false, isSuperAdmin: false });
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({ email: '', isAdmin: false, isSuperAdmin: false });
  const { t } = useTranslation();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        // Check admin status
        const { data: adminData } = await supabase
          .from('admins')
          .select('admins.user_id')
          .eq('admins.user_id', currentUser.id)
          .maybeSingle();

        // Check super admin status
        const { data: superAdminData } = await supabase
          .from('super_admins')
          .select('super_admins.user_id')
          .eq('super_admins.user_id', currentUser.id)
          .maybeSingle();

        setCurrentUserRole({
          isAdmin: !!adminData,
          isSuperAdmin: !!superAdminData
        });

        if (!adminData && !superAdminData) return;
      }

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, created_at');

      if (usersError) throw usersError;

      const { data: admins } = await supabase
        .from('admins')
        .select('admins.user_id');
      
      const { data: superAdmins } = await supabase
        .from('super_admins')
        .select('super_admins.user_id');

      const adminUserIds = new Set(admins?.map(admin => admin.user_id) || []);
      const superAdminUserIds = new Set(superAdmins?.map(admin => admin.user_id) || []);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('user_id');
      
      const bookingCounts = new Map<string, number>();
      bookings?.forEach(booking => {
        bookingCounts.set(
          booking.user_id,
          (bookingCounts.get(booking.user_id) || 0) + 1
        );
      });

      const avatarUrls = new Map<string, string>();
      for (const user of users || []) {
        const { data: avatarData } = await supabase
          .storage
          .from('avatars')
          .list(user.id);

        if (avatarData && avatarData.length > 0) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(`${user.id}/${avatarData[0].name}`);
          avatarUrls.set(user.id, publicUrl);
        }
      }

      const extendedUsers: ExtendedUser[] = (users || []).map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        isAdmin: adminUserIds.has(user.id),
        isSuperAdmin: superAdminUserIds.has(user.id),
        avatarUrl: avatarUrls.get(user.id) || null,
        bookingsCount: bookingCounts.get(user.id) || 0
      }));

      setUsers(extendedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(t('userList.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('users_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'users' 
      }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  const handleDeleteUser = async (user: ExtendedUser) => {
    if (!currentUserRole.isAdmin && !currentUserRole.isSuperAdmin) {
      alert(t('userList.adminAccessMessage'));
      return;
    }

    // Super admins can only be deleted by other super admins
    if (user.isSuperAdmin && !currentUserRole.isSuperAdmin) {
      alert('Only super admins can delete other super admins');
      return;
    }

    if (!window.confirm(t('userList.deleteConfirm', { email: user.email }))) {
      return;
    }

    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      setUsers(users.filter(u => u.id !== user.id));
      alert(t('userList.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(t('userList.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setLoading(true);

      // Only super admins can modify super admin status
      if (editForm.isSuperAdmin !== editingUser.isSuperAdmin && !currentUserRole.isSuperAdmin) {
        throw new Error('Only super admins can modify super admin status');
      }

      // Update email
      await supabase
        .from('users')
        .update({ email: editForm.email })
        .eq('id', editingUser.id);

      // Handle admin status
      if (editForm.isAdmin && !editingUser.isAdmin) {
        await supabase
          .from('admins')
          .insert({ user_id: editingUser.id });
      } else if (!editForm.isAdmin && editingUser.isAdmin) {
        await supabase
          .from('admins')
          .delete()
          .eq('user_id', editingUser.id);
      }

      // Handle super admin status (only if current user is super admin)
      if (currentUserRole.isSuperAdmin) {
        if (editForm.isSuperAdmin && !editingUser.isSuperAdmin) {
          await supabase
            .from('super_admins')
            .insert({ user_id: editingUser.id });
        } else if (!editForm.isSuperAdmin && editingUser.isSuperAdmin) {
          await supabase
            .from('super_admins')
            .delete()
            .eq('user_id', editingUser.id);
        }
      }

      setUsers(users.map(user => 
        user.id === editingUser.id
          ? {
              ...user,
              email: editForm.email,
              isAdmin: editForm.isAdmin,
              isSuperAdmin: editForm.isSuperAdmin
            }
          : user
      ));

      setEditingUser(null);
      alert(t('userList.updateSuccess'));
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error instanceof Error ? error.message : t('userList.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentUserRole.isAdmin && !currentUserRole.isSuperAdmin) {
    return (
      <div className="text-center py-8">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700">{t('userList.adminAccess')}</h2>
        <p className="text-gray-500 mt-2">{t('userList.adminAccessMessage')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{t('userList.editUser')}</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('userList.email')}
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={editForm.isAdmin}
                    onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-900">
                    {t('userList.adminPrivileges')}
                  </label>
                </div>
                {currentUserRole.isSuperAdmin && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isSuperAdmin"
                      checked={editForm.isSuperAdmin}
                      onChange={(e) => setEditForm({ ...editForm, isSuperAdmin: e.target.checked })}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isSuperAdmin" className="ml-2 block text-sm text-gray-900">
                      Super Admin privileges
                    </label>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
                >
                  {t('userList.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  {t('userList.saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">{t('userList.title')}</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t('userList.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <UserItem
            key={user.id}
            user={user}
            currentUserRole={currentUserRole}
            onEdit={(user) => {
              setEditingUser(user);
              setEditForm({
                email: user.email,
                isAdmin: user.isAdmin,
                isSuperAdmin: user.isSuperAdmin
              });
            }}
            onDelete={handleDeleteUser}
          />
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {t('userList.noUsers')}
          </div>
        )}
      </div>
    </div>
  );
}