import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './components/ErrorFallback';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import NotificationManager from './components/NotificationManager';
import { AppState, View, Stage, Transaction, CropType, Customer, Tray } from './types';
import { INITIAL_CROPS, MOCK_TRANSACTIONS, INITIAL_CUSTOMERS } from './constants';
import { getFarmAlerts } from './services/alertService';
import { Sprout } from 'lucide-react';
import { getLocalStateSnapshot, saveState, upsertLocalEntity, deleteLocalEntity } from './services/storage';
import { flushSyncQueueOnce, refreshLocalFromRemote, queueUpsert, queueDelete } from './services/syncService';

const Dashboard = React.lazy(() => import('./components/Dashboard'));
const CropManager = React.lazy(() => import('./components/CropManager'));
const FinanceTracker = React.lazy(() => import('./components/FinanceTracker'));
const AIAssistant = React.lazy(() => import('./components/AIAssistant'));
const DataManager = React.lazy(() => import('./components/DataManager'));
const ProfitCalculator = React.lazy(() => import('./components/ProfitCalculator'));

const ViewLoading: React.FC = () => (
  <div className="min-h-[240px] flex items-center justify-center text-slate-400 text-sm font-bold">
    Loading…
  </div>
);

const App: React.FC = () => {
  // --- Auth & Routing State ---
  const [authStatus, setAuthStatus] = useState<'landing' | 'login' | 'admin'>('landing');

  // --- App State Management ---
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadPhase, setLoadPhase] = useState<string>('Idle');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const loadStartedAtRef = React.useRef<number>(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncKick, setSyncKick] = useState(0);
  const [didForceBoot, setDidForceBoot] = useState(false);
  const [fatalError, setFatalError] = useState<{ message: string; stack?: string; source?: string } | null>(null);
  
  const [appState, setAppState] = useState<AppState>({
    crops: [],
    trays: [],
    transactions: [],
    customers: []
  });

  // --- Global crash capture (mobile-friendly debugging) ---
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.error?.message || event.message || 'Unknown error';
      const stack = event.error?.stack;
      setFatalError({
        message,
        stack,
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as any;
      const message = reason?.message ? String(reason.message) : String(reason ?? 'Unhandled rejection');
      const stack = reason?.stack ? String(reason.stack) : undefined;
      setFatalError({ message, stack, source: 'unhandledrejection' });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  // --- Local-first bootstrap (IndexedDB → UI immediately, remote sync in background) ---
  useEffect(() => {
    if (authStatus !== 'admin') return;

    let isCancelled = false;
    loadStartedAtRef.current = Date.now();

    const initLocalFirst = async () => {
      setIsLoading(true);
      setLoadError(null);
      setLoadPhase('Loading local data…');

      try {
        // Never allow login to block on IndexedDB. If IDB is blocked/hanging, boot with defaults.
        const local = await Promise.race<AppState>([
          getLocalStateSnapshot(),
          new Promise<AppState>((resolve) =>
            window.setTimeout(
              () =>
                resolve({
                  crops: INITIAL_CROPS,
                  trays: [],
                  transactions: [],
                  customers: INITIAL_CUSTOMERS,
                }),
              1500
            )
          ),
        ]);
        const hasLocalData =
          local.crops.length > 0 || local.trays.length > 0 || local.transactions.length > 0 || local.customers.length > 0;

        if (!isCancelled) {
          if (!hasLocalData) setDidForceBoot(true);
          setAppState(
            hasLocalData
              ? local
              : {
                  crops: INITIAL_CROPS,
                  trays: [],
                  transactions: [],
                  customers: INITIAL_CUSTOMERS,
                }
          );
          setIsLoading(false);
          setLoadPhase('Ready');
        }

        // Background: flush any pending changes, then refresh snapshot from remote.
        (async () => {
          if (isCancelled) return;
          setSyncStatus('syncing');
          setSyncMessage('Syncing…');

          // Try a few small passes to drain the queue quickly.
          for (let i = 0; i < 3; i++) {
            const result = await flushSyncQueueOnce();
            if (!result.didSync && result.processed === 0) break;
            if (result.remaining === 0) break;
          }

          // Only overwrite local snapshot when queue is drained (avoid clobbering offline edits).
          try {
            setSyncMessage('Refreshing…');
            const fresh = await refreshLocalFromRemote();
            if (!isCancelled) setAppState(fresh);
            setSyncStatus('idle');
            setSyncMessage(null);
          } catch (e) {
            if (isCancelled) return;
            setSyncStatus('error');
            setSyncMessage('Offline mode (sync failed)');
            setLoadError('Working offline. Database sync is currently unavailable.');
          }
        })();

      } catch (e) {
        console.error("Failed to load local data", e);
        if (!isCancelled) {
          setLoadError('Could not load local farm data. Loaded defaults instead.');
          setDidForceBoot(true);
          setAppState({
            crops: INITIAL_CROPS,
            trays: [],
            transactions: [],
            customers: INITIAL_CUSTOMERS,
          });
        }
      } finally {
        if (!isCancelled) {
          setLoadPhase('Done');
          setIsLoading(false);
        }
      }
    };
    initLocalFirst();

    return () => {
      isCancelled = true;
    };
  }, [authStatus, loadAttempt]);

  // --- Background sync loop ---
  useEffect(() => {
    if (authStatus !== 'admin') return;

    let isCancelled = false;
    let isRunning = false;

    const run = async (reason: 'interval' | 'kick') => {
      if (isCancelled || isRunning) return;
      isRunning = true;
      try {
        setSyncStatus('syncing');
        setSyncMessage(reason === 'kick' ? 'Syncing changes…' : 'Syncing…');

        const result = await flushSyncQueueOnce();
        if (!result.didSync) {
          setSyncStatus('error');
          setSyncMessage('Offline mode (sync failed)');
          setLoadError('Working offline. Database sync is currently unavailable.');
          return;
        }

        // If we actually pushed changes, refresh snapshot so other devices stay consistent.
        if (result.processed > 0) {
          setSyncMessage('Refreshing…');
          const fresh = await refreshLocalFromRemote();
          if (!isCancelled) setAppState(fresh);
        }

        setSyncStatus('idle');
        setSyncMessage(null);
      } catch (e) {
        console.error('Background sync failed', e);
        setSyncStatus('error');
        setSyncMessage('Offline mode (sync failed)');
      } finally {
        isRunning = false;
      }
    };

    // Initial kick (non-blocking)
    run('kick');
    const intervalId = window.setInterval(() => run('interval'), 15_000);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authStatus, syncKick]);

  // --- Handlers (Optimistic UI + API Calls) ---

  const handleAddTray = useCallback(async (cropId: string, count: number, location: string, capacity: number) => {
    const now = new Date().toISOString();
    const newTrays: Tray[] = Array.from({ length: count }).map(() => ({
      id: Math.random().toString(36).substr(2, 9),
      cropTypeId: cropId,
      startDate: now, // Start of Seed stage
      plantedAt: now,
      stage: Stage.SEED,
      notes: '',
      location: location || 'Shed',
      capacity: capacity || undefined,
      updatedAt: now
    }));
    
    setAppState(prev => ({ ...prev, trays: [...prev.trays, ...newTrays] }));
    
    try {
      await Promise.all(
        newTrays.map(async (t) => {
          await upsertLocalEntity('trays', t);
          await queueUpsert('trays', t);
        })
      );
      setSyncKick((v) => v + 1);
    } catch (e) {
        console.error("Failed to save trays", e);
    }
  }, []);

  const handleUpdateTrayStage = useCallback(async (trayId: string, newStage: Stage) => {
    const now = new Date().toISOString();
    let updatedTray: Tray | undefined;

    setAppState(prev => ({
      ...prev,
      trays: prev.trays.map(t => {
        if (t.id === trayId && t.stage !== newStage) {
          // Reset startDate when stage changes to track stage duration correctly
          updatedTray = { 
              ...t, 
              stage: newStage, 
              updatedAt: now, 
              startDate: now,
              stageUpdateAt: now 
          };
          return updatedTray;
        }
        return t;
      })
    }));

    if (updatedTray) {
        try {
            await upsertLocalEntity('trays', updatedTray);
            await queueUpsert('trays', updatedTray);
            setSyncKick((v) => v + 1);
        } catch (e) {
            console.error("Failed to update tray stage", e);
        }
    }
  }, []);

  const handleBulkUpdateTrayStage = useCallback(async (trayIds: string[], newStage: Stage) => {
    const now = new Date().toISOString();
    const updatedTrays: Tray[] = [];

    setAppState(prev => ({
      ...prev,
      trays: prev.trays.map(t => {
        if (trayIds.includes(t.id) && t.stage !== newStage) {
           const updated = { 
               ...t, 
               stage: newStage, 
               updatedAt: now, 
               startDate: now,
               stageUpdateAt: now
           };
           updatedTrays.push(updated);
           return updated;
        }
        return t;
      })
    }));

    if (updatedTrays.length > 0) {
        try {
            await Promise.all(
              updatedTrays.map(async (t) => {
                await upsertLocalEntity('trays', t);
                await queueUpsert('trays', t);
              })
            );
            setSyncKick((v) => v + 1);
        } catch (e) {
            console.error("Failed to bulk update trays", e);
        }
    }
  }, []);

  const handleUpdateTray = useCallback(async (trayId: string, updates: Partial<Tray>) => {
    let fullUpdatedTray: Tray | undefined;
    
    setAppState(prev => ({
      ...prev,
      trays: prev.trays.map(t => {
          if (t.id === trayId) {
              fullUpdatedTray = { ...t, ...updates, updatedAt: new Date().toISOString() };
              return fullUpdatedTray;
          }
          return t;
      })
    }));

    if (fullUpdatedTray) {
        try {
            await upsertLocalEntity('trays', fullUpdatedTray);
            await queueUpsert('trays', fullUpdatedTray);
            setSyncKick((v) => v + 1);
        } catch (e) {
             console.error("Failed to update tray", e);
        }
    }
  }, []);

  const handleDeleteTray = useCallback(async (trayId: string) => {
    if (window.confirm("Are you sure you want to delete this tray?")) {
      setAppState(prev => ({ ...prev, trays: prev.trays.filter(t => t.id !== trayId) }));
      try {
          await deleteLocalEntity('trays', trayId);
          await queueDelete('trays', { id: trayId });
          setSyncKick((v) => v + 1);
      } catch (e) {
          console.error("Failed to delete tray", e);
      }
    }
  }, []);

  const handleBulkDeleteTrays = useCallback(async (trayIds: string[]) => {
    if (window.confirm(`Are you sure you want to delete ${trayIds.length} trays?`)) {
      setAppState(prev => ({ ...prev, trays: prev.trays.filter(t => !trayIds.includes(t.id)) }));
      try {
          await Promise.all(
            trayIds.map(async (id) => {
              await deleteLocalEntity('trays', id);
              await queueDelete('trays', { id });
            })
          );
          setSyncKick((v) => v + 1);
      } catch (e) {
          console.error("Failed to bulk delete trays", e);
      }
    }
  }, []);

  const handleAddTransaction = useCallback(async (type: 'income' | 'expense', amount: number, category: string, desc: string, customerId?: string, payee?: string) => {
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type, category, amount, description: desc, customerId, payee
    };
    setAppState(prev => ({ ...prev, transactions: [...prev.transactions, newTx] }));
    
    try {
        await upsertLocalEntity('transactions', newTx);
        await queueUpsert('transactions', newTx);
        setSyncKick((v) => v + 1);
    } catch (e) {
        console.error("Failed to save transaction", e);
    }
  }, []);

  const handleUpdateTransaction = useCallback(async (updatedTx: Transaction) => {
    setAppState(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t) }));
    try {
        await upsertLocalEntity('transactions', updatedTx);
        await queueUpsert('transactions', updatedTx);
        setSyncKick((v) => v + 1);
    } catch (e) {
        console.error("Failed to update transaction", e);
    }
  }, []);

  const handleDeleteTransaction = useCallback(async (txId: string) => {
    if (window.confirm("Are you sure you want to delete this transaction record?")) {
      setAppState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== txId) }));
      try {
          await deleteLocalEntity('transactions', txId);
          await queueDelete('transactions', { id: txId });
          setSyncKick((v) => v + 1);
      } catch (e) {
          console.error("Failed to delete transaction", e);
      }
    }
  }, []);

  const handleAddCustomer = useCallback(async (customer: Customer) => {
    const newCustomer = { ...customer, id: Math.random().toString(36).substr(2, 9) };
    setAppState(prev => ({ ...prev, customers: [...prev.customers, newCustomer] }));
    try {
        await upsertLocalEntity('customers', newCustomer);
        await queueUpsert('customers', newCustomer);
        setSyncKick((v) => v + 1);
    } catch (e) {
        console.error("Failed to save customer", e);
    }
  }, []);

  const handleUpdateCustomer = useCallback(async (customer: Customer) => {
    setAppState(prev => ({ ...prev, customers: prev.customers.map(c => c.id === customer.id ? customer : c) }));
    try {
        await upsertLocalEntity('customers', customer);
        await queueUpsert('customers', customer);
        setSyncKick((v) => v + 1);
    } catch (e) {
        console.error("Failed to update customer", e);
    }
  }, []);

  const handleDeleteCustomer = useCallback(async (customerId: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      setAppState(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== customerId) }));
      try {
          await deleteLocalEntity('customers', customerId);
          await queueDelete('customers', { id: customerId });
          setSyncKick((v) => v + 1);
      } catch (e) {
          console.error("Failed to delete customer", e);
      }
    }
  }, []);

  const handleAddCrop = useCallback(async (crop: CropType) => {
    setAppState(prev => ({ ...prev, crops: [...prev.crops, crop] }));
    try {
        await upsertLocalEntity('crops', crop);
        await queueUpsert('crops', crop);
        setSyncKick((v) => v + 1);
    } catch (e) {
        console.error("Failed to save crop", e);
    }
  }, []);

  const handleUpdateCrop = useCallback(async (updatedCrop: CropType) => {
    setAppState(prev => ({ ...prev, crops: prev.crops.map(c => c.id === updatedCrop.id ? updatedCrop : c) }));
    try {
        await upsertLocalEntity('crops', updatedCrop);
        await queueUpsert('crops', updatedCrop);
        setSyncKick((v) => v + 1);
    } catch (e) {
        console.error("Failed to update crop", e);
    }
  }, []);

  const handleDeleteCrop = useCallback(async (cropId: string) => {
    if (window.confirm("Are you sure you want to remove this crop?")) {
      setAppState(prev => ({ ...prev, crops: prev.crops.filter(c => c.id !== cropId) }));
      try {
          await deleteLocalEntity('crops', cropId);
          await queueDelete('crops', { id: cropId });
          setSyncKick((v) => v + 1);
      } catch (e) {
          console.error("Failed to delete crop", e);
      }
    }
  }, []);

  // Note: Import/Reset might need more work to sync with DB, for now we just reload or use basic implementations
  const handleImportState = useCallback(async (newState: AppState) => {
      // For now, client side set, but we should probably push to DB?
      // Pushing 1000 items is heavy. 
      // A "Restore" button should probably use the seed API.
      setAppState(newState);
      try {
        await saveState(newState);
        // Queue upserts (best-effort); syncing happens in background.
        await Promise.all([
          ...newState.crops.map(async (c) => queueUpsert('crops', c)),
          ...newState.trays.map(async (t) => queueUpsert('trays', t)),
          ...newState.transactions.map(async (tx) => queueUpsert('transactions', tx)),
          ...newState.customers.map(async (c) => queueUpsert('customers', c)),
        ]);
        setSyncKick((v) => v + 1);
        alert("State loaded locally. Sync will push it to the database in the background.");
      } catch (e) {
        console.error('Failed to persist imported state locally', e);
        alert("State loaded in memory, but failed to persist locally.");
      }
  }, []);
  
  const handleResetState = useCallback(async () => {
    // Basic reset
    setAppState({ crops: INITIAL_CROPS, trays: [], transactions: [], customers: INITIAL_CUSTOMERS });
    // TODO: Clear DB?
  }, []);

  // --- Dismissed Alerts State (shared across components) ---
  const [dismissedAlerts, setDismissedAlerts] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('galway_dismissed_alerts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setDismissedAlerts(new Set(parsed));
        }
      }
    } catch (e) {
      console.warn('Failed to load dismissed alerts from localStorage', e);
    }
  }, []);

  // Listen for storage events to sync dismissed alerts across tabs
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'galway_dismissed_alerts' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setDismissedAlerts(new Set(parsed));
          }
        } catch (e) {
          console.warn('Failed to parse dismissed alerts from storage event', e);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // --- Alert Calculation for Badge & Notifications ---
  const allAlerts = React.useMemo(() => {
     try {
        if (!Array.isArray(appState.trays) || !Array.isArray(appState.crops)) return [];
        return getFarmAlerts(appState);
     } catch (e) {
        console.error("Alert calc error", e);
        return [];
     }
  }, [appState]);

  // Filter out dismissed alerts for the badge count
  const alerts = React.useMemo(() => {
    return allAlerts.filter(alert => !dismissedAlerts.has(alert.id));
  }, [allAlerts, dismissedAlerts]);

  const alertCount = alerts.length;

  // Handler to dismiss an alert (shared across components)
  const handleDismissAlert = React.useCallback((alertId: string) => {
    setDismissedAlerts(prev => {
      const newDismissed = new Set(prev);
      newDismissed.add(alertId);
      try {
        localStorage.setItem('galway_dismissed_alerts', JSON.stringify(Array.from(newDismissed)));
      } catch (e) {
        console.warn('Failed to save dismissed alerts to localStorage', e);
      }
      return newDismissed;
    });
  }, []);

  // --- Rendering ---

  if (fatalError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-extrabold text-slate-900">App crashed</h2>
            <p className="text-sm text-slate-500 mt-1">
              View: <span className="font-mono text-xs">{currentView}</span>
            </p>
          </div>
          <div className="p-6 space-y-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Error</div>
              <div className="mt-1 font-mono text-xs text-slate-900 whitespace-pre-wrap break-words">{fatalError.message}</div>
              {fatalError.source && (
                <div className="mt-2 text-[10px] font-mono text-slate-500 whitespace-pre-wrap break-words">
                  {fatalError.source}
                </div>
              )}
            </div>
            {fatalError.stack && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 max-h-52 overflow-auto">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stack</div>
                <div className="mt-1 font-mono text-[10px] text-slate-700 whitespace-pre-wrap break-words">
                  {fatalError.stack}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFatalError(null);
                  setCurrentView('dashboard');
                }}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 text-white font-bold"
              >
                Recover
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 text-slate-900 font-bold"
              >
                Reload
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">crash-capture:v1</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && authStatus === 'admin') {
     const elapsedSec = Math.max(0, Math.round((Date.now() - loadStartedAtRef.current) / 1000));
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
           <div className="flex flex-col items-center">
              <div className="bg-teal-600 p-3 rounded-2xl mb-4 animate-bounce"><Sprout className="w-8 h-8 text-white" /></div>
              <h2 className="text-slate-100 font-bold text-lg">Loading Farm Data...</h2>
              <p className="mt-2 text-slate-400 text-sm font-semibold">{loadPhase} · {elapsedSec}s</p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setLoadError('Loaded offline defaults (manual override).');
                    setAppState({
                      crops: INITIAL_CROPS,
                      trays: [],
                      transactions: MOCK_TRANSACTIONS ?? [],
                      customers: INITIAL_CUSTOMERS,
                    });
                    setIsLoading(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-100 font-bold text-sm hover:bg-slate-700 transition"
                >
                  Continue offline
                </button>
                <button
                  onClick={() => setLoadAttempt(v => v + 1)}
                  className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 transition"
                >
                  Retry
                </button>
              </div>
              <p className="mt-4 text-slate-500 text-xs font-mono opacity-80">boot:lf4 crash-capture:v1</p>
           </div>
        </div>
     );
  }

  if (authStatus === 'landing') return <LandingPage onLoginClick={() => setAuthStatus('login')} />;
  if (authStatus === 'login') return <LoginPage onLoginSuccess={() => setAuthStatus('admin')} onBack={() => setAuthStatus('landing')} />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard state={appState} onNavigate={setCurrentView} dismissedAlerts={dismissedAlerts} onDismissAlert={handleDismissAlert} />;
      case 'crops': return (
          <CropManager 
            state={appState} 
            onAddTray={handleAddTray} 
            onUpdateTrayStage={handleUpdateTrayStage}
            onBulkUpdateTrayStage={handleBulkUpdateTrayStage}
            onUpdateTray={handleUpdateTray}
            onDeleteTray={handleDeleteTray}
            onBulkDeleteTrays={handleBulkDeleteTrays}
            onAddCrop={handleAddCrop}
            onUpdateCrop={handleUpdateCrop}
            onDeleteCrop={handleDeleteCrop}
          />
        );
      case 'calculator': return <ProfitCalculator state={appState} />;
      case 'finance': return (
          <FinanceTracker 
            state={appState} 
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        );
      case 'data': return <DataManager state={appState} onImport={handleImportState} onReset={handleResetState} />;
      case 'ai': return <AIAssistant state={appState} />;
      default: return <Dashboard state={appState} onNavigate={setCurrentView} />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView} onLogout={() => setAuthStatus('landing')} alertCount={alertCount}>
      {didForceBoot && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 text-sm font-semibold">
            Local-first mode: started with defaults (local DB was empty or slow). Changes will sync when online.
          </div>
        </div>
      )}
      {loadError && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm font-semibold">
            {loadError}
          </div>
        </div>
      )}
      {syncMessage && (
        <div className="px-4 pt-2">
          <div
            className={`rounded-2xl border px-4 py-2 text-xs font-bold ${
              syncStatus === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            {syncMessage}
          </div>
        </div>
      )}
      <NotificationManager alerts={alerts} />
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => setCurrentView('dashboard')}
        // Important: if one view throws (e.g. CropManager), don't "brick" the whole app.
        // Reset the boundary whenever the user navigates to a different view.
        resetKeys={[currentView]}
        onError={(error) => {
          // React render errors won't always hit window.onerror, especially on mobile.
          setFatalError({ message: error.message || 'Render error', stack: error.stack, source: 'ErrorBoundary' });
        }}
      >
        <Suspense fallback={<ViewLoading />}>{renderView()}</Suspense>
      </ErrorBoundary>
    </Layout>
  );
};

export default App;
