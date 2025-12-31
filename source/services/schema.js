// src/database/schema.js
export const schema = {
  users: {
    id: "text",
    first_name: "text",
    last_name: "text",
    role: "text",
    email: "text",
    password: "text",
    is_deleted: "boolean",
    is_admin: "boolean",
    address: "text",
    receipt_template: "text",
    commission: "numeric",
    mobile: "text",
    referral: "text",
    user_level: "integer",
    com_rate: "numeric",
    com_portion: "numeric",
    device_id: "text",
    user_id: "text",
    coordinates: "text",
    gross_today: "numeric",
    app_version: "text",
    last_summary: "timestamp",
    configuration: "json",
    uplines: "json",
    created_at: "timestamp",
    updated_at: "timestamp",
    login_devices: "json",
    // Sync columns
    _status: "text",
    _version: "numeric",
  },

  bettings: {
    id: "text",
    is_complete: "boolean",
    is_deleted: "boolean",
    is_validated: "timestamp",
    timestamp: "timestamp",
    input_type: "text",
    straight: "numeric",
    ramble: "numeric",
    gross: "numeric",
    net: "numeric",
    is_print: "boolean",
    is_win_to: "boolean",
    collector: "text",
    owner_id: "text",
    print_copy: "numeric",
    draw_id: "text",
    user_id: "text",
    file_url: "text",
    note: "text",
    contact: "text",
    ticket_no: "text",
    winning: "numeric",
    game_time: "text",
    hits: "json",
    commissions: "json",
    combinations: "json",
    uplines: "json",
    created_at: "timestamp",
    updated_at: "timestamp",
    // Sync columns
    _status: "text",
    _version: "numeric",
  },

  draws: {
    id: "text",
    game_type: "text",
    game_time: "text",
    combination: "text",
    gross_total: "numeric",
    win_total: "numeric",
    net_total: "numeric",
    sold_out_total: "numeric",
    draw_date: "timestamp",
    is_win_to: "boolean",
    tip_url: "text",
    is_deleted: "boolean",
    created_at: "timestamp",
    updated_at: "timestamp",
    // Sync columns
    _status: "text",
    _version: "numeric",
  },

  master_combinations: {
    id: "text",
    digit: "text",
    straight_limit: "numeric",
    ramble_limit: "numeric",
    ramble_total: "numeric",
    straight_total: "numeric",
    is_win_to: "boolean",
    risk_level: "text",
    win_frequency: "numeric",
    straight_max_limit: "numeric",
    ramble_max_limit: "numeric",
    is_deleted: "boolean",
    created_at: "timestamp",
    updated_at: "timestamp",
    // Sync columns
    _status: "text",
    _version: "numeric",
  },

  messages: {
    id: "text",
    created_by: "text",
    recepient: "text",
    recepient_name: "text",
    conversations: "json",
    is_deleted: "boolean",
    created_at: "timestamp",
    updated_at: "timestamp",
    // Sync columns
    _status: "text",
    _version: "numeric",
  },

  cashflow: {
    id: "text",
    amount: "numeric",
    description: "text",
    input_type: "text",
    is_deleted: "boolean",
    owner: "text",
    owner_name: "text",
    user: "text",
    updated_by: "text",
    created_at: "timestamp",
    updated_at: "timestamp",
    // Sync columns
    _status: "text",
    _version: "numeric",
  },
};

export const SYNC_TABLES = {
  SYNC_METADATA: 'sync_metadata',
  SYNC_QUEUE: 'sync_queue',
};

export const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS ${SYNC_TABLES.SYNC_METADATA} (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS ${SYNC_TABLES.SYNC_QUEUE} (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id TEXT NOT NULL,
  data TEXT,
  created_at INTEGER,
  attempted_at INTEGER,
  status TEXT DEFAULT 'pending'
);

-- Users table with sync columns
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  email TEXT,
  password TEXT,
  is_deleted BOOLEAN DEFAULT 0,
  is_admin BOOLEAN DEFAULT 0,
  address TEXT,
  receipt_template TEXT,
  commission NUMERIC DEFAULT 0,
  mobile TEXT,
  referral TEXT,
  user_level INTEGER DEFAULT 0,
  com_rate NUMERIC DEFAULT 0,
  com_portion NUMERIC DEFAULT 0,
  device_id TEXT,
  user_id TEXT,
  coordinates TEXT,
  gross_today NUMERIC DEFAULT 0,
  app_version TEXT,
  last_summary TIMESTAMP,
  configuration TEXT,
  uplines TEXT,
  login_devices TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  _status TEXT DEFAULT 'synced',
  _version INTEGER DEFAULT 1
);

