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
import { api } from './services/api';
import { getFarmAlerts } from './services/alertService';
import { Sprout } from 'lucide-react';

const App: React.FC = () => {
  // --- Auth & Routing State ---
  const [authStatus, setAuthStatus] = useState<'landing' | 'login' | 'admin'>('landing');

  // --- App State Management ---
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  const [appState, setAppState] = useState<AppState>({
    crops: [],
    trays: [],
    transactions: [],
    customers: []
  });

  // --- Initial Load from API ---
  useEffect(() => {
    const init = async () => {
      try {
        // Ensure DB is setup
        await api.setup();
        
        // Parallel Fetch
        const [crops, trays, transactions, customers] = await Promise.all([
            api.getCrops(),
            api.getTrays(),
            api.getTransactions(),
            api.getCustomers()
        ]);

        let loadedCrops = crops;
        let loadedCustomers = customers;

        // Seed if empty
        if (crops.length === 0) {
            console.log("Seeding initial data...");
            await api.seed({ crops: INITIAL_CROPS, customers: INITIAL_CUSTOMERS });
            loadedCrops = INITIAL_CROPS;
            loadedCustomers = INITIAL_CUSTOMERS;
        }

        setAppState({
            crops: loadedCrops,
            trays,
            transactions,
            customers: loadedCustomers
        });

      } catch (e) {
        console.error("Failed to load data from API", e);
        // Fallback to constants for critical data if API fails completely? 
        // Or show error.
      } finally {
        setIsLoading(false);
      }
    };
    if (authStatus === 'admin') {
        init();
    }
  }, [authStatus]);

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
        await Promise.all(newTrays.map(t => api.saveTray(t)));
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
            await api.saveTray(updatedTray);
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
            await Promise.all(updatedTrays.map(t => api.saveTray(t)));
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
            await api.saveTray(fullUpdatedTray);
        } catch (e) {
             console.error("Failed to update tray", e);
        }
    }
  }, []);

  const handleDeleteTray = useCallback(async (trayId: string) => {
    if (window.confirm("Are you sure you want to delete this tray?")) {
      setAppState(prev => ({ ...prev, trays: prev.trays.filter(t => t.id !== trayId) }));
      try {
          await api.deleteTray(trayId);
      } catch (e) {
          console.error("Failed to delete tray", e);
      }
    }
  }, []);

  const handleBulkDeleteTrays = useCallback(async (trayIds: string[]) => {
    if (window.confirm(`Are you sure you want to delete ${trayIds.length} trays?`)) {
      setAppState(prev => ({ ...prev, trays: prev.trays.filter(t => !trayIds.includes(t.id)) }));
      try {
          // Delete sequentially or parallel? Parallel is fine.
          await Promise.all(trayIds.map(id => api.deleteTray(id)));
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
        await api.saveTransaction(newTx);
    } catch (e) {
        console.error("Failed to save transaction", e);
    }
  }, []);

  const handleUpdateTransaction = useCallback(async (updatedTx: Transaction) => {
    setAppState(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t) }));
    try {
        await api.saveTransaction(updatedTx);
    } catch (e) {
        console.error("Failed to update transaction", e);
    }
  }, []);

  const handleDeleteTransaction = useCallback(async (txId: string) => {
    if (window.confirm("Are you sure you want to delete this transaction record?")) {
      setAppState(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== txId) }));
      try {
          await api.deleteTransaction(txId);
      } catch (e) {
          console.error("Failed to delete transaction", e);
      }
    }
  }, []);

  const handleAddCustomer = useCallback(async (customer: Customer) => {
    const newCustomer = { ...customer, id: Math.random().toString(36).substr(2, 9) };
    setAppState(prev => ({ ...prev, customers: [...prev.customers, newCustomer] }));
    try {
        await api.saveCustomer(newCustomer);
    } catch (e) {
        console.error("Failed to save customer", e);
    }
  }, []);

  const handleUpdateCustomer = useCallback(async (customer: Customer) => {
    setAppState(prev => ({ ...prev, customers: prev.customers.map(c => c.id === customer.id ? customer : c) }));
    try {
        await api.saveCustomer(customer);
    } catch (e) {
        console.error("Failed to update customer", e);
    }
  }, []);

  const handleDeleteCustomer = useCallback(async (customerId: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      setAppState(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== customerId) }));
      try {
          await api.deleteCustomer(customerId);
      } catch (e) {
          console.error("Failed to delete customer", e);
      }
    }
  }, []);

  const handleAddCrop = useCallback(async (crop: CropType) => {
    setAppState(prev => ({ ...prev, crops: [...prev.crops, crop] }));
    try {
        await api.saveCrop(crop);
    } catch (e) {
        console.error("Failed to save crop", e);
    }
  }, []);

  const handleUpdateCrop = useCallback(async (updatedCrop: CropType) => {
    setAppState(prev => ({ ...prev, crops: prev.crops.map(c => c.id === updatedCrop.id ? updatedCrop : c) }));
    try {
        await api.saveCrop(updatedCrop);
    } catch (e) {
        console.error("Failed to update crop", e);
    }
  }, []);

  const handleDeleteCrop = useCallback(async (cropId: string) => {
    if (window.confirm("Are you sure you want to remove this crop?")) {
      setAppState(prev => ({ ...prev, crops: prev.crops.filter(c => c.id !== cropId) }));
      try {
          await api.deleteCrop(cropId);
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
      alert("State loaded in memory. To persist, please use the Data Manager Restore function.");
  }, []);
  
  const handleResetState = useCallback(async () => {
    // Basic reset
    setAppState({ crops: INITIAL_CROPS, trays: [], transactions: [], customers: INITIAL_CUSTOMERS });
    // TODO: Clear DB?
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

  if (isLoading && authStatus === 'admin') {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
           <div className="flex flex-col items-center">
              <div className="bg-teal-600 p-3 rounded-2xl mb-4 animate-bounce"><Sprout className="w-8 h-8 text-white" /></div>
              <h2 className="text-slate-100 font-bold text-lg">Loading Farm Data...</h2>
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
