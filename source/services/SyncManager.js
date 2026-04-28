// src/services/SyncManager.js
import moment from 'moment-timezone';
import DatabaseService from './DatabaseService';
import SupabaseService from './SupabaseService';
import { SYNC_TABLES } from './schema';
import { AppState } from 'react-native';
import { syncConfig } from '../configs/syncConfig';
import supabase from '../utils/supabaseClient';
import { clearCacheForTable, normalizeForSQLite, normalizeForSupabase, TABLES } from '../utils/offlineSync';
import { store } from '../redux/store';
import { SYNC_ACTION_TYPES } from '../redux/actions/syncActions';
class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.tableConfigs = new Map();
    this.syncListeners = new Set();
    this.appState = AppState.currentState;
    this.isInitialized = false;
    this.appStateSubscription = null;
    this.dispatch = null; // Will be set after store is available
  }
  
    // Set dispatch after store is created
  setDispatch(dispatch) {
    this.dispatch = dispatch;
  }

  // Dispatch Redux action safely
  dispatchAction(action) {
    if (this.dispatch && action) {
      this.dispatch(action);
    }
  }

  // Simplified table configuration with 24-hour focus
  configureTables() {
    const defaultConfig = {
      maxAge: 720, // hours
      maxRecords: 10000,
      immediateSync: true,
      cleanupStale: true,
      softDelete: true,
      incrementalSync: true,
      recentDataHours: 24 // Focus on last 24 hours
    };

    
    TABLES.forEach(tableName => {
      const tableConfig = syncConfig.tables?.[tableName] || {};
      this.tableConfigs.set(tableName, { ...defaultConfig, ...tableConfig });
    });
  }

  
  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  // Optimized initialization
  async init() {
    try {
      console.log('🔄 Initializing SyncManager...');
      await DatabaseService.init();
      
      this.isInitialized = true;
      this.configureTables();
      // this.setupAppStateListener();
      
      console.log('✅ SyncManager initialized');
      
      // Start initial sync in background
      setTimeout(() => this.sync(), 2000);
    } catch (error) {
      console.error('❌ SyncManager initialization failed:', error);
      throw error;
    }
  }

  // Manila timezone utilities
  getCurrentManilaTime() {
    return moment().tz('Asia/Manila').toISOString();
  }

  // Get Manila time 24 hours ago
  get24HoursAgoManilaTime() {
    return moment().tz('Asia/Manila').subtract(24, 'hours').toISOString();
  }

  formatManilaTime(date) {
    if (!date) return 'No date';
    return moment(date).tz('Asia/Manila').format('YYYY-MM-DD HH:mm:ss');
  }

  handleAppStateChange = (nextAppState) => {
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      this.sync();
    }
    this.appState = nextAppState;
  };

  addSyncListener(listener) {
    this.syncListeners.add(listener);
  }

  removeSyncListener(listener) {
    this.syncListeners.delete(listener);
  }

  notifySyncListeners(event) {
    this.syncListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  startBackgroundSync(interval = null) {
    if (!this.isInitialized) {
      console.error('❌ Cannot start sync: SyncManager not initialized');
      return;
    }

    const syncInterval = interval || syncConfig.syncInterval;
    
    this.syncInterval = setInterval(() => {
      if (this.appState === 'active') {
        this.sync();
      }
    }, syncInterval);

    console.log(`🔄 Started background sync every ${syncInterval / 1000 / 60} minutes`);
    this.sync();
  }

  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  // Optimized sync process
  async sync() {
    if (!this.isInitialized || this.isSyncing || !SupabaseService.isConnected()) {
      return;
    }

    this.isSyncing = true;
    this.notifySyncListeners({ type: 'sync_started' });

    try {
      console.log('🔄 Starting sync process...');
      
      // Push changes first to avoid conflicts
      await this.pushLocalChanges();
      
      // Pull remote changes with 24-hour focus
      await this.pullRemoteChanges();
      
      // Update sync timestamp
      await this.updateLastSyncTime();
      
         this.dispatchAction({ type: SYNC_ACTION_TYPES.INCREMENT_DATA_VERSION });
    
      this.notifySyncListeners({ 
        type: 'sync_completed', 
        timestamp: Date.now() 
      });
      console.log('✅ Sync completed successfully');
    } catch (error) {
      this.notifySyncListeners({ 
        type: 'sync_failed', 
        error: error 
      });
      console.error('❌ Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Optimized local changes push
  async pushLocalChanges() {
    console.log('📤 Pushing local changes...');
    
    const pendingChanges = await DatabaseService.executeQuery(
      `SELECT * FROM ${SYNC_TABLES.SYNC_QUEUE} 
       WHERE status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT 50`
    );

    if (pendingChanges.rows.length === 0) {
      console.log('✅ No pending changes to push');
      return;
    }

    console.log(`📤 Processing ${pendingChanges.rows.length} pending changes`);

    const results = await Promise.allSettled(
      pendingChanges.rows.map(change => this.processSyncItem(change))
    );

    // Log results summary
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📤 Push completed: ${successful} successful, ${failed} failed`);
  }

  async processSyncItem(item) {
    const { table_name, operation, record_id, data } = item;
    const record = data ? JSON.parse(data) : null;
    
    const recordData = normalizeForSupabase(table_name, record);
    console.log(`🔄 ${operation} ${table_name} record ${record_id}`);

    let result;
    switch (operation) {
      case 'INSERT':
        result = await supabase
          .from(table_name)
          .insert(recordData);
        break;
      case 'UPDATE':
        result = await supabase
          .from(table_name)
          .update(recordData)
          .eq('id', record_id);
        break;
      case 'DELETE':
        result = await supabase
          .from(table_name)
          .delete()
          .eq('id', record_id);
        break;
    }

    if (result?.error) {
      throw new Error(result.error.message);
    }

    // Remove from sync queue on success
    await DatabaseService.executeQuery(
      `DELETE FROM ${SYNC_TABLES.SYNC_QUEUE} WHERE id = ?`,
      [item.id]
    );

    console.log(`✅ ${operation} completed for ${table_name} record ${record_id}`);
  }

  // OPTIMIZED: Remote changes pull with 24-hour focus
  async pullRemoteChanges() {
    const lastSyncTime = await this.getLastSyncTime();
    const twentyFourHoursAgo = this.get24HoursAgoManilaTime();
    
    console.log(`📥 Last sync: ${this.formatManilaTime(lastSyncTime)}`);
    console.log(`📥 24 hours ago: ${this.formatManilaTime(twentyFourHoursAgo)}`);
    
    // Process tables in parallel for better performance
    const syncPromises = Array.from(this.tableConfigs.entries()).map(
      async ([tableName, config]) => {
        try {
          await this.pullTableChanges(tableName, lastSyncTime, twentyFourHoursAgo, config);
        } catch (error) {
          console.error(`❌ Failed to pull ${tableName}:`, error);
          // Don't throw - continue with other tables
        }
      }
    );

    await Promise.allSettled(syncPromises);
  }

  async pullTableChanges(tableName, lastSyncTime, twentyFourHoursAgo, config) {
    const useIncremental = config.incrementalSync && lastSyncTime > 0;
    
    if (useIncremental) {
      await this.pullIncrementalChanges(tableName, lastSyncTime, twentyFourHoursAgo, config);
    } else {
      await this.pullRecentRecords(tableName, twentyFourHoursAgo, config);
    }
  }

  // NEW: Pull only recent records (last 24 hours) for full sync
  async pullRecentRecords(tableName, twentyFourHoursAgo, config) {
    console.log(`🔄 Recent data sync for ${tableName} (last 24 hours)`);
    
    let query = supabase
      .from(tableName)
      .select('*')
      .gte('updated_at', twentyFourHoursAgo) // Only get records updated in last 24 hours
      .order('updated_at', { ascending: false });

    if (config.maxRecords) {
      query = query.limit(config.maxRecords);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error(`❌ Error pulling recent ${tableName}:`, error);
      return;
    }

    if (records?.length > 0) {
      await this.processRemoteRecords(tableName, records);
      console.log(`✅ Recent sync completed for ${tableName}: ${records.length} records from last 24 hours`);
    } else {
      console.log(`📭 No recent records found for ${tableName} in last 24 hours`);
    }
  }

  // OPTIMIZED: Incremental changes with 24-hour fallback
  async pullIncrementalChanges(tableName, lastSyncTime, twentyFourHoursAgo, config) {
    console.log(`🔄 Incremental sync for ${tableName}`);
    
    const lastSyncDate = new Date(lastSyncTime).toISOString();
    
    // Calculate which date to use (last sync or 24 hours ago, whichever is more recent)
    const cutoffDate = new Date(Math.max(lastSyncTime, new Date(twentyFourHoursAgo).getTime())).toISOString();
    
    console.log(`📅 Using cutoff: ${this.formatManilaTime(cutoffDate)}`);
    
    let query = supabase
      .from(tableName)
      .select('*')
      .gte('updated_at', cutoffDate) // Get changes since cutoff (last sync OR 24 hours ago)
      .order('updated_at', { ascending: false });

    if (config.maxRecords) {
      query = query.limit(config.maxRecords);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error(`❌ Error pulling ${tableName} changes:`, error);
      return;
    }

    if (records?.length > 0) {
      await this.processRemoteRecords(tableName, records);
      console.log(`✅ Incremental sync: ${records.length} ${tableName} records since ${this.formatManilaTime(cutoffDate)}`);
    } else {
      console.log(`✅ No ${tableName} changes since ${this.formatManilaTime(cutoffDate)}`);
    }
  }

  // NEW: Smart sync that prioritizes recent data but ensures critical data is available
  async pullSmartChanges(tableName, lastSyncTime, twentyFourHoursAgo, config) {
    const lastSyncDate = new Date(lastSyncTime).toISOString();
    const cutoffDate = new Date(Math.max(lastSyncTime, new Date(twentyFourHoursAgo).getTime())).toISOString();

    console.log(`🧠 Smart sync for ${tableName}`);
    console.log(`📅 Cutoff: ${this.formatManilaTime(cutoffDate)}`);

    // First, get recent changes (last 24 hours or since last sync)
    let recentQuery = supabase
      .from(tableName)
      .select('*')
      .gte('updated_at', cutoffDate)
      .order('updated_at', { ascending: false })
      .limit(config.maxRecords || 500);

    const { data: recentRecords, error: recentError } = await recentQuery;

    if (recentError) {
      console.error(`❌ Error pulling recent ${tableName}:`, recentError);
      return;
    }

    let totalProcessed = 0;

    if (recentRecords?.length > 0) {
      await this.processRemoteRecords(tableName, recentRecords);
      totalProcessed += recentRecords.length;
      console.log(`✅ Processed ${recentRecords.length} recent ${tableName} records`);
    }

    // For certain critical tables, ensure we have minimal data even if older
    if (this.isCriticalTable(tableName) && totalProcessed === 0) {
      console.log(`⚠️ No recent data for critical table ${tableName}, fetching minimal older data`);
      await this.pullMinimalCriticalData(tableName, config);
    }

    console.log(`✅ Smart sync completed for ${tableName}: ${totalProcessed} records`);
  }

  // Determine if a table is critical and needs fallback data
  isCriticalTable(tableName) {
    const criticalTables = ['users', 'branches', 'batches'];
    return criticalTables.includes(tableName);
  }

  // Pull minimal critical data for essential tables
  async pullMinimalCriticalData(tableName, config) {
    console.log(`🔄 Fetching minimal critical data for ${tableName}`);
    
    let query = supabase
      .from(tableName)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50); // Small limit for critical data

    const { data: criticalRecords, error } = await query;

    if (error) {
      console.error(`❌ Error pulling critical ${tableName}:`, error);
      return;
    }

    if (criticalRecords?.length > 0) {
      await this.processRemoteRecords(tableName, criticalRecords);
      console.log(`✅ Fetched ${criticalRecords.length} critical ${tableName} records`);
    }
  }

  // Optimized record processing with batching
  async processRemoteRecords(tableName, remoteRecords) {
    if (!remoteRecords?.length) return;

    console.log(`🔄 Processing ${remoteRecords.length} ${tableName} records`);
    
    // Process in smaller batches for better memory management
    const batchSize = 20;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < remoteRecords.length; i += batchSize) {
      const batch = remoteRecords.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(record => this.upsertLocalRecord(tableName, record))
      );

      // Count results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value === 'inserted') inserted++;
          else if (result.value === 'updated') updated++;
          else skipped++;
        }
      });
      
      console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
    }
    
    clearCacheForTable(tableName)
    console.log(`✅ Completed ${tableName}: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
  }

  async upsertLocalRecord(tableName, remoteRecord) {
    if (!remoteRecord?.id) return 'skipped';

    // Check if record exists locally
    const existingResult = await DatabaseService.executeQuery(
      `SELECT id, updated_at FROM ${tableName} WHERE id = ?`,
      [remoteRecord.id]
    );

    const existsLocally = existingResult.rows.length > 0;

    if (!existsLocally) {
      await this.insertLocalRecord(tableName, remoteRecord);
      return 'inserted';
    } else {
      // Update only if remote is newer
      const localUpdated = new Date(existingResult.rows[0].updated_at).getTime();
      const remoteUpdated = new Date(remoteRecord.updated_at).getTime();

      if (remoteUpdated > localUpdated) {
        await this.updateLocalRecord(tableName, remoteRecord);
        return 'updated';
      }
      return 'skipped';
    }
  }

  async insertLocalRecord(tableName, record) {
    const normalized = normalizeForSQLite(tableName, record);
    const columns = Object.keys(normalized);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => normalized[col]);

    await DatabaseService.executeQuery(
      `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) 
       VALUES (${placeholders})`,
      values
    );
  }

  async updateLocalRecord(tableName, record) {
    const normalized = normalizeForSQLite(tableName, record);
    const columns = Object.keys(normalized).filter(col => !['id', 'created_at'].includes(col));
    
    if (columns.length === 0) return;

    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = columns.map(col => normalized[col]);

    await DatabaseService.executeQuery(
      `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
      [...values, normalized.id]
    );
  }

  async getLastSyncTime() {
    const result = await DatabaseService.executeQuery(
      `SELECT value FROM ${SYNC_TABLES.SYNC_METADATA} 
       WHERE key = 'last_sync_time'`
    );
    
    return result.rows.length > 0 ? parseInt(result.rows[0].value) : 0;
  }

  async updateLastSyncTime() {
    const now = Date.now();
    await DatabaseService.executeQuery(
      `INSERT OR REPLACE INTO ${SYNC_TABLES.SYNC_METADATA} 
       (key, value, updated_at) VALUES (?, ?, ?)`,
      ['last_sync_time', now.toString(), now]
    );
  }

  // Optimized queue change method
  async queueChange(tableName, operation, recordId, data = null) {
    if (!this.isInitialized) return;

    const syncId = `${tableName}_${recordId}_${Date.now()}`;
    const now = Date.now();
    
    await DatabaseService.executeQuery(
      `INSERT INTO ${SYNC_TABLES.SYNC_QUEUE} 
       (id, table_name, operation, record_id, data, created_at, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        syncId,
        tableName,
        operation,
        recordId,
        data ? JSON.stringify(data) : null,
        now,
        'pending'
      ]
    );

    // Update record timestamp
    await DatabaseService.executeQuery(
      `UPDATE ${tableName} SET updated_at = ? WHERE id = ?`,
      [this.getCurrentManilaTime(), recordId]
    );

    console.log(`📝 Queued ${operation} for ${tableName} record ${recordId}`);

    // Trigger immediate sync if online
    if (SupabaseService.isConnected()) {
      setTimeout(() => this.sync(), 100);
    }
  }

  async getSyncStatus() {
    if (!this.isInitialized) {
      return { pending: 0, failed: 0, lastSync: null, isSyncing: false };
    }

    const [pendingCount, failedCount] = await Promise.all([
      DatabaseService.executeQuery(
        `SELECT COUNT(*) as count FROM ${SYNC_TABLES.SYNC_QUEUE} WHERE status = 'pending'`
      ),
      DatabaseService.executeQuery(
        `SELECT COUNT(*) as count FROM ${SYNC_TABLES.SYNC_QUEUE} WHERE status = 'failed'`
      )
    ]);

    const lastSync = await this.getLastSyncTime();

    return {
      pending: pendingCount.rows[0]?.count || 0,
      failed: failedCount.rows[0]?.count || 0,
      lastSync: lastSync ? new Date(lastSync) : null,
      isSyncing: this.isSyncing
    };
  }

  // Force full sync with 24-hour focus
  async forceFullSync() {
    if (!this.isInitialized) return;

    console.log('🔄 Forcing full sync with 24-hour focus...');

    // Reset last sync time
    await DatabaseService.executeQuery(
      `DELETE FROM ${SYNC_TABLES.SYNC_METADATA} WHERE key = 'last_sync_time'`
    );
    
    await this.sync();
  }
  
  clearSync() {
    this.isSyncing = false;
  }
}

export default new SyncManager();