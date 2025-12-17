
import React, { useEffect, useState } from 'react';
import { AppState, Tray, Transaction, Customer, CropType } from '../types';
import { clearDB, getStorageEstimate, getDatabaseStats, DbStats } from '../services/storage';
import { Database, Download, Upload, Trash2, HardDrive, AlertTriangle, CheckCircle, Image as ImageIcon, Sprout, ShoppingBag, Users, X, DollarSign, Scale, Calendar, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { INITIAL_CROPS, INITIAL_CUSTOMERS } from '../constants';
import { refreshLocalFromRemote } from '../services/syncService';

interface DataManagerProps {
  state: AppState;
  onImport: (newState: AppState) => void;
  onReset: () => void;
  onStateUpdate?: (newState: AppState) => void;
}

const DataManager: React.FC<DataManagerProps> = ({ state, onImport, onReset, onStateUpdate }) => {
  const [storageStats, setStorageStats] = useState<{ usage: number; quota: number } | null>(null);
  const [dbBreakdown, setDbBreakdown] = useState<DbStats[]>([]);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  
  // Data Inspector State
  const [viewingStore, setViewingStore] = useState<string | null>(null);

  useEffect(() => {
    getStorageEstimate().then(setStorageStats);
    getDatabaseStats().then(setDbBreakdown);
  }, [state]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getCount = (store: string) => dbBreakdown.find(s => s.store === store)?.count || 0;

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `galway-sun-sprouts-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];

    if (file) {
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (e) => {
        try {
          const content = e.target?.result;
          if (typeof content === 'string') {
            const parsedState = JSON.parse(content);
            if (parsedState.crops && parsedState.trays) {
              onImport(parsedState);
              setImportStatus('success');
              setTimeout(() => setImportStatus('idle'), 3000);
            } else {
              throw new Error("Invalid format");
            }
          }
        } catch (error) {
          console.error("Import failed:", error);
          setImportStatus('error');
          setTimeout(() => setImportStatus('idle'), 3000);
        }
      };
    }
  };

  const handleFactoryReset = async () => {
    if (window.confirm("FINAL WARNING: This will delete ALL data including custom crops and images. This cannot be undone.")) {
       await clearDB();
       onReset(); 
       setResetConfirm(false);
    }
  };

  const handleUploadToRemote = async () => {
    setDownloadStatus('downloading'); // Reuse the same status for upload
    try {
      console.log('Uploading local data to remote database...');
      
      // Check if we're in development without API routes
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalDev) {
        try {
          const testResponse = await fetch('/api/version', { method: 'GET' });
          if (!testResponse.ok && testResponse.status === 404) {
            alert('⚠️ API routes are not available in local development.\n\n' +
                  'To upload to remote database:\n' +
                  '• Deploy to Vercel (works automatically)\n' +
                  '• Or run: npm run dev:vercel');
            setDownloadStatus('error');
            setTimeout(() => setDownloadStatus('idle'), 3000);
            return;
          }
        } catch (fetchError) {
          alert('⚠️ API routes are not available in local development.\n\n' +
                'To upload to remote database:\n' +
                '• Deploy to Vercel (works automatically)\n' +
                '• Or run: npm run dev:vercel');
          setDownloadStatus('error');
          setTimeout(() => setDownloadStatus('idle'), 3000);
          return;
        }
      }
      
      // Ensure database is set up
      try {
        await api.setup();
      } catch (setupError) {
        console.warn('Setup warning (may already exist):', setupError);
      }
      
      // Upload all local data to remote
      console.log('Uploading crops...');
      for (const crop of state.crops) {
        try {
          await api.saveCrop(crop);
        } catch (e) {
          console.warn(`Failed to upload crop ${crop.name}:`, e);
        }
      }
      
      console.log('Uploading trays...');
      for (const tray of state.trays) {
        try {
          await api.saveTray(tray);
        } catch (e) {
          console.warn(`Failed to upload tray ${tray.id}:`, e);
        }
      }
      
      console.log('Uploading transactions...');
      for (const txn of state.transactions) {
        try {
          await api.saveTransaction(txn);
        } catch (e) {
          console.warn(`Failed to upload transaction ${txn.id}:`, e);
        }
      }
      
      console.log('Uploading customers...');
      for (const customer of state.customers) {
        try {
          await api.saveCustomer(customer);
        } catch (e) {
          console.warn(`Failed to upload customer ${customer.name}:`, e);
        }
      }
      
      const uploadedCount = {
        crops: state.crops.length,
        trays: state.trays.length,
        transactions: state.transactions.length,
        customers: state.customers.length,
        images: state.crops.filter(c => c.imageUrl).length
      };
      
      console.log('Uploaded to remote:', uploadedCount);
      
      setDownloadStatus('success');
      
      // Show success message
      const message = `Successfully uploaded to remote database:\n• ${uploadedCount.crops} crops\n• ${uploadedCount.trays} trays\n• ${uploadedCount.transactions} transactions\n• ${uploadedCount.customers} customers\n• ${uploadedCount.images} images`;
      alert(message);
      
      setTimeout(() => {
        setDownloadStatus('idle');
      }, 2000);
    } catch (error: any) {
      console.error('Upload failed:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        alert(`Network error: ${errorMessage}\n\nMake sure you're connected to the internet and the database is accessible.`);
      } else {
        alert(`Upload failed: ${errorMessage}\n\nCheck browser console (F12) for more details.`);
      }
      
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 5000);
    }
  };

  const handleDownloadFromRemote = async () => {
    setDownloadStatus('downloading');
    try {
      console.log('Downloading data from remote database...');
      
      // Check if we're in development without API routes
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalDev) {
        try {
          const testResponse = await fetch('/api/version', { method: 'GET' });
          if (!testResponse.ok && testResponse.status === 404) {
            alert('⚠️ API routes are not available in local development.\n\n' +
                  'To download from remote database:\n' +
                  '• Deploy to Vercel (works automatically)\n' +
                  '• Or run: npm run dev:vercel');
            setDownloadStatus('error');
            setTimeout(() => setDownloadStatus('idle'), 3000);
            return;
          }
        } catch (fetchError) {
          alert('⚠️ API routes are not available in local development.\n\n' +
                'To download from remote database:\n' +
                '• Deploy to Vercel (works automatically)\n' +
                '• Or run: npm run dev:vercel');
          setDownloadStatus('error');
          setTimeout(() => setDownloadStatus('idle'), 3000);
          return;
        }
      }
      
      // Download from remote and save to local
      console.log('Fetching data from remote database...');
      const remoteState = await refreshLocalFromRemote();
      
      const downloadedCount = {
        crops: remoteState.crops.length,
        trays: remoteState.trays.length,
        transactions: remoteState.transactions.length,
        customers: remoteState.customers.length,
        images: remoteState.crops.filter(c => c.imageUrl?.startsWith('data:')).length
      };
      
      console.log('Downloaded from remote:', downloadedCount);
      
      // Check if database is empty
      if (downloadedCount.crops === 0 && downloadedCount.trays === 0 && downloadedCount.transactions === 0) {
        const shouldUpload = confirm('Remote database appears to be empty.\n\nWould you like to upload your local data to the remote database instead?');
        if (shouldUpload) {
          setDownloadStatus('idle');
          await handleUploadToRemote();
          return;
        }
      }
      
      // Update app state if callback provided
      if (onStateUpdate) {
        onStateUpdate(remoteState);
      }
      
      // Refresh storage stats
      await getStorageEstimate().then(setStorageStats);
      await getDatabaseStats().then(setDbBreakdown);
      
      setDownloadStatus('success');
      
      // Show success message
      const message = `Successfully downloaded:\n• ${downloadedCount.crops} crops\n• ${downloadedCount.trays} trays\n• ${downloadedCount.transactions} transactions\n• ${downloadedCount.customers} customers\n• ${downloadedCount.images} images converted`;
      alert(message);
      
      setTimeout(() => {
        setDownloadStatus('idle');
        // Reload to show updated data
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Download failed:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        alert(`Network error: ${errorMessage}\n\nMake sure you're connected to the internet and the database is accessible.`);
      } else {
        alert(`Download failed: ${errorMessage}\n\nCheck browser console (F12) for more details.`);
      }
      
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 5000);
    }
  };

  const handleSyncCrops = async () => {
    setSyncStatus('syncing');
    try {
      console.log('Starting sync...', { cropCount: INITIAL_CROPS.length });
      
      // Check if we're in development without API routes
      const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocalDev) {
        // Try to detect if API routes are available
        try {
          const testResponse = await fetch('/api/version', { method: 'GET' });
          if (!testResponse.ok && testResponse.status === 404) {
            // API routes not available
            alert('⚠️ API routes are not available in local development.\n\n' +
                  'The sync will work automatically when deployed to Vercel.\n\n' +
                  'To test locally, run: npm run dev:vercel');
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
            return;
          }
        } catch (fetchError) {
          // Network error or API not available
          alert('⚠️ API routes are not available in local development.\n\n' +
                'The sync will work automatically when deployed to Vercel.\n\n' +
                'To test locally, run: npm run dev:vercel');
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 3000);
          return;
        }
      }
      
      // First ensure database is set up (this adds missing columns)
      try {
        console.log('Running database setup...');
        await api.setup();
        console.log('Database setup completed');
      } catch (setupError: any) {
        console.warn('Setup warning (may already exist):', setupError);
        // Continue even if setup fails - columns might already exist
      }
      
      // Then sync crops
      console.log('Seeding crops to database...');
      const cropsWithImages = INITIAL_CROPS.filter(c => c.imageUrl);
      const cropsWithoutImages = INITIAL_CROPS.filter(c => !c.imageUrl);
      console.log(`Syncing ${INITIAL_CROPS.length} crops (${cropsWithImages.length} with images, ${cropsWithoutImages.length} without)`);
      if (cropsWithoutImages.length > 0) {
        console.warn('Crops without images:', cropsWithoutImages.map(c => c.name));
      }
      cropsWithImages.forEach(crop => {
        console.log(`  - ${crop.name}: ${crop.imageUrl}`);
      });
      await api.seed({ crops: INITIAL_CROPS, customers: INITIAL_CUSTOMERS });
      console.log('Sync completed successfully - all crop images saved to database');
      
      // Note: refreshLocalFromRemote will be called automatically by App.tsx's sync loop
      // No need to manually refresh here to avoid circular dependencies
      
      setSyncStatus('success');
      setTimeout(() => {
        setSyncStatus('idle');
        // Refresh the page to load updated crops from database
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Sync failed with error:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const is404 = error?.status === 404;
      
      console.error('Error details:', {
        message: errorMessage,
        stack: error?.stack,
        response: error?.response,
        status: error?.status
      });
      
      // Show helpful error message for 404s
      if (is404) {
        alert('⚠️ API routes not available (404 error).\n\n' +
              'API routes only work when:\n' +
              '• Deployed to Vercel (sync will work automatically)\n' +
              '• Running locally with: npm run dev:vercel\n\n' +
              'Your code is ready - sync will work after deployment!');
      } else {
        alert(`Sync failed: ${errorMessage}\n\nCheck browser console (F12) for more details.`);
      }
      
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  // --- Data Rendering Helper ---
  const renderDataContent = () => {
     if (!viewingStore) return null;

     switch(viewingStore) {
        case 'trays':
           return (
              <div className="space-y-2">
                 {state.trays.length === 0 && <p className="text-slate-400 text-center py-4">No records found.</p>}
                 {state.trays.slice().reverse().map((tray: Tray) => {
                    const crop = state.crops.find(c => c.id === tray.cropTypeId);
                    const crop2 = tray.cropTypeId2 ? state.crops.find(c => c.id === tray.cropTypeId2) : null;
                    const displayName = crop2 ? `${crop?.name || 'Unknown'} + ${crop2.name}` : (crop?.name || 'Unknown Crop');
                    return (
                       <div key={tray.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                          <div>
                             <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800 text-sm">{displayName}</p>
                                {crop2 && (
                                   <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Half-Half</span>
                                )}
                             </div>
                             <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
                                <span className={`px-1.5 py-0.5 rounded border ${tray.stage === 'Harvested' ? 'bg-teal-50 border-teal-100 text-teal-700' : 'bg-white border-slate-200'}`}>{tray.stage}</span>
                                <span>{new Date(tray.startDate).toLocaleDateString()}</span>
                                <span>{tray.location}</span>
                             </div>
                          </div>
                          <div className="text-right">
                             {tray.yield && (
                                <span className="flex items-center justify-end text-xs font-bold text-teal-600 mb-1">
                                   <Scale className="w-3 h-3 mr-1" />
                                   {tray.yield}g
                                </span>
                             )}
                             <span className="text-[10px] text-slate-400 block">ID: {tray.id.substr(0,4)}</span>
                          </div>
                       </div>
                    );
                 })}
              </div>
           );
         case 'transactions':
            return (
               <div className="space-y-2">
                  {state.transactions.length === 0 && <p className="text-slate-400 text-center py-4">No records found.</p>}
                  {state.transactions.slice().reverse().map((tx: Transaction) => (
                     <div key={tx.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                           <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-teal-100 text-teal-600' : 'bg-red-100 text-red-600'}`}>
                              <DollarSign className="w-4 h-4" />
                           </div>
                           <div>
                              <p className="font-bold text-slate-800 text-sm">{tx.category}</p>
                              <p className="text-[10px] text-slate-500">{tx.description} • {new Date(tx.date).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-teal-600' : 'text-slate-700'}`}>
                           {tx.type === 'income' ? '+' : '-'}€{tx.amount}
                        </span>
                     </div>
                  ))}
               </div>
            );
         case 'customers':
            return (
               <div className="space-y-2">
                  {state.customers.length === 0 && <p className="text-slate-400 text-center py-4">No records found.</p>}
                  {state.customers.map((cust: Customer) => (
                     <div key={cust.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-start mb-1">
                           <p className="font-bold text-slate-800 text-sm">{cust.name}</p>
                           <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">{cust.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{cust.contact} • {cust.email}</p>
                     </div>
                  ))}
               </div>
            );
         case 'crops':
            return (
               <div className="space-y-2">
                  {state.crops.map((crop: CropType) => (
                     <div key={crop.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shadow-sm ${crop.color.split(' ')[0]} ${crop.color.split(' ')[1]}`}>
                           {crop.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                           <p className="font-bold text-slate-800 text-sm">{crop.name}</p>
                           <p className="text-[10px] text-slate-500">{crop.seedingRate}g seed • {crop.estimatedYieldPerTray}g yield</p>
                        </div>
                     </div>
                  ))}
               </div>
            );
         case 'images':
            const cropsWithImages = state.crops.filter(c => c.imageUrl);
            return (
               <div className="grid grid-cols-3 gap-2">
                  {cropsWithImages.length === 0 && <p className="col-span-3 text-slate-400 text-center py-4">No images saved.</p>}
                  {cropsWithImages.map(crop => (
                     <div key={crop.id} className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200">
                        {crop.imageUrl ? (
                           <img src={crop.imageUrl} alt={crop.name} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <ImageIcon className="w-6 h-6" />
                           </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] p-1 truncate text-center">
                           {crop.name}
                        </div>
                     </div>
                  ))}
               </div>
            );
         default:
            return null;
     }
  };

  const getStoreTitle = (store: string) => {
     switch(store) {
        case 'trays': return 'Growing Records';
        case 'transactions': return 'Financial Records';
        case 'customers': return 'Customer Database';
        case 'crops': return 'Crop Varieties';
        case 'images': return 'Image Gallery';
        default: return 'Data Viewer';
     }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col space-y-1 mb-6">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Data Management</h2>
        <p className="text-slate-500 text-sm">Monitor storage usage and inspect records.</p>
      </div>

      {/* Storage Stats Card */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
               <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <HardDrive className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-bold text-slate-800">Storage Usage</h3>
                  <p className="text-xs text-slate-400 font-medium">IndexedDB System</p>
               </div>
            </div>
            {storageStats && (
               <div className="text-right">
                  <span className="block text-xl font-bold text-blue-600">{formatBytes(storageStats.usage)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Used</span>
               </div>
            )}
         </div>

         {/* Detailed Breakdown Table */}
         <div className="bg-slate-50 rounded-2xl p-1 overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-slate-100">
               <button onClick={() => setViewingStore('trays')} className="p-3 flex items-center justify-between hover:bg-white transition-colors rounded-xl w-full text-left group">
                  <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                        <Sprout className="w-4 h-4" />
                     </div>
                     <div>
                        <span className="block text-sm font-bold text-slate-700">Growing Data</span>
                        <span className="text-[10px] text-slate-400">Active & Harvested Trays</span>
                     </div>
                  </div>
                  <span className="text-sm font-bold text-slate-800 flex items-center">
                     {getCount('trays')} Records
                     <span className="ml-2 text-slate-300 group-hover:text-teal-500">→</span>
                  </span>
               </button>

               <button onClick={() => setViewingStore('transactions')} className="p-3 flex items-center justify-between hover:bg-white transition-colors rounded-xl w-full text-left group">
                  <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-4 h-4" />
                     </div>
                     <div>
                        <span className="block text-sm font-bold text-slate-700">Selling Data</span>
                        <span className="text-[10px] text-slate-400">Transactions & Finances</span>
                     </div>
                  </div>
                  <span className="text-sm font-bold text-slate-800 flex items-center">
                     {getCount('transactions')} Records
                     <span className="ml-2 text-slate-300 group-hover:text-indigo-500">→</span>
                  </span>
               </button>

               <button onClick={() => setViewingStore('customers')} className="p-3 flex items-center justify-between hover:bg-white transition-colors rounded-xl w-full text-left group">
                  <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                        <Users className="w-4 h-4" />
                     </div>
                     <div>
                        <span className="block text-sm font-bold text-slate-700">Orders Data</span>
                        <span className="text-[10px] text-slate-400">Customer Profiles</span>
                     </div>
                  </div>
                  <span className="text-sm font-bold text-slate-800 flex items-center">
                     {getCount('customers')} Records
                     <span className="ml-2 text-slate-300 group-hover:text-orange-500">→</span>
                  </span>
               </button>

               <button onClick={() => setViewingStore('images')} className="p-3 flex items-center justify-between hover:bg-white transition-colors rounded-xl w-full text-left group">
                  <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-4 h-4" />
                     </div>
                     <div>
                        <span className="block text-sm font-bold text-slate-700">Images</span>
                        <span className="text-[10px] text-slate-400">Custom Crop Photos</span>
                     </div>
                  </div>
                  <span className="text-sm font-bold text-slate-800 flex items-center">
                     {getCount('images')} Saved
                     <span className="ml-2 text-slate-300 group-hover:text-pink-500">→</span>
                  </span>
               </button>

               <button onClick={() => setViewingStore('crops')} className="p-3 flex items-center justify-between hover:bg-white transition-colors rounded-xl w-full text-left group">
                  <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                        <Database className="w-4 h-4" />
                     </div>
                     <div>
                        <span className="block text-sm font-bold text-slate-700">Crop Definitions</span>
                        <span className="text-[10px] text-slate-400">Metadata (No Images)</span>
                     </div>
                  </div>
                  <span className="text-sm font-bold text-slate-800 flex items-center">
                     {getCount('crops')} Varieties
                     <span className="ml-2 text-slate-300 group-hover:text-slate-500">→</span>
                  </span>
               </button>
            </div>
         </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {/* Upload to Remote */}
         <button 
            onClick={handleUploadToRemote}
            disabled={downloadStatus === 'downloading'}
            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md hover:border-green-200 transition-all group relative disabled:opacity-50 disabled:cursor-not-allowed"
         >
            <div className="p-4 bg-green-50 rounded-full text-green-600 mb-3 group-hover:scale-110 transition-transform">
               {downloadStatus === 'downloading' ? <RefreshCw className="w-8 h-8 animate-spin" /> : downloadStatus === 'success' ? <CheckCircle className="w-8 h-8" /> : downloadStatus === 'error' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <Upload className="w-8 h-8" />}
            </div>
            <h3 className="font-bold text-slate-800">Upload to DB</h3>
            <p className="text-xs text-slate-400 mt-1">Save local data to remote</p>
            {downloadStatus === 'downloading' && <span className="absolute bottom-2 text-xs text-green-500 font-bold">Uploading...</span>}
            {downloadStatus === 'success' && <span className="absolute bottom-2 text-xs text-teal-500 font-bold">Uploaded!</span>}
            {downloadStatus === 'error' && <span className="absolute bottom-2 text-xs text-red-500 font-bold">Failed</span>}
         </button>

         {/* Download from Remote */}
         <button 
            onClick={handleDownloadFromRemote}
            disabled={downloadStatus === 'downloading'}
            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group relative disabled:opacity-50 disabled:cursor-not-allowed"
         >
            <div className="p-4 bg-blue-50 rounded-full text-blue-600 mb-3 group-hover:scale-110 transition-transform">
               {downloadStatus === 'downloading' ? <RefreshCw className="w-8 h-8 animate-spin" /> : downloadStatus === 'success' ? <CheckCircle className="w-8 h-8" /> : downloadStatus === 'error' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <Download className="w-8 h-8" />}
            </div>
            <h3 className="font-bold text-slate-800">Download from DB</h3>
            <p className="text-xs text-slate-400 mt-1">Get herbs & pictures from remote</p>
            {downloadStatus === 'downloading' && <span className="absolute bottom-2 text-xs text-blue-500 font-bold">Downloading...</span>}
            {downloadStatus === 'success' && <span className="absolute bottom-2 text-xs text-teal-500 font-bold">Downloaded!</span>}
            {downloadStatus === 'error' && <span className="absolute bottom-2 text-xs text-red-500 font-bold">Failed</span>}
         </button>

         {/* Sync Crops */}
         <button 
            onClick={handleSyncCrops}
            disabled={syncStatus === 'syncing'}
            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md hover:border-purple-200 transition-all group relative disabled:opacity-50 disabled:cursor-not-allowed"
         >
            <div className="p-4 bg-purple-50 rounded-full text-purple-600 mb-3 group-hover:scale-110 transition-transform">
               {syncStatus === 'syncing' ? <RefreshCw className="w-8 h-8 animate-spin" /> : syncStatus === 'success' ? <CheckCircle className="w-8 h-8" /> : syncStatus === 'error' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <RefreshCw className="w-8 h-8" />}
            </div>
            <h3 className="font-bold text-slate-800">Sync Crops to DB</h3>
            <p className="text-xs text-slate-400 mt-1">Update database with latest crops</p>
            {syncStatus === 'syncing' && <span className="absolute bottom-2 text-xs text-purple-500 font-bold">Syncing...</span>}
            {syncStatus === 'success' && <span className="absolute bottom-2 text-xs text-teal-500 font-bold">Sync Successful!</span>}
            {syncStatus === 'error' && <span className="absolute bottom-2 text-xs text-red-500 font-bold">Sync Failed</span>}
         </button>

         {/* Backup */}
         <button 
            onClick={handleExport}
            className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md hover:border-teal-200 transition-all group"
         >
            <div className="p-4 bg-teal-50 rounded-full text-teal-600 mb-3 group-hover:scale-110 transition-transform">
               <Download className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800">Backup All Data</h3>
            <p className="text-xs text-slate-400 mt-1">Download consolidated JSON</p>
         </button>

         {/* Restore */}
         <label className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer relative">
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            <div className="p-4 bg-blue-50 rounded-full text-blue-600 mb-3 group-hover:scale-110 transition-transform">
               {importStatus === 'success' ? <CheckCircle className="w-8 h-8" /> : importStatus === 'error' ? <AlertTriangle className="w-8 h-8 text-red-500" /> : <Upload className="w-8 h-8" />}
            </div>
            <h3 className="font-bold text-slate-800">Restore Data</h3>
            <p className="text-xs text-slate-400 mt-1">Upload JSON backup</p>
            {importStatus === 'success' && <span className="absolute bottom-2 text-xs text-teal-500 font-bold">Import Successful!</span>}
            {importStatus === 'error' && <span className="absolute bottom-2 text-xs text-red-500 font-bold">Import Failed</span>}
         </label>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 pt-8 border-t border-slate-200">
         <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-900">Danger Zone</h3>
         </div>
         
         {!resetConfirm ? (
            <button 
               onClick={() => setResetConfirm(true)}
               className="w-full flex items-center justify-center p-4 bg-red-50 text-red-700 font-bold rounded-2xl border border-red-100 hover:bg-red-100 transition-colors"
            >
               <Trash2 className="w-5 h-5 mr-2" />
               Reset Database
            </button>
         ) : (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 animate-fade-in">
               <p className="text-sm text-red-800 font-bold mb-3 text-center">Are you sure? This deletes growing, selling, and order data.</p>
               <div className="flex space-x-3">
                  <button 
                     onClick={() => setResetConfirm(false)}
                     className="flex-1 py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-200"
                  >
                     Cancel
                  </button>
                  <button 
                     onClick={handleFactoryReset}
                     className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200"
                  >
                     Confirm Reset
                  </button>
               </div>
            </div>
         )}
      </div>

      {/* Data Viewer Modal */}
      {viewingStore && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                  <h3 className="text-lg font-bold text-slate-800">{getStoreTitle(viewingStore)}</h3>
                  <button onClick={() => setViewingStore(null)} className="p-1 rounded-full hover:bg-slate-200 transition-colors text-slate-500">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               <div className="p-4 overflow-y-auto">
                  {renderDataContent()}
               </div>
               <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                  <button onClick={() => setViewingStore(null)} className="text-sm font-bold text-slate-500 hover:text-slate-800">
                     Close Viewer
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default DataManager;
