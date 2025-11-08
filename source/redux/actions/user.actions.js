import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../utils/supabaseClient';
import {
  SET_USER,
  SET_AUTHENTICATED,
  SET_UNAUTHENTICATED,
  SET_LOADING,
  SET_ERROR,
  CLEAR_ERROR,
  SET_COLLECTOR,
  SET_ACTIVE_USER,
} from './types';
import { api, fetchUser } from '../../utils/offlineSync';

// AsyncStorage keys
const STORAGE_KEYS = {
  USER_EMAIL: 'user_email',
  USER_SESSION: 'user_session',
  USER_PROFILE: 'user_profile',
  AUTH_TOKEN: 'auth_token',
  SESSION_EXPIRY: 'session_expiry',
};

// Supabase session configuration - 30 days expiration
const SESSION_CONFIG = {
  expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
};

// Clear error action
export const clearError = () => ({
  type: CLEAR_ERROR,
});

// Set loading action
export const setLoading = (isLoading) => ({
  type: SET_LOADING,
  payload: isLoading,
});

// Set error action
export const setError = (error) => ({
  type: SET_ERROR,
  payload: error,
});

// Set user and authenticated state
export const setUser = (user) => ({
  type: SET_USER,
  payload: user,
});

export const setAuthenticated = () => ({
  type: SET_AUTHENTICATED,
});

export const setUnauthenticated = () => ({
  type: SET_UNAUTHENTICATED,
});

// Storage utility functions
const storage = {
  // Save user email to AsyncStorage
  saveUserEmail: async (email) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
      console.log('User email saved to storage:', email);
    } catch (error) {
      console.error('Error saving user email:', error);
    }
  },

  // Get user email from AsyncStorage
  getUserEmail: async () => {
    try {
      const email = await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
      return email;
    } catch (error) {
      console.error('Error getting user email:', error);
      return null;
    }
  },

  // Save user session data
  saveUserSession: async (session) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
      
      // Calculate and save session expiry (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiryDate.toISOString());
    } catch (error) {
      console.error('Error saving user session:', error);
    }
  },

  // Get user session data
  getUserSession: async () => {
    try {
      const session = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error getting user session:', error);
      return null;
    }
  },

  // Save user profile
  saveUserProfile: async (profile) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  },

  // Get user profile
  getUserProfile: async () => {
    try {
      const profile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Get session expiry
  getSessionExpiry: async () => {
    try {
      const expiry = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_EXPIRY);
      return expiry ? new Date(expiry) : null;
    } catch (error) {
      console.error('Error getting session expiry:', error);
      return null;
    }
  },

  // Check if session is expired
  isSessionExpired: async () => {
    try {
      const expiry = await storage.getSessionExpiry();
      if (!expiry) return true;
      
      return new Date() > expiry;
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return true;
    }
  },

  // Clear all user data from storage
  clearUserData: async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_EMAIL,
        STORAGE_KEYS.USER_SESSION,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.SESSION_EXPIRY,
      ]);
      console.log('All user data cleared from storage');
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  },
};

export const fetchUserByEmail = (email) => async (dispatch, getState) => {
  
  try {
    
      
  
    const user = await fetchUser(email);


    return user;
  } catch (error) {

    throw error;
  }
};


export const updateUser = (id, data) => async (dispatch, getState) => {
  
  try {
    
    let user = await api.getUser(id);
  
    if(!user) return;
  
    await api.updateUser(id, data);

    let newUser = await api.getUser(id);

    return newUser;
  } catch (error) {

    throw error;
  }
};



// Initialize auth state using stored email - MAIN AUTH LOGIC
export const initializeAuth = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearError());

    // First, check if we have a stored email
    const storedEmail = await storage.getUserEmail();
    
    if (!storedEmail) {
      console.log('No stored email found - user not logged in');
      dispatch(setUnauthenticated());
      dispatch(setUser(null));
      dispatch(setLoading(false));
      return null;
    }

    console.log('Found stored email:', storedEmail);

    // Check if session is expired based on our stored expiry
    const isExpired = await storage.isSessionExpired();
    if (isExpired) {
      console.log('Session expired based on stored expiry date');
      await storage.clearUserData();
      dispatch(setUnauthenticated());
      dispatch(setUser(null));
      dispatch(setLoading(false));
      return null;
    }

    // Try to get current session from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Supabase session error:', sessionError);
      // Continue with stored data despite session error
    }

    let userData = null;

    if (session?.user && session.user.email === storedEmail) {
      // Active Supabase session exists and matches stored email
      console.log('Active Supabase session found');
      
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', storedEmail)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      userData = {
        id: session.user.id,
        email: session.user.email,
        ...session.user.user_metadata,
        ...profile,
      };

      // Update stored session and profile
      await storage.saveUserSession(session);
      if (profile) {
        await storage.saveUserProfile(profile);
      }

    } else {
      // No active Supabase session, but we have stored data
      console.log('No active Supabase session, using stored data');
      
      const storedSession = await storage.getUserSession();
      const storedProfile = await storage.getUserProfile();
      
      if (storedSession && storedProfile) {
        userData = {
          id: storedSession.user?.id,
          email: storedEmail,
          ...storedProfile,
        };
        
        console.log('Using stored user data for session');
        
        // Attempt to refresh session in background without blocking
        setTimeout(async () => {
          try {
            const { data: { session: refreshedSession } } = await supabase.auth.getSession();
            if (refreshedSession?.user) {
              console.log('Session refreshed in background');
              await storage.saveUserSession(refreshedSession);
            }
          } catch (refreshError) {
            console.error('Background session refresh error:', refreshError);
          }
        }, 1000);
      } else {
        console.log('No stored session data available');
        await storage.clearUserData();
        dispatch(setUnauthenticated());
        dispatch(setUser(null));
        dispatch(setLoading(false));
        return null;
      }
    }

    if (userData) {
      dispatch(setUser(userData));
      dispatch(setAuthenticated());
      dispatch(setLoading(false));
      dispatch({type: SET_COLLECTOR, payload: userData.email})
      dispatch({type: SET_ACTIVE_USER, payload: userData})

      console.log('User authenticated successfully');
      return userData;
    } else {
      throw new Error('Failed to initialize user data');
    }

  } catch (error) {
    console.error('Auth initialization error:', error);
    dispatch(setError(error.message));
    
    // Don't clear storage on initialization errors - keep user logged in
    // Only clear if it's a critical auth error
    if (error.message.includes('invalid') || error.message.includes('expired')) {
      await storage.clearUserData();
    }
    
    dispatch(setUnauthenticated());
    dispatch(setUser(null));
    dispatch(setLoading(false));
    
    return null;
  }
};

