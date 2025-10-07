// src/hooks/useTableConfig.js
import { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';

export const useTableConfig = (tableName, config = {}) => {
  const { registerTable, isInitialized } = useData(tableName);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (tableName && isInitialized && !isRegistered) {
      console.log(`useTableConfig: Registering table ${tableName}`, config);
      registerTable(tableName, config);
      setIsRegistered(true);
    }
  }, [tableName, registerTable, isInitialized, isRegistered, config]);

  return useData(tableName);
};