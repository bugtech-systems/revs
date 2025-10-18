// src/config/syncConfig.js
export const syncConfig = {
  syncInterval: 3 * 60 * 1000, // 2 minutes
  
  tables: {
    users: {
      query: "",
      maxAge: 2160, // hours (30 days)
      maxRecords: 100,
      immediateSync: true,
      cleanupStale: false,
      softDelete: false,
      incrementalSync: true // Use incremental sync for better performance
    },
    bettings: {
      query: "",
      maxAge: 100, // 7 days
      maxRecords: 100,
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
      incrementalSync: true // Always do full sync for master data
    },
    // messages: {
    //   query: "",
    //   maxAge: 720, // 30 days
    //   maxRecords: 1000,
    //   immediateSync: false,
    //   cleanupStale: false,
    //   softDelete: false,
    //   incrementalSync: false // Always do full sync for master data
    // },
    // cashflow: {
    //   query: "",
    //   maxAge: 720, // 30 days
    //   maxRecords: 2000,
    //   immediateSync: false,
    //   cleanupStale: false,
    //   softDelete: false,
    //   incrementalSync: false // Always do full sync for master data
    // }
  }
};