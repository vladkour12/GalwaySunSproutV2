
import React, { useState, useMemo, useEffect } from 'react';
import { saveCropManagerPreferences, loadCropManagerPreferences, STORAGE_KEYS, saveToStorage, loadFromStorage } from '../utils/persistence';
import { AppState, CropType, Stage, Tray, Customer, Alert } from '../types';
import { getFarmAlerts } from '../services/alertService';
import { STAGE_FLOW } from '../constants';
import { Plus, X, Sprout, Calendar, CheckCircle, Trash2, ArrowRight, Droplet, Sun, Moon, Archive, MoreHorizontal, Scale, Palette, AlertCircle, Euro, ChevronRight, Edit2, Info, Package, Repeat, ShoppingBag, Truck, MapPin, Clock, Anchor, User, CheckSquare, Search, Filter, ArrowUpDown, Thermometer, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from './CustomSelect';

interface CropManagerProps {
  state: AppState;
  onAddTray: (cropId: string, count: number, location: string, capacity: number, cropId2?: string) => void;
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

const safeDayName = (dayIndex: number) => {
  if (!Number.isFinite(dayIndex)) return 'Unknown';
  const idx = Math.trunc(dayIndex);
  return DAYS_OF_WEEK[idx] ?? 'Unknown';
};

const abbrDay = (dayName: string) => (typeof dayName === 'string' && dayName.length >= 3 ? dayName.substring(0, 3) : '---');

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

const isValidDate = (d: Date) => !Number.isNaN(d.getTime());

const formatShortDate = (d: Date) => {
  if (!isValidDate(d)) return '--';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Helper to calculate Dynamic Harvest Date based on CURRENT stage progress
const getTargetHarvestDate = (tray: Tray, crop: CropType) => {
  // If finished, return the last update time
  if (tray.stage === Stage.HARVEST_READY || tray.stage === Stage.HARVESTED) {
     const d = new Date(tray.updatedAt);
     return isValidDate(d) ? d : new Date();
  }

  const currentStageIndex = STAGE_FLOW.indexOf(tray.stage);
  if (currentStageIndex === -1) return new Date(); // Fallback

  // 1. Start calculation from when the current stage began
  const start = new Date(tray.startDate);
  if (!isValidDate(start)) {
    const updated = new Date(tray.updatedAt);
    return isValidDate(updated) ? updated : new Date();
  }
  let projectedTime = start.getTime();

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
  try {
    const start = new Date(tray.startDate);
    if (isNaN(start.getTime())) return { text: "Invalid date", isOverdue: false, hours: 0 };
    
    const startTime = start.getTime();
    const durationHours = getStageDurationHours(tray.stage, crop);

    if (tray.stage === Stage.HARVEST_READY) return { text: "Harvest Now", isOverdue: false, hours: 0 };

    const targetTime = startTime + (durationHours * 60 * 60 * 1000);
    const now = new Date().getTime();
    const diff = targetTime - now;
    const totalHours = diff / (1000 * 60 * 60);

    if (diff < 0) return { text: "Overdue", isOverdue: true, hours: Math.abs(totalHours) };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) return { text: `${days}d ${hours}h`, isOverdue: false, hours: totalHours };
    if (hours > 0) return { text: `${hours}h`, isOverdue: false, hours: totalHours };
    return { text: "Now", isOverdue: false, hours: 0 };
  } catch (e) {
    console.error('Error in getTimeToNextStage:', e);
    return { text: "Error", isOverdue: false, hours: 0 };
  }
};

// Helper to get days and hours since crop started growing
const getDaysSinceStart = (tray: Tray) => {
  try {
    const start = new Date(tray.startDate);
    if (isNaN(start.getTime())) return { days: 0, hours: 0, text: "--" };
    
    const now = new Date().getTime();
    const startTime = start.getTime();
    const diff = now - startTime;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return { days, hours, text: `${days}d ${hours}h` };
  } catch (e) {
    console.error('Error in getDaysSinceStart:', e);
    return { days: 0, hours: 0, text: "--" };
  }
};

// Helper to calculate estimated seed cost per tray
const getEstimatedSeedCost = (crop: CropType, isHalfHalf: boolean = false) => {
  if (!crop.seedingRate) return 0;
  const rate = isHalfHalf ? crop.seedingRate / 2 : crop.seedingRate;
  // Prioritize Large pack price (1kg) for better accuracy on business scale
  if (crop.price1kg) {
    return (rate / (crop.pkgWeightLarge || 1000)) * crop.price1kg;
  }
  if (crop.price500g) {
    return (rate / (crop.pkgWeightSmall || 500)) * crop.price500g;
  }
  return 0;
};

// Helper to get tray yield (handles half-half trays)
const getTrayYield = (tray: Tray, crops: CropType[]): number => {
  const crop = crops.find(c => c.id === tray.cropTypeId);
  const crop2 = tray.cropTypeId2 ? crops.find(c => c.id === tray.cropTypeId2) : null;
  
  if (!crop) return 0;
  if (crop2) {
    // Half-half tray: average of both yields
    return ((crop.estimatedYieldPerTray || 0) + (crop2.estimatedYieldPerTray || 0)) / 2;
  }
  return crop.estimatedYieldPerTray || 0;
};

// Helper to get tray seed cost (handles half-half trays)
const getTraySeedCost = (tray: Tray, crops: CropType[]): number => {
  const crop = crops.find(c => c.id === tray.cropTypeId);
  const crop2 = tray.cropTypeId2 ? crops.find(c => c.id === tray.cropTypeId2) : null;
  
  if (!crop) return 0;
  
  const cost1 = getEstimatedSeedCost(crop, !!crop2);
  const cost2 = crop2 ? getEstimatedSeedCost(crop2, true) : 0;
  
  return cost1 + cost2;
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
  // Navigation State (with persistence)
  const savedCropManagerPrefs = loadCropManagerPreferences();
  // Check if we should show calendar tab (from notification click)
  const shouldShowCalendar = localStorage.getItem('galway_show_calendar') === 'true';
  const [activeTab, setActiveTab] = useState<'production' | 'varieties' | 'plan' | 'calendar'>(
    shouldShowCalendar ? 'calendar' : savedCropManagerPrefs.activeTab
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Clear the calendar flag after using it
  useEffect(() => {
    if (shouldShowCalendar) {
      localStorage.removeItem('galway_show_calendar');
    }
  }, [shouldShowCalendar]);
  
  // Update time every minute for live timers (only when calendar tab is active)
  useEffect(() => {
    if (activeTab !== 'calendar') return;
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    // Also update immediately on mount
    setCurrentTime(new Date());
    return () => clearInterval(interval);
  }, [activeTab]);
  const [plannerMode, setPlannerMode] = useState<'event' | 'recurring'>(savedCropManagerPrefs.plannerMode);

  // Crop search and filter state
  const [cropSearchQuery, setCropSearchQuery] = useState('');
  const [cropFilterDifficulty, setCropFilterDifficulty] = useState<string>('all');
  const [cropSortBy, setCropSortBy] = useState<'name' | 'difficulty' | 'yield' | 'price'>('name');
  const [cropSortOrder, setCropSortOrder] = useState<'asc' | 'desc'>('asc');

  // Force re-render every minute to update countdown timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    saveCropManagerPreferences({ activeTab, plannerMode });
  }, [activeTab, plannerMode]);
  
  // Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTray, setSelectedTray] = useState<Tray | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropType | null>(null);
  const [isEditingCrop, setIsEditingCrop] = useState(false); // Toggle between View Details and Edit Form
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  
  // Add to shelf option when creating new crop
  const [addToShelf, setAddToShelf] = useState(false);
  const [selectedShelfLocation, setSelectedShelfLocation] = useState('');
  
  // Drag and drop state
  const [draggedTray, setDraggedTray] = useState<Tray | null>(null);
  const [dragOverLocation, setDragOverLocation] = useState<string | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Tray editing state
  const [isEditingTray, setIsEditingTray] = useState(false);
  const [editingTrayNotes, setEditingTrayNotes] = useState('');
  const [editingTrayLocation, setEditingTrayLocation] = useState('');
  const [editingTrayStartDate, setEditingTrayStartDate] = useState('');
  const [editingTrayPlantedDate, setEditingTrayPlantedDate] = useState('');
  
  // Full-size image viewer state
  const [fullSizeImage, setFullSizeImage] = useState<{ src: string; alt: string } | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  
  // Calendar popup state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  
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
  const [plantCropId2, setPlantCropId2] = useState(''); // Second crop for half-half trays
  const [isHalfHalf, setIsHalfHalf] = useState(false); // Toggle for half-half tray
  const [plantLocation, setPlantLocation] = useState('');
  const [plantCount, setPlantCount] = useState(1);
  const [yieldInput, setYieldInput] = useState('');

  // Load Orders from LocalStorage on mount
  useEffect(() => {
    const saved = loadFromStorage<RecurringOrder[]>(STORAGE_KEYS.ORDERS, []);
    if (saved.length > 0) {
      setRecurringOrders(saved);
    }
  }, []);

  // Save Orders
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ORDERS, recurringOrders);
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

  // Filtered and sorted varieties
  const varieties = useMemo(() => {
    let filtered = state.crops.filter(crop => {
      // Search filter
      if (cropSearchQuery) {
        const query = cropSearchQuery.toLowerCase();
        const matchesName = crop.name.toLowerCase().includes(query);
        const matchesScientific = crop.scientificName?.toLowerCase().includes(query);
        const matchesSummary = crop.summary?.toLowerCase().includes(query);
        const matchesCategory = crop.category?.toLowerCase().includes(query);
        if (!matchesName && !matchesScientific && !matchesSummary && !matchesCategory) {
          return false;
        }
      }
      
      // Difficulty filter
      if (cropFilterDifficulty !== 'all') {
        if (crop.difficulty?.toLowerCase() !== cropFilterDifficulty.toLowerCase()) {
          return false;
        }
      }
      
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (cropSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'difficulty':
          const difficultyOrder: Record<string, number> = {
            'easy': 1, 'medium': 2, 'intermediate': 3, 'medium-difficult': 4, 'hard': 5, 'difficult': 6
          };
          const aDiff = difficultyOrder[a.difficulty?.toLowerCase() || ''] || 99;
          const bDiff = difficultyOrder[b.difficulty?.toLowerCase() || ''] || 99;
          comparison = aDiff - bDiff;
          break;
        case 'yield':
          comparison = (a.estimatedYieldPerTray || 0) - (b.estimatedYieldPerTray || 0);
          break;
        case 'price':
          comparison = (a.pricePerTray || 0) - (b.pricePerTray || 0);
          break;
      }
      return cropSortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [state.crops, cropSearchQuery, cropFilterDifficulty, cropSortBy, cropSortOrder]);

  // --- Calculations for Planners ---

  const eventSchedule = useMemo(() => {
     try {
     if (!plannerCropId || !plannerDate) return null;
     const crop = state.crops.find(c => c.id === plannerCropId);
     if (!crop) return null;

     const target = new Date(plannerDate);
     if (isNaN(target.getTime())) return null;

     const totalDays = (crop.germinationDays || 0) + (crop.blackoutDays || 0) + (crop.lightDays || 0);
     
     // Plant Date = Target - Total Days
     const plantDate = new Date(target);
     plantDate.setDate(target.getDate() - totalDays);
     
     const germEnd = new Date(plantDate);
     germEnd.setDate(plantDate.getDate() + (crop.germinationDays || 0));
     
     const blackoutEnd = new Date(germEnd);
     blackoutEnd.setDate(germEnd.getDate() + (crop.blackoutDays || 0));
     
     return { crop, plantDate, germEnd, blackoutEnd, harvestDate: target };
     } catch (e) {
       console.error('Planner (event) crashed', e);
       return null;
     }
  }, [plannerCropId, plannerDate, state.crops]);

  const recurringSchedule = useMemo(() => {
    try {
    if (!recurringCropId || !recurringTargetAmount) return null;
    const crop = state.crops.find(c => c.id === recurringCropId);
    if (!crop) return null;
    
    const target = parseInt(recurringTargetAmount);
    if (isNaN(target) || target <= 0) return null;

    const yieldPerTray = crop.estimatedYieldPerTray || 1;
    const traysNeeded = Math.ceil(target / yieldPerTray);
    const totalGrowingDays = (crop.germinationDays || 0) + (crop.blackoutDays || 0) + (crop.lightDays || 0);
    
    // Calculate Plant Day Index (0-6)
      const plantDayIndex = (Math.trunc(recurringHarvestDay) - (Math.trunc(totalGrowingDays) % 7) + 7) % 7;
    
    // --- New Calculations ---
    // 1. Weekly Seed Usage
    const weeklySeedGrams = traysNeeded * (crop.seedingRate || 0);
    
    // 2. Weekly Seed Cost (Best Price Logic: 1kg -> 500g -> fallback)
    let seedCost = 0;
    if (crop.price1kg) seedCost = (weeklySeedGrams / 1000) * crop.price1kg;
    else if (crop.price500g) seedCost = (weeklySeedGrams / 500) * crop.price500g;
    
    // 3. Weekly Revenue
    const weeklyRevenue = (target / 100) * (crop.revenuePer100g || 6.00);

    // 4. Shelf Capacity Used (Peak Active Trays under lights)
    const lightBatches = Math.ceil((crop.lightDays || 0) / 7); 
    const shelfSpace = lightBatches * traysNeeded;

    // 5. Schedule Flow
      const plantDayName = safeDayName(plantDayIndex);
      const blackoutStartDayIndex = (plantDayIndex + Math.trunc(crop.germinationDays || 0)) % 7;
      const lightStartDayIndex = (blackoutStartDayIndex + Math.trunc(crop.blackoutDays || 0)) % 7;

    // 6. Upcoming Schedule (Calendar Dates)
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0-6
    let daysUntilNextPlant = (plantDayIndex - currentDayIndex + 7) % 7;
    // If today is the planting day, assume next one is today if not already passed, else next week?
    // Let's assume if it's today, we show today.
    
    const upcomingDates = [];
    const nextPlantDate = new Date(today);
    nextPlantDate.setDate(today.getDate() + daysUntilNextPlant);

    for (let i = 0; i < 4; i++) {
        const d = new Date(nextPlantDate);
        d.setDate(nextPlantDate.getDate() + (i * 7));
        upcomingDates.push(d);
    }

    return {
      crop,
      traysNeeded,
      yieldPerTray,
      plantDayName,
        harvestDayName: safeDayName(recurringHarvestDay),
      totalGrowingDays,
      weeklySeedGrams,
      seedCost,
      weeklyRevenue,
      shelfSpace,
      lightBatches,
      upcomingDates,
      timeline: {
          plant: plantDayName,
          blackout: safeDayName(blackoutStartDayIndex),
          light: safeDayName(lightStartDayIndex),
          harvest: safeDayName(recurringHarvestDay),
        },
    };
    } catch (e) {
      console.error('Planner (recurring) crashed', e);
      return null;
    }
  }, [recurringCropId, recurringTargetAmount, recurringHarvestDay, state.crops]);

  // --- Calendar Data Generation ---
  const calendarDays = useMemo(() => {
      try {
      const days = [];
      const today = new Date();
      if (isNaN(today.getTime())) {
        console.error('Invalid today date');
        return [];
      }
  
      // Show 4 days: today and next 3 days
      for (let i = 0; i < 4; i++) {
        const currentDay = new Date(today);
        currentDay.setDate(today.getDate() + i);
        const dayOfWeek = currentDay.getDay(); // 0-6
  
        const tasks: { type: string, text: string, sub?: string, icon: any, color: string, trayId?: string, estYield?: number, timeRemaining?: { text: string, isOverdue: boolean }, targetTime?: number }[] = [];
  
        // 0. Overdue / Action Needed (Only for Today) - Sync with Dashboard Alerts
      if (i === 0) {
         const alerts = getFarmAlerts(state);
         alerts.forEach(alert => {
            let icon = AlertCircle;
            let color = "text-red-600 bg-red-50";
            let type = 'alert'; // Default to alert style
            
            if (alert.type === 'urgent') {
               icon = AlertCircle;
               color = "text-red-600 bg-red-50";
            } else if (alert.type === 'warning') {
               icon = AlertCircle;
               color = "text-amber-600 bg-amber-50"; 
            } else if (alert.type === 'routine') {
               icon = Droplet;
               color = "text-blue-500 bg-blue-50";
               type = 'routine';
            }

            tasks.push({
               type: type,
               text: alert.title,
               sub: alert.message,
               icon: icon,
               color: color,
               trayId: alert.trayId
            });
         });
      }

      // 1. Existing Tasks from Active Trays
      
      activeTrays.forEach(tray => {
         const crop = state.crops.find(c => c.id === tray.cropTypeId);
         const crop2 = tray.cropTypeId2 ? state.crops.find(c => c.id === tray.cropTypeId2) : null;
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
         
         // For half-half trays, use the first crop's schedule (or could use longest)
         const displayName = crop2 ? `${crop.name} + ${crop2.name}` : crop.name;
         const estYield = crop2 
            ? ((crop.estimatedYieldPerTray || 0) + (crop2.estimatedYieldPerTray || 0)) / 2
            : (crop.estimatedYieldPerTray || 0);

         if (tray.stage === Stage.SOAK && crop.soakHours > 0) {
            // Soak is usually same day or next day, hard to pin exact date without hours
            // Skip for calendar view simplicity, handle in dashboard alerts
         } else if (tray.stage === Stage.GERMINATION) {
             stageDuration = crop.germinationDays;
             stageEndDate = addDays(startDate, stageDuration);
             // Don't show scheduled task if it's already shown as overdue action today
             const isOverdue = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) > crop.germinationDays + 0.5;
             if (stageEndDate.toDateString() === currentDay.toDateString() && !(i === 0 && isOverdue)) {
                const timeInfo = getTimeToNextStage(tray, crop);
                const targetTime = startDate.getTime() + (crop.germinationDays * 24 * 60 * 60 * 1000);
                tasks.push({ 
                  type: 'task', 
                  text: `Blackout ${displayName} (${tray.location})`, 
                  icon: Moon, 
                  color: 'text-purple-600 bg-purple-50', 
                  trayId: tray.id,
                  timeRemaining: timeInfo,
                  targetTime: targetTime
                });
             }
         } else if (tray.stage === Stage.BLACKOUT) {
             stageDuration = crop.blackoutDays;
             stageEndDate = addDays(startDate, stageDuration);
             const isOverdue = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) > crop.blackoutDays + 0.5;
             if (stageEndDate.toDateString() === currentDay.toDateString() && !(i === 0 && isOverdue)) {
                const timeInfo = getTimeToNextStage(tray, crop);
                const targetTime = startDate.getTime() + (crop.blackoutDays * 24 * 60 * 60 * 1000);
                tasks.push({ 
                  type: 'task', 
                  text: `Uncover ${displayName} (${tray.location})`, 
                  icon: Sun, 
                  color: 'text-amber-600 bg-amber-50', 
                  trayId: tray.id,
                  timeRemaining: timeInfo,
                  targetTime: targetTime
                });
             }
         } else if (tray.stage === Stage.LIGHT) {
             stageDuration = crop.lightDays;
             stageEndDate = addDays(startDate, stageDuration);
             const isOverdue = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) > crop.lightDays + 2;
             if (stageEndDate.toDateString() === currentDay.toDateString() && !(i === 0 && isOverdue)) {
                const timeInfo = getTimeToNextStage(tray, crop);
                const targetTime = startDate.getTime() + (crop.lightDays * 24 * 60 * 60 * 1000);
                tasks.push({ 
                  type: 'harvest', 
                  text: `Harvest ${displayName}`, 
                  sub: tray.location, 
                  icon: CheckCircle, 
                  color: 'text-teal-600 bg-teal-50', 
                  trayId: tray.id, 
                  estYield: estYield,
                  timeRemaining: timeInfo,
                  targetTime: targetTime
                });
             }
         }
         
         // Also handle SOAK stage for today's tasks
         if (tray.stage === Stage.SOAK && crop.soakHours > 0 && i === 0) {
            try {
              const timeInfo = getTimeToNextStage(tray, crop);
              const startTime = new Date(startDate).getTime();
              if (!isNaN(startTime)) {
                const targetTime = startTime + (crop.soakHours * 60 * 60 * 1000);
                tasks.push({ 
                  type: 'task', 
                  text: `Move ${displayName} to Germination (${tray.location})`, 
                  icon: Droplet, 
                  color: 'text-blue-600 bg-blue-50', 
                  trayId: tray.id,
                  timeRemaining: timeInfo,
                  targetTime: targetTime
                });
              }
            } catch (e) {
              console.error('Error processing SOAK task:', e);
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

      // 4. General Tasks (handled by getFarmAlerts for Today)
      // Future days don't show generic routines to keep calendar clean.


      days.push({ date: currentDay, dayOfWeek, tasks });
    }
    return days;
      } catch (e) {
        console.error('Calendar generation crashed', e);
        return [];
      }
  }, [activeTrays, recurringOrders, state.crops, state.customers]);


  // --- Handlers ---

  const handlePlant = () => {
     if(!plantCropId) return;
     const crop = state.crops.find(c => c.id === plantCropId);
     const crop2 = isHalfHalf && plantCropId2 ? state.crops.find(c => c.id === plantCropId2) : null;
     // For half-half trays, use average yield or sum of both
     const capacity = isHalfHalf && crop2 
        ? ((crop?.estimatedYieldPerTray || 0) + (crop2.estimatedYieldPerTray || 0)) / 2
        : (crop?.estimatedYieldPerTray || 0);
     onAddTray(plantCropId, plantCount, plantLocation || 'Shed', capacity, isHalfHalf ? plantCropId2 : undefined);
     setIsAdding(false);
     setPlantCropId(state.crops[0]?.id || '');
     setPlantCropId2('');
     setIsHalfHalf(false);
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
        estimatedYieldPerTray: 298, 
        pricePerTray: 10,
        seedingRate: 0,
        price500g: 0,
        price1kg: 0
     } as CropType);
     setIsEditingCrop(true); // Default to edit mode for new
     setAddToShelf(false); // Reset add to shelf option
     setSelectedShelfLocation(''); // Reset selected location
  };
  
  // Get unique shelf locations from active trays
  const availableLocations = useMemo(() => {
    const locations = new Set<string>();
    activeTrays.forEach(tray => {
      if (tray.location) {
        locations.add(tray.location);
      }
    });
    // Add common locations if none exist
    if (locations.size === 0) {
      locations.add('Shelf 1');
      locations.add('Shelf 2');
      locations.add('Shelf 3');
      locations.add('Shed');
    }
    return Array.from(locations).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 999;
      const numB = parseInt(b.replace(/\D/g, '')) || 999;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [activeTrays]);

  // --- Render Sections ---

  return (
    <div>
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
         
         {/* --- PRODUCTION LIST (IMPROVED SHED UI) --- */}
         {activeTab === 'production' && (
            <div className="space-y-4">
               {activeTrays.length === 0 && (
                  <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="text-center py-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border-2 border-dashed border-slate-200"
                  >
                     <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-200 mb-4">
                        <Sprout className="w-8 h-8 text-slate-400" />
                  </div>
                     <p className="text-slate-500 font-bold text-sm mb-1">No active trays</p>
                     <p className="text-slate-400 text-xs">Start by planting your first crop</p>
                  </motion.div>
               )}
               
               {/* Group trays by shelf location - 4 trays per shelf */}
               {(() => {
                  const groupedByLocation = activeTrays.reduce((acc, tray) => {
                     const location = tray.location || 'Unassigned';
                     if (!acc[location]) acc[location] = [];
                     acc[location].push(tray);
                     return acc;
                  }, {} as Record<string, typeof activeTrays>);

                  // Sort locations naturally (Shelf 1, Shelf 2, etc.)
                  const sortedLocations = Object.keys(groupedByLocation).sort((a, b) => {
                     const numA = parseInt(a.replace(/\D/g, '')) || 999;
                     const numB = parseInt(b.replace(/\D/g, '')) || 999;
                     if (numA !== numB) return numA - numB;
                     return a.localeCompare(b);
                  });

                  return sortedLocations.map((location, locationIndex) => {
                     const trays = groupedByLocation[location];
                     // Group trays into shelves of 4
                     const shelves: (typeof trays)[] = [];
                     for (let i = 0; i < trays.length; i += 4) {
                        shelves.push(trays.slice(i, i + 4));
                     }

                     return (
                        <div key={location} className="space-y-3">
                           {/* Shelf Location Header - Drop Zone */}
                           <div 
                              className={`flex items-center gap-2 px-2 py-1.5 bg-gradient-to-r from-slate-50 to-transparent rounded-xl border-2 transition-all ${
                                 dragOverLocation === location 
                                    ? 'border-teal-400 bg-teal-50 shadow-lg' 
                                    : 'border-slate-100'
                              }`}
                              onDragOver={(e) => {
                                 e.preventDefault();
                                 if (draggedTray && draggedTray.location !== location) {
                                    setDragOverLocation(location);
                                 }
                              }}
                              onDragLeave={() => {
                                 setDragOverLocation(null);
                              }}
                              onDrop={(e) => {
                                 e.preventDefault();
                                 if (draggedTray && draggedTray.location !== location) {
                                    onUpdateTray(draggedTray.id, { location });
                                    setDraggedTray(null);
                                    setDragOverLocation(null);
                                 }
                              }}
                              onTouchEnd={(e) => {
                                 if (draggedTray && touchStartPos) {
                                    const touch = e.changedTouches[0];
                                    // Small delay to ensure touch event completes
                                    setTimeout(() => {
                                       const element = document.elementFromPoint(touch.clientX, touch.clientY);
                                       const dropZone = element?.closest('[data-drop-zone]');
                                       if (dropZone) {
                                          const targetLocation = dropZone.getAttribute('data-location');
                                          if (targetLocation && targetLocation === location && draggedTray.location !== location) {
                                             onUpdateTray(draggedTray.id, { location });
                                          }
                                       }
                                       setDraggedTray(null);
                                       setDragOverLocation(null);
                                       setTouchStartPos(null);
                                    }, 50);
                                 }
                              }}
                              data-drop-zone
                              data-location={location}
                           >
                              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-teal-100 text-teal-700">
                                 <MapPin className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                 <h3 className="text-sm font-bold text-slate-800">{location}</h3>
                                 <p className="text-xs text-slate-500">{trays.length} {trays.length === 1 ? 'tray' : 'trays'}</p>
                              </div>
                              {trays.length > 4 && (
                                 <div className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">
                                    {shelves.length} {shelves.length === 1 ? 'shelf' : 'shelves'}
                                 </div>
                              )}
                              {dragOverLocation === location && (
                                 <div className="text-xs font-bold text-teal-600 animate-pulse">Drop here</div>
                              )}
                           </div>

                           {/* Render shelves (4 trays per shelf) */}
                           {shelves.map((shelfTrays, shelfIndex) => (
                              <div key={shelfIndex} className="space-y-3">
                                 {shelves.length > 1 && (
                                    <div className="flex items-center gap-2 px-2">
                                       <div className="w-px h-4 bg-slate-200"></div>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                          {location} - Row {shelfIndex + 1}
                                       </span>
                                    </div>
                                 )}
                                 
                                 {/* 4-tray grid */}
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {shelfTrays.map(tray => {
                  const crop = state.crops.find(c => c.id === tray.cropTypeId);
                  const crop2 = tray.cropTypeId2 ? state.crops.find(c => c.id === tray.cropTypeId2) : null;
                  if (!crop) return null;

                  // For half-half trays, use the first crop for timing calculations
                  const harvestDate = getTargetHarvestDate(tray, crop);
                  const nextStageInfo = getTimeToNextStage(tray, crop);
                  const isHarvestReady = tray.stage === Stage.HARVEST_READY;

                  return (
                     <motion.div 
                        key={tray.id}
                        layoutId={tray.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ 
                           opacity: draggedTray?.id === tray.id ? 0.5 : 1, 
                           scale: draggedTray?.id === tray.id ? 0.95 : 1,
                           zIndex: draggedTray?.id === tray.id ? 50 : 1
                        }}
                        onClick={(e) => {
                           // Only open modal if not dragging
                           if (!isDragging && !draggedTray) {
                              setSelectedTray(tray);
                              setIsEditingTray(false);
                              setEditingTrayNotes(tray.notes || '');
                              setEditingTrayLocation(tray.location || '');
                              // Initialize date fields for editing
                              const startDate = new Date(tray.startDate);
                              setEditingTrayStartDate(startDate.toISOString().slice(0, 16));
                              if (tray.plantedAt) {
                                 const plantedDate = new Date(tray.plantedAt);
                                 setEditingTrayPlantedDate(plantedDate.toISOString().slice(0, 16));
                              } else {
                                 setEditingTrayPlantedDate('');
                              }
                           }
                        }}
                        draggable
                        onDragStart={(e) => {
                           setIsDragging(true);
                           setDraggedTray(tray);
                           e.dataTransfer.effectAllowed = 'move';
                           e.dataTransfer.setData('text/plain', tray.id);
                        }}
                        onDragEnd={() => {
                           setIsDragging(false);
                           setDraggedTray(null);
                           setDragOverLocation(null);
                        }}
                        onTouchStart={(e) => {
                           const touch = e.touches[0];
                           setTouchStartPos({ x: touch.clientX, y: touch.clientY });
                           setIsDragging(false);
                        }}
                        onTouchMove={(e) => {
                           if (touchStartPos) {
                              const touch = e.touches[0];
                              const deltaX = Math.abs(touch.clientX - touchStartPos.x);
                              const deltaY = Math.abs(touch.clientY - touchStartPos.y);
                              
                              // Only start dragging if moved more than 10px (to distinguish from tap)
                              if (deltaX > 10 || deltaY > 10) {
                                 if (!isDragging) {
                                    setIsDragging(true);
                                    setDraggedTray(tray);
                                 }
                                 
                                 const element = document.elementFromPoint(touch.clientX, touch.clientY);
                                 const dropZone = element?.closest('[data-drop-zone]');
                                 if (dropZone) {
                                    const location = dropZone.getAttribute('data-location');
                                    if (location && location !== tray.location) {
                                       setDragOverLocation(location);
                                    } else {
                                       setDragOverLocation(null);
                                    }
                                 } else {
                                    setDragOverLocation(null);
                                 }
                              }
                           }
                        }}
                        onTouchEnd={(e) => {
                           if (isDragging && draggedTray && touchStartPos) {
                              const touch = e.changedTouches[0];
                              setTimeout(() => {
                                 const element = document.elementFromPoint(touch.clientX, touch.clientY);
                                 const dropZone = element?.closest('[data-drop-zone]');
                                 if (dropZone) {
                                    const targetLocation = dropZone.getAttribute('data-location');
                                    if (targetLocation && targetLocation !== tray.location) {
                                       onUpdateTray(tray.id, { location: targetLocation });
                                    }
                                 }
                                 setDraggedTray(null);
                                 setDragOverLocation(null);
                                 setIsDragging(false);
                                 setTouchStartPos(null);
                              }, 50);
                           } else {
                              // It was just a tap, not a drag
                              setIsDragging(false);
                              setTouchStartPos(null);
                           }
                        }}
                        className={`group bg-white rounded-xl border-2 ${nextStageInfo.isOverdue ? 'border-red-300 bg-gradient-to-br from-red-50 to-white' : isHarvestReady ? 'border-teal-300 bg-gradient-to-br from-teal-50 to-white' : 'border-slate-200 hover:border-teal-200'} shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing relative overflow-hidden ${draggedTray?.id === tray.id ? 'opacity-50 scale-95 shadow-xl' : ''}`}
                        whileHover={{ scale: draggedTray ? 1 : 1.02 }}
                        whileTap={{ scale: 0.98 }}
                     >
                                             {/* Overdue Pulse Effect */}
                                             {nextStageInfo.isOverdue && (
                                                <div className="absolute inset-0 border-2 border-red-400 rounded-2xl animate-pulse opacity-50 z-0"></div>
                                             )}
                                             
                                             <div className="p-2 flex flex-col gap-1.5 relative z-10">
                                                {/* Drag Handle Indicator */}
                                                {!draggedTray && (
                                                   <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                      <div className="p-0.5 bg-slate-800/80 rounded-lg">
                                                         <MapPin className="w-2.5 h-2.5 text-white" />
                                                      </div>
                                                   </div>
                                                )}
                                                
                                                {/* Crop Image with Stage Badge - Half-Half Support */}
                                                <div className={`relative w-full aspect-square rounded-md flex items-center justify-center text-[9px] font-bold shadow-sm overflow-hidden border ${nextStageInfo.isOverdue ? 'border-red-300' : isHarvestReady ? 'border-teal-300' : 'border-slate-200'} cursor-pointer`}
                                                     onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (crop2) {
                                                           // For half-half, show first crop image
                                                           if (crop.imageUrl) {
                                                              setFullSizeImage({ src: crop.imageUrl, alt: crop.name });
                                                              setImageZoom(1);
                                                              setImagePosition({ x: 0, y: 0 });
                                                           }
                                                        } else {
                                                           if (crop.imageUrl) {
                                                              setFullSizeImage({ src: crop.imageUrl, alt: crop.name });
                                                              setImageZoom(1);
                                                              setImagePosition({ x: 0, y: 0 });
                                                           }
                                                        }
                                                     }}
                                                >
                                                   {crop2 ? (
                                                      /* Half-Half Tray: Split View */
                                                      <div className="w-full h-full flex">
                                                         <div className={`flex-1 ${crop.color?.split(' ')[0] || 'bg-slate-200'} flex items-center justify-center relative`}
                                                              onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 if (crop.imageUrl) {
                                                                    setFullSizeImage({ src: crop.imageUrl, alt: crop.name });
                                                                    setImageZoom(1);
                                                                    setImagePosition({ x: 0, y: 0 });
                                                                 }
                                                              }}
                                                         >
                                                            {crop.imageUrl ? (
                                                               <img src={crop.imageUrl} alt={crop.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                            ) : (
                                                               <span className="text-slate-600 text-[7px]">{crop.name.substring(0,2).toUpperCase()}</span>
                                                            )}
                                                         </div>
                                                         <div className="w-0.5 bg-slate-300"></div>
                                                         <div className={`flex-1 ${crop2.color?.split(' ')[0] || 'bg-slate-200'} flex items-center justify-center relative`}
                                                              onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 if (crop2.imageUrl) {
                                                                    setFullSizeImage({ src: crop2.imageUrl, alt: crop2.name });
                                                                    setImageZoom(1);
                                                                    setImagePosition({ x: 0, y: 0 });
                                                                 }
                                                              }}
                                                         >
                                                            {crop2.imageUrl ? (
                                                               <img src={crop2.imageUrl} alt={crop2.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                            ) : (
                                                               <span className="text-slate-600 text-[7px]">{crop2.name.substring(0,2).toUpperCase()}</span>
                                                            )}
                                                         </div>
                                                      </div>
                                                   ) : (
                                                      /* Single Crop Tray */
                                                      <div className={`w-full h-full ${crop.color?.split(' ')[0] || 'bg-slate-200'}`}>
                                                         {crop.imageUrl ? (
                                                            <img 
                                                               src={crop.imageUrl} 
                                                               alt={crop.name} 
                                                               className="w-full h-full object-cover"
                                                               onError={(e) => {
                                                                  console.warn(`Failed to load image for ${crop.name}:`, crop.imageUrl);
                                                                  e.currentTarget.style.display = 'none';
                                                               }}
                                                            />
                                                         ) : (
                                                            <span className="text-slate-600 text-[8px]">{crop.name.substring(0,2).toUpperCase()}</span>
                                                         )}
                                                      </div>
                                                   )}
                                                   {/* Stage Indicator Badge */}
                                                   <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white flex items-center justify-center ${
                                                      tray.stage === Stage.SEED || tray.stage === Stage.SOAK ? 'bg-slate-500' :
                                                      tray.stage === Stage.GERMINATION ? 'bg-blue-500' :
                                                      tray.stage === Stage.BLACKOUT ? 'bg-purple-500' :
                                                      tray.stage === Stage.LIGHT ? 'bg-amber-500' :
                                                      'bg-teal-500'
                                                   }`}></div>
                                                </div>

                                                {/* Crop Name & Stage */}
                                                <div className="space-y-1">
                                                   <div className="flex items-start justify-between gap-1">
                                                      <div className="flex-1 min-w-0">
                                                         {crop2 ? (
                                                            <div className="space-y-0.5">
                                                               <h3 className="text-[9px] font-bold text-slate-900 truncate">{crop.name}</h3>
                                                               <h3 className="text-[9px] font-bold text-slate-700 truncate">+ {crop2.name}</h3>
                                                            </div>
                                                         ) : (
                                                            <h3 className="text-[10px] font-bold text-slate-900 truncate">{crop.name}</h3>
                                                         )}
                                                      </div>
                                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                                         {crop2 && (
                                                            <Package className="w-2.5 h-2.5 text-purple-500" title="Half-half tray" />
                                                         )}
                                                         {tray.notes && (
                                                            <Info className="w-2.5 h-2.5 text-blue-500" title="Has notes" />
                                                         )}
                                                         {nextStageInfo.isOverdue && (
                                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                                         )}
                                                      </div>
                                                   </div>
                                                   <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide ${getStageColor(tray.stage)}`}>
                                  {tray.stage}
                               </span>
                        </div>

                                                {/* Status Info */}
                                                <div className="space-y-0.5 pt-0.5 border-t border-slate-100">
                           {isHarvestReady ? (
                                                      <div className="flex items-center gap-1 text-teal-600">
                                                         <CheckCircle className="w-2.5 h-2.5 flex-shrink-0" />
                                                         <span className="text-[9px] font-bold">Ready</span>
                              </div>
                           ) : (
                              <>
                                                         <div className="flex items-center justify-between text-[9px]">
                                                            <span className="text-slate-500">Growing:</span>
                                                            <span className="font-bold text-slate-700">{getDaysSinceStart(tray).text}</span>
                                 </div>
                                                         <div className="flex items-center justify-between text-[9px]">
                                                            <span className="text-slate-500">Harvest:</span>
                                                            <span className="font-bold text-slate-700">{formatShortDate(harvestDate)}</span>
                                 </div>
                                                         <div className="flex items-center justify-between">
                                                            <span className={`text-[9px] font-medium ${nextStageInfo.isOverdue ? 'text-red-600' : 'text-teal-600'}`}>
                                                               Next:
                                                            </span>
                                                            <span className={`text-[9px] font-bold ${nextStageInfo.isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                                       {nextStageInfo.text}
                                    </span>
                                 </div>
                              </>
                           )}
                                                </div>
                        </div>
                     </motion.div>
                  );
               })}
                                    
                                    {/* Fill empty slots if less than 4 trays */}
                                    {Array.from({ length: 4 - shelfTrays.length }).map((_, emptyIndex) => (
                                       <div 
                                          key={`empty-${emptyIndex}`} 
                                          className={`aspect-square rounded-xl border-2 border-dashed transition-all ${
                                             dragOverLocation === location && draggedTray 
                                                ? 'border-teal-400 bg-teal-50' 
                                                : 'border-slate-200 bg-slate-50/50'
                                          } flex items-center justify-center`}
                                          onDragOver={(e) => {
                                             e.preventDefault();
                                             if (draggedTray && draggedTray.location !== location) {
                                                setDragOverLocation(location);
                                             }
                                          }}
                                          onDragLeave={() => {
                                             setDragOverLocation(null);
                                          }}
                                          onDrop={(e) => {
                                             e.preventDefault();
                                             if (draggedTray && draggedTray.location !== location) {
                                                onUpdateTray(draggedTray.id, { location });
                                                setDraggedTray(null);
                                                setDragOverLocation(null);
                                             }
                                          }}
                                          data-drop-zone
                                          data-location={location}
                                       >
                                          <div className="text-center">
                                             <Sprout className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                                             <span className="text-[8px] text-slate-400 font-medium">Empty</span>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           ))}
                        </div>
                     );
                  });
               })()}
            </div>
         )}

         {/* --- CALENDAR TAB --- */}
         {activeTab === 'calendar' && (
            <div className="space-y-2.5">
               {/* Daily Schedule - Compact Timeline View - At Top */}
               <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                     <Clock className="w-3 h-3" />
                     Upcoming Tasks (Next 4 Days)
                  </h4>
                  <div className="relative pl-3 space-y-1.5 before:absolute before:left-3 before:top-1 before:bottom-0 before:w-0.5 before:bg-gradient-to-b before:from-teal-200 before:via-slate-200 before:to-slate-200 before:rounded-full">
                     {calendarDays.map((day, idx) => {
                     const dailyHarvest = day.tasks.reduce((sum, t) => sum + (t.estYield || 0), 0);
                     const isToday = idx === 0;
                     const urgentCount = day.tasks.filter(t => t.type === 'alert').length;
                     const monthName = day.date.toLocaleDateString(undefined, { month: 'short' });
                     const dayName = isToday ? 'Today' : idx === 1 ? 'Tomorrow' : day.date.toLocaleDateString(undefined, { weekday: 'short' });

                     return (
                     <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="relative pl-7"
                     >
                        {/* Compact Timeline Node */}
                        <div className={`absolute left-0 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md transition-all ${
                           isToday 
                              ? 'bg-gradient-to-br from-teal-500 to-teal-600 scale-110 shadow-teal-300' 
                              : 'bg-gradient-to-br from-slate-200 to-slate-300'
                        }`}>
                           {isToday ? (
                              <motion.div 
                                 animate={{ scale: [1, 1.2, 1] }}
                                 transition={{ duration: 2, repeat: Infinity }}
                                 className="w-1 h-1 bg-white rounded-full"
                              />
                           ) : (
                              <div className="w-0.5 h-0.5 bg-white rounded-full" />
                           )}
                        </div>

                        {/* Compact Date Header */}
                        <div className="mb-1.5">
                           <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                 <div className="flex items-baseline gap-1">
                                    <span className={`text-base font-black leading-none ${isToday ? 'text-slate-900' : 'text-slate-500'}`}>
                                       {day.date.getDate()}
                                    </span>
                                    <span className={`text-[8px] font-bold uppercase tracking-wide ${isToday ? 'text-teal-600' : 'text-slate-400'}`}>
                                       {monthName}
                                    </span>
                                 </div>
                                 <span className={`text-[10px] font-bold ${isToday ? 'text-slate-800' : 'text-slate-500'}`}>
                                    {dayName}
                                 </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                 {urgentCount > 0 && (
                                    <div className="flex items-center gap-0.5 bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md border border-red-200">
                                       <AlertCircle className="w-2.5 h-2.5" />
                                       <span className="text-[9px] font-bold">{urgentCount}</span>
                                    </div>
                                 )}
                                 {dailyHarvest > 0 && (
                                    <div className="flex items-center gap-1 bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-md border border-teal-200">
                                       <Scale className="w-2.5 h-2.5" />
                                       <span className="text-[9px] font-bold">
                                          {dailyHarvest >= 1000 ? `${(dailyHarvest/1000).toFixed(1)}kg` : `${dailyHarvest}g`}
                                       </span>
                                    </div>
                                 )}
                              </div>
                           </div>
                           {day.tasks.length > 0 && (
                              <div className="h-0.5 bg-gradient-to-r from-teal-200 via-blue-200 to-purple-200 rounded-full" />
                           )}
                        </div>
                        
                        {/* Compact Tasks List */}
                        {day.tasks.length === 0 ? (
                           <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="p-2 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-dashed border-slate-200 text-center"
                           >
                              <Calendar className="w-4 h-4 text-slate-300 mx-auto mb-0.5" />
                              <p className="text-[10px] text-slate-400 font-medium">No tasks</p>
                           </motion.div>
                        ) : (
                           <div className="space-y-1.5">
                              {day.tasks.map((task, tIdx) => {
                                 const Icon = task.icon;
                                 const isUrgent = task.type === 'alert';
                                 const isHarvest = task.type === 'harvest';
                                 
                                 return (
                                    <motion.div
                                       key={tIdx}
                                       initial={{ opacity: 0, y: 5 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ delay: tIdx * 0.02 }}
                                       onClick={() => { 
                                          if (task.trayId) { 
                                             const t = state.trays.find(x => x.id === task.trayId); 
                                             if (t) {
                                                setSelectedTray(t);
                                                setIsEditingTray(false);
                                                setEditingTrayNotes(t.notes || '');
                                                setEditingTrayLocation(t.location || '');
                                                // Initialize date fields for editing
                                                const startDate = new Date(t.startDate);
                                                setEditingTrayStartDate(startDate.toISOString().slice(0, 16));
                                                if (t.plantedAt) {
                                                   const plantedDate = new Date(t.plantedAt);
                                                   setEditingTrayPlantedDate(plantedDate.toISOString().slice(0, 16));
                                                } else {
                                                   setEditingTrayPlantedDate('');
                                                }
                                             }
                                          } 
                                       }}
                                       className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                                          task.trayId ? 'cursor-pointer active:scale-[0.98] hover:shadow-md' : ''
                                       } ${
                                          isUrgent 
                                             ? 'bg-red-50 border-red-200' 
                                             : isHarvest
                                             ? 'bg-teal-50 border-teal-200'
                                             : task.type === 'plant'
                                             ? 'bg-emerald-50 border-emerald-200'
                                             : 'bg-white border-slate-200 hover:border-slate-300'
                                       }`}
                                    >
                                       {/* Compact Icon */}
                                       <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                                          isUrgent
                                             ? 'bg-red-500 text-white'
                                             : isHarvest
                                             ? 'bg-teal-500 text-white'
                                             : task.type === 'plant'
                                             ? 'bg-emerald-500 text-white'
                                             : task.color 
                                                ? `${task.color.split(' ')[0]} ${task.color.split(' ')[1]} bg-opacity-10`
                                                : 'bg-slate-100 text-slate-500'
                                       }`}>
                                          <Icon className={`w-3.5 h-3.5 ${
                                             isUrgent || isHarvest || task.type === 'plant'
                                                ? 'text-white'
                                                : task.color?.split(' ')[0] || 'text-slate-500'
                                          }`} />
                                       </div>
                                       
                                       {/* Task Content */}
                                       <div className="flex-1 min-w-0">
                                          <div className="flex justify-between items-center gap-2">
                                             <p className={`text-xs font-bold leading-tight truncate ${
                                                isUrgent ? 'text-red-900' : isHarvest ? 'text-teal-900' : 'text-slate-800'
                                             }`}>
                                                {task.text}
                                             </p>
                                             <div className="flex items-center gap-1 flex-shrink-0">
                                                {task.timeRemaining && task.targetTime && (() => {
                                                   const now = currentTime.getTime();
                                                   const diff = task.targetTime - now;
                                                   let timeText = '';
                                                   let isOverdue = false;
                                                   let hours = 0;
                                                   
                                                   if (diff < 0) {
                                                      timeText = 'Overdue';
                                                      isOverdue = true;
                                                      hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
                                                   } else {
                                                      hours = Math.floor(diff / (1000 * 60 * 60));
                                                      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                      if (hours > 0) {
                                                         timeText = `${hours}h ${minutes}m`;
                                                      } else {
                                                         timeText = `${minutes}m`;
                                                      }
                                                   }
                                                   
                                                   return (
                                                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                                                         isOverdue 
                                                           ? 'text-red-700 bg-red-50 border-red-300' 
                                                           : hours < 2 
                                                             ? 'text-amber-700 bg-amber-50 border-amber-300'
                                                             : 'text-blue-700 bg-blue-50 border-blue-300'
                                                      }`}>
                                                         <Clock className="w-2.5 h-2.5" />
                                                         {timeText}
                                                      </span>
                                                   );
                                                })()}
                                                {task.estYield && (
                                                   <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">
                                                      <Scale className="w-2.5 h-2.5" />
                                                      {task.estYield >= 1000 ? `${(task.estYield/1000).toFixed(1)}kg` : `${task.estYield}g`}
                                                   </span>
                                                )}
                                             </div>
                                          </div>
                                          {task.sub && (
                                             <p className={`text-[10px] mt-0.5 leading-tight font-medium truncate ${
                                                isUrgent ? 'text-red-600' : isHarvest ? 'text-teal-600' : 'text-slate-500'
                                             }`}>
                                                {task.sub}
                                             </p>
                                          )}
                                       </div>
                                       
                                       {/* Arrow indicator */}
                                       {task.trayId && (
                                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 group-hover:text-teal-500 transition-colors" />
                                       )}
                                    </motion.div>
                                 );
                              })}
                           </div>
                        )}
                     </motion.div>
                     );
                  })}
                  </div>
               </div>

               {/* Color Legend */}
               <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                     <Info className="w-3 h-3" />
                     Color Guide
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                     <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
                        <span className="text-[9px] font-medium text-slate-600">Urgent/Alert</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-teal-500 border-2 border-white shadow-sm"></div>
                        <span className="text-[9px] font-medium text-slate-600">Harvest</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></div>
                        <span className="text-[9px] font-medium text-slate-600">Plant</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                        <span className="text-[9px] font-medium text-slate-600">Task</span>
                     </div>
                  </div>
               </div>
               
               {/* Calendar Grid - Full Month View */}
               <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-7 gap-1">
                     {/* Day Headers */}
                     {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <div key={idx} className="text-center">
                           <span className="text-[8px] font-bold text-slate-500 uppercase">{day}</span>
                        </div>
                     ))}
                     
                     {/* Calendar Days - Full Month */}
                     {(() => {
                        const today = new Date();
                        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                        const startDate = new Date(firstDayOfMonth);
                        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
                        
                        // Helper function to get tasks for any date
                        const getTasksForDate = (date: Date) => {
                           const tasks: any[] = [];
                           const dayOfWeek = date.getDay();
                           const isToday = date.toDateString() === today.toDateString();
                           
                           // 1. Alerts (only for today)
                           if (isToday) {
                              const alerts = getFarmAlerts(state);
                              alerts.forEach(alert => {
                                 let icon = AlertCircle;
                                 let color = "text-red-600 bg-red-50";
                                 let type = 'alert';
                                 
                                 if (alert.type === 'urgent') {
                                    icon = AlertCircle;
                                    color = "text-red-600 bg-red-50";
                                 } else if (alert.type === 'warning') {
                                    icon = AlertCircle;
                                    color = "text-amber-600 bg-amber-50";
                                 } else if (alert.type === 'routine') {
                                    icon = Droplet;
                                    color = "text-blue-500 bg-blue-50";
                                    type = 'routine';
                                 }
                                 
                                 tasks.push({ type, icon, color, trayId: alert.trayId });
                              });
                           }
                           
                           // 2. Tray stage transitions
                           activeTrays.forEach(tray => {
                              const crop = state.crops.find(c => c.id === tray.cropTypeId);
                              if (!crop) return;
                              
                              const startDate = new Date(tray.startDate);
                              const addDays = (d: Date, days: number) => {
                                 const res = new Date(d);
                                 res.setDate(res.getDate() + days);
                                 return res;
                              };
                              
                              let stageEndDate = new Date(startDate);
                              
                              if (tray.stage === Stage.GERMINATION) {
                                 stageEndDate = addDays(startDate, crop.germinationDays);
                                 if (stageEndDate.toDateString() === date.toDateString()) {
                                    tasks.push({ type: 'task', icon: Moon });
                                 }
                              } else if (tray.stage === Stage.BLACKOUT) {
                                 stageEndDate = addDays(startDate, crop.blackoutDays);
                                 if (stageEndDate.toDateString() === date.toDateString()) {
                                    tasks.push({ type: 'task', icon: Sun });
                                 }
                              } else if (tray.stage === Stage.LIGHT) {
                                 stageEndDate = addDays(startDate, crop.lightDays);
                                 if (stageEndDate.toDateString() === date.toDateString()) {
                                    tasks.push({ type: 'harvest', icon: CheckCircle });
                                 }
                              }
                           });
                           
                           // 3. Orders due
                           const ordersDue = recurringOrders.filter(o => o.dueDayOfWeek === dayOfWeek);
                           if (ordersDue.length > 0) {
                              tasks.push({ type: 'order', icon: Truck });
                           }
                           
                           // 4. Planting tasks (from orders)
                           recurringOrders.forEach(order => {
                              const crop = state.crops.find(c => c.id === order.cropId);
                              if (!crop) return;
                              const totalDays = crop.germinationDays + crop.blackoutDays + crop.lightDays;
                              const plantDayIndex = (order.dueDayOfWeek - (totalDays % 7) + 7) % 7;
                              if (plantDayIndex === dayOfWeek) {
                                 tasks.push({ type: 'plant', icon: Sprout });
                              }
                           });
                           
                           return tasks;
                        };
                        
                        const days = [];
                        const totalDays = 42; // 6 weeks * 7 days
                        
                        for (let i = 0; i < totalDays; i++) {
                           const date = new Date(startDate);
                           date.setDate(startDate.getDate() + i);
                           
                           const isCurrentMonth = date.getMonth() === today.getMonth();
                           const isToday = date.toDateString() === today.toDateString();
                           
                           // Get tasks for this date
                           const tasks = getTasksForDate(date);
                           
                           // Determine color based on task types (priority: urgent > harvest > plant > task)
                           let circleColor = isCurrentMonth ? 'bg-slate-100' : 'bg-slate-50'; // Default (no tasks)
                           let borderColor = 'border-slate-200';
                           let textColor = isCurrentMonth ? 'text-slate-600' : 'text-slate-400';
                           let hasUrgent = tasks.some(t => t.type === 'alert');
                           let hasHarvest = tasks.some(t => t.type === 'harvest');
                           let hasPlant = tasks.some(t => t.type === 'plant');
                           let hasTask = tasks.some(t => t.type === 'task' || t.type === 'order');
                           
                           if (hasUrgent) {
                              circleColor = 'bg-red-500';
                              borderColor = 'border-red-600';
                              textColor = 'text-white';
                           } else if (hasHarvest) {
                              circleColor = 'bg-teal-500';
                              borderColor = 'border-teal-600';
                              textColor = 'text-white';
                           } else if (hasPlant) {
                              circleColor = 'bg-emerald-500';
                              borderColor = 'border-emerald-600';
                              textColor = 'text-white';
                           } else if (hasTask) {
                              circleColor = 'bg-blue-500';
                              borderColor = 'border-blue-600';
                              textColor = 'text-white';
                           }
                           
                           days.push(
                              <button
                                 key={i}
                                 onClick={() => setSelectedCalendarDate(date)}
                                 className={`relative w-full aspect-square rounded-md ${circleColor} ${borderColor} border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                                    isToday ? 'ring-1 ring-offset-1 ring-teal-400' : ''
                                 } ${tasks.length > 0 ? 'shadow-sm' : ''}`}
                              >
                                 <span className={`text-[9px] font-bold ${textColor}`}>
                                    {date.getDate()}
                                 </span>
                                 {tasks.length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-white rounded-full border border-slate-300 flex items-center justify-center">
                                       <span className="text-[7px] font-bold text-slate-700">{tasks.length}</span>
                                    </span>
                                 )}
                              </button>
                           );
                        }
                        return days;
                     })()}
                  </div>
               </div>

               {/* Date Tasks Popup */}
               <AnimatePresence>
                  {selectedCalendarDate && (() => {
                     // Get tasks for selected date using the same logic as calendar grid
                     const today = new Date();
                     const dayOfWeek = selectedCalendarDate.getDay();
                     const isToday = selectedCalendarDate.toDateString() === today.toDateString();
                     const tasks: any[] = [];
                     
                     // 1. Alerts (only for today)
                     if (isToday) {
                        const alerts = getFarmAlerts(state);
                        alerts.forEach(alert => {
                           let icon = AlertCircle;
                           let color = "text-red-600 bg-red-50";
                           let type = 'alert';
                           
                           if (alert.type === 'urgent') {
                              icon = AlertCircle;
                              color = "text-red-600 bg-red-50";
                           } else if (alert.type === 'warning') {
                              icon = AlertCircle;
                              color = "text-amber-600 bg-amber-50";
                           } else if (alert.type === 'routine') {
                              icon = Droplet;
                              color = "text-blue-500 bg-blue-50";
                              type = 'routine';
                           }
                           
                           tasks.push({ type, icon, color, text: alert.title, sub: alert.message, trayId: alert.trayId });
                        });
                     }
                     
                     // 2. Tray stage transitions
                     activeTrays.forEach(tray => {
                        const crop = state.crops.find(c => c.id === tray.cropTypeId);
                        const crop2 = tray.cropTypeId2 ? state.crops.find(c => c.id === tray.cropTypeId2) : null;
                        if (!crop) return;
                        
                        const startDate = new Date(tray.startDate);
                        const displayName = crop2 ? `${crop.name} + ${crop2.name}` : crop.name;
                        const estYield = crop2 
                           ? ((crop.estimatedYieldPerTray || 0) + (crop2.estimatedYieldPerTray || 0)) / 2
                           : (crop.estimatedYieldPerTray || 0);
                        
                        const addDays = (d: Date, days: number) => {
                           const res = new Date(d);
                           res.setDate(res.getDate() + days);
                           return res;
                        };
                        
                        let stageEndDate = new Date(startDate);
                        
                        if (tray.stage === Stage.GERMINATION) {
                           stageEndDate = addDays(startDate, crop.germinationDays);
                           if (stageEndDate.toDateString() === selectedCalendarDate.toDateString()) {
                              const timeInfo = getTimeToNextStage(tray, crop);
                              const targetTime = startDate.getTime() + (crop.germinationDays * 24 * 60 * 60 * 1000);
                              tasks.push({ 
                                 type: 'task', 
                                 text: `Blackout ${displayName} (${tray.location})`,
                                 icon: Moon, 
                                 color: 'text-purple-600 bg-purple-50', 
                                 trayId: tray.id,
                                 timeRemaining: timeInfo,
                                 targetTime: targetTime
                              });
                           }
                        } else if (tray.stage === Stage.BLACKOUT) {
                           stageEndDate = addDays(startDate, crop.blackoutDays);
                           if (stageEndDate.toDateString() === selectedCalendarDate.toDateString()) {
                              const timeInfo = getTimeToNextStage(tray, crop);
                              const targetTime = startDate.getTime() + (crop.blackoutDays * 24 * 60 * 60 * 1000);
                              tasks.push({ 
                                 type: 'task', 
                                 text: `Uncover ${displayName} (${tray.location})`,
                                 icon: Sun, 
                                 color: 'text-amber-600 bg-amber-50', 
                                 trayId: tray.id,
                                 timeRemaining: timeInfo,
                                 targetTime: targetTime
                              });
                           }
                        } else if (tray.stage === Stage.LIGHT) {
                           stageEndDate = addDays(startDate, crop.lightDays);
                           if (stageEndDate.toDateString() === selectedCalendarDate.toDateString()) {
                              const timeInfo = getTimeToNextStage(tray, crop);
                              const targetTime = startDate.getTime() + (crop.lightDays * 24 * 60 * 60 * 1000);
                              tasks.push({ 
                                 type: 'harvest', 
                                 text: `Harvest ${displayName}`,
                                 sub: tray.location,
                                 icon: CheckCircle, 
                                 color: 'text-teal-600 bg-teal-50', 
                                 trayId: tray.id, 
                                 estYield: estYield,
                                 timeRemaining: timeInfo,
                                 targetTime: targetTime
                              });
                           }
                        }
                     });
                     
                     // 3. Orders due
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
                     
                     // 4. Planting tasks
                     recurringOrders.forEach(order => {
                        const crop = state.crops.find(c => c.id === order.cropId);
                        if (!crop) return;
                        const totalDays = crop.germinationDays + crop.blackoutDays + crop.lightDays;
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
                     
                     return (
                        <motion.div
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                           onClick={() => setSelectedCalendarDate(null)}
                        >
                           <motion.div
                              initial={{ scale: 0.95, y: 10 }}
                              animate={{ scale: 1, y: 0 }}
                              exit={{ scale: 0.95, y: 10 }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
                           >
                              {/* Header */}
                              <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 text-white">
                                 <div className="flex justify-between items-start">
                                    <div>
                                       <h3 className="text-lg font-bold">
                                          {isToday ? 'Today' : selectedCalendarDate.toLocaleDateString(undefined, { 
                                             weekday: 'long', 
                                             month: 'long', 
                                             day: 'numeric' 
                                          })}
                                       </h3>
                                       <p className="text-sm opacity-90 mt-0.5">
                                          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                                       </p>
                                    </div>
                                    <button
                                       onClick={() => setSelectedCalendarDate(null)}
                                       className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                    >
                                       <X className="w-5 h-5" />
                                    </button>
                                 </div>
                              </div>
                              
                              {/* Tasks List */}
                              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                 {tasks.length === 0 ? (
                                    <div className="text-center py-8">
                                       <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                       <p className="text-sm text-slate-400 font-medium">No tasks scheduled</p>
                                    </div>
                                 ) : (
                                    tasks.map((task, idx) => {
                                       const Icon = task.icon;
                                       const isUrgent = task.type === 'alert';
                                       const isHarvest = task.type === 'harvest';
                                       
                                       return (
                                          <motion.div
                                             key={idx}
                                             initial={{ opacity: 0, y: 5 }}
                                             animate={{ opacity: 1, y: 0 }}
                                             transition={{ delay: idx * 0.05 }}
                                             onClick={() => {
                                                if (task.trayId) {
                                                   const t = state.trays.find(x => x.id === task.trayId);
                                                   if (t) {
                                                      setSelectedTray(t);
                                                      setSelectedCalendarDate(null);
                                                      setIsEditingTray(false);
                                                      setEditingTrayNotes(t.notes || '');
                                                      setEditingTrayLocation(t.location || '');
                                                      const startDate = new Date(t.startDate);
                                                      setEditingTrayStartDate(startDate.toISOString().slice(0, 16));
                                                      if (t.plantedAt) {
                                                         const plantedDate = new Date(t.plantedAt);
                                                         setEditingTrayPlantedDate(plantedDate.toISOString().slice(0, 16));
                                                      } else {
                                                         setEditingTrayPlantedDate('');
                                                      }
                                                   }
                                                }
                                             }}
                                             className={`p-3 rounded-xl border-2 transition-all ${
                                                task.trayId ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''
                                             } ${
                                                isUrgent 
                                                   ? 'bg-red-50 border-red-200' 
                                                   : isHarvest
                                                   ? 'bg-teal-50 border-teal-200'
                                                   : task.type === 'plant'
                                                   ? 'bg-emerald-50 border-emerald-200'
                                                   : 'bg-white border-slate-200'
                                             }`}
                                          >
                                             <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg flex-shrink-0 ${
                                                   isUrgent
                                                      ? 'bg-red-500 text-white'
                                                      : isHarvest
                                                      ? 'bg-teal-500 text-white'
                                                      : task.type === 'plant'
                                                      ? 'bg-emerald-500 text-white'
                                                      : 'bg-blue-500 text-white'
                                                }`}>
                                                   <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                   <p className={`text-sm font-bold ${
                                                      isUrgent ? 'text-red-900' : isHarvest ? 'text-teal-900' : 'text-slate-800'
                                                   }`}>
                                                      {task.text}
                                                   </p>
                                                   {task.sub && (
                                                      <p className="text-xs text-slate-600 mt-0.5">{task.sub}</p>
                                                   )}
                                                   <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                      {task.timeRemaining && task.targetTime && (() => {
                                                         const now = currentTime.getTime();
                                                         const diff = task.targetTime - now;
                                                         let timeText = '';
                                                         let isOverdue = false;
                                                         
                                                         if (diff < 0) {
                                                            timeText = 'Overdue';
                                                            isOverdue = true;
                                                         } else {
                                                            const hours = Math.floor(diff / (1000 * 60 * 60));
                                                            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                                            if (hours > 0) {
                                                               timeText = `${hours}h ${minutes}m`;
                                                            } else {
                                                               timeText = `${minutes}m`;
                                                            }
                                                         }
                                                         
                                                         return (
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                               isOverdue 
                                                                  ? 'text-red-700 bg-red-100' 
                                                                  : 'text-blue-700 bg-blue-100'
                                                            }`}>
                                                               <Clock className="w-3 h-3" />
                                                               {timeText}
                                                            </span>
                                                         );
                                                      })()}
                                                      {task.estYield && (
                                                         <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
                                                            <Scale className="w-3 h-3" />
                                                            {task.estYield >= 1000 ? `${(task.estYield/1000).toFixed(1)}kg` : `${task.estYield}g`}
                                                         </span>
                                                      )}
                                                   </div>
                                                </div>
                                                {task.trayId && (
                                                   <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                                )}
                                             </div>
                                          </motion.div>
                                       );
                                    })
                                 )}
                              </div>
                           </motion.div>
                        </motion.div>
                     );
                  })()}
               </AnimatePresence>

            </div>
         )}

         {/* --- VARIETIES LIST --- */}
         {activeTab === 'varieties' && (
            <div className="space-y-3">
               {/* Search and Filter Bar */}
               <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  {/* Search */}
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                     <input
                        type="text"
                        value={cropSearchQuery}
                        onChange={(e) => setCropSearchQuery(e.target.value)}
                        placeholder="Search crops by name, scientific name, or category..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                     />
                     {cropSearchQuery && (
                        <button
                           onClick={() => setCropSearchQuery('')}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                           <X className="w-4 h-4" />
                        </button>
                     )}
                  </div>

                  {/* Filters and Sort */}
                  <div className="flex flex-wrap gap-2">
                     {/* Difficulty Filter */}
                     <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                           value={cropFilterDifficulty}
                           onChange={(e) => setCropFilterDifficulty(e.target.value)}
                           className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                           <option value="all">All Difficulties</option>
                           <option value="easy">Easy</option>
                           <option value="medium">Medium</option>
                           <option value="intermediate">Intermediate</option>
                           <option value="medium-difficult">Medium-Difficult</option>
                           <option value="hard">Hard</option>
                           <option value="difficult">Difficult</option>
                        </select>
                     </div>

                     {/* Sort By */}
                     <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-slate-400" />
                        <select
                           value={cropSortBy}
                           onChange={(e) => setCropSortBy(e.target.value as any)}
                           className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                           <option value="name">Name</option>
                           <option value="difficulty">Difficulty</option>
                           <option value="yield">Yield</option>
                           <option value="price">Price</option>
                        </select>
                        <button
                           onClick={() => setCropSortOrder(cropSortOrder === 'asc' ? 'desc' : 'asc')}
                           className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-lg transition-colors"
                           title={cropSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        >
                           {cropSortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                     </div>

                     {/* Results Count */}
                     <div className="ml-auto flex items-center text-xs text-slate-500 font-medium">
                        {varieties.length} {varieties.length === 1 ? 'crop' : 'crops'}
                        {cropSearchQuery || cropFilterDifficulty !== 'all' ? ' found' : ''}
                     </div>
                  </div>
               </div>

               {/* New Button */}
               <button onClick={openNewCrop} className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-teal-400 hover:text-teal-500 transition-colors">
                  <Plus className="w-5 h-5 mr-2" />
                  <span className="font-bold">Add New Variety</span>
               </button>

               {/* Varieties List */}
               {varieties.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                     <Sprout className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                     <p className="text-slate-500 font-bold text-sm mb-1">No crops found</p>
                     <p className="text-slate-400 text-xs">Try adjusting your search or filters</p>
                  </div>
               ) : (
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
                           <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-inner relative overflow-hidden ${crop.color?.split(' ')[0] || 'bg-slate-200'}`}>
                              {crop.imageUrl ? (
                                 <img 
                                    src={crop.imageUrl} 
                                    alt={crop.name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                       console.warn(`Failed to load image for ${crop.name}:`, crop.imageUrl);
                                       e.currentTarget.style.display = 'none';
                                    }}
                                 />
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
                                    <span className={crop.price500g ? "text-slate-600" : ""}>{crop.pkgWeightSmall || 500}g: {crop.price500g ? `€${crop.price500g.toFixed(2)}` : '--'}</span>
                                 </div>
                                 <span className="text-slate-300">•</span>
                                 <span className={crop.price1kg ? "text-slate-600" : ""}>{crop.pkgWeightLarge ? (crop.pkgWeightLarge >= 1000 ? (crop.pkgWeightLarge/1000) + 'kg' : crop.pkgWeightLarge + 'g') : '1kg'}: {crop.price1kg ? `€${crop.price1kg.toFixed(2)}` : '--'}</span>
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
               )}
            </div>
         )}

         {/* --- PLANNER (Functional) --- */}
         {activeTab === 'plan' && (
            <div className="space-y-2.5">
               
               {/* Weekly Orders Section - At Top */}
               <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                        <h3 className="font-bold text-slate-800 text-xs">Weekly Orders</h3>
                     </div>
                     <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsAddingOrder(!isAddingOrder)} 
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm transition-all ${
                           isAddingOrder 
                              ? 'text-slate-600 bg-slate-100 border border-slate-200' 
                              : 'text-white bg-indigo-600 border border-indigo-500'
                        }`}
                     >
                        {isAddingOrder ? 'Cancel' : <><Plus className="w-3 h-3 inline mr-1" />Add</>}
                     </motion.button>
                  </div>

                  <AnimatePresence>
                  {isAddingOrder && (
                     <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }} 
                        className="mb-3 overflow-hidden"
                     >
                        <div className="bg-slate-50 p-2 rounded-lg border border-indigo-200 space-y-2">
                           <div>
                              <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">Customer</label>
                              <CustomSelect 
                                 value={newOrderCustId}
                                 onChange={(val) => setNewOrderCustId(val)}
                                 options={[
                                    { value: "", label: "Select Customer..." },
                                    ...state.customers.map(c => ({ value: c.id, label: c.name }))
                                 ]}
                                 className="w-full"
                              />
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                              <div>
                                 <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">Crop</label>
                                 <CustomSelect 
                                    value={newOrderCropId}
                                    onChange={(val) => setNewOrderCropId(val)}
                                    options={[
                                       { value: "", label: "Select Crop..." },
                                       ...state.crops.map(c => ({ value: c.id, label: c.name }))
                                    ]}
                                 />
                              </div>
                              <div>
                                 <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">Amount (g)</label>
                                 <input 
                                    type="number" 
                                    placeholder="0" 
                                    value={newOrderAmount} 
                                    onChange={e => setNewOrderAmount(e.target.value)} 
                                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-indigo-200 focus:border-indigo-400 outline-none" 
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">Delivery Day</label>
                              <CustomSelect 
                                 value={newOrderDay}
                                 onChange={(val) => setNewOrderDay(parseInt(val))}
                                 options={DAYS_OF_WEEK.map((d, i) => ({ value: i, label: `Deliver on ${d}` }))}
                              />
                           </div>
                           <motion.button 
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={addRecurringOrder} 
                              className="w-full py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all"
                           >
                              Save Order
                           </motion.button>
                        </div>
                     </motion.div>
                  )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                     {recurringOrders.length === 0 && !isAddingOrder && (
                        <div className="text-center py-2.5">
                           <ShoppingBag className="w-5 h-5 text-slate-300 mx-auto mb-0.5 opacity-50" />
                           <p className="text-[10px] text-slate-400 font-medium">No weekly orders</p>
                        </div>
                     )}
                     {recurringOrders.map(order => {
                        const crop = state.crops.find(c => c.id === order.cropId);
                        const cust = state.customers.find(c => c.id === order.customerId);
                        return (
                           <motion.div
                              key={order.id}
                              initial={{ opacity: 0, y: 3 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group bg-slate-50 p-1.5 rounded-lg border border-slate-200 flex justify-between items-center hover:bg-white transition-all"
                           >
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                 <div className="p-1 rounded-md bg-indigo-50 text-indigo-600 flex-shrink-0">
                                    <Truck className="w-2.5 h-2.5" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-slate-800 truncate">{cust?.name || 'Unknown'}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                       <span className="text-[10px] font-medium text-slate-600">
                                          {order.amount >= 1000 ? `${(order.amount/1000).toFixed(1)}kg` : `${order.amount}g`}
                                       </span>
                                       <span className="text-slate-300">•</span>
                                       <span className="text-[10px] font-bold text-emerald-600 truncate">{crop?.name || 'Unknown'}</span>
                                       <span className="text-slate-300">•</span>
                                       <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                          <Calendar className="w-2.5 h-2.5" />
                                          {DAYS_OF_WEEK[order.dueDayOfWeek]}
                                       </span>
                                    </div>
                                 </div>
                              </div>
                              <motion.button 
                                 whileHover={{ scale: 1.1 }}
                                 whileTap={{ scale: 0.9 }}
                                 onClick={() => deleteOrder(order.id)} 
                                 className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                              >
                                 <X className="w-3 h-3" />
                              </motion.button>
                           </motion.div>
                        );
                     })}
                  </div>
               </div>
               
               {/* Mode Switcher */}
               <div className="bg-slate-100 p-0.5 rounded-lg flex">
                  <button 
                    onClick={() => setPlannerMode('event')} 
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center justify-center ${plannerMode === 'event' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                  >
                    <Calendar className="w-3 h-3 mr-1" /> Event Date
                  </button>
                  <button 
                    onClick={() => setPlannerMode('recurring')} 
                    className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all flex items-center justify-center ${plannerMode === 'recurring' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                  >
                    <Repeat className="w-3 h-3 mr-1" /> Weekly Routine
                  </button>
               </div>

               {plannerMode === 'event' ? (
                 /* EVENT PLANNER MODE */
                 <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center">
                       <Calendar className="w-4 h-4 mr-1.5 text-teal-600" />
                       Backward Planner
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">Need crops for a specific date? Calculate exactly when to plant.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                       <div>
                          <CustomSelect 
                             label="Crop Variety"
                             value={plannerCropId} 
                             onChange={(val) => setPlannerCropId(val)}
                             options={[
                                { value: "", label: "Select Crop..." },
                                ...state.crops.map(c => ({ value: c.id, label: c.name }))
                             ]}
                          />
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
                       <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex justify-between items-center mb-3">
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
                             <div className="flex items-start relative z-10 pb-3">
                                <div className="flex flex-col items-center mr-3">
                                   <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] shadow-sm border-2 border-white">1</div>
                                   <div className="w-0.5 h-full bg-slate-200 absolute top-6"></div>
                                </div>
                                <div className="flex-1 pt-0.5">
                                   <p className="text-xs font-bold text-slate-800">Soak & Plant</p>
                                   <p className="text-[10px] text-slate-500">{eventSchedule.plantDate.toDateString()}</p>
                                   {eventSchedule.crop.soakHours > 0 && (
                                      <span className="inline-block mt-0.5 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                                         Soak for {eventSchedule.crop.soakHours} hours
                                      </span>
                                   )}
                                </div>
                             </div>
                             
                             {/* Step 2: Blackout */}
                             <div className="flex items-start relative z-10 pb-3">
                                <div className="flex flex-col items-center mr-3">
                                   <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shadow-sm border-2 border-white">2</div>
                                   <div className="w-0.5 h-full bg-slate-200 absolute top-6"></div>
                                </div>
                                <div className="flex-1 pt-0.5">
                                   <p className="text-xs font-bold text-slate-800">Enter Blackout</p>
                                   <p className="text-[10px] text-slate-500">{eventSchedule.germEnd.toDateString()}</p>
                                   <span className="inline-block mt-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                      Duration: {eventSchedule.crop.blackoutDays} days
                                   </span>
                                </div>
                             </div>

                             {/* Step 3: Lights */}
                             <div className="flex items-start relative z-10">
                                <div className="flex flex-col items-center mr-3">
                                   <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-[10px] shadow-sm border-2 border-white">3</div>
                                </div>
                                <div className="flex-1 pt-0.5">
                                   <p className="text-xs font-bold text-slate-800">Expose to Light</p>
                                   <p className="text-[10px] text-slate-500">{eventSchedule.blackoutEnd.toDateString()}</p>
                                   <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                                      Duration: {eventSchedule.crop.lightDays} days
                                   </span>
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                    {!eventSchedule && (
                       <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                          <Calendar className="w-6 h-6 text-slate-300 mb-1" />
                          <p className="text-slate-400 text-xs">Select a crop and date above to see your schedule.</p>
                       </div>
                    )}
                 </div>
               ) : (
                 /* WEEKLY ROUTINE MODE */
                 <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center">
                       <Repeat className="w-4 h-4 mr-1.5 text-indigo-600" />
                       Weekly Production
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">Establish a regular supply. Calculate trays needed for a weekly target.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                       <div>
                          <CustomSelect 
                             label="Crop Variety"
                             value={recurringCropId} 
                             onChange={(val) => setRecurringCropId(val)}
                             options={[
                                { value: "", label: "Select Crop..." },
                                ...state.crops.map(c => ({ value: c.id, label: c.name }))
                             ]}
                          />
                       </div>
                       <div className="flex gap-2">
                           <div className="flex-1">
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Weekly Target (g)</label>
                             <input 
                                type="number" 
                                value={recurringTargetAmount} 
                                onChange={(e) => setRecurringTargetAmount(e.target.value)}
                                placeholder="e.g. 1000"
                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                             />
                           </div>
                           <div className="flex-1">
                              <CustomSelect 
                                 label="Harvest Day"
                                 value={recurringHarvestDay}
                                 onChange={(val) => setRecurringHarvestDay(parseInt(val))}
                                 options={DAYS_OF_WEEK.map((day, idx) => ({ value: idx, label: day }))}
                              />
                           </div>
                       </div>
                    </div>

                    {recurringSchedule && (
                       <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex flex-col items-center justify-center py-2 border-b border-slate-200 border-dashed mb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">To Harvest {recurringTargetAmount}g Weekly</span>
                              <div className="flex items-baseline space-x-1.5">
                                 <span className="text-2xl font-bold text-indigo-600">{recurringSchedule.traysNeeded}</span>
                                 <span className="text-sm font-bold text-slate-500">Trays Needed</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">
                                 Est. Yield: {recurringSchedule.yieldPerTray}g per tray
                              </p>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm space-y-3">
                              {/* 1. Header & Primary Instruction */}
                              <div className="flex items-start space-x-2.5 pb-2 border-b border-indigo-50">
                                 <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600 mt-0.5">
                                    <Calendar className="w-4 h-4" />
                                 </div>
                                 <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 text-xs mb-0.5">Weekly Cycle</h4>
                                    <div className="inline-block bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm shadow-indigo-200">
                                       Plant {recurringSchedule.traysNeeded} trays every {recurringSchedule.plantDayName}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                       To harvest fresh <strong>{recurringSchedule.crop.name}</strong> every <strong>{recurringSchedule.harvestDayName}</strong>.
                                    </p>
                                 </div>
                              </div>

                              {/* 2. Detailed Timeline Flow */}
                              <div>
                                 <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Routine Schedule</h5>
                                 <div className="grid grid-cols-4 gap-1.5 text-center">
                                    <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                       <span className="block text-[9px] text-slate-400 uppercase font-bold">Plant</span>
                                       <span className="text-[10px] font-bold text-indigo-600">{abbrDay(recurringSchedule.timeline.plant)}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                       <span className="block text-[9px] text-slate-400 uppercase font-bold">Dark</span>
                                       <span className="text-[10px] font-bold text-slate-700">{abbrDay(recurringSchedule.timeline.blackout)}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                       <span className="block text-[9px] text-slate-400 uppercase font-bold">Light</span>
                                       <span className="text-[10px] font-bold text-amber-500">{abbrDay(recurringSchedule.timeline.light)}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                       <span className="block text-[9px] text-slate-400 uppercase font-bold">Cut</span>
                                       <span className="text-[10px] font-bold text-teal-600">{abbrDay(recurringSchedule.timeline.harvest)}</span>
                                    </div>
                                 </div>
                              </div>

                              {/* 3. Business Stats Grid */}
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                 {/* Revenue */}
                                 <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                    <span className="text-[9px] font-bold text-emerald-600/70 uppercase block mb-0.5">Wk Revenue</span>
                                    <div className="text-sm font-bold text-emerald-700">€{recurringSchedule.weeklyRevenue.toFixed(2)}</div>
                                 </div>
                                 
                                 {/* Seed Cost */}
                                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Seed Cost</span>
                                    <div className="text-sm font-bold text-slate-700">€{recurringSchedule.seedCost.toFixed(2)}</div>
                                    <span className="text-[9px] text-slate-400 font-medium">{recurringSchedule.weeklySeedGrams}g / week</span>
                                 </div>

                                 {/* Shelf Capacity */}
                                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Shelf Space</span>
                                    <div className="text-sm font-bold text-slate-700">{recurringSchedule.shelfSpace} <span className="text-[10px] font-medium text-slate-400">trays</span></div>
                                    <span className="text-[9px] text-slate-400 font-medium">Max ({recurringSchedule.lightBatches} wk cycle)</span>
                                 </div>

                                 {/* Profit Margin (Simple) */}
                                 <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                    <span className="text-[9px] font-bold text-indigo-600/70 uppercase block mb-0.5">Est. Profit</span>
                                    <div className="text-sm font-bold text-indigo-700">€{(recurringSchedule.weeklyRevenue - recurringSchedule.seedCost).toFixed(2)}</div>
                                 </div>
                              </div>

                              {/* 4. Upcoming Schedule */}
                              <div className="pt-1.5 border-t border-slate-100">
                                 <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Upcoming Plantings</h5>
                                 <div className="bg-slate-50 rounded-lg border border-slate-100 divide-y divide-slate-100">
                                    {recurringSchedule.upcomingDates.map((date, idx) => (
                                       <div key={idx} className="flex justify-between items-center p-2">
                                          <div className="flex items-center">
                                             <div className="w-6 text-center mr-2">
                                                <span className="block text-[8px] font-bold text-slate-400 uppercase">{date.toLocaleDateString(undefined, {month:'short'})}</span>
                                                <span className="block text-xs font-bold text-slate-700">{date.getDate()}</span>
                                             </div>
                                             <div>
                                                <p className="text-[10px] font-bold text-slate-700">Plant {recurringSchedule.traysNeeded}x Trays</p>
                                                <p className="text-[9px] text-slate-400">Target harvest: {new Date(date.getTime() + (recurringSchedule.totalGrowingDays * 24 * 60 * 60 * 1000)).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</p>
                                             </div>
                                          </div>
                                          <button 
                                             onClick={() => {
                                                setPlantCropId(recurringSchedule.crop.id);
                                                setPlantCount(recurringSchedule.traysNeeded);
                                                setPlantLocation('Shelf 1'); // Default
                                                setIsAdding(true);
                                             }}
                                             className="text-[9px] font-bold text-white bg-slate-800 px-2 py-1 rounded-md hover:bg-slate-700"
                                          >
                                             Plant
                                          </button>
                                       </div>
                                    ))}
                                 </div>
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
               className="fixed bottom-24 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-300 flex items-center justify-center z-40 active:scale-95 transition-transform"
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
                     <button onClick={() => {
                        setIsAdding(false);
                        setIsHalfHalf(false);
                        setPlantCropId2('');
                     }} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 active:bg-slate-300 transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <div>
                     <CustomSelect 
                        label="Crop"
                        value={plantCropId}
                        onChange={(val) => setPlantCropId(val)}
                        options={[
                           { value: '', label: 'Select crop...' },
                           ...state.crops.map(c => ({ value: c.id, label: c.name }))
                        ]}
                     />
                  </div>
                  
                  {/* Half-Half Tray Option - Made More Prominent */}
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-teal-50 rounded-xl border-2 border-purple-200 hover:border-purple-300 transition-colors">
                     <input 
                        type="checkbox" 
                        id="halfHalf"
                        checked={isHalfHalf}
                        onChange={(e) => {
                           setIsHalfHalf(e.target.checked);
                           if (!e.target.checked) setPlantCropId2('');
                        }}
                        className="w-6 h-6 rounded border-2 border-purple-400 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer"
                     />
                     <label htmlFor="halfHalf" className="flex items-center text-base font-bold text-slate-800 cursor-pointer flex-1">
                        <Package className="w-5 h-5 mr-2 text-purple-600" />
                        <span>Half-Half Tray</span>
                        <span className="text-sm text-slate-600 ml-1">(2 crops in 1 tray)</span>
                     </label>
                  </div>
                  
                  {isHalfHalf && (
                     <div>
                        <CustomSelect 
                           label="Second Crop"
                           value={plantCropId2}
                           onChange={(val) => setPlantCropId2(val)}
                           options={[
                              { value: '', label: 'Select second crop...' },
                              ...state.crops.filter(c => c.id !== plantCropId).map(c => ({ value: c.id, label: c.name }))
                           ]}
                        />
                     </div>
                  )}
                  
                  <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Location</label>
                        <input type="text" value={plantLocation} onChange={e => setPlantLocation(e.target.value)} placeholder="Shelf 1" className="w-full mt-1 p-3 bg-slate-50 rounded-xl text-base font-bold outline-none border border-slate-100" />
                     </div>
                     <div className="w-24">
                        <label className="text-xs font-bold text-slate-400 uppercase">Count</label>
                        <input type="number" value={plantCount} onChange={e => setPlantCount(parseInt(e.target.value)||1)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl text-base font-bold outline-none border border-slate-100 text-center" />
                     </div>
                  </div>
                  
                  {/* Seed and Soak Info */}
                  {(() => {
                     const crop = state.crops.find(c => c.id === plantCropId);
                     const crop2 = isHalfHalf && plantCropId2 ? state.crops.find(c => c.id === plantCropId2) : null;
                     if (!crop) return null;
                     
                     const seedNeeded1 = (crop.seedingRate || 0) / (isHalfHalf ? 2 : 1) * plantCount;
                     const seedNeeded2 = crop2 ? ((crop2.seedingRate || 0) / 2) * plantCount : 0;
                     const totalSeedNeeded = seedNeeded1 + seedNeeded2;
                     
                     return (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                           {isHalfHalf && crop2 ? (
                              <>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seed Needed ({crop.name})</span>
                                       <div className="flex items-center text-slate-700 font-bold">
                                          <Scale className="w-4 h-4 mr-2 text-teal-500" />
                                          <span>{seedNeeded1.toFixed(0)}g</span>
                                       </div>
                                    </div>
                                    <div>
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seed Needed ({crop2.name})</span>
                                       <div className="flex items-center text-slate-700 font-bold">
                                          <Scale className="w-4 h-4 mr-2 text-teal-500" />
                                          <span>{seedNeeded2.toFixed(0)}g</span>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="pt-2 border-t border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Seed Needed</span>
                                    <div className="flex items-center text-slate-800 font-bold text-lg">
                                       <Scale className="w-5 h-5 mr-2 text-teal-600" />
                                       <span>{totalSeedNeeded.toFixed(0)}g</span>
                                    </div>
                                 </div>
                              </>
                           ) : (
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seed Needed</span>
                                    <div className="flex items-center text-slate-700 font-bold">
                                       <Scale className="w-4 h-4 mr-2 text-teal-500" />
                                       <span>{totalSeedNeeded.toFixed(0)}g</span>
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
                           )}
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
                        {selectedTray.cropTypeId2 ? (
                           <div>
                              <h3 className="text-xl font-bold text-slate-800">
                                 {state.crops.find(c => c.id === selectedTray.cropTypeId)?.name}
                                 <span className="text-base text-slate-500"> + </span>
                                 {state.crops.find(c => c.id === selectedTray.cropTypeId2)?.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                 <Package className="w-3 h-3 text-purple-500" />
                                 <span className="text-xs font-bold text-purple-600">Half-Half Tray</span>
                              </div>
                           </div>
                        ) : (
                           <h3 className="text-xl font-bold text-slate-800">{state.crops.find(c => c.id === selectedTray.cropTypeId)?.name}</h3>
                        )}
                        <p className="text-sm text-slate-500 font-medium">{selectedTray.location}</p>
                     </div>
                     <button onClick={() => { 
                        setSelectedTray(null); 
                        setIsEditingTray(false);
                        setEditingTrayNotes('');
                        setEditingTrayLocation('');
                        setEditingTrayStartDate('');
                        setEditingTrayPlantedDate('');
                     }} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 active:bg-slate-300 transition-colors"><X className="w-5 h-5" /></button>
                  </div>

                  {/* Status Card */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div className="flex justify-between items-center mb-3">
                        <div>
                           <span className="text-xs font-bold text-slate-400 uppercase">Current Stage</span>
                           <div className={`mt-1 inline-flex px-2 py-1 rounded-lg text-xs font-bold uppercase ${getStageColor(selectedTray.stage)}`}>{selectedTray.stage}</div>
                        </div>
                        <div className="text-right">
                           <span className="text-xs font-bold text-slate-400 uppercase">Planted</span>
                           <div className="font-bold text-slate-700">{formatShortDate(new Date(selectedTray.plantedAt || selectedTray.startDate))}</div>
                        </div>
                     </div>
                     <div className="pt-3 border-t border-slate-200">
                        <span className="text-xs font-bold text-slate-400 uppercase">Stage Started</span>
                        <div className="font-bold text-slate-700 mt-1">{formatShortDate(new Date(selectedTray.startDate))}</div>
                        <p className="text-[10px] text-slate-400 mt-1">This date determines timing for current stage</p>
                     </div>
                  </div>

                  {/* Crop Information Card */}
                  {(() => {
                     const crop = state.crops.find(c => c.id === selectedTray.cropTypeId);
                     const crop2 = selectedTray.cropTypeId2 ? state.crops.find(c => c.id === selectedTray.cropTypeId2) : null;
                     if (!crop) return null;
                     
                     const seedCost = getTraySeedCost(selectedTray, state.crops);
                     const estYield = getTrayYield(selectedTray, state.crops);
                     
                     return (
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                           <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center">
                              <Info className="w-3 h-3 mr-1.5" />
                              Tray Information
                           </h4>
                           {crop2 ? (
                              <div className="space-y-3">
                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">{crop.name} Seed</span>
                                       <div className="text-sm font-bold text-blue-900">
                                          <Scale className="w-3 h-3 inline mr-1" />
                                          {((crop.seedingRate || 0) / 2).toFixed(0)}g
                                       </div>
                                    </div>
                                    <div>
                                       <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">{crop2.name} Seed</span>
                                       <div className="text-sm font-bold text-blue-900">
                                          <Scale className="w-3 h-3 inline mr-1" />
                                          {((crop2.seedingRate || 0) / 2).toFixed(0)}g
                                       </div>
                                    </div>
                                 </div>
                                 <div className="pt-2 border-t border-blue-200 grid grid-cols-2 gap-3">
                                    <div>
                                       <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">Est. Yield</span>
                                       <div className="text-sm font-bold text-blue-900">{estYield.toFixed(0)}g</div>
                                    </div>
                                    <div>
                                       <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">Seed Cost</span>
                                       <div className="text-sm font-bold text-blue-900">
                                          <Euro className="w-3 h-3 inline mr-1" />
                                          {seedCost.toFixed(2)}
                                       </div>
                              </div>
                          </div>
                    </div>
                 ) : (
                              <div className="grid grid-cols-2 gap-3">
                                 <div>
                                    <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">Est. Yield</span>
                                    <div className="text-sm font-bold text-blue-900">{estYield.toFixed(0)}g</div>
                                 </div>
                                 <div>
                                    <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">Seed Cost</span>
                                    <div className="text-sm font-bold text-blue-900">
                                       <Euro className="w-3 h-3 inline mr-1" />
                                       {seedCost.toFixed(2)}
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                     );
                  })()}

                  {/* Primary Action */}
                  {selectedTray.stage === Stage.HARVEST_READY ? (
                     <div className="space-y-2">
                        <input type="number" value={yieldInput} onChange={e => setYieldInput(e.target.value)} placeholder="Yield Weight (g)" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold text-center outline-none focus:ring-2 focus:ring-teal-500" />
                        <button onClick={harvestTray} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-200 flex items-center justify-center">
                           <Archive className="w-5 h-5 mr-2" /> Complete Harvest
                        </button>
                     </div>
                  ) : (
                     <button onClick={advanceTray} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center shadow-lg shadow-slate-300 hover:bg-slate-800 transition-colors">
                        Advance Stage <ArrowRight className="w-5 h-5 ml-2" />
                     </button>
                  )}

                  {/* Tray Info Section */}
                  {isEditingTray ? (
                     <div className="space-y-4 pt-2 border-t border-slate-200">
                        <div>
                           <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Location</label>
                           <input 
                              type="text" 
                              value={editingTrayLocation} 
                              onChange={e => setEditingTrayLocation(e.target.value)}
                              placeholder="e.g. Shelf 1, Shelf 2-A"
                              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                           />
                        </div>
                        
                        {/* Date Editing Section */}
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 space-y-3">
                           <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-amber-700" />
                              <h4 className="text-xs font-bold text-amber-800 uppercase">Adjust Dates (For Testing)</h4>
                           </div>
                           <p className="text-[10px] text-amber-600 mb-3">Use this to sync germination dates when testing different seed types in the same pack.</p>
                           
                           <div>
                              <label className="text-[10px] font-bold uppercase text-amber-700 block mb-2 flex items-center">
                                 <Clock className="w-3 h-3 mr-1" />
                                 Stage Start Date
                              </label>
                              <input 
                                 type="datetime-local" 
                                 value={editingTrayStartDate} 
                                 onChange={e => setEditingTrayStartDate(e.target.value)}
                                 className="w-full p-3 bg-white border-2 border-amber-200 rounded-xl text-base font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
                              />
                              <p className="text-[10px] text-amber-600 mt-1">When current stage started (affects all timing calculations)</p>
                           </div>
                           
                           <div>
                              <label className="text-[10px] font-bold uppercase text-amber-700 block mb-2 flex items-center">
                                 <Sprout className="w-3 h-3 mr-1" />
                                 Original Planting Date (Optional)
                              </label>
                              <input 
                                 type="datetime-local" 
                                 value={editingTrayPlantedDate} 
                                 onChange={e => setEditingTrayPlantedDate(e.target.value)}
                                 className="w-full p-3 bg-white border-2 border-amber-200 rounded-xl text-base font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
                              />
                              <p className="text-[10px] text-amber-600 mt-1">Original planting date (for reference, doesn't affect calculations)</p>
                           </div>
                        </div>
                        
                        <div>
                           <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2 flex items-center">
                              <Info className="w-3 h-3 mr-1" />
                              Notes / Information
                           </label>
                           <textarea 
                              value={editingTrayNotes} 
                              onChange={e => setEditingTrayNotes(e.target.value)}
                              placeholder="Add notes about this tray (e.g. special conditions, observations, etc.)"
                              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 h-24 resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                           />
                        </div>
                        <div className="flex gap-3">
                           <button 
                              onClick={() => {
                                 const updates: Partial<Tray> = { 
                                    notes: editingTrayNotes,
                                    location: editingTrayLocation
                                 };
                                 
                                 // Update startDate if changed
                                 if (editingTrayStartDate) {
                                    updates.startDate = new Date(editingTrayStartDate).toISOString();
                                 }
                                 
                                 // Update plantedAt if changed
                                 if (editingTrayPlantedDate) {
                                    updates.plantedAt = new Date(editingTrayPlantedDate).toISOString();
                                 }
                                 
                                 onUpdateTray(selectedTray.id, updates);
                                 setIsEditingTray(false);
                              }}
                              className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
                           >
                              Save Changes
                           </button>
                           <button 
                              onClick={() => {
                                 setIsEditingTray(false);
                                 setEditingTrayNotes(selectedTray.notes || '');
                                 setEditingTrayLocation(selectedTray.location || '');
                                 setEditingTrayStartDate('');
                                 setEditingTrayPlantedDate('');
                              }}
                              className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                           >
                              Cancel
                           </button>
                        </div>
                     </div>
                  ) : (
                     <>
                        {/* Display Notes if they exist */}
                        {selectedTray.notes && (
                           <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                              <div className="flex items-center mb-2">
                                 <Info className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                                 <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Notes</h4>
                              </div>
                              <p className="text-sm text-blue-900 leading-relaxed">{selectedTray.notes}</p>
                           </div>
                        )}
                        
                        {/* Secondary Actions */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                           <button 
                              onClick={() => {
                                 setIsEditingTray(true);
                                 setEditingTrayNotes(selectedTray.notes || '');
                                 setEditingTrayLocation(selectedTray.location || '');
                                 // Initialize date fields
                                 const startDate = new Date(selectedTray.startDate);
                                 setEditingTrayStartDate(startDate.toISOString().slice(0, 16));
                                 if (selectedTray.plantedAt) {
                                    const plantedDate = new Date(selectedTray.plantedAt);
                                    setEditingTrayPlantedDate(plantedDate.toISOString().slice(0, 16));
                                 } else {
                                    setEditingTrayPlantedDate('');
                                 }
                              }}
                              className="py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
                           >
                              <Edit2 className="w-4 h-4 mr-2" /> {selectedTray.notes ? 'Edit Info' : 'Add Info'}
                           </button>
                           <button onClick={() => { if(confirm('Delete tray?')) { onDeleteTray(selectedTray.id); setSelectedTray(null); } }} className="py-3 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                           </button>
                        </div>
                     </>
                  )}
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
                     <button onClick={() => { 
                        setSelectedCrop(null); 
                        setAddToShelf(false); 
                        setSelectedShelfLocation(''); 
                     }} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 active:bg-slate-300 transition-colors"><X className="w-5 h-5" /></button>
                  </div>

                  {/* VIEW MODE */}
                  {!isEditingCrop ? (
                     <div className="space-y-6">
                        {/* 1. Big Picture Hero */}
                        <div className="w-full aspect-video rounded-2xl bg-slate-100 overflow-hidden relative shadow-inner">
                           {selectedCrop.imageUrl ? (
                              <img 
                                 src={selectedCrop.imageUrl} 
                                 alt={selectedCrop.name} 
                                 className="w-full h-full object-cover"
                                 onError={(e) => {
                                    console.warn(`Failed to load image for ${selectedCrop.name}:`, selectedCrop.imageUrl);
                                    e.currentTarget.style.display = 'none';
                                 }}
                              />
                           ) : (
                              <div className={`w-full h-full flex items-center justify-center ${selectedCrop.color?.split(' ')[0] || 'bg-slate-200'}`}>
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
                                    <span className="text-xs text-slate-500 font-medium">{selectedCrop.pkgWeightSmall || 500}g Pack</span>
                                    <span className="text-xs font-bold text-slate-800">{selectedCrop.price500g ? `€${selectedCrop.price500g.toFixed(2)}` : '--'}</span>
                                 </div>
                                 <div className="bg-white p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs text-slate-500 font-medium">{selectedCrop.pkgWeightLarge >= 1000 ? (selectedCrop.pkgWeightLarge/1000) + 'kg' : selectedCrop.pkgWeightLarge || 1000 + 'g'} Pack</span>
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
                     <div className="space-y-5">
                         <h3 className="text-lg font-bold text-slate-800">{selectedCrop.id ? 'Edit Crop Details' : 'New Variety'}</h3>
                        
                        {/* Basic Info */}
                        <div className="space-y-3">
                           <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center">
                              <Sprout className="w-3 h-3 mr-1.5" />
                              Basic Information
                           </h4>
                           <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Name</label>
                              <input type="text" value={selectedCrop.name} onChange={e => setSelectedCrop({...selectedCrop, name: e.target.value})} placeholder="Crop Name" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                           </div>
                           
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400">Seed Rate (g)</label>
                                 <div className="relative">
                                    <Scale className="w-3 h-3 absolute left-3 top-3.5 text-slate-400" />
                                    <input type="number" value={selectedCrop.seedingRate || ''} onChange={e => setSelectedCrop({...selectedCrop, seedingRate: parseInt(e.target.value) || 0})} placeholder="0" className="w-full pl-8 p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                                 </div>
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400">Est Yield (g)</label>
                                 <input type="number" value={selectedCrop.estimatedYieldPerTray || ''} onChange={e => setSelectedCrop({...selectedCrop, estimatedYieldPerTray: parseInt(e.target.value) || 0})} placeholder="0" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                              </div>
                           </div>
                        </div>

                        {/* Growing Schedule */}
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                           <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center">
                              <Clock className="w-3 h-3 mr-1.5" />
                              Growing Schedule
                           </h4>
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center">
                                    <Droplet className="w-3 h-3 mr-1" />
                                    Soak (hours)
                                 </label>
                                 <input type="number" value={selectedCrop.soakHours || 0} onChange={e => setSelectedCrop({...selectedCrop, soakHours: parseInt(e.target.value) || 0})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400">Germination (days)</label>
                                 <input type="number" value={selectedCrop.germinationDays || 0} onChange={e => setSelectedCrop({...selectedCrop, germinationDays: parseInt(e.target.value) || 0})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center">
                                    <Moon className="w-3 h-3 mr-1" />
                                    Blackout (days)
                                 </label>
                                 <input type="number" value={selectedCrop.blackoutDays || 0} onChange={e => setSelectedCrop({...selectedCrop, blackoutDays: parseInt(e.target.value) || 0})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center">
                                    <Sun className="w-3 h-3 mr-1" />
                                    Light (days)
                                 </label>
                                 <input type="number" value={selectedCrop.lightDays || 0} onChange={e => setSelectedCrop({...selectedCrop, lightDays: parseInt(e.target.value) || 0})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                              </div>
                           </div>
                        </div>


                        {/* Image Upload */}
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                           <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center">
                              <ImageIcon className="w-3 h-3 mr-1.5" />
                              Image
                           </h4>
                           <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                 <label className="block">
                                    <input
                                       type="file"
                                       accept="image/*"
                                       capture="environment"
                                       className="hidden"
                                       onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                             const reader = new FileReader();
                                             reader.onloadend = () => {
                                                const base64String = reader.result as string;
                                                setSelectedCrop({...selectedCrop, imageUrl: base64String});
                                             };
                                             reader.readAsDataURL(file);
                                          }
                                       }}
                                    />
                                    <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-colors">
                                       <ImageIcon className="w-5 h-5 mb-1.5 text-slate-400" />
                                       <span className="text-[10px] font-bold text-slate-600">Take Photo</span>
                                    </div>
                                 </label>
                                 <label className="block">
                                    <input
                                       type="file"
                                       accept="image/*"
                                       className="hidden"
                                       onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                             const reader = new FileReader();
                                             reader.onloadend = () => {
                                                const base64String = reader.result as string;
                                                setSelectedCrop({...selectedCrop, imageUrl: base64String});
                                             };
                                             reader.readAsDataURL(file);
                                          }
                                       }}
                                    />
                                    <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-colors">
                                       <Upload className="w-5 h-5 mb-1.5 text-slate-400" />
                                       <span className="text-[10px] font-bold text-slate-600">Choose File</span>
                                    </div>
                                 </label>
                              </div>
                              {selectedCrop.imageUrl && (
                                 <div className="relative">
                                    <img src={selectedCrop.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                                    <button
                                       onClick={() => setSelectedCrop({...selectedCrop, imageUrl: ''})}
                                       className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                       <X className="w-4 h-4" />
                                    </button>
                                 </div>
                              )}
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400">Or enter Image URL</label>
                                 <input type="text" value={selectedCrop.imageUrl && !selectedCrop.imageUrl.startsWith('data:') ? selectedCrop.imageUrl : ''} onChange={e => setSelectedCrop({...selectedCrop, imageUrl: e.target.value})} placeholder="https://..." className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium text-slate-600" />
                              </div>
                           </div>
                        </div>

                        {/* Pricing */}
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                           <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center">
                              <Euro className="w-3 h-3 mr-1.5" />
                              Pricing
                           </h4>
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400">Small Pack (g)</label>
                                 <input type="number" value={selectedCrop.pkgWeightSmall || ''} onChange={e => setSelectedCrop({...selectedCrop, pkgWeightSmall: parseInt(e.target.value)})} placeholder="500" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400">Large Pack (g)</label>
                                 <input type="number" value={selectedCrop.pkgWeightLarge || ''} onChange={e => setSelectedCrop({...selectedCrop, pkgWeightLarge: parseInt(e.target.value)})} placeholder="1000" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400">Price {selectedCrop.pkgWeightSmall || 500}g (€)</label>
                                 <div className="relative">
                                    <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">€</span>
                                    <input type="number" step="0.01" value={selectedCrop.price500g || ''} onChange={e => setSelectedCrop({...selectedCrop, price500g: parseFloat(e.target.value)})} className="w-full pl-7 p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                                 </div>
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400">Price {selectedCrop.pkgWeightLarge ? (selectedCrop.pkgWeightLarge >= 1000 ? (selectedCrop.pkgWeightLarge/1000) + 'kg' : selectedCrop.pkgWeightLarge + 'g') : '1kg'} (€)</label>
                                 <div className="relative">
                                    <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">€</span>
                                    <input type="number" step="0.01" value={selectedCrop.price1kg || ''} onChange={e => setSelectedCrop({...selectedCrop, price1kg: parseFloat(e.target.value)})} className="w-full pl-7 p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Description */}
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                           <h4 className="text-xs font-bold uppercase text-slate-400">Description</h4>
                           <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Category / Flavor Profile</label>
                              <input type="text" value={selectedCrop.category || ''} onChange={e => setSelectedCrop({...selectedCrop, category: e.target.value})} placeholder="e.g. Spicy, Mild, Peppery, Nutty, Sweet" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600" />
                           </div>
                           <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Summary / Notes</label>
                              <textarea value={selectedCrop.summary || ''} onChange={e => setSelectedCrop({...selectedCrop, summary: e.target.value})} placeholder="Description..." className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 h-20 resize-none" />
                           </div>
                        </div>

                        {/* Additional Crop Information */}
                        <div className="pt-3 border-t border-slate-200 space-y-3">
                           <h4 className="text-xs font-bold uppercase text-slate-400">Additional Information</h4>
                           
                           <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center">
                                    <Thermometer className="w-3 h-3 mr-1" />
                                    Optimal Temp (°C)
                                 </label>
                                 <input type="number" value={selectedCrop.optimalTemperature || ''} onChange={e => setSelectedCrop({...selectedCrop, optimalTemperature: parseInt(e.target.value) || undefined})} placeholder="e.g. 20" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                              </div>
                              <div>
                                 <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center">
                                    <Save className="w-3 h-3 mr-1" />
                                    Storage Days
                                 </label>
                                 <input type="number" value={selectedCrop.storageDays || ''} onChange={e => setSelectedCrop({...selectedCrop, storageDays: parseInt(e.target.value) || undefined})} placeholder="e.g. 7" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold" />
                              </div>
                           </div>

                           <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Growing Tips</label>
                              <textarea value={selectedCrop.growingTips || ''} onChange={e => setSelectedCrop({...selectedCrop, growingTips: e.target.value})} placeholder="Special growing instructions or tips..." className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 h-20 resize-none" />
                           </div>

                           <div>
                              <label className="text-[10px] font-bold uppercase text-slate-400">Nutrition Info</label>
                              <textarea value={selectedCrop.nutritionInfo || ''} onChange={e => setSelectedCrop({...selectedCrop, nutritionInfo: e.target.value})} placeholder="Nutritional highlights (e.g. High in Vitamin C, Iron, etc.)" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 h-20 resize-none" />
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

                        {/* Add to Shelf Option (only for new crops) */}
                        {!selectedCrop.id && (
                           <div className="pt-3 border-t border-slate-200 space-y-3">
                              <div className="flex items-center space-x-3">
                                 <input 
                                    type="checkbox" 
                                    id="addToShelf"
                                    checked={addToShelf}
                                    onChange={(e) => {
                                       setAddToShelf(e.target.checked);
                                       if (!e.target.checked) setSelectedShelfLocation('');
                                    }}
                                    className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                 />
                                 <label htmlFor="addToShelf" className="flex items-center text-sm font-bold text-slate-700 cursor-pointer">
                                    <MapPin className="w-4 h-4 mr-2 text-teal-600" />
                                    Add to existing shelf
                                 </label>
                              </div>
                              
                              {addToShelf && (
                                 <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Select Shelf Location</label>
                                    <CustomSelect
                                       value={selectedShelfLocation}
                                       onChange={(val) => setSelectedShelfLocation(val)}
                                       options={[
                                          { value: '', label: 'Choose location...' },
                                          ...availableLocations.map(loc => ({ value: loc, label: loc }))
                                       ]}
                                    />
                                 </div>
                              )}
                           </div>
                        )}

                        <div className="pt-2 space-y-3">
                           <button onClick={() => { 
                              if(selectedCrop.name) { 
                                 const newCropId = selectedCrop.id || Math.random().toString(36).substr(2,9);
                                 const cropToSave = {...selectedCrop, id: newCropId};
                                 
                                 if(selectedCrop.id) {
                                    onUpdateCrop(cropToSave);
                                 } else {
                                    onAddCrop(cropToSave);
                                    // If add to shelf is checked and location is selected, add a tray
                                    if(addToShelf && selectedShelfLocation) {
                                       onAddTray(newCropId, 1, selectedShelfLocation, cropToSave.estimatedYieldPerTray || 0);
                                    }
                                 }
                                 setSelectedCrop(null);
                                 setAddToShelf(false);
                                 setSelectedShelfLocation('');
                              }
                           }} className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl shadow-md">
                              {selectedCrop.id ? 'Save Changes' : 'Save Variety'}
                           </button>
                           {selectedCrop.id && <button onClick={() => { if(confirm('Delete?')) { onDeleteCrop(selectedCrop.id); setSelectedCrop(null); }}} className="w-full py-3 text-red-500 font-bold bg-red-50 rounded-xl">Delete Variety</button>}
                        </div>
                     </div>
                  )}

               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Full-Size Image Viewer with Pinch-to-Zoom */}
      <AnimatePresence>
         {fullSizeImage && (
            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
               onClick={() => {
                  setFullSizeImage(null);
                  setImageZoom(1);
                  setImagePosition({ x: 0, y: 0 });
               }}
            >
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     setFullSizeImage(null);
                     setImageZoom(1);
                     setImagePosition({ x: 0, y: 0 });
                  }}
                  className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm transition-colors"
               >
                  <X className="w-6 h-6 text-white" />
               </button>
               
               <div
                  className="relative w-full h-full flex items-center justify-center overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => {
                     if (e.touches.length === 2) {
                        setIsPinching(true);
                        const touch1 = e.touches[0];
                        const touch2 = e.touches[1];
                        const distance = Math.hypot(
                           touch2.clientX - touch1.clientX,
                           touch2.clientY - touch1.clientY
                        );
                        setLastPinchDistance(distance);
                     }
                  }}
                  onTouchMove={(e) => {
                     if (e.touches.length === 2 && isPinching) {
                        e.preventDefault();
                        const touch1 = e.touches[0];
                        const touch2 = e.touches[1];
                        const distance = Math.hypot(
                           touch2.clientX - touch1.clientX,
                           touch2.clientY - touch1.clientY
                        );
                        
                        if (lastPinchDistance > 0) {
                           const scale = distance / lastPinchDistance;
                           const newZoom = Math.max(1, Math.min(5, imageZoom * scale));
                           setImageZoom(newZoom);
                           setLastPinchDistance(distance);
                        }
                     } else if (e.touches.length === 1 && imageZoom > 1) {
                        // Pan when zoomed
                        const touch = e.touches[0];
                        const rect = e.currentTarget.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        
                        setImagePosition({
                           x: (touch.clientX - centerX) * 0.5,
                           y: (touch.clientY - centerY) * 0.5
                        });
                     }
                  }}
                  onTouchEnd={(e) => {
                     if (e.touches.length < 2) {
                        setIsPinching(false);
                        setLastPinchDistance(0);
                     }
                  }}
               >
                  <motion.img
                     src={fullSizeImage.src}
                     alt={fullSizeImage.alt}
                     className="max-w-full max-h-full object-contain select-none"
                     style={{
                        transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                        transformOrigin: 'center center',
                        transition: isPinching ? 'none' : 'transform 0.1s ease-out'
                     }}
                     drag={imageZoom > 1}
                     dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                     onDrag={(e, info) => {
                        if (imageZoom > 1) {
                           setImagePosition({ x: info.offset.x, y: info.offset.y });
                        }
                     }}
                     whileDrag={{ cursor: 'grabbing' }}
                  />
               </div>
               
               {/* Zoom indicator */}
               {imageZoom > 1 && (
                  <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-bold"
                  >
                     {Math.round(imageZoom * 100)}%
                  </motion.div>
               )}
            </motion.div>
         )}
      </AnimatePresence>
   </div>
);
};

export default CropManager;
