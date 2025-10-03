// db.js
import SQLite from "react-native-sqlite-storage";
import supabase from "./supabaseClient";
import { api, getDB } from "./offlineSync";

// Enable debug (optional for development)
// SQLite.DEBUG(true);
// SQLite.enablePromise(true);




// db.js


// Initialize DB and create tables
export const initDB = async () => {
  try {
  let db = await SQLite.openDatabase({ name: "leo.db", location: "default" });

    await new Promise((resolve, reject) => {
      db.transaction(
        (tx) => {
          // Users table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              first_name TEXT,
              last_name TEXT,
              email TEXT,
              device_id TEXT,
              app_version TEXT,
              configuration TEXT
            );`
          );

          // Draws table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS draws (
              id TEXT PRIMARY KEY,
              game_time TEXT,
              draw_date TEXT,
              combination TEXT
            );`
          );

          // Bettings table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS bettings (
              id TEXT PRIMARY KEY,
              isComplete INTEGER DEFAULT 0,
              isDeleted INTEGER DEFAULT 0,
              isValidated TEXT,
              timestamp TEXT,
              inputType TEXT,
              straight REAL,
              ramble REAL,
              gross REAL,
              net REAL,
              isPrint INTEGER DEFAULT 0,
              isWinTo INTEGER DEFAULT 0,
              collector TEXT,
              ownerId TEXT,
              printCopy INTEGER,
              drawId TEXT,
              user TEXT,
              fileUrl TEXT,
              note TEXT,
              contact TEXT,
              ticketNo TEXT,
              winning REAL,
              gameTime TEXT,
              hits TEXT,
              commissions TEXT,
              combinations TEXT,
              uplines TEXT,
              last_updated TEXT,
              synced INTEGER DEFAULT 0
            );`
          );
        },
        (error) => {
          console.log("❌ DB init error:", error);
          reject(error);
        },
        () => {
          console.log("✅ Tables created");
          resolve(true);
        }
      );
    });

    return db;
  } catch (err) {
    console.error("❌ initDB error:", err);
    throw err;
  }
};

// Return database instance
// export const getDB = async () => {
//   let db = await SQLite.openDatabase({ name: "app.db", location: "default" });

//   if (!db) throw new Error("DB not initialized. Call initDB() first.");
//   return db;
// };


// Get local user
// Get local authenticated user
export const getLocalUser = async (authEmail = null) => {
    let db = await getDB();
    console.log('GET LOCAL USER')
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      let query = 'SELECT * FROM users';
      const params = [];

   if (authEmail) {
        query += ' WHERE email = ? LIMIT 1';
        params.push(authEmail);
      }
      

      tx.executeSql(
        query,
        params,
        (_, result) => {
          if (result.rows.length > 0) {
            const row = result.rows.item(0);
            resolve({
              ...row,
              configuration: JSON.parse(row.configuration || []),
            });
          } else {
            resolve(null);
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};


// Save or update user locally
export const saveLocalUser = async (user) => {
    await api.createUser(user)
};

// Update local user device
export const updateLocalUserDevice = async (userId, deviceId) => {
  let db = await getDB();

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE users SET device_id = ? WHERE id = ?;',
        [deviceId, userId],
        (_, result) => resolve(result.rowsAffected > 0),
        (_, error) => reject(error)
      );
    });
  });
};


// Update user's last_summary
export const update_local_user_last_summary = async (user_id, date) => {
  let db = await getDB();

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE users SET last_summary = ? WHERE id = ?;',
        [date.toISOString(), user_id],
        (_, result) => resolve(result.rowsAffected > 0),
        (_, error) => reject(error)
      );
    });
  });
};

// Get bettings filtered by date & owner_id
export const get_local_bettings = async ({ owner_id, start_date, end_date, include_all }) => {
  let db = await getDB();

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      let query = '';
      let params = [];
      if (include_all) {
        query = `SELECT * FROM bettings WHERE is_deleted = 0 AND input_type = 'normal' AND timestamp BETWEEN ? AND ?`;
        params = [start_date.toISOString(), end_date.toISOString()];
      } else {
        query = `SELECT * FROM bettings WHERE is_deleted = 0 AND input_type = 'normal' AND owner_id = ? AND timestamp BETWEEN ? AND ?`;
        params = [owner_id, start_date.toISOString(), end_date.toISOString()];
      }

      tx.executeSql(
        query,
        params,
        (_, result) => {
          const data = [];
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows.item(i);
            data.push({
              ...row,
              uplines: JSON.parse(row.uplines || '[]'),
              is_deleted: row.is_deleted === 1,
            });
          }
          resolve(data);
        },
        (_, error) => reject(error)
      );
    });
  });
};

// Get draws filtered by date
export const get_local_draws = async ({ start_date, end_date }) => {
  let db = await getDB();

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM draws WHERE draw_date BETWEEN ? AND ? ORDER BY draw_date ASC;',
        [start_date.toISOString(), end_date.toISOString()],
        (_, result) => {
          const data = [];
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows.item(i);
            data.push({
              ...row,
              is_win_to: row.is_win_to === 1,
            });
          }
          resolve(data);
        },
        (_, error) => reject(error)
      );
    });
  });
};




// -------------------- USERS --------------------
export const fetchUser = async (email) => {
  let db = await getDB();


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
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM users WHERE email = ?`,
          [email],
          async (_, { rows }) => {
            if (!rows.length) return resolve(null);

            const user = rows._array[0];

            // Parse uplines from JSON and fetch each locally
            if (user.uplines) {
              const uplineIds = JSON.parse(user.uplines);
              if (uplineIds.length) {
                const placeholders = uplineIds.map(() => '?').join(',');
                tx.executeSql(
                  `SELECT * FROM users WHERE id IN (${placeholders})`,
                  uplineIds,
                  (_, { rows: uplineRows }) => {
                    user.uplines = uplineRows._array;
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


// -------------------- DRAWS --------------------
export const fetchDraws = async (date) => {
  let db = await getDB();


    try {
        const startOfDay = moment(date).startOf('day').toISOString();
        const endOfDay = moment(date).endOf('day').toISOString();

        const { data, error } = await supabase
            .from('draws')
            .select('*')
            .gte('drawDate', startOfDay)
            .lt('drawDate', endOfDay)
            .order('gameTime', { ascending: true });

        if (error) throw error;

        // Cache locally
        db.transaction(tx => {
            data.forEach(draw => {
                tx.executeSql(
                    `INSERT OR REPLACE INTO draws (id, gameTime, drawDate, combination) VALUES (?, ?, ?, ?)`,
                    [draw.id, draw.gameTime, draw.drawDate, draw.combination || null]
                );
            });
        });

        return data;
    } catch (err) {
        console.log('Supabase fetchDraws error, fallback to local', err);
        return new Promise(resolve => {
            db.transaction(tx => {
                tx.executeSql(
                    `SELECT * FROM draws WHERE date(drawDate) = date(?) ORDER BY gameTime ASC`,
                    [date],
                    (_, { rows }) => resolve(rows._array)
                );
            });
        });
    }
};

// -------------------- PLACE BET --------------------
// -------------------- PLACE BET (Offline-First) --------------------
export const placeBet = async (bet) => {
  let db = await getDB();


console.log(bet, 'PLACE BEET')
  return new Promise((resolve, reject) => {
    const id = bet.id || Date.now().toString(); // fallback if no id
    const timestamp = new Date().toISOString();
  
    console.log(  [
          id,
          bet.isComplete ? 1 : 0,
          bet.isDeleted ? 1 : 0,
          bet.isValidated ? bet.isValidated.toISOString() : null,
          timestamp,
          bet.inputType || "normal",
          bet.straight || 0,
          bet.ramble || 0,
          bet.gross || 0,
          bet.net || 0,
          bet.isPrint ? 1 : 0,
          bet.isWinTo ? 1 : 0,
          bet.collector || "",
          bet.owner_id,
          bet.printCopy || 1,
          bet.drawId || null,
          bet.user || null,
          bet.fileUrl || null,
          bet.note || null,
          bet.contact || null,
          bet.ticketNo || null,
          bet.winning || 0,
          bet.gameTime || "2pm",
          JSON.stringify(bet.hits || []),
          JSON.stringify(bet.commissions || []),
          JSON.stringify(bet.combinations || []),
          JSON.stringify(bet.uplines || []),
          0 // synced flag
        ], 'BETTING PLACE')
  
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO bettings (
          id,
          timestamp,
          inputType,
          straight,
          ramble,
          gross,
          net,
          isPrint,
          isWinTo,
          collector,
          owner_id,
          printCopy,
          drawId,
          user,
          fileUrl,
          note,
          contact,
          ticketNo,
          winning,
          gameTime,
          hits,
          commissions,
          combinations,
          uplines,
          synced
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          timestamp,
          bet.inputType || "normal",
          bet.straight || 0,
          bet.ramble || 0,
          bet.gross || 0,
          bet.net || 0,
          bet.isPrint ? 1 : 0,
          bet.isWinTo ? 1 : 0,
          bet.collector || "",
          bet.owner_id,
          bet.printCopy || 1,
          bet.drawId || null,
          bet.user || null,
          bet.fileUrl || null,
          bet.note || null,
          bet.contact || null,
          bet.ticketNo || null,
          bet.winning || 0,
          bet.gameTime || "2pm",
          JSON.stringify(bet.hits || []),
          JSON.stringify(bet.commissions || []),
          JSON.stringify(bet.combinations || []),
          JSON.stringify(bet.uplines || []),
          0 // synced flag
        ],
        (_, result) => resolve({ id, local: true }),
        (_, error) => reject(error)
      );
    });
  });
};


// -------------------- GET PENDING BETS --------------------
export const getPendingBets = async () => {
    let db = await getDB();


    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                `SELECT * FROM bettings WHERE synced = 0`,
                [],
                (_, { rows }) => resolve(rows),
                (_, error) => reject(error)
            );
        });
    });
};

