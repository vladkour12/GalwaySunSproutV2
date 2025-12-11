
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, CropType, Stage, Tray, Customer } from '../types';
import { STAGE_FLOW } from '../constants';
import { Plus, X, Sprout, Calendar, CheckCircle, Trash2, ArrowRight, Droplet, Sun, Moon, Archive, MoreHorizontal, Scale, Palette, AlertCircle, Euro, ChevronRight, Edit2, Info, Package, Repeat, ShoppingBag, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CropManagerProps {
  state: AppState;
  onAddTray: (cropId: string, count: number, location: string, capacity: number) => void;
  onUpdateTrayStage: (trayId: string, newStage: Stage) => void;
  onBulkUpdateTrayStage: (trayIds: string[], newStage: Stage) => void;
  onUpdateTray: (trayId: string, updates: Partial<Tray>) => void;
  onDeleteTray: (trayId: string) => void;
  onBulkDeleteTrays: (trayIds: string[]) => void;
  onAddCrop: (crop: CropType) => void;
  onUpdateCrop: (crop: CropType) => void;
  onDeleteCrop: (cropId: string) => void;
}

// Local interface for Recurring Orders (stored in localStorage for now)
interface RecurringOrder {
  id: string;
  customerId: string; // references Customer.id
  cropId: string;
  amount: number; // grams
  dueDayOfWeek: number; // 0=Sun, 1=Mon...
}

const COLOR_OPTIONS = [
  'bg-green-100 text-green-800 border-green-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-teal-100 text-teal-700 border-teal-200',
];

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getStageColor = (stage: Stage) => {
  switch (stage) {
    case Stage.SEED: return 'bg-slate-100 text-slate-600';
    case Stage.SOAK: return 'bg-blue-100 text-blue-700';
    case Stage.GERMINATION: return 'bg-purple-100 text-purple-700';
    case Stage.BLACKOUT: return 'bg-gray-800 text-white';
    case Stage.LIGHT: return 'bg-amber-100 text-amber-700';
    case Stage.HARVEST_READY: return 'bg-teal-100 text-teal-700';
    default: return 'bg-slate-50 text-slate-400';
  }
};

// Helper to get duration of a specific stage in hours
const getStageDurationHours = (stage: Stage, crop: CropType): number => {
  switch (stage) {
    case Stage.SEED: return 0; // Immediate transition usually
    case Stage.SOAK: return crop.soakHours;
    case Stage.GERMINATION: return crop.germinationDays * 24;
    case Stage.BLACKOUT: return crop.blackoutDays * 24;
    case Stage.LIGHT: return crop.lightDays * 24;
    default: return 0;
  }
};

// Helper to calculate Dynamic Harvest Date based on CURRENT stage progress
const getTargetHarvestDate = (tray: Tray, crop: CropType) => {
  // If finished, return the last update time
  if (tray.stage === Stage.HARVEST_READY || tray.stage === Stage.HARVESTED) {
     return new Date(tray.updatedAt); 
  }

  const currentStageIndex = STAGE_FLOW.indexOf(tray.stage);
  if (currentStageIndex === -1) return new Date(); // Fallback

  // 1. Start calculation from when the current stage began
  let projectedTime = new Date(tray.startDate).getTime();

  // 2. Add remaining duration of current stage + all future stages
  for (let i = currentStageIndex; i < STAGE_FLOW.length; i++) {
     const stage = STAGE_FLOW[i];
     if (stage === Stage.HARVEST_READY) break; // Stop at harvest
     
     const durationHours = getStageDurationHours(stage, crop);
     projectedTime += (durationHours * 60 * 60 * 1000);
  }
  
  return new Date(projectedTime);
};

// Helper to calculate Time to Next Stage
const getTimeToNextStage = (tray: Tray, crop: CropType) => {
  const start = new Date(tray.startDate).getTime();
  const durationHours = getStageDurationHours(tray.stage, crop);
  
  if (tray.stage === Stage.HARVEST_READY) return { text: "Harvest Now", isOverdue: false };

  const targetTime = start + (durationHours * 60 * 60 * 1000);
  const now = new Date().getTime();
  const diff = targetTime - now;

  if (diff < 0) return { text: "Overdue", isOverdue: true };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return { text: `${days}d ${hours}h`, isOverdue: false };
  return { text: `${hours}h`, isOverdue: false };
};

// Helper to calculate estimated seed cost per tray
const getEstimatedSeedCost = (crop: CropType) => {
  if (!crop.seedingRate) return 0;
  // Prioritize Large pack price (1kg) for better accuracy on business scale
  if (crop.price1kg) {
    return (crop.seedingRate / (crop.pkgWeightLarge || 1000)) * crop.price1kg;
  }
  if (crop.price500g) {
    return (crop.seedingRate / (crop.pkgWeightSmall || 500)) * crop.price500g;
  }
  return 0;
};

const CropManager: React.FC<CropManagerProps> = ({ 
  state, 
  onAddTray, 
  onUpdateTrayStage, 
  onUpdateTray, 
  onDeleteTray, 
  onAddCrop, 
  onUpdateCrop, 
  onDeleteCrop,
  onBulkUpdateTrayStage, 
  onBulkDeleteTrays 
}) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'production' | 'varieties' | 'plan' | 'calendar'>('production');
  const [plannerMode, setPlannerMode] = useState<'event' | 'recurring'>('event');
  
  // Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTray, setSelectedTray] = useState<Tray | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropType | null>(null);
  const [isEditingCrop, setIsEditingCrop] = useState(false); // Toggle between View Details and Edit Form
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  
  // Event Planner State
  const [plannerCropId, setPlannerCropId] = useState('');
  const [plannerDate, setPlannerDate] = useState(new Date().toISOString().split('T')[0]);

  // Recurring Planner State
  const [recurringCropId, setRecurringCropId] = useState('');
  const [recurringTargetAmount, setRecurringTargetAmount] = useState<string>('');
  const [recurringHarvestDay, setRecurringHarvestDay] = useState<number>(5); // Default Friday (5)

  // Calendar / Orders State
  const [recurringOrders, setRecurringOrders] = useState<RecurringOrder[]>([]);
  const [newOrderCustId, setNewOrderCustId] = useState('');
  const [newOrderCropId, setNewOrderCropId] = useState('');
  const [newOrderAmount, setNewOrderAmount] = useState('');
  const [newOrderDay, setNewOrderDay] = useState(5);

  // Form State
  const [plantCropId, setPlantCropId] = useState(state.crops[0]?.id || '');
  const [plantLocation, setPlantLocation] = useState('');
  const [plantCount, setPlantCount] = useState(1);
  const [yieldInput, setYieldInput] = useState('');

  // Load Orders from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('galway_orders');
    if (saved) {
      try {
        setRecurringOrders(JSON.parse(saved));
      } catch (e) { console.error("Failed to load orders"); }
    }
  }, []);

  // Save Orders
  useEffect(() => {
    localStorage.setItem('galway_orders', JSON.stringify(recurringOrders));
  }, [recurringOrders]);

  useEffect(() => {
    if (!plantCropId && state.crops.length > 0) {
      setPlantCropId(state.crops[0].id);
    }
  }, [state.crops, plantCropId]);

  // --- Helpers ---
  const activeTrays = useMemo(() => 
    state.trays
      .filter(t => t.stage !== Stage.HARVESTED && t.stage !== Stage.COMPOST)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
  , [state.trays]);

  const varieties = useMemo(() => state.crops, [state.crops]);

  // --- Calculations for Planners ---

  const eventSchedule = useMemo(() => {
     if (!plannerCropId || !plannerDate) return null;
     const crop = state.crops.find(c => c.id === plannerCropId);
     if (!crop) return null;

     const target = new Date(plannerDate);
     const totalDays = crop.germinationDays + crop.blackoutDays + crop.lightDays;
     
     // Plant Date = Target - Total Days
     const plantDate = new Date(target);
     plantDate.setDate(target.getDate() - totalDays);
     
     const germEnd = new Date(plantDate);
     germEnd.setDate(plantDate.getDate() + crop.germinationDays);
     
     const blackoutEnd = new Date(germEnd);
     blackoutEnd.setDate(germEnd.getDate() + crop.blackoutDays);
     
     return { crop, plantDate, germEnd, blackoutEnd, harvestDate: target };
  }, [plannerCropId, plannerDate, state.crops]);

  const recurringSchedule = useMemo(() => {
    if (!recurringCropId || !recurringTargetAmount) return null;
    const crop = state.crops.find(c => c.id === recurringCropId);
    if (!crop) return null;
    
    const target = parseInt(recurringTargetAmount);
    if (isNaN(target) || target <= 0) return null;

    const yieldPerTray = crop.estimatedYieldPerTray || 1;
    const traysNeeded = Math.ceil(target / yieldPerTray);
    const totalGrowingDays = crop.germinationDays + crop.blackoutDays + crop.lightDays;
    
    // Calculate Plant Day Index (0-6)
    const plantDayIndex = (recurringHarvestDay - (totalGrowingDays % 7) + 7) % 7;
    
    return {
      crop,
      traysNeeded,
      yieldPerTray,
      plantDayName: DAYS_OF_WEEK[plantDayIndex],
      harvestDayName: DAYS_OF_WEEK[recurringHarvestDay],
      totalGrowingDays
    };
  }, [recurringCropId, recurringTargetAmount, recurringHarvestDay, state.crops]);

  // --- Calendar Data Generation ---
  const calendarDays = useMemo(() => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(today);
      currentDay.setDate(today.getDate() + i);
      const dayOfWeek = currentDay.getDay(); // 0-6

      // 1. Existing Tasks from Active Trays
      const tasks = [];
      
      activeTrays.forEach(tray => {
         const crop = state.crops.find(c => c.id === tray.cropTypeId);
         if (!crop) return;
         
         const startDate = new Date(tray.startDate);
         
         // Helper to add days
         const addDays = (d: Date, days: number) => {
            const res = new Date(d);
            res.setDate(res.getDate() + days);
            return res;
         };

         // Check if a stage transition lands on 'currentDay'
         // We need to know WHEN the current stage ends based on start date
         let stageEndDate = new Date(startDate);
         let stageDuration = 0;

         if (tray.stage === Stage.SOAK && crop.soakHours > 0) {
            // Soak is usually same day or next day, hard to pin exact date without hours
            // Skip for calendar view simplicity, handle in dashboard alerts
         } else if (tray.stage === Stage.GERMINATION) {
             stageDuration = crop.germinationDays;
             stageEndDate = addDays(startDate, stageDuration);
             if (stageEndDate.toDateString() === currentDay.toDateString()) {
                tasks.push({ type: 'task', text: `Blackout ${crop.name} (${tray.location})`, icon: Moon, color: 'text-purple-600 bg-purple-50' });
             }
         } else if (tray.stage === Stage.BLACKOUT) {
             stageDuration = crop.blackoutDays;
             stageEndDate = addDays(startDate, stageDuration);
             if (stageEndDate.toDateString() === currentDay.toDateString()) {
                tasks.push({ type: 'task', text: `Uncover ${crop.name} (${tray.location})`, icon: Sun, color: 'text-amber-600 bg-amber-50' });
             }
         } else if (tray.stage === Stage.LIGHT) {
             stageDuration = crop.lightDays;
             stageEndDate = addDays(startDate, stageDuration);
             if (stageEndDate.toDateString() === currentDay.toDateString()) {
                tasks.push({ type: 'harvest', text: `Harvest ${crop.name}`, sub: tray.location, icon: CheckCircle, color: 'text-teal-600 bg-teal-50' });
             }
         }
      });

      // 2. Orders Due This Day
      const ordersDue = recurringOrders.filter(o => o.dueDayOfWeek === dayOfWeek);
      ordersDue.forEach(order => {
         const crop = state.crops.find(c => c.id === order.cropId);
         const cust = state.customers.find(c => c.id === order.customerId);
         if (crop) {
            tasks.push({ 
               type: 'order', 
               text: `Deliver ${crop.name}`, 
               sub: `${cust?.name || 'Unknown'} (${order.amount}g)`, 
               icon: Truck, 
               color: 'text-indigo-600 bg-indigo-50' 
            });
         }
      });

      // 3. Planting Tasks (Reverse Engineered from Orders)
      // Check ALL orders, see if we need to plant TODAY to hit that order's future date
      // This is tricky for a 7-day view because the order might be next week.
      // Simplification: "Weekly Routine" means if I plant today (Day X), will it be ready on Day Y?
      recurringOrders.forEach(order => {
         const crop = state.crops.find(c => c.id === order.cropId);
         if (!crop) return;
         
         const totalDays = crop.germinationDays + crop.blackoutDays + crop.lightDays;
         // PlantDay = (OrderDay - TotalDays) % 7
         const plantDayIndex = (order.dueDayOfWeek - (totalDays % 7) + 7) % 7;
         
         if (plantDayIndex === dayOfWeek) {
            const trays = Math.ceil(order.amount / (crop.estimatedYieldPerTray || 1));
             tasks.push({ 
               type: 'plant', 
               text: `Plant ${trays}x ${crop.name}`, 
               sub: `For ${state.customers.find(c => c.id === order.customerId)?.name || 'Order'}`, 
               icon: Sprout, 
               color: 'text-emerald-600 bg-emerald-50' 
            });
         }
      });

      // 4. General Tasks
      if (activeTrays.length > 0) {
         tasks.push({ type: 'routine', text: 'Check Water & Airflow', sub: `${activeTrays.length} active trays`, icon: Droplet, color: 'text-blue-500 bg-blue-50' });
      }

      days.push({ date: currentDay, dayOfWeek, tasks });
    }
    return days;
  }, [activeTrays, recurringOrders, state.crops, state.customers]);


  // --- Handlers ---

  const handlePlant = () => {
     if(!plantCropId) return;
     const crop = state.crops.find(c => c.id === plantCropId);
     onAddTray(plantCropId, plantCount, plantLocation || 'Shed', crop?.estimatedYieldPerTray || 0);
     setIsAdding(false);
     setPlantLocation('');
     setPlantCount(1);
  };

  const advanceTray = () => {
     if(!selectedTray) return;
     const idx = STAGE_FLOW.indexOf(selectedTray.stage);
     if(idx < STAGE_FLOW.length - 1) {
        onUpdateTrayStage(selectedTray.id, STAGE_FLOW[idx+1]);
        setSelectedTray(null);
     }
  };

  const harvestTray = () => {
     if(!selectedTray) return;
     const val = parseInt(yieldInput);
     if(val > 0) onUpdateTray(selectedTray.id, { yield: val });
     onUpdateTrayStage(selectedTray.id, Stage.HARVESTED);
     setSelectedTray(null);
     setYieldInput('');
  };

  const addRecurringOrder = () => {
     if (newOrderCustId && newOrderCropId && newOrderAmount) {
        const order: RecurringOrder = {
           id: Math.random().toString(36).substr(2,9),
           customerId: newOrderCustId,
           cropId: newOrderCropId,
           amount: parseInt(newOrderAmount),
           dueDayOfWeek: newOrderDay
        };
        setRecurringOrders([...recurringOrders, order]);
        setIsAddingOrder(false);
        setNewOrderAmount('');
     }
  };

  const deleteOrder = (id: string) => {
     setRecurringOrders(recurringOrders.filter(o => o.id !== id));
  };

  const openCropDetail = (crop: CropType) => {
     setSelectedCrop(crop);
     setIsEditingCrop(false); // Default to view mode
  };

  const openNewCrop = () => {
     setSelectedCrop({ 
        id: '', 
        name: '', 
        color: COLOR_OPTIONS[0], 
        soakHours: 0, 
        germinationDays: 3, 
        blackoutDays: 3, 
        lightDays: 7, 
        estimatedYieldPerTray: 200, 
        pricePerTray: 10,
        seedingRate: 0,
        price500g: 0,
        price1kg: 0
     } as CropType);
     setIsEditingCrop(true); // Default to edit mode for new
  };

  // --- Render Sections ---

  return (
    <div className="pb-24">
      {/* 1. Simple Header & Tabs */}
      <div className="bg-white sticky top-0 z-20 pt-4 pb-2 px-1 border-b border-slate-100 shadow-sm">
         <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-2xl font-bold text-slate-800">
               {activeTab === 'production' ? 'My Shed' : activeTab === 'varieties' ? 'Seeds' : activeTab === 'calendar' ? 'Calendar' : 'Plan'}
            </h2>
            <div className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
               {activeTab === 'production' && `${activeTrays.length} Active`}
               {activeTab === 'varieties' && `${varieties.length} Types`}
               {activeTab === 'calendar' && new Date().toLocaleDateString(undefined, {weekday: 'long'})}
            </div>
         </div>
         <div className="flex p-1 bg-slate-100 rounded-xl mx-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('production')} className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'production' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Shed</button>
            <button onClick={() => setActiveTab('calendar')} className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Calendar</button>
            <button onClick={() => setActiveTab('plan')} className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'plan' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Planner</button>
            <button onClick={() => setActiveTab('varieties')} className={`flex-1 min-w-[80px] py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'varieties' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Seeds</button>
         </div>
      </div>

      {/* 2. Content Area */}
      <div className="mt-4 px-2">
         
         {/* --- PRODUCTION LIST --- */}
         {activeTab === 'production' && (
            <div className="space-y-2">
               {activeTrays.length === 0 && (
                  <div className="text-center py-20 text-slate-400">
                     <Sprout className="w-12 h-12 mx-auto mb-2 opacity-20" />
                     <p>No active trays.</p>
                  </div>
               )}
               {activeTrays.map(tray => {
                  const crop = state.crops.find(c => c.id === tray.cropTypeId);
                  if (!crop) return null;

                  const harvestDate = getTargetHarvestDate(tray, crop);
                  const nextStageInfo = getTimeToNextStage(tray, crop);
                  const isHarvestReady = tray.stage === Stage.HARVEST_READY;

                  return (
                     <motion.div 
                        key={tray.id}
                        layoutId={tray.id}
                        onClick={() => setSelectedTray(tray)}
                        className={`bg-white p-2.5 rounded-2xl border ${nextStageInfo.isOverdue ? 'border-red-200 bg-red-50/10' : 'border-slate-100'} shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden`}
                     >
                        {/* 1. Left: Small Picture (Reduced to w-10/40px) */}
                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-inner relative overflow-hidden ${crop.color.split(' ')[0] || 'bg-slate-200'}`}>
                           {crop.imageUrl ? (
                              <img src={crop.imageUrl} alt={crop.name} className="w-full h-full object-cover" />
                           ) : (
                              <span>{crop.name.substring(0,2)}</span>
                           )}
                           {nextStageInfo.isOverdue && (
                              <div className="absolute inset-0 border-2 border-red-400 rounded-xl animate-pulse"></div>
                           )}
                        </div>

                        {/* 2. Middle: Name & Stage */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                           <div className="flex items-center">
                              <h3 className="text-sm font-bold text-slate-800 truncate">{crop.name}</h3>
                              {tray.location && <span className="ml-2 text-[10px] text-slate-400 truncate">({tray.location})</span>}
                           </div>
                           <div className="mt-0.5 flex items-center">
                               <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide ${getStageColor(tray.stage)}`}>
                                  {tray.stage}
                               </span>
                           </div>
                        </div>

                        {/* 3. Right: Timings */}
                        <div className="text-right flex flex-col justify-center min-w-[70px]">
                           {isHarvestReady ? (
                              <div className="text-teal-600 font-bold text-xs flex items-center justify-end">
                                 <CheckCircle className="w-3.5 h-3.5 mr-1" /> Ready
                              </div>
                           ) : (
                              <>
                                 <div className="mb-0.5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none mb-0.5">Ready</span>
                                    <span className="text-xs font-bold text-slate-700">{harvestDate.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                 </div>
                                 <div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none mb-0.5">Next</span>
                                    <span className={`text-xs font-bold ${nextStageInfo.isOverdue ? 'text-red-500' : 'text-teal-600'}`}>
                                       {nextStageInfo.text}
                                    </span>
                                 </div>
                              </>
                           )}
                        </div>
                     </motion.div>
                  );
               })}
            </div>
         )}

         {/* --- CALENDAR TAB --- */}
         {activeTab === 'calendar' && (
            <div className="space-y-6">
               
               {/* Daily Schedule */}
               <div className="space-y-4">
                  {calendarDays.map((day, idx) => (
                     <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                        <h4 className={`text-sm font-bold mb-3 flex items-center ${idx === 0 ? 'text-teal-600' : 'text-slate-800'}`}>
                           {idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : day.date.toLocaleDateString(undefined, {weekday: 'long'})}
                           <span className="text-xs font-normal text-slate-400 ml-2">{day.date.toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                        </h4>
                        
                        {day.tasks.length === 0 ? (
                           <div className="text-xs text-slate-400 italic pl-2">No tasks scheduled.</div>
                        ) : (
                           <div className="space-y-2">
                              {day.tasks.map((task, tIdx) => {
                                 const Icon = task.icon;
                                 return (
                                    <div key={tIdx} className={`flex items-start space-x-3 p-2.5 rounded-xl ${task.color}`}>
                                       <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                       <div className="flex-1 min-w-0">
                                          <p className="text-xs font-bold leading-tight">{task.text}</p>
                                          {task.sub && <p className="text-[10px] opacity-80 mt-0.5 leading-tight">{task.sub}</p>}
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                  ))}
               </div>

               {/* Recurring Orders Section */}
               <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-slate-800 flex items-center">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Weekly Orders
                     </h3>
                     <button onClick={() => setIsAddingOrder(!isAddingOrder)} className="text-xs font-bold text-teal-600 bg-white border border-teal-100 px-3 py-1.5 rounded-lg shadow-sm">
                        {isAddingOrder ? 'Cancel' : '+ Add Order'}
                     </button>
                  </div>

                  <AnimatePresence>
                  {isAddingOrder && (
                     <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4 overflow-hidden">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                           <select value={newOrderCustId} onChange={e => setNewOrderCustId(e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700 outline-none">
                              <option value="">Select Customer...</option>
                              {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           </select>
                           <div className="flex gap-2">
                              <select value={newOrderCropId} onChange={e => setNewOrderCropId(e.target.value)} className="flex-[2] p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700 outline-none">
                                 <option value="">Select Crop...</option>
                                 {state.crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <input type="number" placeholder="g" value={newOrderAmount} onChange={e => setNewOrderAmount(e.target.value)} className="flex-1 p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700 outline-none" />
                           </div>
                           <select value={newOrderDay} onChange={e => setNewOrderDay(parseInt(e.target.value))} className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold text-slate-700 outline-none">
                              {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>Deliver on {d}</option>)}
                           </select>
                           <button onClick={addRecurringOrder} className="w-full py-2 bg-slate-800 text-white text-xs font-bold rounded-lg">Save Order</button>
                        </div>
                     </motion.div>
                  )}
                  </AnimatePresence>

                  <div className="space-y-2">
                     {recurringOrders.length === 0 && !isAddingOrder && (
                        <p className="text-xs text-slate-400 text-center py-2">No active weekly orders.</p>
                     )}
                     {recurringOrders.map(order => {
                        const crop = state.crops.find(c => c.id === order.cropId);
                        const cust = state.customers.find(c => c.id === order.customerId);
                        return (
                           <div key={order.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                              <div>
                                 <p className="text-xs font-bold text-slate-800">{cust?.name || 'Unknown'}</p>
                                 <p className="text-[10px] text-slate-500 font-medium">
                                    {order.amount}g {crop?.name} • <span className="text-indigo-600">{DAYS_OF_WEEK[order.dueDayOfWeek]}</span>
                                 </p>
                              </div>
                              <button onClick={() => deleteOrder(order.id)} className="text-slate-300 hover:text-red-400"><X className="w-4 h-4" /></button>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
         )}

         {/* --- VARIETIES LIST --- */}
         {activeTab === 'varieties' && (
            <div className="space-y-3">
               {/* New Button */}
               <button onClick={openNewCrop} className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-teal-400 hover:text-teal-500 transition-colors mb-4">
                  <Plus className="w-5 h-5 mr-2" />
                  <span className="font-bold">Add New Variety</span>
               </button>

               {/* Varieties List */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {varieties.map(crop => {
                     const seedCost = getEstimatedSeedCost(crop);
                     
                     return (
                        <div 
                           key={crop.id} 
                           onClick={() => openCropDetail(crop)} 
                           className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden active:scale-[0.98] transition-transform flex items-center gap-4 cursor-pointer"
                        >
                           {/* Small Picture Left */}
                           <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-inner relative overflow-hidden ${crop.color.split(' ')[0] || 'bg-slate-200'}`}>
                              {crop.imageUrl ? (
                                 <img src={crop.imageUrl} alt={crop.name} className="w-full h-full object-cover" />
                              ) : (
                                 <span>{crop.name.substring(0,2)}</span>
                              )}
                           </div>
                           
                           {/* Info Middle/Right */}
                           <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-slate-800 truncate mb-1">{crop.name}</h3>
                              
                              <div className="flex flex-wrap gap-3 mb-1.5">
                                 {/* Seed Cost */}
                                 <div className="flex items-center text-xs text-slate-700 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    <Euro className="w-3 h-3 mr-1 text-slate-400" />
                                    <span>{seedCost > 0 ? `€${seedCost.toFixed(2)}` : '-'} / tray</span>
                                 </div>
                                 
                                 {/* Yield */}
                                 <div className="flex items-center text-xs text-slate-500 font-medium py-0.5">
                                    <Scale className="w-3 h-3 mr-1 text-slate-400" />
                                    <span>{crop.estimatedYieldPerTray}g</span>
                                 </div>
                              </div>

                              {/* Row 2: Bulk Prices */}
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                 <div className="flex items-center">
                                    <Package className="w-3 h-3 mr-1 opacity-50" />
                                    <span className={crop.price500g ? "text-slate-600" : ""}>500g: {crop.price500g ? `€${crop.price500g.toFixed(2)}` : '--'}</span>
                                 </div>
                                 <span className="text-slate-300">•</span>
                                 <span className={crop.price1kg ? "text-slate-600" : ""}>1kg: {crop.price1kg ? `€${crop.price1kg.toFixed(2)}` : '--'}</span>
                              </div>
                           </div>
                           
                           {/* Arrow Hint */}
                           <div className="text-slate-300">
                              <ChevronRight className="w-5 h-5" />
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         )}

         {/* --- PLANNER (Functional) --- */}
         {activeTab === 'plan' && (
            <div className="space-y-4">
               
               {/* Mode Switcher */}
               <div className="bg-slate-100 p-1 rounded-xl flex">
                  <button 
                    onClick={() => setPlannerMode('event')} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${plannerMode === 'event' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> Event Date
                  </button>
                  <button 
                    onClick={() => setPlannerMode('recurring')} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${plannerMode === 'recurring' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                  >
                    <Repeat className="w-3.5 h-3.5 mr-1.5" /> Weekly Routine
                  </button>
               </div>

               {plannerMode === 'event' ? (
                 /* EVENT PLANNER MODE */
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                       <Calendar className="w-5 h-5 mr-2 text-teal-600" />
                       Backward Planner
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">Need crops for a specific date? Calculate exactly when to plant.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                       <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Crop Variety</label>
                          <select 
                             value={plannerCropId} 
                             onChange={(e) => setPlannerCropId(e.target.value)}
                             className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                          >
                             <option value="">Select Crop...</option>
                             {state.crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Target Harvest Date</label>
                          <input 
                             type="date" 
                             value={plannerDate} 
                             onChange={(e) => setPlannerDate(e.target.value)}
                             className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                          />
                       </div>
                    </div>

                    {eventSchedule && (
                       <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex justify-between items-center mb-6">
                             <div className="text-center">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Start Planting</span>
                                <span className="text-xl font-bold text-teal-600">
                                   {eventSchedule.plantDate.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                </span>
                             </div>
                             <div className="h-0.5 flex-1 bg-slate-200 mx-4 relative">
                                <ArrowRight className="absolute -right-1 -top-2.5 w-5 h-5 text-slate-300" />
                             </div>
                             <div className="text-center">
                                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Harvest Day</span>
                                <span className="text-xl font-bold text-slate-800">
                                   {eventSchedule.harvestDate.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                </span>
                             </div>
                          </div>

                          {/* Timeline Visualization */}
                          <div className="space-y-0 relative">
                             {/* Step 1: Soak/Plant */}
                             <div className="flex items-start relative z-10 pb-6">
                                <div className="flex flex-col items-center mr-4">
                                   <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shadow-sm border-2 border-white">1</div>
                                   <div className="w-0.5 h-full bg-slate-200 absolute top-8"></div>
                                </div>
                                <div className="flex-1 pt-1">
                                   <p className="text-sm font-bold text-slate-800">Soak & Plant</p>
                                   <p className="text-xs text-slate-500">{eventSchedule.plantDate.toDateString()}</p>
                                   {eventSchedule.crop.soakHours > 0 && (
                                      <span className="inline-block mt-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                         Soak for {eventSchedule.crop.soakHours} hours
                                      </span>
                                   )}
                                </div>
                             </div>
                             
                             {/* Step 2: Blackout */}
                             <div className="flex items-start relative z-10 pb-6">
                                <div className="flex flex-col items-center mr-4">
                                   <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm border-2 border-white">2</div>
                                   <div className="w-0.5 h-full bg-slate-200 absolute top-8"></div>
                                </div>
                                <div className="flex-1 pt-1">
                                   <p className="text-sm font-bold text-slate-800">Enter Blackout</p>
                                   <p className="text-xs text-slate-500">{eventSchedule.germEnd.toDateString()}</p>
                                   <span className="inline-block mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      Duration: {eventSchedule.crop.blackoutDays} days
                                   </span>
                                </div>
                             </div>

                             {/* Step 3: Lights */}
                             <div className="flex items-start relative z-10">
                                <div className="flex flex-col items-center mr-4">
                                   <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs shadow-sm border-2 border-white">3</div>
                                </div>
                                <div className="flex-1 pt-1">
                                   <p className="text-sm font-bold text-slate-800">Expose to Light</p>
                                   <p className="text-xs text-slate-500">{eventSchedule.blackoutEnd.toDateString()}</p>
                                   <span className="inline-block mt-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                      Duration: {eventSchedule.crop.lightDays} days
                                   </span>
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                    {!eventSchedule && (
                       <div className="bg-slate-50/50 p-8 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                          <Calendar className="w-10 h-10 text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm">Select a crop and date above to see your schedule.</p>
                       </div>
                    )}
                 </div>
               ) : (
                 /* WEEKLY ROUTINE MODE */
                 <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                       <Repeat className="w-5 h-5 mr-2 text-indigo-600" />
                       Weekly Production
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">Establish a regular supply. Calculate trays needed for a weekly target.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                       <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Crop Variety</label>
                          <select 
                             value={recurringCropId} 
                             onChange={(e) => setRecurringCropId(e.target.value)}
                             className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                          >
                             <option value="">Select Crop...</option>
                             {state.crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>
                       <div className="flex gap-2">
                           <div className="flex-1">
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Weekly Target (g)</label>
                             <input 
                                type="number" 
                                value={recurringTargetAmount} 
                                onChange={(e) => setRecurringTargetAmount(e.target.value)}
                                placeholder="e.g. 1000"
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                             />
                           </div>
                           <div className="flex-1">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Harvest Day</label>
                              <select 
                                 value={recurringHarvestDay}
                                 onChange={(e) => setRecurringHarvestDay(parseInt(e.target.value))}
                                 className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                              >
                                 {DAYS_OF_WEEK.map((day, idx) => <option key={day} value={idx}>{day}</option>)}
                              </select>
                           </div>
                       </div>
                    </div>

                    {recurringSchedule && (
                       <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex flex-col items-center justify-center py-4 border-b border-slate-200 border-dashed mb-4">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">To Harvest {recurringTargetAmount}g Weekly</span>
                              <div className="flex items-baseline space-x-2">
                                 <span className="text-4xl font-bold text-indigo-600">{recurringSchedule.traysNeeded}</span>
                                 <span className="text-lg font-bold text-slate-500">Trays Needed</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-2">
                                 Est. Yield: {recurringSchedule.yieldPerTray}g per tray
                              </p>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-start space-x-4">
                              <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600 mt-1">
                                 <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-slate-800 text-sm">Your Weekly Routine</h4>
                                 <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    To harvest fresh <strong>{recurringSchedule.crop.name}</strong> every <strong>{recurringSchedule.harvestDayName}</strong>:
                                 </p>
                                 <div className="mt-3 inline-block bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                                    Plant {recurringSchedule.traysNeeded} trays every {recurringSchedule.plantDayName}
                                 </div>
                                 <p className="text-[10px] text-slate-400 mt-2">
                                    Total growing cycle: {recurringSchedule.totalGrowingDays} days
                                 </p>
                              </div>
                          </div>
                       </div>
                    )}

                    {!recurringSchedule && (
                       <div className="bg-slate-50/50 p-8 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                          <Repeat className="w-10 h-10 text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm">Fill in details to generate your recurring schedule.</p>
                       </div>
                    )}
                 </div>
               )}
            </div>
         )}
      </div>

      {/* 3. Floating Action Button (Only on Production) */}
      <AnimatePresence>
         {activeTab === 'production' && (
            <motion.button 
               initial={{ scale: 0 }} 
               animate={{ scale: 1 }} 
               exit={{ scale: 0 }}
               onClick={() => setIsAdding(true)}
               className="fixed bottom-24 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-300 flex items-center justify-center z-30"
            >
               <Plus className="w-7 h-7" />
            </motion.button>
         )}
      </AnimatePresence>

      {/* --- MODALS --- */}
      {/* Updated alignment to be consistently centered and adaptive */}

      {/* Add Tray Modal */}
      <AnimatePresence>
         {isAdding && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
                  <div className="flex justify-between items-center">
                     <h3 className="text-lg font-bold text-slate-800">Plant New</h3>
                     <button onClick={() => setIsAdding(false)} className="p-2 bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-400 uppercase">Crop</label>
                     <select value={plantCropId} onChange={e => setPlantCropId(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl font-bold outline-none border border-slate-100">
                        {state.crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>
                  <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Location</label>
                        <input type="text" value={plantLocation} onChange={e => setPlantLocation(e.target.value)} placeholder="Shelf 1" className="w-full mt-1 p-3 bg-slate-50 rounded-xl font-bold outline-none border border-slate-100" />
                     </div>
                     <div className="w-24">
                        <label className="text-xs font-bold text-slate-400 uppercase">Count</label>
                        <input type="number" value={plantCount} onChange={e => setPlantCount(parseInt(e.target.value)||1)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl font-bold outline-none border border-slate-100 text-center" />
                     </div>
                  </div>
                  
                  {/* Seed and Soak Info */}
                  {(() => {
                     const crop = state.crops.find(c => c.id === plantCropId);
                     if (!crop) return null;
                     return (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                           <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seed Needed</span>
                              <div className="flex items-center text-slate-700 font-bold">
                                 <Scale className="w-4 h-4 mr-2 text-teal-500" />
                                 <span>{(crop.seedingRate || 0) * plantCount}g</span>
                              </div>
                           </div>
                           <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Soak Duration</span>
                              <div className="flex items-center text-slate-700 font-bold">
                                 <Droplet className="w-4 h-4 mr-2 text-blue-500" />
                                 <span>{crop.soakHours > 0 ? `${crop.soakHours} hours` : 'No Soak'}</span>
                              </div>
                           </div>
                        </div>
                     );
                  })()}

                  <button onClick={handlePlant} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-200">Start Growing</button>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Tray Detail / Action Modal */}
      <AnimatePresence>
         {selectedTray && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-xl font-bold text-slate-800">{state.crops.find(c => c.id === selectedTray.cropTypeId)?.name}</h3>
                        <p className="text-sm text-slate-500 font-medium">{selectedTray.location}</p>
                     </div>
                     <button onClick={() => setSelectedTray(null)} className="p-2 bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
                  </div>

                  {/* Status Card */}
                  <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                     <div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Current Stage</span>
                        <div className={`mt-1 inline-flex px-2 py-1 rounded-lg text-xs font-bold uppercase ${getStageColor(selectedTray.stage)}`}>{selectedTray.stage}</div>
                     </div>
                     <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 uppercase">Planted</span>
                        <div className="font-bold text-slate-700">{new Date(selectedTray.startDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</div>
                     </div>
                  </div>

                  {/* Primary Action */}
                  {selectedTray.stage === Stage.HARVEST_READY ? (
                     <div className="space-y-2">
                        <input type="number" value={yieldInput} onChange={e => setYieldInput(e.target.value)} placeholder="Yield Weight (g)" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-center outline-none focus:ring-2 focus:ring-teal-500" />
                        <button onClick={harvestTray} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-200 flex items-center justify-center">
                           <Archive className="w-5 h-5 mr-2" /> Complete Harvest
                        </button>
                     </div>
                  ) : (
                     <button onClick={advanceTray} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center shadow-lg shadow-slate-300 hover:bg-slate-800 transition-colors">
                        Advance Stage <ArrowRight className="w-5 h-5 ml-2" />
                     </button>
                  )}

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                     <button className="py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors">
                        <MoreHorizontal className="w-4 h-4 mr-2" /> Edit Info
                     </button>
                     <button onClick={() => { if(confirm('Delete tray?')) { onDeleteTray(selectedTray.id); setSelectedTray(null); } }} className="py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                     </button>
                  </div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Detail & Edit Crop Modal (Unified) */}
      <AnimatePresence>
         {selectedCrop && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
                  
                  {/* Header Actions */}
                  <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center space-x-2">
                       {!isEditingCrop && selectedCrop.id && (
                          <button onClick={() => setIsEditingCrop(true)} className="flex items-center text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-colors">
                             <Edit2 className="w-3 h-3 mr-1" /> Edit
                          </button>
                       )}
                       {isEditingCrop && selectedCrop.id && (
                          <button onClick={() => setIsEditingCrop(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800">
                             Cancel Edit
                          </button>
                       )}
                     </div>
                     <button onClick={() => setSelectedCrop(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X className="w-4 h-4" /></button>
                  </div>

                  {/* VIEW MODE */}
                  {!isEditingCrop ? (
                     <div className="space-y-6">
                        {/* 1. Big Picture Hero */}
                        <div className="w-full aspect-video rounded-2xl bg-slate-100 overflow-hidden relative shadow-inner">
                           {selectedCrop.imageUrl ? (
                              <img src={selectedCrop.imageUrl} alt={selectedCrop.name} className="w-full h-full object-cover" />
                           ) : (
                              <div className={`w-full h-full flex items-center justify-center ${selectedCrop.color.split(' ')[0]}`}>
                                 <Sprout className="w-16 h-16 opacity-50" />
                              </div>
                           )}
                           <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                              <h2 className="text-2xl font-bold text-white">{selectedCrop.name}</h2>
                              {selectedCrop.scientificName && <p className="text-white/80 text-xs italic">{selectedCrop.scientificName}</p>}
                           </div>
                        </div>

                        {/* 2. Growing Schedule (Timeline) */}
                        <div>
                           <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Growing Cycle</h4>
                           <div className="flex items-center justify-between text-center relative">
                              {/* Line connector */}
                              <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 -z-10" />
                              
                              <div className="flex flex-col items-center bg-white px-1">
                                 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1 text-xs font-bold border-2 border-white">
                                    {selectedCrop.soakHours > 0 ? `${selectedCrop.soakHours}h` : '-'}
                                 </div>
                                 <span className="text-[10px] font-bold text-slate-600 uppercase">Soak</span>
                              </div>
                              <div className="flex flex-col items-center bg-white px-1">
                                 <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-1 text-xs font-bold border-2 border-white">
                                    {selectedCrop.germinationDays}d
                                 </div>
                                 <span className="text-[10px] font-bold text-slate-600 uppercase">Germ</span>
                              </div>
                              <div className="flex flex-col items-center bg-white px-1">
                                 <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center mb-1 text-xs font-bold border-2 border-white">
                                    {selectedCrop.blackoutDays}d
                                 </div>
                                 <span className="text-[10px] font-bold text-slate-600 uppercase">Dark</span>
                              </div>
                              <div className="flex flex-col items-center bg-white px-1">
                                 <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1 text-xs font-bold border-2 border-white">
                                    {selectedCrop.lightDays}d
                                 </div>
                                 <span className="text-[10px] font-bold text-slate-600 uppercase">Light</span>
                              </div>
                           </div>
                        </div>

                        {/* 3. Financials & Yield */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 grid grid-cols-2 gap-4">
                           <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seed Cost</span>
                              <div className="flex items-center text-slate-800 font-bold">
                                 <Euro className="w-4 h-4 mr-1 text-slate-400" />
                                 {getEstimatedSeedCost(selectedCrop) > 0 ? getEstimatedSeedCost(selectedCrop).toFixed(2) : '--'}
                                 <span className="text-[10px] font-medium text-slate-400 ml-1">/ tray</span>
                              </div>
                           </div>
                           <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Est. Revenue</span>
                              <div className="flex items-center text-teal-600 font-bold">
                                 <Euro className="w-4 h-4 mr-1" />
                                 {((selectedCrop.estimatedYieldPerTray/100) * (selectedCrop.revenuePer100g || 6)).toFixed(2)}
                                 <span className="text-[10px] font-medium text-teal-600/60 ml-1">/ tray</span>
                              </div>
                           </div>
                           <div className="col-span-2 pt-3 border-t border-slate-200 mt-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Bulk Seed Prices</span>
                              <div className="grid grid-cols-2 gap-3">
                                 <div className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-medium">500g Pack</span>
                                    <span className="text-xs font-bold text-slate-800">{selectedCrop.price500g ? `€${selectedCrop.price500g.toFixed(2)}` : '--'}</span>
                                 </div>
                                 <div className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-medium">1kg Pack</span>
                                    <span className="text-xs font-bold text-slate-800">{selectedCrop.price1kg ? `€${selectedCrop.price1kg.toFixed(2)}` : '--'}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="col-span-2 pt-2 border-t border-slate-200 mt-1">
                              <div className="flex justify-between items-center text-xs">
                                 <span className="text-slate-500 font-medium">Seeding Rate: <strong>{selectedCrop.seedingRate}g</strong></span>
                                 <span className="text-slate-500 font-medium">Exp. Yield: <strong>{selectedCrop.estimatedYieldPerTray}g</strong></span>
                              </div>
                           </div>
                        </div>

                        {/* 4. Notes */}
                        {selectedCrop.summary && (
                           <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                              <h4 className="flex items-center text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
                                 <Info className="w-3.5 h-3.5 mr-1.5" /> Notes
                              </h4>
                              <p className="text-sm text-blue-900 leading-relaxed">{selectedCrop.summary}</p>
                           </div>
                        )}
                     </div>
                  ) : (
                     /* EDIT FORM MODE */
                     <div className="space-y-4">
                         <h3 className="text-lg font-bold text-slate-800">{selectedCrop.id ? 'Edit Crop Details' : 'New Variety'}</h3>
                        
                        <div>
                           <label className="text-[10px] font-bold uppercase text-slate-400">Name</label>
                           <input type="text" value={selectedCrop.name} onChange={e => setSelectedCrop({...selectedCrop, name: e.target.value})} placeholder="Crop Name" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Seed Rate (g)</label>
                              <div className="relative">
                                 <Scale className="w-3 h-3 absolute left-3 top-3.5 text-slate-400" />
                                 <input type="number" value={selectedCrop.seedingRate} onChange={e => setSelectedCrop({...selectedCrop, seedingRate: parseInt(e.target.value)})} className="w-full pl-8 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold" />
                              </div>
                           </div>
                           <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Est Yield (g)</label>
                              <input type="number" value={selectedCrop.estimatedYieldPerTray} onChange={e => setSelectedCrop({...selectedCrop, estimatedYieldPerTray: parseInt(e.target.value)})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold" />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Price 500g (€)</label>
                              <div className="relative">
                                 <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">€</span>
                                 <input type="number" step="0.01" value={selectedCrop.price500g || ''} onChange={e => setSelectedCrop({...selectedCrop, price500g: parseFloat(e.target.value)})} className="w-full pl-7 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold" />
                              </div>
                           </div>
                           <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Price 1kg (€)</label>
                              <div className="relative">
                                 <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">€</span>
                                 <input type="number" step="0.01" value={selectedCrop.price1kg || ''} onChange={e => setSelectedCrop({...selectedCrop, price1kg: parseFloat(e.target.value)})} className="w-full pl-7 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold" />
                              </div>
                           </div>
                        </div>

                        <div>
                           <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center mb-2"><Palette className="w-3 h-3 mr-1"/> Color Theme</label>
                           <div className="flex flex-wrap gap-2">
                              {COLOR_OPTIONS.map((color) => (
                                 <button 
                                    key={color} 
                                    onClick={() => setSelectedCrop({...selectedCrop, color})}
                                    className={`w-8 h-8 rounded-full border-2 ${color.split(' ')[0]} ${selectedCrop.color === color ? 'ring-2 ring-offset-2 ring-slate-800 border-transparent' : 'border-white shadow-sm'}`}
                                 />
                              ))}
                           </div>
                        </div>

                        <div className="pt-2 space-y-3">
                           <button onClick={() => { if(selectedCrop.name) { selectedCrop.id ? onUpdateCrop(selectedCrop) : onAddCrop({...selectedCrop, id: Math.random().toString(36).substr(2,9)}); setSelectedCrop(null); }}} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl shadow-md">Save Variety</button>
                           {selectedCrop.id && <button onClick={() => { if(confirm('Delete?')) { onDeleteCrop(selectedCrop.id); setSelectedCrop(null); }}} className="w-full py-3 text-red-500 font-bold bg-red-50 rounded-xl">Delete Variety</button>}
                        </div>
                     </div>
                  )}

               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default CropManager;
