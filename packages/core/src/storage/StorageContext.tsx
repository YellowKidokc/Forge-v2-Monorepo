import React, { createContext, useContext } from 'react';
import type { StorageAdapter } from './StorageAdapter';

const StorageContext = createContext<StorageAdapter | null>(null);

export function StorageProvider({ adapter, children }: { adapter: StorageAdapter; children: React.ReactNode }) {
  return <StorageContext.Provider value={adapter}>{children}</StorageContext.Provider>;
}

export function useStorage(): StorageAdapter {
  const adapter = useContext(StorageContext);
  if (!adapter) throw new Error('useStorage must be used within a StorageProvider');
  return adapter;
}
