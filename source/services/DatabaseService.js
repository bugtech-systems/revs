// src/database/DatabaseService.js
import SQLite from 'react-native-sqlite-storage';
import { INITIAL_SCHEMA } from './schema.js';

// Error types for better error handling
export const DATABASE_ERRORS = {
  NOT_INITIALIZED: 'DATABASE_NOT_INITIALIZED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  QUERY_EXECUTION_FAILED: 'QUERY_EXECUTION_FAILED',
  SCHEMA_INITIALIZATION_FAILED: 'SCHEMA_INITIALIZATION_FAILED',
  DATABASE_OPEN_FAILED: 'DATABASE_OPEN_FAILED',
  BATCH_OPERATION_FAILED: 'BATCH_OPERATION_FAILED',
  CONNECTION_CLOSED: 'CONNECTION_CLOSED'
};

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.isInitializing = false;
    this.transactionInProgress = false;
    this.initPromise = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.initializationCallbacks = [];
    
    // Initialize with error handling
    this.init().catch(error => {
      console.error('❌ DatabaseService initialization failed:', error);
    });
  }

  async init() {
    // Return the same promise if initialization is already in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        await this.openDatabase();
        await this.initializeSchema();
        this.isInitialized = true;
        this.isInitializing = false;
        console.log('✅ DatabaseService initialized successfully');
        
        // Notify all waiting callbacks
        this.initializationCallbacks.forEach(callback => callback(null));
        this.initializationCallbacks = [];
        
        resolve();
      } catch (error) {
        this.isInitializing = false;
        this.initPromise = null;
        
        // Notify all waiting callbacks about the error
        this.initializationCallbacks.forEach(callback => callback(error));
        this.initializationCallbacks = [];
        
        console.error('❌ DatabaseService initialization failed:', error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      try {
        this.db = SQLite.openDatabase(
          {
            name: 'lgm2.db',
            location: 'default',
          },
          () => {
            console.log('✅ Database opened successfully');
            resolve();
          },
          error => {
            console.error('❌ Database opening error:', error);
            const dbError = new Error(`Failed to open database: ${error.message}`);
            dbError.code = DATABASE_ERRORS.DATABASE_OPEN_FAILED;
            dbError.originalError = error;
            reject(dbError);
          }
        );
      } catch (error) {
        const dbError = new Error(`Database open exception: ${error.message}`);
        dbError.code = DATABASE_ERRORS.DATABASE_OPEN_FAILED;
        dbError.originalError = error;
        reject(dbError);
      }
    });
  }

  async initializeSchema() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        const error = new Error('Database connection not available');
        error.code = DATABASE_ERRORS.SCHEMA_INITIALIZATION_FAILED;
        reject(error);
        return;
      }

      this.db.transaction(
        tx => {
          const statements = INITIAL_SCHEMA.split(';').filter(stmt => stmt.trim());
          
          let completed = 0;
          let hasError = false;

          statements.forEach((statement) => {
            if (hasError) return;

            const sql = statement.trim();
            if (!sql) {
              completed++;
              if (completed === statements.length && !hasError) {
                resolve();
              }
              return;
            }

            tx.executeSql(
              sql + ';',
              [],
              () => {
                completed++;
                if (completed === statements.length && !hasError) {
                  console.log('✅ Database schema initialized successfully');
                  resolve();
                }
              },
              (tx, error) => {
                console.error('❌ Schema initialization error:', error, 'SQL:', sql);
                hasError = true;
                
                // Check if it's a "table already exists" error which we can ignore
                if (error.message && error.message.includes('already exists')) {
                  console.log('ℹ️ Table already exists, continuing...');
                  completed++;
                  if (completed === statements.length && !hasError) {
                    resolve();
                  }
                  return false; // Don't rollback transaction
                }
                
                const schemaError = new Error(`Schema initialization failed: ${error.message}`);
                schemaError.code = DATABASE_ERRORS.SCHEMA_INITIALIZATION_FAILED;
                schemaError.originalError = error;
                schemaError.failedStatement = sql;
                reject(schemaError);
                return true; // Rollback transaction
              }
            );
          });
        },
        error => {
          console.error('❌ Schema transaction error:', error);
          const schemaError = new Error(`Schema transaction failed: ${error.message}`);
          schemaError.code = DATABASE_ERRORS.SCHEMA_INITIALIZATION_FAILED;
          schemaError.originalError = error;
          reject(schemaError);
        }
      );
    });
  }

  async waitForInitialization() {
    if (this.isInitialized) {
      return Promise.resolve();
    }
    
    if (this.isInitializing) {
      return new Promise((resolve, reject) => {
        this.initializationCallbacks.push((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
    
    // If not initializing, start initialization
    return this.init();
  }

  async executeQuery(sql, params = [], options = {}) {
    const { 
      retryOnFailure = true, 
      maxRetries = this.maxRetries,
      timeout = 30000 
    } = options;

    try {
      await this.waitForInitialization();
    } catch (error) {
      throw this.createDatabaseError(
        DATABASE_ERRORS.NOT_INITIALIZED,
        'Database not initialized',
        error
      );
    }

    if (!this.db) {
      throw this.createDatabaseError(
        DATABASE_ERRORS.NOT_INITIALIZED,
        'Database connection not available'
      );
    }

    const executeWithRetry = async (attempt = 1) => {
      return new Promise((resolve, reject) => {
        // Set timeout for query execution
        const timeoutId = setTimeout(() => {
          const timeoutError = this.createDatabaseError(
            DATABASE_ERRORS.QUERY_EXECUTION_FAILED,
            `Query execution timeout after ${timeout}ms`
          );
          reject(timeoutError);
        }, timeout);

        this.db.transaction(
          tx => {
            tx.executeSql(
              sql,
              params.map(param => this.sanitizeValue(param)),
              (tx, results) => {
                clearTimeout(timeoutId);
                try {
                  const rows = [];
                  for (let i = 0; i < results.rows.length; i++) {
                    rows.push(results.rows.item(i));
                  }
                  
                  const result = { 
                    rows, 
                    rowsAffected: results.rowsAffected, 
                    insertId: results.insertId 
                  };
                  
                  resolve(result);
                } catch (parseError) {
                  reject(this.createDatabaseError(
                    DATABASE_ERRORS.QUERY_EXECUTION_FAILED,
                    'Failed to parse query results',
                    parseError
                  ));
                }
              },
              (tx, error) => {
                clearTimeout(timeoutId);
                console.error('❌ SQL Error:', error, 'SQL:', sql, 'Params:', params);
                
                const dbError = this.createDatabaseError(
                  DATABASE_ERRORS.QUERY_EXECUTION_FAILED,
                  `Query execution failed: ${error.message}`,
                  error
                );
                dbError.sql = sql;
                dbError.params = params;

                // Retry logic for certain types of errors
                if (retryOnFailure && attempt < maxRetries && this.shouldRetry(error)) {
                  console.log(`🔄 Retrying query (attempt ${attempt + 1}/${maxRetries})...`);
                  setTimeout(() => {
                    executeWithRetry(attempt + 1).then(resolve).catch(reject);
                  }, Math.pow(2, attempt) * 1000); // Exponential backoff
                } else {
                  reject(dbError);
                }
                
                return true; // Rollback transaction
              }
            );
          },
          error => {
            clearTimeout(timeoutId);
            const transactionError = this.createDatabaseError(
              DATABASE_ERRORS.TRANSACTION_FAILED,
              `Transaction failed: ${error.message}`,
              error
            );
            reject(transactionError);
          }
        );
      });
    };

    return executeWithRetry();
  }

  shouldRetry(error) {
    // Retry on these SQLite error codes/messages
    const retryableErrors = [
      'database is locked',
      'no such table', // Sometimes table might not be ready
      'timeout',
      'busy'
    ];
    
    return retryableErrors.some(retryableError => 
      error.message?.toLowerCase().includes(retryableError)
    );
  }

  async executeBatch(operations, options = {}) {
    const { stopOnFailure = true, timeout = 60000 } = options;

    try {
      await this.waitForInitialization();
    } catch (error) {
      throw this.createDatabaseError(
        DATABASE_ERRORS.NOT_INITIALIZED,
        'Database not initialized',
        error
      );
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const timeoutError = this.createDatabaseError(
          DATABASE_ERRORS.BATCH_OPERATION_FAILED,
          `Batch operation timeout after ${timeout}ms`
        );
        reject(timeoutError);
      }, timeout);

      this.db.transaction(
        tx => {
          let completed = 0;
          let hasError = false;

          operations.forEach(({ sql, params }, index) => {
            if (hasError && stopOnFailure) return;

            tx.executeSql(
              sql,
              params ? params.map(param => this.sanitizeValue(param)) : [],
              () => {
                completed++;
                if (completed === operations.length && !hasError) {
                  clearTimeout(timeoutId);
                  resolve({ 
                    success: true, 
                    operationsCompleted: completed 
                  });
                }
              },
              (tx, error) => {
                clearTimeout(timeoutId);
                hasError = true;
                
                const batchError = this.createDatabaseError(
                  DATABASE_ERRORS.BATCH_OPERATION_FAILED,
                  `Batch operation failed at operation ${index + 1}: ${error.message}`,
                  error
                );
                batchError.failedOperation = { sql, params, index };
                batchError.completedOperations = completed;
                
                reject(batchError);
                return true; // Rollback transaction
              }
            );
          });
        },
        error => {
          clearTimeout(timeoutId);
          const transactionError = this.createDatabaseError(
            DATABASE_ERRORS.TRANSACTION_FAILED,
            `Batch transaction failed: ${error.message}`,
            error
          );
          reject(transactionError);
        },
        () => {
          // Success callback - only called if all operations succeed
          clearTimeout(timeoutId);
          if (!operations.length) {
            resolve({ success: true, operationsCompleted: 0 });
          }
        }
      );
    });
  }

  createDatabaseError(code, message, originalError = null) {
    const error = new Error(message);
    error.code = code;
    error.timestamp = new Date().toISOString();
    
    if (originalError) {
      error.originalError = originalError;
      error.stack = `${error.stack}\nCaused by: ${originalError.stack}`;
    }
    
    return error;
  }

  async testConnection() {
    try {
      await this.waitForInitialization();
      const result = await this.executeQuery('SELECT 1 as test', [], { 
        retryOnFailure: false,
        timeout: 5000 
      });
      return result.rows.length > 0 && result.rows[0].test === 1;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close(
          () => {
            console.log('✅ Database closed successfully');
            this.isInitialized = false;
            this.db = null;
            resolve();
          },
          error => {
            console.error('❌ Database close error:', error);
            this.isInitialized = false;
            this.db = null;
            resolve(); // Resolve anyway since we're closing
          }
        );
      } else {
        resolve();
      }
    });
  }

  async reset() {
    try {
      await this.close();
      this.isInitialized = false;
      this.initPromise = null;
      await this.init();
      return true;
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      return false;
    }
  }

  // Helper to convert JavaScript values to SQLite compatible values
  sanitizeValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    if (typeof value === 'number' && !isFinite(value)) {
      return null; // Handle NaN, Infinity
    }
    return value;
  }

  // Helper to parse SQLite values back to JavaScript
  parseValue(value, type) {
    if (value === null || value === undefined) {
      return null;
    }
    if (type === 'json' && typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    if (type === 'boolean') {
      return Boolean(value);
    }
    return value;
  }

  // Get database status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      hasConnection: !!this.db,
      retryCount: this.retryCount
    };
  }
}

// Create and export singleton instance
const databaseService = new DatabaseService();
export default databaseService;