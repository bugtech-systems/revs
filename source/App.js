/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
  useColorScheme,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  Alert,
  AppState
} from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import {  DefaultTheme, DarkTheme } from '@react-navigation/native';
import 'react-native-url-polyfill/auto'; // For Supabase compatibility in React Native
import { LogBox } from 'react-native';
import { StackNavigator } from './StackNavigator';
import { store } from './redux/store';
import { 
  initializeSync, 
  cleanupSync 
} from './redux/actions/syncActions';
import { 
  initializeAuth,
  signOut
} from './redux/actions/user.actions';
import { syncConfig } from './configs/syncConfig';
import SyncManager from './services/SyncManager';


// Add this at the top of your App.js, before any components
LogBox.ignoreLogs([
  'new NativeEventEmitter',
  'Non-serializable values',
  'new NativeEventEmitter() was called with a non-null argument without the required',
]);


// Loading Indicator Component
const LoadingIndicator = ({ message = "Initializing App..." }) => {
  return (
    <View style={styles.activityContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

// Error Screen Component
const ErrorScreen = ({ error, onRetry, onContinueOffline }) => {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Initialization Error</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <View style={styles.buttonContainer}>
        <Text style={styles.retryButton} onPress={onRetry}>
          Retry
        </Text>
        <Text style={styles.continueButton} onPress={onContinueOffline}>
          Continue Offline
        </Text>
      </View>
    </View>
  );
};

// Database Initializer Component
const DatabaseInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const syncState = useSelector(state => state.sync);
  const [manualRetry, setManualRetry] = useState(0);
  const [dbInitialized, setDbInitialized] = useState(false);

  const { 
    isInitializing, 
    isReady, 
    error, 
  } = syncState;

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('Initializing database...');
        await dispatch(initializeSync(syncConfig));
        
        const setupSyncListeners = () => {
          console.log('Setting up sync listeners with Redux...');
        };
         // Set dispatch for SyncManager
        SyncManager.setDispatch(dispatch);
        setupSyncListeners();
        setDbInitialized(true);
      } catch (err) {
        console.error('Database initialization failed:', err);
        setDbInitialized(true); // Still mark as initialized to continue
      }
    };

    initDatabase();

    return () => {
      dispatch(cleanupSync());
    };
  }, [dispatch, manualRetry]);

  const handleRetry = () => {
    setManualRetry(prev => prev + 1);
    setDbInitialized(false);
  };

  const handleContinueOffline = () => {
    Alert.alert(
      "Continue Offline",
      "Some features may be limited without database synchronization.",
      [{ text: "OK" }]
    );
    setDbInitialized(true); // Force continue even with errors
  };

  // Show loading during database initialization
  if (!dbInitialized || isInitializing) {
    return <LoadingIndicator message="Initializing database..." />;
  }

  // Show error screen if database initialization failed
  if (error && !isReady) {
    return (
      <ErrorScreen 
        error={error} 
        onRetry={handleRetry}
        onContinueOffline={handleContinueOffline}
      />
    );
  }

  // Render children when database is initialized
  return children;
};

// Authentication Initializer Component
const AuthInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector(({ user }) => user);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Initializing authentication...');
        await dispatch(initializeAuth());
        setAuthInitialized(true);
        
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setAuthInitialized(true); // Still mark as initialized to show app
      }
    };

    // Only initialize auth after database is ready
    initAuth();
  }, [dispatch]);

  // Show loading during auth initialization
  if (!authInitialized || isLoading) {
    return <LoadingIndicator message="Checking authentication..." />;
  }

  return children;
};

