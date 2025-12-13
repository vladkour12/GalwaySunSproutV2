
import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from './components/ErrorFallback';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CropManager from './components/CropManager';
import FinanceTracker from './components/FinanceTracker';
import AIAssistant from './components/AIAssistant';
import DataManager from './components/DataManager';
import ProfitCalculator from './components/ProfitCalculator';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import NotificationManager from './components/NotificationManager';
import { AppState, View, Stage, Transaction, CropType, Customer, Tray } from './types';
import { INITIAL_CROPS, MOCK_TRANSACTIONS, INITIAL_CUSTOMERS } from './constants';
import { loadState, saveState } from './services/storage';
import { getFarmAlerts } from './services/alertService';
import { Sprout } from 'lucide-react';

const App: React.FC = () => {
  // --- Auth & Routing State ---
  const [authStatus, setAuthStatus] = useState<'landing' | 'login' | 'admin'>('landing');

  // --- App State Management ---
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  const [appState, setAppState] = useState<AppState>({
    crops: INITIAL_CROPS,
    trays: [],
    transactions: [...MOCK_TRANSACTIONS],
    customers: INITIAL_CUSTOMERS
  });

  // --- Initial Load from IndexedDB ---
  useEffect(() => {
    const init = async () => {
      try {
        const savedState = await loadState();
        if (savedState) {
           if (!savedState.crops || savedState.crops.length === 0) savedState.crops = INITIAL_CROPS;
           if (!savedState.customers) savedState.customers = INITIAL_CUSTOMERS;
           // Migration check
           if (savedState.crops.some(c => c.id === 'c1')) savedState.crops = INITIAL_CROPS;
           
           setAppState(prev => ({ ...prev, ...savedState, crops: savedState.crops || INITIAL_CROPS, trays: savedState.trays || [], transactions: savedState.transactions || [], customers: savedState.customers || INITIAL_CUSTOMERS }));
        }
      } catch (e) {
        console.error("Failed to load DB", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // --- Save to IndexedDB on Change (Debounced) ---
  useEffect(() => {
    if (isLoading) return;
    const timeoutId = setTimeout(() => {
      saveState(appState).catch(e => console.error("Save failed", e));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [appState, isLoading]);

  // --- Optimized Handlers (Wrapped in useCallback) ---

  const handleAddTray = useCallback((cropId: string, count: number, location: string, capacity: number) => {
    const now = new Date().toISOString();
    const newTrays = Array.from({ length: count }).map(() => ({
      id: Math.random().toString(36).substr(2, 9),
      cropTypeId: cropId,
      startDate: now,
      plantedAt: now,
      stage: Stage.SEED,
      notes: '',
      location: location || 'Shed',
      capacity: capacity || undefined,
      updatedAt: now
    }));
    setAppState(prev => ({ ...prev, trays: [...prev.trays, ...newTrays] }));
  }, []);

  const handleUpdateTrayStage = useCallback((trayId: string, newStage: Stage) => {
    setAppState(prev => ({
      ...prev,
      trays: prev.trays.map(t => {
        if (t.id === trayId && t.stage !== newStage) {
          return { ...t, stage: newStage, updatedAt: new Date().toISOString(), startDate: new Date().toISOString() };
        }
        return t;
      })
    }));
  }, []);

  const handleBulkUpdateTrayStage = useCallback((trayIds: string[], newStage: Stage) => {
    setAppState(prev => ({
      ...prev,
      trays: prev.trays.map(t => {
        if (trayIds.includes(t.id) && t.stage !== newStage) {
           return { ...t, stage: newStage, updatedAt: new Date().toISOString(), startDate: new Date().toISOString() };
        }
        return t;
      })
    }));
  }, []);

  const handleUpdateTray = useCallback((trayId: string, updates: Partial<Tray>) => {
    setAppState(prev => ({
      ...prev,
      trays: prev.trays.map(t => t.id === trayId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
    }));
  }, []);

  const handleDeleteTray = useCallback((trayId: string) => {
    if (window.confirm("Are you sure you want to delete this tray?")) {
      setAppState(prev => ({ ...prev, trays: prev.trays.filter(t => t.id !== trayId) }));
    }
  }, []);

  const handleBulkDeleteTrays = useCallback((trayIds: string[]) => {
    if (window.confirm(`Are you sure you want to delete ${trayIds.length} trays?`)) {
      setAppState(prev => ({ ...prev, trays: prev.trays.filter(t => !trayIds.includes(t.id)) }));
    }
  }, []);

  const handleAddTransaction = useCallback((type: 'income' | 'expense', amount: number, category: string, desc: string, customerId?: string, payee?: string) => {
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      type, category, amount, description: desc, customerId, payee
    };
    setAppState(prev => ({ ...prev, transactions: [...prev.transactions, newTx] }));
  }, []);

  const handleUpdateTransaction = useCallback((updatedTx: Transaction) => {
    setAppState(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t) }));
  }, []);

  const handleDeleteTransaction = useCallback((txId: string) => {
    if (window.confirm("Are you sure you want to delete this transaction record?")) {
      setAppState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== txId) }));
    }
  }, []);

  const handleAddCustomer = useCallback((customer: Customer) => {
    setAppState(prev => ({ ...prev, customers: [...prev.customers, { ...customer, id: Math.random().toString(36).substr(2, 9) }] }));
  }, []);

  const handleUpdateCustomer = useCallback((customer: Customer) => {
    setAppState(prev => ({ ...prev, customers: prev.customers.map(c => c.id === customer.id ? customer : c) }));
  }, []);

  const handleDeleteCustomer = useCallback((customerId: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      setAppState(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== customerId) }));
    }
  }, []);

  const handleAddCrop = useCallback((crop: CropType) => {
    setAppState(prev => ({ ...prev, crops: [...prev.crops, crop] }));
  }, []);

  const handleUpdateCrop = useCallback((updatedCrop: CropType) => {
    setAppState(prev => ({ ...prev, crops: prev.crops.map(c => c.id === updatedCrop.id ? updatedCrop : c) }));
  }, []);

  const handleDeleteCrop = useCallback((cropId: string) => {
    // Note: Can't access appState here easily inside useCallback without dependency, 
    // but simple check in setter is better or we pass state to children to check.
    // For now, simpler: we check in the component that calls this (CropManager already checks).
    if (window.confirm("Are you sure you want to remove this crop?")) {
      setAppState(prev => ({ ...prev, crops: prev.crops.filter(c => c.id !== cropId) }));
    }
  }, []);

  const handleImportState = useCallback((newState: AppState) => setAppState(newState), []);
  
  const handleResetState = useCallback(() => {
    setAppState({ crops: INITIAL_CROPS, trays: [], transactions: [...MOCK_TRANSACTIONS], customers: INITIAL_CUSTOMERS });
  }, []);

  // --- Alert Calculation for Badge & Notifications ---
  const alerts = React.useMemo(() => {
     try {
        if (!Array.isArray(appState.trays) || !Array.isArray(appState.crops)) return [];
        return getFarmAlerts(appState);
     } catch (e) {
        console.error("Alert calc error", e);
        return [];
     }
  }, [appState]);

  const alertCount = alerts.length;

  // --- Rendering ---

  if (isLoading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
           <div className="flex flex-col items-center">
              <div className="bg-teal-600 p-3 rounded-2xl mb-4 animate-bounce"><Sprout className="w-8 h-8 text-white" /></div>
              <h2 className="text-slate-800 font-bold text-lg">Loading Farm Data...</h2>
           </div>
        </div>
     );
  }

  if (authStatus === 'landing') return <LandingPage onLoginClick={() => setAuthStatus('login')} />;
  if (authStatus === 'login') return <LoginPage onLoginSuccess={() => setAuthStatus('admin')} onBack={() => setAuthStatus('landing')} />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard state={appState} onNavigate={setCurrentView} />;
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
      <NotificationManager alerts={alerts} />
      <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => setCurrentView('dashboard')}>
        {renderView()}
      </ErrorBoundary>
    </Layout>
  );
};

export default App;
