// src/database/DatabaseService.js
import SQLite from 'react-native-sqlite-storage';
import { INITIAL_SCHEMA } from './schema.js';
import supabase from '../utils/supabaseClient';

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.transactionInProgress = false;
    this.initPromise = null;
    
    
    
    this.init();
  }

 init() {
    // Return the same promise if initialization is already in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      this.db = SQLite.openDatabase(
        {
          name: 'leodev3.db',
          location: 'default',
        },
        () => {
          console.log('✅ Database opened successfully');
          this.initializeSchema()
            .then(() => {
              this.isInitialized = true;
              resolve();
            })
            .catch(reject);
        },
        error => {
          console.error('❌ Database opening error:', error);
          reject(error);
        }
      );
    });

    return this.initPromise;
  }

  initializeSchema() {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        const statements = INITIAL_SCHEMA.split(';').filter(stmt => stmt.trim());
        
        let completed = 0;
        statements.forEach((statement) => {
          tx.executeSql(
            statement + ';',
            [],
            () => {
              completed++;
              if (completed === statements.length) {
                resolve();
              }
            },
            (tx, error) => {
              console.error('Schema initialization error:', error);
              reject(error);
              return true;
            }
          );
        });
      });
    });
  }

  executeQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          sql,
          params,
          (tx, results) => {
            const rows = [];
            for (let i = 0; i < results.rows.length; i++) {
              rows.push(results.rows.item(i));
            }
            resolve({ 
              rows, 
              rowsAffected: results.rowsAffected, 
              insertId: results.insertId 
            });
          },
          (tx, error) => {
            console.error('SQL Error:', error, sql, params);
            reject(error);
            return true;
          }
        );
      });
    });
  }

  async executeBatch(operations) {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        tx => {
          operations.forEach(({ sql, params }) => {
            tx.executeSql(sql, params || []);
          });
        },
        error => {
          reject(error);
        },
        () => {
          resolve();
        }
      );
    });
  }
  
  async fetchUser (email) {
    // let db = await getDB();
  
  
    try {
      // Fetch main user from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
  
      if (error) throw error;
  
      let populatedUplines = [];
  
      if (data.uplines?.length) {
        // Fetch all uplines as user objects
        const { data: uplineData, error: uplineError } = await supabase
          .from('users')
          .select('*')
          .in('id', data.uplines);
  
        if (uplineError) throw uplineError;
  
        populatedUplines = uplineData || [];
      }
  
      const userWithUplines = { ...data, uplines: populatedUplines };
  
  
  
      return userWithUplines;
    } catch (err) {
      console.log('Supabase fetchUser error, falling back to local', err);
  
      // Fallback to SQLite
      return new Promise(resolve => {
        this.db.transaction(tx => {
          tx.executeSql(
            `SELECT * FROM users WHERE email = ?`,
            [email],
            async (_, { rows }) => {
              if (!rows.length) return resolve(null);
              
              const rowsArr = [];
            for (let i = 0; i < rows.length; i++) {
              rowsArr.push(rows.item(i));
            }
              
              
              console.log(rowsArr, 'ROWSSS')
              
              const user = rowsArr[0];
                // rows.push(results.rows.item());
                console.log(user.configuration, 'USSSSSE')
              // Parse uplines from JSON and fetch each locally
              if (user.uplines) {
                const uplineIds = JSON.parse(user.uplines);
                if (uplineIds.length) {
                  const placeholders = uplineIds.map(() => '?').join(',');
                  tx.executeSql(
                    `SELECT * FROM users WHERE id IN (${placeholders})`,
                    uplineIds,
                    (_, { rows: uplineRows }) => {
                    const uplinesArr = [];
                      for (let i = 0; i < uplineRows.length; i++) {
                        uplinesArr.push(uplineRows.item(i));
                      }
                      
                      user.uplines = uplinesArr;
                      console.log(user.uplines, 'UPLINES')
                      resolve(user);
                    }
                  );
                } else {
                  user.uplines = [];
                  resolve(user);
                }
              } else {
                user.uplines = [];
                resolve(user);
              }
            }
          );
        });
      });
    }
  };
  
  

  close() {
    if (this.db) {
      this.db.close();
      this.isInitialized = false;
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
      return JSON.stringify(value);
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
}

export default new DatabaseService();