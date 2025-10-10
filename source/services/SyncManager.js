// src/services/SyncManager.js
import moment from 'moment-timezone';
import DatabaseService from './DatabaseService';
import SupabaseService from './SupabaseService';
import { SYNC_TABLES } from './schema';
import { AppState } from 'react-native';
import { syncConfig } from '../configs/syncConfig';
import supabase from '../utils/supabaseClient';



class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this.tableConfigs = new Map();
    this.syncListeners = new Set();
    this.appState = AppState.currentState;
    this.isInitialized = false;
    this.appStateSubscription = null;
    
    // Setup app state listener
    // this.setupAppStateListener();
  }

  setupAppStateListener() {
    // Use the new subscription API
    // this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  // Initialize sync manager after database is ready
  async init() {
    try {
      console.log('🔄 Initializing SyncManager...');
      await DatabaseService.init();
      
      // Configure all tables from syncConfig
      // this.configureTablesFromConfig();
      
      this.isInitialized = true;
      console.log('✅ SyncManager initialized');
      this.sync();
    } catch (error) {
      console.error('❌ SyncManager initialization failed:', error);
      throw error;
    }
  }

  // Configure tables from syncConfig
  configureTablesFromConfig() {
    const { tables } = syncConfig;
    Object.entries(tables).forEach(([tableName, config]) => {
      this.configureTable(tableName, config);
    });
    console.log(`✅ Configured ${Object.keys(tables).length} tables for sync`);
  }

  // Manila timezone utility methods
  getManilaTimezone() {
    return 'Asia/Manila';
  }


// Add this helper method to your SyncManager class
async checkColumnExists(tableName, columnName) {
  try {
    const tableInfo = await DatabaseService.executeQuery(`PRAGMA table_info(${tableName})`);
    return tableInfo.rows.some(col => col.name === columnName);
  } catch (error) {
    console.warn(`⚠️ Could not check column existence for ${tableName}.${columnName}:`, error);
    return false;
  }
}

  // Get current time in Manila timezone
  getCurrentManilaTime() {
    try {
      return moment().tz('Asia/Manila').toISOString();
    } catch (error) {
      console.error('❌ Error getting current Manila time:', error);
      return new Date().toISOString();
    }
  }

  // Convert any date to Manila timezone
  toManilaTime(date) {
    try {
      if (!date) return this.getCurrentManilaTime();
      return moment(date).tz('Asia/Manila').toISOString();
    } catch (error) {
      console.error('❌ Error converting to Manila time:', error, date);
      return this.getCurrentManilaTime();
    }
  }

  // Format date for display in Manila time
  formatManilaTime(date) {
    try {
      if (!date) return 'No date';
      return moment(date).tz('Asia/Manila').format('YYYY-MM-DD HH:mm:ss (Manila)');
    } catch (error) {
      console.error('❌ Error formatting Manila time:', error);
      return 'Error formatting time';
    }
  }

  // Compare dates considering Manila timezone
  compareInManilaTime(date1, date2) {
    try {
      if (!date1 || !date2) return 0;
      
      const d1 = moment(date1).tz('Asia/Manila');
      const d2 = moment(date2).tz('Asia/Manila');
      
      if (!d1.isValid() || !d2.isValid()) return 0;
      
      return d1.valueOf() - d2.valueOf();
    } catch (error) {
      console.error('❌ Error comparing dates in Manila time:', error);
      return 0;
    }
  }

  handleAppStateChange = (nextAppState) => {
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, trigger sync
      this.sync();
    }
    this.appState = nextAppState;
  };

  configureTable(tableName, config) {
    if (!this.isInitialized) {
      console.warn('⚠️ SyncManager not initialized. Table configuration will be applied after initialization.');
    }
    this.tableConfigs.set(tableName, {
      query: config.query || '',
      maxAge: config.maxAge || 720, // hours
      maxRecords: config.maxRecords || 1000,
      immediateSync: config.immediateSync !== false,
      cleanupStale: config.cleanupStale !== false,
      softDelete: config.softDelete !== false,
      incrementalSync: config.incrementalSync !== false,
      verifyBeforeDelete: config.verifyBeforeDelete !== false,
      ...config
    });
  }

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
      // Only sync if app is active
      if (this.appState === 'active') {
        this.sync();
      }
    }, syncInterval);

    console.log(`🔄 Started background sync every ${syncInterval / 1000 / 60} minutes`);

    // Initial sync
    this.sync();
  }

  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    // Remove app state listener using the new API
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  async sync() {
    if (!this.isInitialized) {
      console.error('❌ Cannot sync: SyncManager not initialized');
      return;
    }

    if (this.isSyncing || !SupabaseService.isConnected()) {
      console.log('⏸️ Sync skipped: already syncing or no connection');
      return;
    }

    this.isSyncing = true;
    this.notifySyncListeners({ type: 'sync_started' });

    try {
      console.log('🔄 Starting sync process...');
      
      await this.pushLocalChanges();
      await this.pullRemoteChanges();
      await this.cleanupStaleData();
      await this.updateLastSyncTime();
      
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

  async pushLocalChanges() {
    console.log('📤 Checking for local changes to push...');
    
    const pendingChanges = await DatabaseService.executeQuery(
      `SELECT * FROM ${SYNC_TABLES.SYNC_QUEUE} 
       WHERE status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT 100`
    );

    console.log(`📤 Found ${pendingChanges.rows.length} pending changes to push`);

    for (const change of pendingChanges.rows) {
      try {
        console.log(`📤 Processing sync item: ${change.table_name} ${change.operation} ${change.record_id}`);
        await this.processSyncItem(change);
      } catch (error) {
        console.error(`❌ Failed to process sync item ${change.id}:`, error);
        await this.markSyncItemAsFailed(change.id, error?.message);
      }
    }
  }

// In your SyncManager.js, update the processSyncItem method:

async processSyncItem(item) {
  const { table_name, operation, record_id, data } = item;
  const recordData = data ? JSON.parse(data) : null;
  // const supabase = SupabaseService.getClient();


console.log(recordData, 'RECORD DATA')
  console.log(`🔄 Processing ${operation} on ${table_name} for record ${record_id}`);

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

console.log(result, "RESULLT", item.id)

  if (result?.error) {
    throw new Error(result.error.message);
  }

  // Remove from sync queue on success
  await DatabaseService.executeQuery(
    `DELETE FROM ${SYNC_TABLES.SYNC_QUEUE} WHERE id = ?`,
    [item.id]
  );

  // FIX: Check if _status column exists before trying to update it
  try {
  
  
  
  
    // First, check if the table has _status column
      const hasStatusColumn = await this.checkColumnExists(table_name, '_status');

    // const tableInfo = await DatabaseService.executeQuery(`PRAGMA table_info(${table_name})`);
    
    // const hasStatusColumn = tableInfo.rows.some(col => col.name === '_status');
    
    if (hasStatusColumn) {
      await DatabaseService.executeQuery(
        `UPDATE ${table_name} SET _status = 'synced' WHERE id = ?`,
        [record_id]
      );
      console.log(`✅ Updated _status for ${table_name} record ${record_id}`);
    } else {
      console.log(`ℹ️ No _status column in ${table_name}, skipping status update`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not update _status for ${table_name}:`, error?.message);
    // Don't throw error here - the main sync operation was successful
  }

  console.log(`✅ Successfully ${operation.toLowerCase()}ed record ${record_id} in ${table_name}`);
} 

  async markSyncItemAsFailed(id, errorMessage = 'Unknown error') {
    await DatabaseService.executeQuery(
      `UPDATE ${SYNC_TABLES.SYNC_QUEUE} 
       SET status = 'failed', attempted_at = ?, error_message = ?
       WHERE id = ?`,
      [Date.now(), errorMessage, id]
    );
    console.log(`❌ Marked sync item ${id} as failed: ${errorMessage}`);
  }

  // FIXED REMOTE DATA PULLING METHODS
  async pullRemoteChanges() {
    const lastSyncTime = await this.getLastSyncTime();
    console.log(`📥 Last sync was at: ${this.formatManilaTime(lastSyncTime)}`);
    
    for (const [tableName, config] of this.tableConfigs) {
      try {
        console.log(`\n📥 Processing table: ${tableName}`);
        await this.pullTableChanges(tableName, lastSyncTime, config);
      } catch (error) {
        console.error(`❌ Failed to pull changes for ${tableName}:`, error);
        // Continue with other tables even if one fails
      }
    }
  }

  async pullTableChanges(tableName, lastSyncTime, config) {
    const supabase = SupabaseService.getClient();
    
    if (config.incrementalSync === false || lastSyncTime === 0) {
      // Full sync - pull all records matching query
      await this.pullAllTableRecords(tableName, config);
    } else {
      // Incremental sync - pull only records updated since last sync
      await this.pullIncrementalTableChanges(tableName, lastSyncTime, config);
    }
  }

  async pullAllTableRecords(tableName, config) {
    console.log(`🔄 Performing FULL sync for ${tableName}`);
    
    const supabase = SupabaseService.getClient();
    
    let query = supabase
      .from(tableName)
      .select('*')
      .order('updated_at', { ascending: false });

    // Apply table-specific query scope
    if (config.query) {
      try {
        query = this.applySupabaseQueryFilter(query, config.query);
      } catch (error) {
        console.error(`Error applying query for ${tableName}:`, error);
      }
    }

    if (config.maxRecords) {
      query = query.limit(config.maxRecords);
    }

    const { data: allRemoteRecords, error } = await query;

    if (error) {
      console.error(`❌ Error pulling all records for ${tableName}:`, error);
      return;
    }

    if (allRemoteRecords && allRemoteRecords.length > 0) {
      console.log(`📥 Found ${allRemoteRecords.length} remote records for ${tableName}`);
      
      // Use batch processing for better performance
      await this.processRemoteRecords(tableName, allRemoteRecords);

      // Store ALL remote IDs for safe cleanup
      const remoteIds = allRemoteRecords.map(record => record.id);
      await this.storeAllRemoteRecordIds(tableName, remoteIds);
    } else {
      console.log(`📭 No remote records found for ${tableName}`);
      // Store empty array to indicate no remote records
      await this.storeAllRemoteRecordIds(tableName, []);
    }
  }

  async pullIncrementalTableChanges(tableName, lastSyncTime, config) {
    console.log(`🔄 Performing INCREMENTAL sync for ${tableName}`);
    console.log(`   📅 Since: ${this.formatManilaTime(lastSyncTime)}`);
    
    const supabase = SupabaseService.getClient();
    
    // Get records updated since last sync
    const lastSyncDate = new Date(lastSyncTime).toISOString();
    
    let updatedQuery = supabase
      .from(tableName)
      .select('*')
      .gte('updated_at', lastSyncDate)
      .order('updated_at', { ascending: false });

    // Apply table-specific query scope
    if (config.query) {
      try {
        updatedQuery = this.applySupabaseQueryFilter(updatedQuery, config.query);
      } catch (error) {
        console.error(`Error applying query for ${tableName}:`, error);
      }
    }

    if (config.maxRecords) {
      updatedQuery = updatedQuery.limit(config.maxRecords);
    }

    const { data: updatedRecords, error: updatedError } = await updatedQuery;

    if (updatedError) {
      console.error(`❌ Error pulling updated records for ${tableName}:`, updatedError);
      return;
    }

    if (updatedRecords && updatedRecords.length > 0) {
      console.log(`📥 Found ${updatedRecords.length} updated records for ${tableName}`);
      
      // Process updated records
      await this.processRemoteRecords(tableName, updatedRecords);

      // Update the stored remote IDs with the ones we just processed
      const remoteIds = updatedRecords.map(record => record.id);
      await this.updateRemoteRecordIds(tableName, remoteIds);
    } else {
      console.log(`✅ No updated records found for ${tableName}`);
    }
  }

  // NEW METHOD: Process remote records efficiently
  async processRemoteRecords(tableName, remoteRecords) {
    if (!remoteRecords || remoteRecords.length === 0) return;

    console.log(`🔄 Processing ${remoteRecords.length} remote records for ${tableName}`);
    
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // Process in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < remoteRecords.length; i += batchSize) {
      const batch = remoteRecords.slice(i, i + batchSize);
      
      for (const record of batch) {
        try {
          const result = await this.upsertLocalRecord(tableName, record);
          if (result === 'inserted') inserted++;
          else if (result === 'updated') updated++;
          else skipped++;
        } catch (error) {
          console.error(`❌ Error processing record ${record.id} in ${tableName}:`, error);
        }
      }
      
      console.log(`   ✅ Processed batch ${Math.floor(i/batchSize) + 1}: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
    }

    console.log(`✅ Completed processing ${tableName}: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);
  }

  // NEW METHOD: Upsert individual record with proper conflict resolution
  async upsertLocalRecord(tableName, remoteRecord) {
    if (!remoteRecord || !remoteRecord.id) {
      console.warn('⚠️ Invalid remote record:', remoteRecord);
      return 'skipped';
    }

    // Check if record exists locally
    const existingResult = await DatabaseService.executeQuery(
      `SELECT id, updated_at FROM ${tableName} WHERE id = ?`,
      [remoteRecord.id]
    );

    const existsLocally = existingResult.rows.length > 0;

    if (!existsLocally) {
      // Insert new record
      await this.insertLocalRecord(tableName, remoteRecord);
      return 'inserted';
    } else {
      // Update existing record if remote is newer
      const localUpdated = existingResult.rows[0].updated_at;
      const remoteUpdated = remoteRecord.updated_at;

      // Compare timestamps (using direct comparison for reliability)
      const localTime = new Date(localUpdated).getTime();
      const remoteTime = new Date(remoteUpdated).getTime();

      if (remoteTime > localTime) {
        // Remote is newer - update
        await this.updateLocalRecord(tableName, remoteRecord);
        return 'updated';
      } else {
        // Local is newer or same - skip
        return 'skipped';
      }
    }
  }

  async updateLocalRecord(tableName, record) {
    try {
      // Get table schema to know which columns exist
      const tableInfo = await DatabaseService.executeQuery(`PRAGMA table_info(${tableName})`);
      const existingColumns = tableInfo.rows.map(col => col.name);
      
      // Filter columns to only those that exist in the table and are not sync metadata
      const columns = Object.keys(record).filter(col => 
        existingColumns.includes(col) && 
        !['_status', '_version'].includes(col) && 
        record[col] !== undefined
      );
      
      if (columns.length === 0) {
        console.warn(`⚠️ No valid columns to update for record ${record.id} in ${tableName}`);
        return;
      }

      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = columns.map(col => {
        const value = record[col];
        // Handle different value types
        if (value === null) return null;
        if (typeof value === 'object') return JSON.stringify(value);
        return value;
      });

      await DatabaseService.executeQuery(
        `UPDATE ${tableName} 
         SET ${setClause} 
         WHERE id = ?`,
        [...values, record.id]
      );
    } catch (error) {
      console.error(`❌ Error updating local record ${record.id} in ${tableName}:`, error);
      throw error;
    }
  }

  async insertLocalRecord(tableName, record) {
    try {
      // Get table schema to know which columns exist
      const tableInfo = await DatabaseService.executeQuery(`PRAGMA table_info(${tableName})`);
      const existingColumns = tableInfo.rows.map(col => col.name);
      
      // Filter columns to only those that exist in the table and are not sync metadata
      const columns = Object.keys(record).filter(col => 
        existingColumns.includes(col) && 
        !['_status', '_version'].includes(col) && 
        record[col] !== undefined
      );
      
      if (columns.length === 0) {
        console.warn(`⚠️ No valid columns to insert for record ${record.id} in ${tableName}`);
        return;
      }

      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => {
        const value = record[col];
        // Handle different value types
        if (value === null) return null;
        if (typeof value === 'object') return JSON.stringify(value);
        return value;
      });

console.log(placeholders, values, 'INSERT RECORDD')

      await DatabaseService.executeQuery(
        `INSERT INTO ${tableName} (${columns.join(', ')}) 
         VALUES (${placeholders})`,
        values
      );
    } catch (error) {
      console.error(`❌ Error inserting local record ${record.id} in ${tableName}:`, error);
      throw error;
    }
  }

  async updateRemoteRecordIds(tableName, newRemoteIds) {
    try {
      // Get existing remote IDs
      const existingIds = await this.getAllRemoteRecordIds(tableName) || [];
      
      // Merge with new IDs (remove duplicates)
      const mergedIds = [...new Set([...existingIds, ...newRemoteIds])];
      
      const now = Date.now();
      const key = `all_remote_${tableName}_ids`;
      
      await DatabaseService.executeQuery(
        `INSERT OR REPLACE INTO ${SYNC_TABLES.SYNC_METADATA} 
         (key, value, updated_at) VALUES (?, ?, ?)`,
        [key, JSON.stringify({ ids: mergedIds, timestamp: now }), now]
      );
      
      console.log(`💾 Updated remote ID cache for ${tableName}: ${mergedIds.length} total IDs`);
    } catch (error) {
      console.error(`Error updating remote IDs for ${tableName}:`, error);
    }
  }

  // Helper method to apply Supabase query filters
  applySupabaseQueryFilter(query, queryString) {
    if (!queryString) return query;
    
    // Simple query parser for common patterns
    const conditions = queryString.split(' AND ');
    
    for (const condition of conditions) {
      const trimmed = condition.trim();
      
      if (trimmed.includes('=')) {
        const [field, value] = trimmed.split('=').map(part => part.trim());
        const cleanValue = this.cleanValue(value);
        query = query.eq(field, cleanValue);
      } else if (trimmed.includes('>')) {
        const [field, value] = trimmed.split('>').map(part => part.trim());
        const cleanValue = this.cleanValue(value);
        query = query.gt(field, cleanValue);
      } else if (trimmed.includes('<')) {
        const [field, value] = trimmed.split('<').map(part => part.trim());
        const cleanValue = this.cleanValue(value);
        query = query.lt(field, cleanValue);
      } else if (trimmed.includes('!=')) {
        const [field, value] = trimmed.split('!=').map(part => part.trim());
        const cleanValue = this.cleanValue(value);
        query = query.neq(field, cleanValue);
      } else if (trimmed.includes(' LIKE ')) {
        const [field, value] = trimmed.split(' LIKE ').map(part => part.trim());
        const cleanValue = this.cleanValue(value);
        query = query.like(field, cleanValue);
      }
    }
    
    return query;
  }

  cleanValue(value) {
    // Remove quotes and handle boolean values
    let clean = value.replace(/'/g, '').replace(/"/g, '');
    
    // Handle boolean values
    if (clean === 'true') return true;
    if (clean === 'false') return false;
    
    // Handle numeric values
    if (!isNaN(clean) && clean !== '') return Number(clean);
    
    return clean;
  }

  async storeAllRemoteRecordIds(tableName, remoteIds) {
    try {
      const now = Date.now();
      const key = `all_remote_${tableName}_ids`;
      
      await DatabaseService.executeQuery(
        `INSERT OR REPLACE INTO ${SYNC_TABLES.SYNC_METADATA} 
         (key, value, updated_at) VALUES (?, ?, ?)`,
        [key, JSON.stringify({ ids: remoteIds, timestamp: now }), now]
      );
    } catch (error) {
      console.error(`Error storing all remote IDs for ${tableName}:`, error);
    }
  }

  async getAllRemoteRecordIds(tableName) {
    try {
      const result = await DatabaseService.executeQuery(
        `SELECT value FROM ${SYNC_TABLES.SYNC_METADATA} 
         WHERE key = ?`,
        [`all_remote_${tableName}_ids`]
      );
      
      if (result.rows.length > 0) {
        const data = JSON.parse(result.rows[0].value);
        // Only return IDs from the last 7 days to ensure data freshness but allow some history
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (data.timestamp > sevenDaysAgo) {
          return data.ids || [];
        }
      }
    } catch (error) {
      console.error(`Error getting all remote IDs for ${tableName}:`, error);
    }
    return null; // Return null to indicate no recent sync data
  }

  // KEEP ALL OTHER EXISTING METHODS EXACTLY AS THEY WERE
  async cleanupStaleData() {
    if (!this.isInitialized) {
      return;
    }

    console.log('🧹 Starting stale data cleanup process...');
    
    for (const [tableName, config] of this.tableConfigs) {
      if (config.cleanupStale !== false) {
        await this.cleanupTableStaleData(tableName, config);
      }
    }

    // Regular cleanup of old data
    await this.cleanupOldData();
  }

  async cleanupTableStaleData(tableName, config) {
    try {
      console.log(`🔍 Checking for stale data in ${tableName}...`);
      
      // Get ALL IDs that exist in the remote database (from accumulated syncs)
      const allRemoteIds = await this.getAllRemoteRecordIds(tableName);
      
      if (allRemoteIds === null) {
        console.log(`⚠️ No recent sync data found for ${tableName}, skipping stale cleanup`);
        return;
      }

      // Get all local IDs for this table
      const localRecords = await DatabaseService.executeQuery(
        `SELECT id FROM ${tableName}`
      );
      const localIds = localRecords.rows.map(record => record.id);
      
      console.log(`📊 Stale data check for ${tableName}:`);
      console.log(`   📍 Local records: ${localIds.length}`);
      console.log(`   🌐 Known remote records: ${allRemoteIds.length}`);
      
      // Find IDs that exist locally but don't exist in our remote ID cache
      const potentialStaleIds = localIds.filter(id => !allRemoteIds.includes(id));
      
      console.log(`🔍 Found ${potentialStaleIds.length} potentially stale records in ${tableName}`);

      if (potentialStaleIds.length > 0) {
        // Verify with remote before deleting
        await this.verifyAndCleanStaleRecords(tableName, potentialStaleIds, config);
      } else {
        console.log(`✅ No stale data found in ${tableName}`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning up stale data in ${tableName}:`, error);
    }
  }

  async verifyAndCleanStaleRecords(tableName, potentialStaleIds, config) {
    console.log(`🔎 Verifying ${potentialStaleIds.length} potentially stale records with remote...`);
    
    const supabase = SupabaseService.getClient();
    
    // Check remote existence in batches to avoid request limits
    const batchSize = 50;
    let actuallyStaleIds = [];
    let verifiedCount = 0;

    for (let i = 0; i < potentialStaleIds.length; i += batchSize) {
      const batch = potentialStaleIds.slice(i, i + batchSize);
      
      try {
        // Check if these records still exist remotely
        const { data: remoteRecords, error } = await supabase
          .from(tableName)
          .select('id, is_deleted')
          .in('id', batch);

        if (error) {
          console.error(`❌ Error verifying remote existence for batch:`, error);
          continue;
        }

        const remoteExistingIds = new Set(remoteRecords?.map(record => record.id) || []);
        const remoteDeletedIds = new Set(
          remoteRecords
            ?.filter(record => record.is_deleted === true)
            .map(record => record.id) || []
        );

        // Records are actually stale if:
        // 1. They don't exist in remote at all, OR
        // 2. They exist but are marked as deleted (is_deleted = true)
        const batchStaleIds = batch.filter(id => 
          !remoteExistingIds.has(id) || remoteDeletedIds.has(id)
        );

        actuallyStaleIds = [...actuallyStaleIds, ...batchStaleIds];
        verifiedCount += batch.length;

        console.log(`   ✅ Verified batch ${Math.floor(i/batchSize) + 1}: ${batchStaleIds.length}/${batch.length} actually stale`);
        
      } catch (error) {
        console.error(`❌ Error processing verification batch:`, error);
      }
    }

    console.log(`📊 Stale verification completed for ${tableName}:`);
    console.log(`   🔍 Checked: ${verifiedCount} records`);
    console.log(`   🗑️ Actually stale: ${actuallyStaleIds.length} records`);
    console.log(`   ✅ Still valid: ${potentialStaleIds.length - actuallyStaleIds.length} records`);

    if (actuallyStaleIds.length > 0) {
      console.log(`🗑️ Removing ${actuallyStaleIds.length} verified stale records from ${tableName}`);
      
      const tableConfig = this.tableConfigs.get(tableName);
      
      if (tableConfig?.softDelete !== false) {
        // Soft delete - mark as deleted instead of removing
        await this.softDeleteRecords(tableName, actuallyStaleIds);
      } else {
        // Hard delete - remove records completely
        await this.hardDeleteRecords(tableName, actuallyStaleIds);
      }
      
      console.log(`✅ Completed verified stale data cleanup for ${tableName}`);
    } else {
      console.log(`✅ No verified stale records to remove from ${tableName}`);
    }
  }

  async softDeleteRecords(tableName, recordIds) {
    // Check if table has is_deleted column
    const tableInfo = await DatabaseService.executeQuery(`PRAGMA table_info(${tableName})`);
    const hasIsDeleted = tableInfo.rows.some(col => col.name === 'is_deleted');

    if (hasIsDeleted) {
      // Use soft delete with Manila time
      const batchSize = 50;
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batch = recordIds.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        
        await DatabaseService.executeQuery(
          `UPDATE ${tableName} SET is_deleted = 1, updated_at = ? WHERE id IN (${placeholders})`,
          [this.getCurrentManilaTime(), ...batch]
        );
        
        console.log(`🔒 Soft deleted batch of ${batch.length} records from ${tableName}`);
      }
    } else {
      // Fall back to hard delete if no is_deleted column
      console.log(`⚠️ No is_deleted column in ${tableName}, using hard delete`);
      await this.hardDeleteRecords(tableName, recordIds);
    }
  }

  async hardDeleteRecords(tableName, recordIds) {
    const batchSize = 50;
    for (let i = 0; i < recordIds.length; i += batchSize) {
      const batch = recordIds.slice(i, i + batchSize);
      const placeholders = batch.map(() => '?').join(',');
      
      await DatabaseService.executeQuery(
        `DELETE FROM ${tableName} WHERE id IN (${placeholders})`,
        batch
      );
      
      console.log(`🗑️ Hard deleted batch of ${batch.length} records from ${tableName}`);
    }
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
    console.log(`💾 Updated last sync time: ${this.formatManilaTime(now)}`);
  }

async queueChange(tableName, operation, recordId, data = null) {
  if (!this.isInitialized) {
    throw new Error('SyncManager not initialized');
  }

  const syncId = `${tableName}_${recordId}_${Date.now()}`;
  const now = Date.now();
  const manilaTime = new Date().toISOString();
  
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

  // FIX: Check if _status column exists before trying to update it
  try {
    const tableInfo = await DatabaseService.executeQuery(`PRAGMA table_info(${tableName})`);
    const hasStatusColumn = tableInfo.rows.some(col => col.name === '_status');
    
    if (hasStatusColumn) {
      await DatabaseService.executeQuery(
        `UPDATE ${tableName} SET _status = 'pending', updated_at = ? WHERE id = ?`,
        [manilaTime, recordId]
      );
    } else {
      // Update just the updated_at if _status doesn't exist
      await DatabaseService.executeQuery(
        `UPDATE ${tableName} SET updated_at = ? WHERE id = ?`,
        [manilaTime, recordId]
      );
    }
  } catch (error) {
    console.warn(`⚠️ Could not update record status for ${tableName}:`, error?.message);
    // Fallback to just updating updated_at
    await DatabaseService.executeQuery(
      `UPDATE ${tableName} SET updated_at = ? WHERE id = ?`,
      [manilaTime, recordId]
    );
  }

  console.log(`📝 Queued ${operation} for ${tableName} record ${recordId} at ${this.formatManilaTime(now)}`);

  // Immediate sync if online and configured for immediate sync
  const tableConfig = this.tableConfigs.get(tableName);
  if (SupabaseService.isConnected() && tableConfig?.immediateSync !== false) {
    this.sync();
  }
}

 async cleanupOldData() {
  if (!this.isInitialized) {
    throw new Error('SyncManager not initialized');
  }

  console.log('🧹 Cleaning up old data...');
  
  for (const [tableName, config] of this.tableConfigs) {
    if (config.maxAge) {
      const cutoffTime = Date.now() - (config.maxAge * 60 * 60 * 1000);
      const cutoffDate = new Date(cutoffTime).toISOString();
      
      try {
        // FIX: Check if _status column exists
        const tableInfo = await DatabaseService.executeQuery(`PRAGMA table_info(${tableName})`);
        const hasStatusColumn = tableInfo.rows.some(col => col.name === '_status');
        
        let result;
        if (hasStatusColumn) {
          result = await DatabaseService.executeQuery(
            `DELETE FROM ${tableName} 
             WHERE created_at < ? AND _status = 'synced'`,
            [cutoffDate]
          );
        } else {
          result = await DatabaseService.executeQuery(
            `DELETE FROM ${tableName} WHERE created_at < ?`,
            [cutoffDate]
          );
        }
        
        console.log(`✅ Cleaned up ${result.rowsAffected} old records from ${tableName}`);
      } catch (error) {
        console.warn(`⚠️ Could not cleanup ${tableName}:`, error.message);
        // Try without any conditions as last resort
        const result = await DatabaseService.executeQuery(
          `DELETE FROM ${tableName} WHERE created_at < ?`,
          [cutoffDate]
        );
        console.log(`✅ Cleaned up ${result.rowsAffected} old records from ${tableName} (fallback)`);
      }
    }
  }

  // Cleanup failed sync items older than 7 days
  const failedCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const result = await DatabaseService.executeQuery(
    `DELETE FROM ${SYNC_TABLES.SYNC_QUEUE} 
     WHERE status = 'failed' AND attempted_at < ?`,
    [failedCutoff]
  );
  console.log(`✅ Cleaned up ${result.rowsAffected} failed sync items`);
}

  async getSyncStatus() {
    if (!this.isInitialized) {
      return {
        pending: 0,
        failed: 0,
        lastSync: null,
        isSyncing: false
      };
    }

    const pendingCount = await DatabaseService.executeQuery(
      `SELECT COUNT(*) as count FROM ${SYNC_TABLES.SYNC_QUEUE} WHERE status = 'pending'`
    );
    
    const failedCount = await DatabaseService.executeQuery(
      `SELECT COUNT(*) as count FROM ${SYNC_TABLES.SYNC_QUEUE} WHERE status = 'failed'`
    );

    const lastSync = await this.getLastSyncTime();

    return {
      pending: pendingCount.rows[0]?.count || 0,
      failed: failedCount.rows[0]?.count || 0,
      lastSync: lastSync ? new Date(lastSync) : null,
      isSyncing: this.isSyncing
    };
  }

  // Force full sync for all tables
  async forceFullSync() {
    if (!this.isInitialized) {
      throw new Error('SyncManager not initialized');
    }

    console.log('🔄 Forcing full sync for all tables...');
    
    // Reset last sync time to force full sync
    await DatabaseService.executeQuery(
      `DELETE FROM ${SYNC_TABLES.SYNC_METADATA} WHERE key = 'last_sync_time'`
    );
    
    // Trigger sync
    await this.sync();
  }
}

export default new SyncManager();