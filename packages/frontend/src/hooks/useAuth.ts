'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  universidadId?: string;
  rol?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const getCurrentUserData = async (): Promise<AuthUser | null> => {
    try {
      const cognitoUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const tokens = session.tokens;

      if (!tokens?.idToken) {
        return null;
      }

      const payload = tokens.idToken.payload;

      return {
        userId: cognitoUser.userId,
        email: payload.email as string,
        name: `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
        universidadId: payload['custom:universidadId'] as string,
        rol: payload['custom:rol'] as string,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      const userData = await getCurrentUserData();
      setUser(userData);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signIn({ username: email, password });
      await refreshUser();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return {
    user,
    loading,
    login,
    logout,
    refreshUser,
  };
};

export { AuthContext };