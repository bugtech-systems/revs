// src/services/SupabaseService.js
import supabase from '../utils/supabaseClient'
import NetInfo from "@react-native-community/netinfo";
// import Config from 'react-native-config';
// import AsyncStorage from '@react-native-async-storage/async-storage';


class SupabaseService {
  constructor() {
    this.client = null;
    this.isOnline = false;
    this.networkListener = null;
    this.init();
  }

  init() {
    
    this.client = supabase
    this.setupNetworkListener();
  }

  setupNetworkListener() {
    // Use the new API for react-native-netinfo
    this.networkListener = NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected;
      console.log('Network state changed:', this.isOnline);
    });
  }

  getClient() {
    return this.client;
  }

  isConnected() {
    return this.isOnline;
  }

  async subscribeToTable(table, filter = {}) {
    if (!this.isConnected()) return;

    return this.client
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          ...filter
        },
        payload => {
          this.handleRealtimeUpdate(payload);
        }
      )
      .subscribe();
  }

  handleRealtimeUpdate(payload) {
    console.log('Realtime update:', payload);
  }

  // Cleanup method to remove listeners
  cleanup() {
    if (this.networkListener) {
      this.networkListener();
      this.networkListener = null;
    }
  }
}

export default new SupabaseService();