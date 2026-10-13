import { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, AlertCircle } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) return 'Password must be at least 6 characters long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (isSignUp) {
        const passwordError = validatePassword(trimmedPassword);
        if (passwordError) {
          setError(passwordError);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: { 
            emailRedirectTo: window.location.origin,
            data: {
              email: trimmedEmail
            }
          }
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
          throw error;
        }
        
        alert('Account created successfully! You can now sign in.');
        setIsSignUp(false);
      } else {
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword
        });
        
        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('Incorrect email or password. Please try again.');
          }
          throw error;
        }

        if (user) {
          onAuthSuccess();
        } else {
          throw new Error('Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isSignUp ? 'Create an Account' : 'Sign In'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <Mail size={18} />
              Email
            </span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <span className="flex items-center gap-2">
              <Lock size={18} />
              Password
            </span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
            required
            minLength={6}
            disabled={loading}
          />
          {isSignUp && (
            <p className="mt-2 text-sm text-gray-600">
              Password must be at least 6 characters long and contain uppercase, lowercase, and numbers
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={() => {
            if (loading) return;
            setIsSignUp(!isSignUp);
            setError(null);
            setPassword('');
          }}
          className="text-blue-600 hover:text-blue-800 text-sm disabled:text-blue-300"
          disabled={loading}
        >
          {isSignUp
            ? 'Already have an account? Sign In'
            : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}