// Sign in action with 30-day session
export const signIn = (email, password) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearError());

    console.log('Attempting sign in with:', email);

    // Set session expiry to 30 days
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    }, {
      // Configure session to expire in 30 days
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('Sign in successful:', data);

    if (data.user && data.session) {
      // Save email and session to AsyncStorage
      await storage.saveUserEmail(data.user.email);
      await storage.saveUserSession(data.session);
      
      // Fetch and save user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', data.user.email)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        ...data.user.user_metadata,
        ...profile,
      };

      if (profile) {
        await storage.saveUserProfile(profile);
      }

      dispatch(setUser(userData));
      dispatch(setAuthenticated());
      dispatch(setLoading(false));
      
      console.log('User signed in with 30-day session');
      return userData;
    } else {
      throw new Error('No user data returned from sign in');
    }
  } catch (error) {
    console.error('Sign in error:', error);
    dispatch(setError(error.message));
    
    // Clear any partial stored data on sign in error
    await storage.clearUserData();
    
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

// Sign up action with 30-day session
export const signUp = (email, password, userMetadata = {}) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearError());

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: userMetadata,
      },
    }, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user && data.session) {
      // Save email and session to AsyncStorage
      await storage.saveUserEmail(data.user.email);
      await storage.saveUserSession(data.session);
      
      // Create profile in your users table
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            ...userMetadata,
            created_at: new Date().toISOString(),
          },
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      const userData = {
        id: data.user.id,
        email: data.user.email,
        ...userMetadata,
      };

      await storage.saveUserProfile(userData);

      dispatch(setUser(userData));
      dispatch(setAuthenticated());
      dispatch(setLoading(false));
      dispatch({type: SET_COLLECTOR, payload: userData.email})
      dispatch({type: SET_ACTIVE_USER, payload: userData})
      
      console.log('User signed up with 30-day session');
      return userData;
    }
  } catch (error) {
    console.error('Sign up error:', error);
    dispatch(setError(error.message));
    
    // Clear any partial stored data on error
    await storage.clearUserData();
    
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

// Sign out action with storage cleanup
export const signOut = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Supabase sign out error:', error);
      // Continue with local signout even if Supabase fails
    }
    
    // Clear all user data from storage
    await storage.clearUserData();
    
    dispatch(setUnauthenticated());
    dispatch(setUser(null));
    dispatch(setLoading(false));
    
    console.log('User signed out and storage cleared');
  } catch (error) {
    console.error('Sign out error:', error);
    dispatch(setError(error.message));
    
    // Force local signout even if there's an error
    await storage.clearUserData();
    dispatch(setUnauthenticated());
    dispatch(setUser(null));
    dispatch(setLoading(false));
    
    throw error;
  }
};

// Forgot password action
export const resetPassword = (email) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearError());

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: 'yourapp://reset-password',
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

// Check if user has stored session (for app startup)
export const hasStoredSession = () => async () => {
  try {
    const email = await storage.getUserEmail();
    const isExpired = await storage.isSessionExpired();
    
    return !!email && !isExpired;
  } catch (error) {
    console.error('Error checking stored session:', error);
    return false;
  }
};

// Get stored user email (for display purposes)
export const getStoredUserEmail = () => async () => {
  return await storage.getUserEmail();
};

// Manual session refresh (if needed)
export const refreshSession = () => async (dispatch) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      throw error;
    }
    
    if (session) {
      await storage.saveUserSession(session);
      console.log('Session refreshed manually');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Manual session refresh error:', error);
    return false;
  }
};

// Clear storage only (without sign out) - useful for debugging
export const clearStorage = () => async (dispatch) => {
  try {
    await storage.clearUserData();
    console.log('Storage cleared manually');
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
};