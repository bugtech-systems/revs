// sync.js
import supabase from "./supabaseClient";
import { getDB, initDB } from "./db";


let syncInterval;

//
// --- USERS SYNC ---
//
export const syncUsers = async () => {
  const db = await getDB();

  const { data, error } = await supabase.from("users").select("*");
  if (error) throw error;

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      data.forEach((user) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO users 
          (id, first_name, last_name, email, device_id, app_version, configuration)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            user.first_name,
            user.last_name,
            user.email,
            user.device_id,
            user.app_version,
            JSON.stringify(user.configuration || {}),
          ]
        );
      });
    },
    reject,
    resolve);
  });
};

//
// --- DRAWS SYNC ---
//
export const syncDraws = async () => {
  const db = await getDB();

  const { data, error } = await supabase.from("draws").select("*");
  if (error) throw error;

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        data.forEach((draw) => {
          // normalize field names for SQLite
          const id = draw.id;
          const game_time = draw.game_time || draw.gameTime || null;
          const draw_date = draw.draw_date || draw.drawDate || null;
          const combination = draw.combination || null;

          if (id) {
            tx.executeSql(
              `INSERT OR REPLACE INTO draws 
                (id, game_time, draw_date, combination)
                VALUES (?, ?, ?, ?)`,
              [id, game_time, draw_date, combination]
            );
          }
        });
      },
      (err) => {
        console.log("❌ syncDraws transaction error:", err);
        reject(err);
      },
      () => {
        console.log("✅ syncDraws completed");
        resolve(true);
      }
    );
  });
};


//
// --- BETTINGS SYNC ---
//
export const syncBettings = async () => {
  const db = await getDB();

  // Push unsynced bettings
  const results = await db.executeSql(
    "SELECT * FROM bettings WHERE synced = 0"
  );
  const unsynced = results[0].rows.raw();

  for (const bet of unsynced) {
    const { error } = await supabase.from("bettings").upsert(bet);
    if (!error) {
      await db.executeSql("UPDATE bettings SET synced = 1 WHERE id = ?", [
        bet.id,
      ]);
    }
  }

  // Pull remote bettings
  const { data, error } = await supabase.from("bettings").select("*");
  if (error) throw error;

  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      data.forEach((bet) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO bettings 
          (id, combination, target, ramble, game_time, timestamp, synced)
          VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [
            bet.id,
            bet.combination,
            bet.target,
            bet.ramble,
            bet.game_time,
            bet.timestamp,
          ]
        );
      });
    },
    reject,
    resolve);
  });
};

//
// --- MASTER SYNC ---
//
export const syncAll = async () => {
  await initDB(); // ✅ make sure tables exist
  await syncUsers();
  await syncDraws();
  await syncBettings();
};

export const startAutoSync = (intervalMs = 30000) => {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(syncAll, intervalMs);
};

export const stopAutoSync = () => {
  if (syncInterval) clearInterval(syncInterval);
};
