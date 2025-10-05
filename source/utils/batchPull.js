// src/sync/batchedPull.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from './supabaseClient';
import { 
  TABLES, 
  LAST_PULLED_KEY, 
  BATCH_SIZE,
  getAllLocalIds,
  localGet,
  insertOrReplace,
  runSql,
  normalizeForSQLite,
  nowISO
} from './offlineSync';

// Batched fetch from Supabase with pagination
const fetchBatchedData = async (tableName, lastPulledAt, batchSize = BATCH_SIZE) => {
  let allData = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(tableName)
      .select('*')
      .range(page * batchSize, (page + 1) * batchSize - 1)
      .order('updated_at', { ascending: true });

    // Only get records updated since last pull
    if (lastPulledAt) {
      query = query.gte('updated_at', lastPulledAt);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Supabase fetch error for ${tableName}: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      hasMore = data.length === batchSize;
      page++;
      
      console.log(`Fetched batch ${page} for ${tableName}: ${data.length} records`);
    } else {
      hasMore = false;
    }

    // Optional: Add small delay to avoid rate limiting
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return allData;
};

// Process batch of records for a table
const processBatch = async (tableName, remoteData, localIds) => {
  const remoteIds = new Set();
  let inserted = 0;
  let updated = 0;
  let deleted = 0;

  // Process each remote record
  for (const remoteRow of remoteData) {
    remoteIds.add(remoteRow.id);

    // Handle deleted records
    if (remoteRow.is_deleted) {
      await runSql(`DELETE FROM ${tableName} WHERE id = ?`, [remoteRow.id]);
      deleted++;
      continue;
    }

    // Check if record exists locally and compare timestamps
    const local = await localGet(tableName, remoteRow.id);
    const remoteUpdatedAt = remoteRow.updated_at || nowISO();
    const localUpdatedAt = local ? local.updated_at || null : null;

    if (!local) {
      // New record - insert
      const toInsert = normalizeForSQLite(tableName, remoteRow);
      await insertOrReplace(tableName, toInsert);
      inserted++;
    } else if (!localUpdatedAt || remoteUpdatedAt > localUpdatedAt) {
      // Updated record - replace
      const toInsert = normalizeForSQLite(tableName, remoteRow);
      await insertOrReplace(tableName, toInsert);
      updated++;
    }
    // Else: local is newer or same, keep local version
  }

  // Remove local records not present in Supabase
      for (const localId of localIds) {
        if (!remoteIds.has(localId)) {
          // double check Supabase directly by ID
            const { data: checkRows, error: checkError } = await supabase
            .from(tableName)
            .select("id")
            .eq("id", localId);
    
          if (checkError) {
            console.warn(`Supabase check failed for ${tableName}:${localId}`, checkError);
            continue; // skip if Supabase lookup failed
          }
    
          const checkRow = checkRows && checkRows.length > 0 ? checkRows[0] : null;
          console.log("CHECK ROW", localId, checkRow);
    
          // Row not in Supabase OR explicitly deleted → remove locally
          if (!checkRow ) {
            console.log(`Removing orphaned row from ${tableName}: ${localId}`);
            await runSql(`DELETE FROM ${tableName} WHERE id = ?`, [localId]);
          }
        }
      }

  return { inserted, updated, deleted };
};

// Main batched pull function
export const pullFromSupabase = async (userId, options = {}) => {
  const {
    batchSize = BATCH_SIZE,
    onProgress = null,
    onTableStart = null,
    onTableComplete = null,
    tables = TABLES
  } = options;

  const pullResults = {
    startedAt: nowISO(),
    completedAt: null,
    tables: {},
    totalRecordsProcessed: 0
  };

  console.log(`Starting batched pull for ${tables.length} tables`);

  for (const table of tables) {
    try {
      if (onTableStart) {
        onTableStart(table);
      }

      const key = `${LAST_PULLED_KEY}:${table}`;
      const lastPulledAt = await AsyncStorage.getItem(key);
      
      console.log(`Pulling ${table}, last pulled: ${lastPulledAt || 'never'}`);

      // Step 1: Get all local IDs for conflict resolution
      const localIds = await getAllLocalIds(table);
      
      // Step 2: Fetch all remote data with batching
      const remoteData = await fetchBatchedData(table, lastPulledAt, batchSize);
      
      console.log(`Processing ${table}: ${localIds.length} local, ${remoteData.length} remote records`);

      // Step 3: Process the batch
      const batchResult = await processBatch(table, remoteData, localIds);
      
      // Step 4: Update last pulled timestamp
      await AsyncStorage.setItem(key, nowISO());

      // Store results
      pullResults.tables[table] = {
        localCount: localIds.length,
        remoteCount: remoteData.length,
        ...batchResult,
        lastPulledAt: nowISO()
      };

      pullResults.totalRecordsProcessed += remoteData.length;

      console.log(`Completed ${table}: +${batchResult.inserted} ↑${batchResult.updated} -${batchResult.deleted}`);

      if (onProgress) {
        onProgress({
          table,
          progress: (tables.indexOf(table) + 1) / tables.length,
          ...batchResult
        });
      }

      if (onTableComplete) {
        onTableComplete(table, pullResults.tables[table]);
      }

    } catch (err) {
      console.warn(`Pull error for ${table}:`, err);
      pullResults.tables[table] = {
        error: err.message,
        success: false
      };
    }
  }

  pullResults.completedAt = nowISO();
  console.log(`Batched pull completed. Processed ${pullResults.totalRecordsProcessed} records across ${tables.length} tables`);

  return pullResults;
};

// Selective table pull
export const pullTablesFromSupabase = async (tableNames, options = {}) => {
  return await pullFromSupabase(null, {
    ...options,
    tables: tableNames
  });
};

// Force full resync (ignore lastPulledAt)
export const forceFullResync = async (options = {}) => {
  // Clear all last pulled timestamps
  for (const table of TABLES) {
    const key = `${LAST_PULLED_KEY}:${table}`;
    await AsyncStorage.removeItem(key);
  }

  console.log('Starting full resync...');
  return await pullFromSupabase(null, options);
};