// Sync Status Component
const SyncStatusBar = () => {
  const syncState = useSelector(state => state.sync);
  const { isAuthenticated } = useSelector(({ user }) => user);
  const { isSyncing, pendingChanges, lastSync, error } = syncState;

  // Only show sync status if user is authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (!isSyncing && pendingChanges === 0 && !error) {
    return null;
  }

  const getStatusMessage = () => {
    if (error) {
      return `❌ Sync Error: ${error}`;
    }
    if (isSyncing) {
      return '🔄 Syncing...';
    }
    if (pendingChanges > 0) {
      return `📋 ${pendingChanges} pending changes`;
    }
    return null;
  };

  const getStatusStyle = () => {
    if (error) return styles.syncError;
    if (isSyncing) return styles.syncing;
    if (pendingChanges > 0) return styles.syncPending;
    return styles.syncIdle;
  };

  const statusMessage = getStatusMessage();
  if (!statusMessage) return null;

  return (
    <View style={[styles.syncStatusBar, getStatusStyle()]}>
      <Text style={styles.syncStatusText}>
        {statusMessage}
      </Text>
      {lastSync && !isSyncing && !error && (
        <Text style={styles.lastSyncText}>
          Last sync: {new Date(lastSync).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

// Authentication Status Component
const AuthStatusBar = () => {
  const { user, isAuthenticated } = useSelector(({ user }) => user);
  const dispatch = useDispatch();

  if (isAuthenticated && user) {
    return (
      <View style={styles.authStatusBar}>
        <Text style={styles.authStatusText}>
          👤 {user.email}
        </Text>
        <Text 
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert(
              "Logout",
              "Are you sure you want to logout?",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Logout", 
                  style: "destructive",
                  onPress: () => dispatch(signOut())
                }
              ]
            );
          }}
        >
          Logout
        </Text>
      </View>
    );
  }

  return null;
};

// App State Manager
const AppStateManager = ({ children }) => {
  const dispatch = useDispatch();
  const { isReady } = useSelector(state => state.sync);
  const { isAuthenticated } = useSelector(({ user }) => user);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('App state changed:', nextAppState);
      
      // Reinitialize auth when app comes to foreground
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App came to foreground, checking auth state...');
        try {
          await dispatch(initializeAuth());
        } catch (error) {
          console.error('Error reinitializing auth:', error);
        }
      }
      
      // Trigger sync when app comes to foreground and sync is ready
      if (appState.match(/inactive|background/) && 
          nextAppState === 'active' && 
          isReady &&
          isAuthenticated) {
        console.log('App came to foreground, triggering sync...');
        // Dispatch manual sync action
        // dispatch(manualSync());
      }
      
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [appState, isReady, isAuthenticated, dispatch]);

  return children;
};

// Conditional Sync Manager
const ConditionalSyncManager = ({ children }) => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector(({ user }) => user);
  const syncState = useSelector(state => state.sync);

  useEffect(() => {

    
    // Only start active sync if user is authenticated
    if (isAuthenticated && user && syncState.isReady) {
      console.log('Starting authenticated sync session...');
      // Start any authenticated-only sync processes here
    }
  }, [isAuthenticated, user, syncState.isReady, dispatch]);

  return children;
};





// Main App Content with Navigation
const AppContent = () => {
  const scheme = useColorScheme();
  const MyTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const { isLoading, isAuthenticated } = useSelector(({ user }) => user);

  if (isLoading) {
    return <LoadingIndicator message="Loading..." />;
  }

  return (
      <View style={styles.container}>
        <AuthStatusBar />
        <StackNavigator />
        <SyncStatusBar />
      </View>
  );
};

// App Initialization Hierarchy
const AppWithProviders = () => {
  return (
        <DatabaseInitializer>
          <AuthInitializer>
            <AppStateManager>
              <ConditionalSyncManager>
                  <AppContent />
              </ConditionalSyncManager>
            </AppStateManager>
          </AuthInitializer>
        </DatabaseInitializer>
  );
};

// Root App Component
export const App = () => {
  return (
    <Provider store={store}>
      <AppWithProviders />
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  activityContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    color: 'white',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#6c757d',
    color: 'white',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  syncStatusBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  authStatusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1001,
  },
  authStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  syncing: {
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
  },
  syncPending: {
    backgroundColor: 'rgba(40, 167, 69, 0.9)',
  },
  syncError: {
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
  },
  syncIdle: {
    backgroundColor: 'rgba(108, 117, 125, 0.9)',
  },
  syncStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  lastSyncText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
});

export default App;