// -------------------- SYNC PENDING BETS --------------------
// -------------------- SYNC PENDING BETS --------------------
export const syncPendingBets = async () => {
  let db = await getDB();


  const pendingBets = await getPendingBets();
  if (!pendingBets.length) return;

  try {
    // Transform rows into Supabase format
    const formattedBets = pendingBets.map(b => ({
      id: b.id,
      isComplete: !!b.isComplete,
      isDeleted: !!b.isDeleted,
      isValidated: b.isValidated ? new Date(b.isValidated).toISOString() : null,
      timestamp: b.timestamp,
      inputType: b.inputType || "normal",
      straight: b.straight || 0,
      ramble: b.ramble || 0,
      gross: b.gross || 0,
      net: b.net || 0,
      isPrint: !!b.isPrint,
      isWinTo: !!b.isWinTo,
      collector: b.collector,
      ownerId: b.ownerId,
      printCopy: b.printCopy || 1,
      drawId: b.drawId || null,
      user: b.user || null,
      fileUrl: b.fileUrl || null,
      note: b.note || null,
      contact: b.contact || null,
      ticketNo: b.ticketNo || null,
      winning: b.winning || 0,
      gameTime: b.gameTime || "2pm",
      hits: b.hits ? JSON.parse(b.hits) : [],
      commissions: b.commissions ? JSON.parse(b.commissions) : [],
      combinations: b.combinations ? JSON.parse(b.combinations) : [],
      uplines: b.uplines ? JSON.parse(b.uplines) : []
    }));

    // Insert into Supabase/Postgres
    const { error } = await supabase.from("bettings").insert(formattedBets);

    if (error) throw error;

    // Mark as synced locally
    db.transaction(tx => {
      tx.executeSql(`UPDATE bettings SET synced = 1 WHERE synced = 0`);
    });

    return true;
  } catch (err) {
    console.log("Sync error:", err);
    return false;
  }
};


