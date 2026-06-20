import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage/token
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      
      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsLoggedIn(true);
          
          const storedFavs = localStorage.getItem(`userFavorites_${parsedUser.email}`);
          if (storedFavs) {
            setFavorites(JSON.parse(storedFavs));
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // ✅ UPDATED: loginWithGoogle accepts credential (JWT) from Google SDK
  const loginWithGoogle = async (credential) => {
    console.log('🔐 loginWithGoogle called with credential:', credential ? 'Received' : 'Empty');
    
    try {
      const response = await authApi.googleAuth({
        credential: credential  // ✅ Send credential (JWT) instead of access_token
      });

      if (response.success) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        
        setUser(response.user);
        setIsLoggedIn(true);
        
        const storedFavs = localStorage.getItem(`userFavorites_${response.user.email}`);
        setFavorites(storedFavs ? JSON.parse(storedFavs) : []);
        
        toast.success('Welcome back!');
        return true;
      } else {
        toast.error(response.message || 'Authentication failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Google auth error:', error);
      toast.error(error.message || 'Authentication failed. Please try again.');
      return false;
    }
  };

  // Email/Password login
  const loginWithEmail = async (email, password) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        
        setUser(data.user);
        setIsLoggedIn(true);
        
        toast.success(`Welcome back ${data.user.name}!`);
        return true;
      } else {
        toast.error(data.message || 'Login failed');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setFavorites([]);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    toast.success('Logged out successfully');
  };

  const addFavorite = async (propertyId) => {
    if (!isLoggedIn || !user) {
      toast.error('Please Sign In to save your favorite properties.');
      return;
    }
    setFavorites(prev => {
      if (prev.includes(propertyId)) return prev;
      const newFavs = [...prev, propertyId];
      localStorage.setItem(`userFavorites_${user.email}`, JSON.stringify(newFavs));
      toast.success('Added to favorites.');
      return newFavs;
    });
  };

  const removeFavorite = (propertyId) => {
    if (!isLoggedIn || !user) return;
    setFavorites(prev => {
      const newFavs = prev.filter(id => id !== propertyId);
      localStorage.setItem(`userFavorites_${user.email}`, JSON.stringify(newFavs));
      toast.success('Removed from favorites.');
      return newFavs;
    });
  };

  const toggleFavorite = (propertyId) => {
    if (!isLoggedIn || !user) {
      toast.error('Please Sign In to save your favorite properties.');
      return;
    }
    if (favorites.includes(propertyId)) {
      removeFavorite(propertyId);
    } else {
      addFavorite(propertyId);
    }
  };

  if (isLoading) {
    return (
      <AuthContext.Provider value={{ 
        user: null, 
        isLoggedIn: false, 
        favorites: [],
        loginWithGoogle,
        loginWithEmail,
        logout,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        isLoading: true
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoggedIn, 
      favorites,
      loginWithGoogle,
      loginWithEmail,
      logout,
      addFavorite,
      removeFavorite,
      toggleFavorite,
      isLoading: false
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};