-- Bettings table with sync columns
CREATE TABLE IF NOT EXISTS bettings (
  id TEXT PRIMARY KEY,
  is_complete BOOLEAN DEFAULT 0,
  is_deleted BOOLEAN DEFAULT 0,
  is_validated TIMESTAMP,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  input_type TEXT,
  straight NUMERIC DEFAULT 0,
  ramble NUMERIC DEFAULT 0,
  gross NUMERIC DEFAULT 0,
  net NUMERIC DEFAULT 0,
  is_print BOOLEAN DEFAULT 0,
  is_win_to BOOLEAN DEFAULT 0,
  collector TEXT,
  owner_id TEXT,
  print_copy INTEGER DEFAULT 0,
  draw_id TEXT,
  user_id TEXT,
  file_url TEXT,
  note TEXT,
  contact TEXT,
  ticket_no TEXT,
  winning NUMERIC DEFAULT 0,
  game_time TEXT,
  hits TEXT,
  commissions TEXT,
  combinations TEXT,
  uplines TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  _status TEXT DEFAULT 'synced',
  _version INTEGER DEFAULT 1
);

-- Draws table with sync columns
CREATE TABLE IF NOT EXISTS draws (
  id TEXT PRIMARY KEY,
  game_type TEXT,
  game_time TEXT,
  combination TEXT,
  gross_total NUMERIC DEFAULT 0,
  win_total NUMERIC DEFAULT 0,
  net_total NUMERIC DEFAULT 0,
  sold_out_total NUMERIC DEFAULT 0,
  draw_date TIMESTAMP,
  is_win_to BOOLEAN DEFAULT 0,
  tip_url TEXT,
  is_deleted BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  _status TEXT DEFAULT 'synced',
  _version INTEGER DEFAULT 1
);

-- Master combinations table with sync columns
CREATE TABLE IF NOT EXISTS master_combinations (
  id TEXT PRIMARY KEY,
  digit TEXT,
  straight_limit NUMERIC DEFAULT 0,
  ramble_limit NUMERIC DEFAULT 0,
  ramble_total NUMERIC DEFAULT 0,
  straight_total NUMERIC DEFAULT 0,
  is_win_to BOOLEAN DEFAULT 0,
  risk_level TEXT,
  win_frequency INTEGER DEFAULT 0,
  straight_max_limit NUMERIC DEFAULT 0,
  ramble_max_limit NUMERIC DEFAULT 0,
  is_deleted BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  _status TEXT DEFAULT 'synced',
  _version INTEGER DEFAULT 1
);

-- Messages table with sync columns
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  created_by TEXT,
  recepient TEXT,
  recepient_name TEXT,
  conversations TEXT,
  is_deleted BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  _status TEXT DEFAULT 'synced',
  _version INTEGER DEFAULT 1
);

-- Cashflow table with sync columns
CREATE TABLE IF NOT EXISTS cashflow (
  id TEXT PRIMARY KEY,
  amount NUMERIC DEFAULT 0,
  description TEXT,
  input_type TEXT,
  is_deleted BOOLEAN DEFAULT 0,
  owner TEXT,
  owner_name TEXT,
  user TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  _status TEXT DEFAULT 'synced',
  _version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON ${SYNC_TABLES.SYNC_QUEUE}(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_bettings_user_id ON bettings(user_id);
CREATE INDEX IF NOT EXISTS idx_bettings_draw_id ON bettings(draw_id);
CREATE INDEX IF NOT EXISTS idx_draws_draw_date ON draws(draw_date);
`;