// -------------------- GET ALL BETS --------------------
export const getAllBets = async () => {

    let db = await getDB();

    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                `SELECT * FROM bettings ORDER BY timestamp DESC`,
                [],
                (_, { rows }) => resolve(rows),
                (_, error) => reject(error)
            );
        });
    });
};

// -------------------- BIDIRECTIONAL SYNC --------------------
export const syncBettings = async () => {
  let db = await getDB();

  try {
    // 1️⃣ PUSH local unsynced bets
    const pendingBets = await getPendingBets();

      console.log(pendingBets, 'PENDINNGGG')

    if (pendingBets.length) {
      const formatted = pendingBets.map(b => ({
        id: b.id,
        isComplete: !!b.isComplete,
        isDeleted: !!b.isDeleted,
        isValidated: b.isValidated ? new Date(b.isValidated).toISOString() : null,
        timestamp: b.timestamp,
        inputType: b.inputType || "normal",
        straight: b.straight || 0,
        ramble: b.ramble || 0,
        gross: b.gross || 0,
        net: b.net || 0,
        isPrint: !!b.isPrint,
        isWinTo: !!b.isWinTo,
        collector: b.collector,
        ownerId: b.ownerId,
        printCopy: b.printCopy || 1,
        drawId: b.drawId || null,
        user: b.user || null,
        fileUrl: b.fileUrl || null,
        note: b.note || null,
        contact: b.contact || null,
        ticketNo: b.ticketNo || null,
        winning: b.winning || 0,
        gameTime: b.gameTime || "2pm",
        hits: b.hits ? JSON.parse(b.hits) : [],
        commissions: b.commissions ? JSON.parse(b.commissions) : [],
        combinations: b.combinations ? JSON.parse(b.combinations) : [],
        uplines: b.uplines ? JSON.parse(b.uplines) : []
      }));

      const { error } = await supabase.from("bettings").upsert(formatted, {
        onConflict: "id",
      });

      if (error) throw error;

      // mark synced locally
      db.transaction(tx => {
        tx.executeSql(`UPDATE bettings SET synced = 1 WHERE synced = 0`);
      });
    }

    // 2️⃣ PULL from Supabase and update local SQLite
    // optional: use `updated_at` or latest `timestamp` filter for efficiency
    const { data: remoteBettings, error: pullError } = await supabase
      .from("bettings")
      .select("*");

    if (pullError) throw pullError;

    db.transaction(tx => {
      remoteBettings.forEach(b => {
        tx.executeSql(
          `INSERT OR REPLACE INTO bettings 
           (id, isComplete, isDeleted, isValidated, timestamp, inputType, straight, ramble, gross, net,
            isPrint, isWinTo, collector, owner_id, printCopy, drawId, user, fileUrl, note, contact,
            ticketNo, winning, gameTime, hits, commissions, combinations, uplines, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            b.id,
            b.isComplete ? 1 : 0,
            b.isDeleted ? 1 : 0,
            b.isValidated,
            b.timestamp,
            b.inputType,
            b.straight,
            b.ramble,
            b.gross,
            b.net,
            b.isPrint ? 1 : 0,
            b.isWinTo ? 1 : 0,
            b.collector,
            b.ownerId,
            b.printCopy,
            b.drawId,
            b.user,
            b.fileUrl,
            b.note,
            b.contact,
            b.ticketNo,
            b.winning,
            b.gameTime,
            JSON.stringify(b.hits || []),
            JSON.stringify(b.commissions || []),
            JSON.stringify(b.combinations || []),
            JSON.stringify(b.uplines || []),
          ]
        );
      });
    });

    console.log("✅ Bi-directional sync completed");
    return true;
  } catch (err) {
    console.log("❌ Sync error:", err);
    return false;
  }
};

