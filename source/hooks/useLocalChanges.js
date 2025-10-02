import { useState, useEffect } from 'react';
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

// Open or create a local database
const getDB = async () => {
  return SQLite.openDatabase({
    name: 'app.db',
    location: 'default',
  });
};

// Ensure table exists for storing offline changes
const initDB = async () => {
  const db = await getDB();
  await db.executeSql(
    `CREATE TABLE IF NOT EXISTS local_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT,
      action TEXT,
      data TEXT,
      is_synced INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  );
  return db;
};

// Hook to fetch local changes
export const useLocalChanges = () => {
  const [changes, setChanges] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchChanges = async () => {
      const db = await initDB();
      const [results] = await db.executeSql(
        'SELECT * FROM local_changes WHERE is_synced = 0 ORDER BY created_at ASC;'
      );

      const unsynced = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        unsynced.push({
          id: row.id,
          table: row.table_name,
          action: row.action,
          data: JSON.parse(row.data),
        });
      }

      if (isMounted) setChanges(unsynced);
    };

    fetchChanges();

    // Optionally, poll every few seconds for new changes
    const interval = setInterval(fetchChanges, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return changes;
};

// Utility to add a change to the queue
export const addLocalChange = async ({ table, action, data }) => {
  const db = await initDB();
  await db.executeSql(
    'INSERT INTO local_changes (table_name, action, data, is_synced) VALUES (?, ?, ?, 0)',
    [table, action, JSON.stringify(data)]
  );
};

// Utility to mark a change as synced
export const markChangeAsSynced = async (id) => {
  const db = await getDB();
  await db.executeSql('UPDATE local_changes SET is_synced = 1 WHERE id = ?', [id]);
};
