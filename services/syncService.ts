import { api } from './api';
import type { AppState, CropType, Tray, Transaction, Customer } from '../types';
import { INITIAL_CROPS, INITIAL_CUSTOMERS } from '../constants';
import {
  enqueueSync,
  listSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
  saveState,
  type SyncQueueItem,
  type SyncEntity,
} from './storage';

const makeQueueId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const queueUpsert = async (entity: SyncEntity, payload: unknown) => {
  await enqueueSync({
    id: makeQueueId(),
    entity,
    op: 'upsert',
    payload,
    createdAt: Date.now(),
  });
};

export const queueDelete = async (entity: SyncEntity, payload: { id: string }) => {
  await enqueueSync({
    id: makeQueueId(),
    entity,
    op: 'delete',
    payload,
    createdAt: Date.now(),
  });
};

const applyQueueItemRemote = async (item: SyncQueueItem) => {
  switch (item.entity) {
    case 'crops': {
      if (item.op === 'delete') return api.deleteCrop((item.payload as any).id);
      return api.saveCrop(item.payload as CropType);
    }
    case 'trays': {
      if (item.op === 'delete') return api.deleteTray((item.payload as any).id);
      return api.saveTray(item.payload as Tray);
    }
    case 'transactions': {
      if (item.op === 'delete') return api.deleteTransaction((item.payload as any).id);
      return api.saveTransaction(item.payload as Transaction);
    }
    case 'customers': {
      if (item.op === 'delete') return api.deleteCustomer((item.payload as any).id);
      return api.saveCustomer(item.payload as Customer);
    }
    default: {
      const _exhaustive: never = item.entity;
      return _exhaustive;
    }
  }
};

export type SyncResult =
  | { didSync: true; processed: number; remaining: number }
  | { didSync: false; processed: number; remaining: number; error: string };

export const flushSyncQueueOnce = async (): Promise<SyncResult> => {
  const items = await listSyncQueue();
  if (items.length === 0) return { didSync: true, processed: 0, remaining: 0 };

  let processed = 0;
  let skipped = 0;
  for (const item of items) {
    try {
      await applyQueueItemRemote(item);
      await removeSyncQueueItem(item.id);
      processed += 1;
    } catch (e: any) {
      // Skip 404 errors for delete operations (item already doesn't exist)
      if (e?.status === 404 && item.op === 'delete') {
        await removeSyncQueueItem(item.id);
        skipped += 1;
        continue;
      }
      
      const next: SyncQueueItem = {
        ...item,
        attempts: (item.attempts ?? 0) + 1,
        lastError: (e as Error)?.message ?? String(e),
      };
      await updateSyncQueueItem(next);
      return {
        didSync: false,
        processed,
        remaining: items.length - processed - skipped,
        error: next.lastError ?? 'Unknown sync error',
      };
    }
  }

  return { didSync: true, processed, remaining: 0 };
};

export const refreshLocalFromRemote = async (): Promise<AppState> => {
  // Always try setup first to ensure tables exist
  try {
    await api.setup();
  } catch (setupError) {
    // Setup errors are OK - tables might already exist
    console.warn('Database setup warning (may already exist):', setupError);
  }

  try {
    const [crops, trays, transactions, customers] = await Promise.all([
      api.getCrops(),
      api.getTrays(),
      api.getTransactions(),
      api.getCustomers(),
    ]);

    // Local-first apps should not "erase" local defaults due to an empty remote DB.
    // If the remote DB is empty, seed it with initial test data.
    if (crops.length === 0) {
      console.log('Database is empty, seeding initial data...');
      try {
        await api.seed({ crops: INITIAL_CROPS, customers: INITIAL_CUSTOMERS });
        const [seededCrops, seededTrays, seededTransactions, seededCustomers] = await Promise.all([
          api.getCrops(),
          api.getTrays(),
          api.getTransactions(),
          api.getCustomers(),
        ]);
        const seeded: AppState = {
          crops: seededCrops,
          trays: seededTrays,
          transactions: seededTransactions,
          customers: seededCustomers,
        };
        await saveState(seeded);
        console.log('Database seeded successfully');
        return seeded;
      } catch (seedError) {
        console.error('Failed to seed database:', seedError);
        // If seeding fails, return empty state but don't crash
        const emptyState: AppState = {
          crops: INITIAL_CROPS,
          trays: [],
          transactions: [],
          customers: INITIAL_CUSTOMERS,
        };
        await saveState(emptyState);
        return emptyState;
      }
    }

    const state: AppState = { crops, trays, transactions, customers };
    
    // Log image URLs for debugging
    console.log('Loaded crops from database:', crops.length);
    crops.forEach(crop => {
      if (crop.imageUrl) {
        console.log(`Crop ${crop.name}: imageUrl = ${crop.imageUrl}`);
      }
    });
    
    await saveState(state);
    return state;
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error('Failed to refresh from remote:', msg);
    
    // If it's a connection/database error, throw it so the UI can show appropriate message
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
      throw new Error(`Network error: ${msg}`);
    }
    
    // For other errors, try one more time after setup
    try {
      console.log('Retrying after database setup...');
      await api.setup();
      const [crops, trays, transactions, customers] = await Promise.all([
        api.getCrops(),
        api.getTrays(),
        api.getTransactions(),
        api.getCustomers(),
      ]);

      if (crops.length === 0) {
        await api.seed({ crops: INITIAL_CROPS, customers: INITIAL_CUSTOMERS });
        const [seededCrops, seededTrays, seededTransactions, seededCustomers] = await Promise.all([
          api.getCrops(),
          api.getTrays(),
          api.getTransactions(),
          api.getCustomers(),
        ]);
        const seeded: AppState = {
          crops: seededCrops,
          trays: seededTrays,
          transactions: seededTransactions,
          customers: seededCustomers,
        };
        await saveState(seeded);
        return seeded;
      }

      const state: AppState = { crops, trays, transactions, customers };
      await saveState(state);
      return state;
    } catch (e2) {
      const msg2 = (e2 as Error)?.message ?? String(e2);
      throw new Error(`Database error: ${msg} / ${msg2}`);
    }
  }
};

