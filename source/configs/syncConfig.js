// src/config/syncConfig.js
export const syncConfig = {
  syncInterval: 2 * 60 * 1000, // 2 minutes
  
  tables: {
    users: {
      query: "is_deleted = false",
      maxAge: 100, // hours (30 days)
      maxRecords: 1000,
      immediateSync: true,
      cleanupStale: true,
      softDelete: false,
      incrementalSync: true // Use incremental sync for better performance
    },
    bettings: {
      query: "is_deleted = false",
      maxAge: 100, // 7 days
      maxRecords: 25000,
      immediateSync: true,
      cleanupStale: true,
      softDelete: false,
      incrementalSync: true
    },
    draws: {
      query: "",
      maxAge: 720, // 30 days
      maxRecords: 1000,
      immediateSync: true,
      cleanupStale: true,
      softDelete: false,
      incrementalSync: true
    },
    master_combinations: {
      query: "",
      maxAge: 2160, // 90 days
      maxRecords: 500,
      immediateSync: false,
      cleanupStale: false,
      softDelete: false,
      incrementalSync: false // Always do full sync for master data
    },
    messages: {
      query: "is_deleted = false",
      maxAge: 720, // 30 days
      maxRecords: 1000,
      immediateSync: true,
      cleanupStale: true,
      softDelete: true,
      incrementalSync: true
    },
    cashflow: {
      query: "is_deleted = false",
      maxAge: 720, // 30 days
      maxRecords: 2000,
      immediateSync: true,
      cleanupStale: true,
      softDelete: true,
      incrementalSync: true
    }
  }
};