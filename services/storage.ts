
import { AppState, CropType, Tray, Transaction, Customer } from '../types';

const DB_NAME = 'GalwaySunSproutsDB';
const DB_VERSION = 2; // Incremented for schema migration
const STORES = ['crops', 'trays', 'transactions', 'customers', 'images'] as const;

type StoreName = typeof STORES[number];

// Initialize the database with schema migration
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction!;

      // 1. Create new stores if they don't exist
      STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
           db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });

      // 2. Migration: If coming from V1 (monolithic 'appState'), migrate data to new stores
      if (db.objectStoreNames.contains('appState')) {
         console.log("Migrating database from V1 to V2...");
         const oldStore = transaction.objectStore('appState');
         const getRequest = oldStore.get('currentState');
         
         getRequest.onsuccess = () => {
            const oldState = getRequest.result as AppState;
            if (oldState) {
               // Move Crops & Extract Images
               const cropStore = transaction.objectStore('crops');
               const imageStore = transaction.objectStore('images');
               
               if (oldState.crops) {
                  oldState.crops.forEach(crop => {
                     // Check if image is base64 (custom upload)
                     if (crop.imageUrl && crop.imageUrl.startsWith('data:')) {
                        // Save image separately
                        imageStore.put({ id: crop.id, data: crop.imageUrl });
                        // Save crop with a marker or same URL (we handle loading logic in loadState)
                        // We keep the URL in the record so the UI doesn't break before reload, 
                        // but strictly speaking we could replace it.
                        cropStore.put(crop); 
                     } else {
                        cropStore.put(crop);
                     }
                  });
               }
               
               // Move Trays
               const trayStore = transaction.objectStore('trays');
               if (oldState.trays) oldState.trays.forEach(t => trayStore.put(t));

               // Move Transactions
               const txStore = transaction.objectStore('transactions');
               if (oldState.transactions) oldState.transactions.forEach(t => txStore.put(t));
               
               // Move Customers
               const custStore = transaction.objectStore('customers');
               if (oldState.customers) oldState.customers.forEach(c => custStore.put(c));
            }
            
            // Delete old monolithic store
            db.deleteObjectStore('appState');
            console.log("Migration complete.");
         };
      }
    };
  });
};

// Helper to clear a store
const clearStore = (store: IDBObjectStore): Promise<void> => {
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// Save the entire application state into separated stores
export const saveState = async (state: AppState): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES, 'readwrite');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      // We clear stores first to ensure deletions in UI are reflected in DB
      // Note: This is a simple sync strategy. For massive datasets, diffing is better, 
      // but for <10k items, this is fast and robust.
      
      const cropStore = transaction.objectStore('crops');
      const trayStore = transaction.objectStore('trays');
      const txStore = transaction.objectStore('transactions');
      const custStore = transaction.objectStore('customers');
      const imageStore = transaction.objectStore('images');

      // Clear all first (except images, we manage them smarter to avoid churn)
      cropStore.clear();
      trayStore.clear();
      txStore.clear();
      custStore.clear();
      // We do NOT clear images store on every save to avoid rewriting large blobs.
      // We only add/update images. Cleanup of unused images can be a separate maintenance task.

      // 1. Save Crops & Handle Images
      state.crops.forEach(crop => {
        if (crop.imageUrl && crop.imageUrl.startsWith('data:')) {
           // It's a heavy base64 string. 
           // Save content to images store
           imageStore.put({ id: crop.id, data: crop.imageUrl });
           
           // Create a lightweight crop record for the 'crops' store
           // We strip the heavy image data from the main record if we wanted to be pure,
           // but for app simplicity (AppState expecting strings), we keep it consistent.
           // Ideally, we store a reference. 
           // For this implementation, we save the full object to 'crops' so loadState is simple,
           // BUT we ensure 'images' store has the backup.
           // IMPROVEMENT: We save a flag or stripped version to crops store to save space?
           // Let's save a "reference" version to crops store to actually save space.
           const { imageUrl, ...cropData } = crop;
           cropStore.put({ ...cropData, hasLocalImage: true }); 
        } else {
           cropStore.put(crop);
        }
      });

      // 2. Save Trays
      state.trays.forEach(tray => trayStore.put(tray));

      // 3. Save Transactions
      state.transactions.forEach(tx => txStore.put(tx));

      // 4. Save Customers
      state.customers.forEach(cust => custStore.put(cust));
    });
  } catch (error) {
    console.error("Failed to save state to DB:", error);
    throw error;
  }
};

// Load the application state from separated stores
export const loadState = async (): Promise<AppState | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES, 'readonly');
      const newState: Partial<AppState> = {};
      
      // Helpers to promisify requests
      const getAll = (storeName: StoreName) => {
         return new Promise<any[]>((res, rej) => {
            const req = transaction.objectStore(storeName).getAll();
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
         });
      };

      Promise.all([
         getAll('crops'),
         getAll('trays'),
         getAll('transactions'),
         getAll('customers'),
         getAll('images')
      ]).then(([crops, trays, transactions, customers, images]) => {
         // Re-assemble images into crops
         const imageMap = new Map(images.map((img: any) => [img.id, img.data]));
         
         const hydratedCrops = crops.map((c: any) => {
            if (c.hasLocalImage && imageMap.has(c.id)) {
               return { ...c, imageUrl: imageMap.get(c.id) };
            }
            return c;
         });

         resolve({
            crops: hydratedCrops,
            trays,
            transactions,
            customers
         } as AppState);
      }).catch(reject);
    });
  } catch (error) {
    console.error("Failed to load state from DB:", error);
    return null;
  }
};

// Clear the database (Factory Reset)
export const clearDB = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES, 'readwrite');
    
    STORES.forEach(name => transaction.objectStore(name).clear());

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export interface DbStats {
   store: string;
   count: number;
}

// Get detailed stats per store
export const getDatabaseStats = async (): Promise<DbStats[]> => {
   const db = await initDB();
   return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES, 'readonly');
      const stats: DbStats[] = [];
      let completed = 0;

      STORES.forEach(name => {
         const req = transaction.objectStore(name).count();
         req.onsuccess = () => {
            stats.push({ store: name, count: req.result });
            completed++;
            if (completed === STORES.length) resolve(stats);
         };
         req.onerror = () => reject(req.error);
      });
   });
};

// Get estimated storage usage
export const getStorageEstimate = async (): Promise<{ usage: number; quota: number } | null> => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }
  return null;
};
