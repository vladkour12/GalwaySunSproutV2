
import React, { useMemo, useState } from 'react';
import { AppState, Stage, Tray } from '../types';
import { getFarmAlerts } from '../services/alertService';
import { 
  ArrowUpRight, 
  Droplets, 
  Sun, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Sprout, 
  DollarSign, 
  Bell, 
  ChevronRight,
  ArrowRight,
  Clock,
  X,
  Info,
  Package,
  Scale,
  MapPin
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  state: AppState;
  onNavigate: (view: any) => void;
  dismissedAlerts?: Set<string>;
  onDismissAlert?: (alertId: string) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 5 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 25, mass: 0.5 } }
};

const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate, dismissedAlerts = new Set(), onDismissAlert }) => {
  
  // --- Data Calculations ---

  const activeTrays = useMemo(() => 
    state.trays.filter(t => t.stage !== Stage.HARVESTED && t.stage !== Stage.COMPOST), 
  [state.trays]);

  const readyToHarvest = useMemo(() => 
    state.trays.filter(t => t.stage === Stage.HARVEST_READY), 
  [state.trays]);

  const financialStats = useMemo(() => {
    let readyValue = 0;
    let maturingValue = 0;

    activeTrays.forEach(tray => {
      const crop = state.crops.find(c => c.id === tray.cropTypeId);
      const crop2 = tray.cropTypeId2 ? state.crops.find(c => c.id === tray.cropTypeId2) : null;
      if (!crop) return;

      let trayValue = 0;
      // Calculate value based on Yield * Market Price (€7.00 / 100g)
      if (crop2) {
        // Half-half tray: average yield of both crops
        const avgYield = ((crop.estimatedYieldPerTray || 0) + (crop2.estimatedYieldPerTray || 0)) / 2;
        trayValue = (avgYield / 100) * 7.00;
      } else if (crop.estimatedYieldPerTray) {
        trayValue = (crop.estimatedYieldPerTray / 100) * 7.00;
      } else {
        trayValue = crop.pricePerTray || 0;
      }

      if (tray.stage === Stage.HARVEST_READY) {
        readyValue += trayValue;
      } else {
        maturingValue += trayValue;
      }
    });

    return { readyValue, maturingValue, total: readyValue + maturingValue };
  }, [activeTrays, state.crops]);

  // --- Smart Alerts Logic ---
  const allAlerts = useMemo(() => {
    return getFarmAlerts(state);
  }, [state]);

  // Filter out dismissed alerts
  const smartAlerts = useMemo(() => {
    return allAlerts.filter(alert => !dismissedAlerts.has(alert.id));
  }, [allAlerts, dismissedAlerts]);

  // --- Recent Activity Logic ---
  const recentActivity = useMemo(() => {
    const activities: { id: string, date: Date, type: 'tray' | 'finance' | 'new', title: string, subtitle: string, icon: any, color: string }[] = [];

    // 1. Trays (Updated recently or Planted)
    state.trays.forEach(tray => {
       const crop = state.crops.find(c => c.id === tray.cropTypeId);
       const updateDate = new Date(tray.updatedAt);
       const plantDate = tray.plantedAt ? new Date(tray.plantedAt) : new Date(tray.startDate);
       
       // Safety check for invalid dates
       if (isNaN(updateDate.getTime()) || isNaN(plantDate.getTime())) return;

       // Add Planting event if recent (within 7 days)
       if ((new Date().getTime() - plantDate.getTime()) < 7 * 24 * 60 * 60 * 1000) {
          activities.push({
            id: `plant-${tray.id}`,
            date: plantDate,
            type: 'new',
            title: `Planted ${crop?.name || 'Tray'}`,
            subtitle: `${tray.location}`,
            icon: Sprout,
            color: 'bg-ocean-secondary/20 text-ocean-accent'
          });
       }

       // Add Update event (if different from planting and recent)
       if (Math.abs(updateDate.getTime() - plantDate.getTime()) > 1000 && (new Date().getTime() - updateDate.getTime()) < 3 * 24 * 60 * 60 * 1000) {
          activities.push({
             id: `update-${tray.id}`,
             date: updateDate,
             type: 'tray',
             title: tray.stage === Stage.HARVESTED ? `Harvested ${crop?.name}` : `${crop?.name} Updated`,
             subtitle: `Moved to ${tray.stage}`,
             icon: tray.stage === Stage.HARVESTED ? CheckCircle : Clock,
             color: tray.stage === Stage.HARVESTED ? 'bg-ocean-secondary/25 text-ocean-accent' : 'bg-ocean-contrast/30 text-ocean-light'
          });
       }
    });

    // 2. Transactions
    state.transactions.forEach(tx => {
       const txDate = new Date(tx.date);
       if (isNaN(txDate.getTime())) return;

       activities.push({
         id: `tx-${tx.id}`,
         date: txDate,
         type: 'finance',
         title: tx.type === 'income' ? 'Sale Recorded' : 'Expense Logged',
         subtitle: `${tx.category} • €${tx.amount.toFixed(2)}`,
         icon: DollarSign,
         color: tx.type === 'income' ? 'bg-ocean-accent/20 text-ocean-accent' : 'bg-ocean-contrast/40 text-ocean-light'
       });
    });

    // Deduplicate by ID and sort descending
    const uniqueMap = new Map();
    activities.forEach(item => uniqueMap.set(item.id, item));
    return Array.from(uniqueMap.values())
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 6);
  }, [state.trays, state.transactions, state.crops]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const traysByStage = activeTrays.reduce((acc, tray) => {
      acc[tray.stage] = (acc[tray.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.keys(traysByStage).map(stage => ({
      name: stage,
      value: traysByStage[stage]
    }));
  }, [activeTrays]);

  const [showCharts, setShowCharts] = React.useState(false);
  const [showValueBreakdown, setShowValueBreakdown] = useState(false);

  // Defer chart rendering to ensure DOM size is ready (fixes Recharts width(-1) error)
  React.useEffect(() => {
    const timer = setTimeout(() => setShowCharts(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate tray breakdown for modal
  const trayValueBreakdown = useMemo(() => {
    const readyTrays: Array<{ tray: Tray; cropName: string; crop2Name?: string; yield: number; value: number; location: string }> = [];
    const maturingTrays: Array<{ tray: Tray; cropName: string; crop2Name?: string; yield: number; value: number; location: string }> = [];

    activeTrays.forEach(tray => {
      const crop = state.crops.find(c => c.id === tray.cropTypeId);
      const crop2 = tray.cropTypeId2 ? state.crops.find(c => c.id === tray.cropTypeId2) : null;
      if (!crop) return;

      let trayYield = 0;
      let trayValue = 0;
      
      if (crop2) {
        // Half-half tray: average yield of both crops
        trayYield = ((crop.estimatedYieldPerTray || 0) + (crop2.estimatedYieldPerTray || 0)) / 2;
        trayValue = (trayYield / 100) * 7.00;
      } else if (crop.estimatedYieldPerTray) {
        trayYield = crop.estimatedYieldPerTray;
        trayValue = (trayYield / 100) * 7.00;
      } else {
        trayYield = 0;
        trayValue = crop.pricePerTray || 0;
      }

      const trayInfo = {
        tray,
        cropName: crop.name,
        crop2Name: crop2?.name,
        yield: trayYield,
        value: trayValue,
        location: tray.location
      };

      if (tray.stage === Stage.HARVEST_READY) {
        readyTrays.push(trayInfo);
      } else {
        maturingTrays.push(trayInfo);
      }
    });

    // Sort by value descending
    readyTrays.sort((a, b) => b.value - a.value);
    maturingTrays.sort((a, b) => b.value - a.value);

    return { readyTrays, maturingTrays };
  }, [activeTrays, state.crops]);

  // Ocean/Teal palette for charts
  const COLORS = ['#00969C', '#047075', '#6BA3BE', '#274D60', '#032F30'];

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Top Header */}
      <motion.div variants={item} className="flex flex-col space-y-1 mb-4">
        <h2 className="text-4xl font-bold text-white tracking-tight">Business Overview</h2>
        <p className="text-[var(--text-subtle)] text-sm font-medium">Welcome back. Monitor your farm operations in real-time.</p>
      </motion.div>

      {/* --- Key Metrics Grid with 3D Stack Effect --- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Metric 1: Active Trays */}
        <motion.div 
          variants={item}
          className="glass-card-elevated card-3d-stack p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('crops')}
          whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
             <Sun className="w-24 h-24 text-[var(--mint)]" />
          </div>
          <div className="flex justify-between items-start z-10">
            <div className="w-12 h-12 rounded-2xl bg-[var(--mint)]/20 flex items-center justify-center text-[var(--mint)] border border-[var(--mint)]/30">
              <Sun className="w-6 h-6 icon-thin" />
            </div>
          </div>
          <div className="mt-6 z-10">
            <h3 className="text-3xl font-bold text-[var(--text-strong)] tracking-tight">{activeTrays.length}</h3>
            <p className="text-xs font-semibold text-[var(--text-subtle)] mt-2 uppercase tracking-wide">Active Trays</p>
          </div>
        </motion.div>

        {/* Metric 2: Harvest Ready */}
        <motion.div 
          variants={item}
          className="glass-card-elevated card-3d-stack p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer"
          onClick={() => onNavigate('crops')}
          whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300">
             <CheckCircle className="w-24 h-24 text-[var(--lavender)]" />
          </div>
          <div className="flex justify-between items-start z-10">
             <div className="w-12 h-12 rounded-2xl bg-[var(--lavender)]/20 flex items-center justify-center text-[var(--lavender)] border border-[var(--lavender)]/30">
              <CheckCircle className="w-6 h-6 icon-thin" />
            </div>
            {readyToHarvest.length > 0 && (
              <span className="flex h-3 w-3 relative animate-glow-pulse">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--lavender)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--lavender)]"></span>
              </span>
            )}
          </div>
          <div className="mt-6 z-10">
            <h3 className="text-3xl font-bold text-[var(--text-strong)] tracking-tight">{readyToHarvest.length}</h3>
            <p className="text-xs font-semibold text-[var(--text-subtle)] mt-2 uppercase tracking-wide">Ready to Cut</p>
          </div>
        </motion.div>

        {/* Metric 3: Revenue Value with 3D Stack */}
        <motion.div 
          variants={item}
          className="glass-card-elevated card-3d-stack col-span-2 relative overflow-hidden cursor-pointer p-6 transition-all duration-300"
          onClick={() => setShowValueBreakdown(true)}
          whileHover={{ scale: 1.01, y: -4, transition: { duration: 0.2 } }}
        >
           <div className="absolute -top-20 -right-20 opacity-10 pointer-events-none">
              <TrendingUp className="w-48 h-48 text-[var(--mint)]" />
           </div>
           <div className="absolute inset-0 bg-gradient-to-br from-[var(--mint)]/5 via-transparent to-[var(--peach)]/5 pointer-events-none"></div>
           
           <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-[var(--text-subtle)] text-xs font-semibold uppercase tracking-widest">Potential Value</p>
                    <h3 className="text-4xl font-bold text-[var(--text-strong)] tracking-tight mt-2">€{financialStats.total.toFixed(2)}</h3>
                 </div>
                 <div className="w-14 h-14 rounded-2xl bg-[var(--mint)]/20 flex items-center justify-center text-[var(--mint)] border border-[var(--mint)]/30">
                    <TrendingUp className="w-7 h-7 icon-thin" />
                 </div>
              </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
                 <div>
                    <span className="text-xs text-[var(--text-subtle)] block mb-2 uppercase tracking-wide font-semibold">Ready Now</span>
                    <span className="text-2xl font-bold text-[var(--mint)]">€{financialStats.readyValue.toFixed(2)}</span>
                 </div>
                 <div>
                    <span className="text-xs text-[var(--text-subtle)] block mb-2 uppercase tracking-wide font-semibold">Maturing</span>
                    <span className="text-2xl font-bold text-[var(--peach)]">€{financialStats.maturingValue.toFixed(2)}</span>
                 </div>
              </div>
           </div>
        </motion.div>
      </div>

      {/* --- Alerts & Activity Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* Smart Alerts */}
        <motion.div variants={item} className="glass-card-elevated p-6 flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-[var(--lavender)]/20 flex items-center justify-center text-[var(--lavender)] border border-[var(--lavender)]/30">
              <Bell className="w-5 h-5 icon-thin" />
            </div>
            <h3 className="font-bold text-white text-lg">Action Needed</h3>
            </div>
            
            <div className="space-y-3 flex-1">
               {smartAlerts.length === 0 ? (
              <div className="py-10 text-center bg-[var(--glass-bg)] rounded-2xl border border-dashed border-[rgba(255,255,255,0.1)]">
                <CheckCircle className="w-10 h-10 text-[var(--mint)] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[var(--text-subtle)]">Everything looks good!</p>
                  </div>
               ) : (
                  smartAlerts.slice(0, 3).map(alert => {
                let bgColor = "bg-[rgba(0,217,163,0.1)]";
                let borderColor = "border-[rgba(0,217,163,0.3)]";
                let iconColor = "text-[var(--mint)]";
                     let Icon = AlertCircle;

                     if (alert.type === 'urgent') {
                  bgColor = "bg-[rgba(255,107,107,0.1)]";
                  borderColor = "border-[rgba(255,107,107,0.3)]";
                  iconColor = "text-[rgb(255,107,107)]";
                     } else if (alert.type === 'warning') {
                  bgColor = "bg-[rgba(255,185,151,0.1)]";
                  borderColor = "border-[rgba(255,185,151,0.3)]";
                  iconColor = "text-[var(--peach)]";
                     } else if (alert.type === 'routine') {
                  bgColor = "bg-[rgba(196,181,253,0.1)]";
                  borderColor = "border-[rgba(196,181,253,0.3)]";
                  iconColor = "text-[var(--lavender)]";
                        Icon = Droplets;
                     }

                     return (
                        <motion.div 
                          key={alert.id} 
                          className={`p-4 rounded-2xl border ${bgColor} ${borderColor} flex items-start justify-between transition-all duration-200 cursor-pointer hover:scale-[1.02] group`}
                          onClick={() => onNavigate(alert.linkTo || 'crops')}
                          whileHover={{ y: -2 }}
                        >
                           <div className="flex items-start space-x-3 flex-1">
                              <Icon className={`w-5 h-5 ${iconColor} mt-0.5 flex-shrink-0`} />
                              <div>
                                <p className="text-sm font-bold text-white">{alert.title}</p>
                                <p className="text-xs text-[var(--text-subtle)] mt-1">{alert.message}</p>
                              </div>
                           </div>
                           <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 onDismissAlert?.(alert.id);
                              }}
                              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors flex-shrink-0"
                              title="Dismiss"
                           >
                              <X className="w-4 h-4 text-[var(--text-subtle)]" />
                           </button>
                        </motion.div>
                     );
                  })
               )}
            </div>
         </motion.div>

         {/* Recent Activity */}
                <motion.div variants={item} className="glass-card-elevated p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center space-x-3">
                 <div className="w-11 h-11 rounded-2xl bg-[var(--mint)]/20 flex items-center justify-center text-[var(--mint)] border border-[var(--mint)]/30">
                      <Clock className="w-5 h-5 icon-thin" />
                 </div>
                  <h3 className="font-bold text-white text-lg">Recent Activity</h3>
               </div>
                    <button onClick={() => onNavigate('data')} className="text-xs font-bold text-[var(--mint)] hover:text-[var(--mint-dark)] transition-colors">View All</button>
            </div>

            <div className="space-y-3 flex-1">
               {recentActivity.length === 0 ? (
                      <div className="text-center py-10 text-[var(--text-subtle)] text-sm">No activity recorded yet.</div>
               ) : (
                  recentActivity.slice(0, 4).map((activity, idx) => {
                     const Icon = activity.icon;
                     return (
                        <motion.div key={activity.id} className="flex items-start space-x-3 relative" whileHover={{ x: 2 }}>
                           {/* Connector Line */}
                          {idx !== recentActivity.length - 1 && (
                            <div className="absolute left-[15px] top-10 bottom-0 w-0.5 bg-[rgba(255,255,255,0.1)]"></div>
                          )}
                           
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${activity.color} border border-current/30`}>
                              <Icon className="w-4 h-4 icon-thin" />
                           </div>
                           <div className="flex-1 pt-0.5">
                              <div className="flex justify-between items-start">
                              <h4 className="text-sm font-bold text-white">{activity.title}</h4>
                              <span className="text-xs text-[var(--text-subtle)] font-medium whitespace-nowrap ml-2">
                                    {activity.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                 </span>
                              </div>
                            <p className="text-xs text-[var(--text-subtle)] mt-1">{activity.subtitle}</p>
                           </div>
                        </motion.div>
                     );
                  })
               )}
            </div>
         </motion.div>
      </div>

      {/* --- Production Pipeline Chart --- */}
      <motion.div variants={item} className="glass-card-elevated p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center">
              <div className="w-10 h-10 rounded-xl bg-[var(--peach)]/20 flex items-center justify-center text-[var(--peach)] border border-[var(--peach)]/30 mr-3">
                <Droplets className="w-5 h-5 icon-thin" />
              </div>
              Production Pipeline
            </h3>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="h-56 w-56 flex-shrink-0 relative">
               {/* Center text for Donut */}
              {activeTrays.length > 0 && (
                 <motion.div 
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                 >
                      <span className="text-4xl font-bold text-white">{activeTrays.length}</span>
                      <span className="text-xs uppercase font-bold text-[var(--text-subtle)] tracking-wider mt-1">Trays</span>
                 </motion.div>
              )}
              
              {activeTrays.length > 0 ? (
                <div style={{ width: 224, height: 224 }}>
                  {showCharts && (
                      <PieChart width={224} height={224}>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={5}
                      cornerRadius={6}
                      dataKey="value"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(10, 10, 15, 0.95)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)', fontSize: '12px', fontWeight: 600, color: '#fff' }}
                    />
                    </PieChart>
                  )}
                </div>
              ) : (
                <div className="h-full w-full rounded-full border-2 border-dashed border-[rgba(255,255,255,0.2)] flex items-center justify-center bg-[var(--glass-bg)]">
                   <Sprout className="w-10 h-10 text-[var(--text-subtle)]" />
                </div>
              )}
            </div>
            
            <div className="flex-1 w-full grid grid-cols-2 gap-3">
              {chartData.map((entry, index) => (
                <motion.div key={entry.name} className="glass-card p-4 flex items-center space-x-3" whileHover={{ scale: 1.05 }}>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <div className="flex flex-col">
                     <span className="text-xs font-bold text-white">{entry.name}</span>
                     <span className="text-xs text-[var(--text-subtle)]">{entry.value} Tray{entry.value !== 1 ? 's' : ''}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
      </motion.div>

      {/* Value Breakdown Modal */}
      <AnimatePresence>
        {showValueBreakdown && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 bg-[rgba(10,10,15,0.6)] backdrop-blur-lg flex items-center justify-center p-4"
            onClick={() => setShowValueBreakdown(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 10 }} 
              className="glass-card-elevated w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">Potential Value Breakdown</h3>
                  <p className="text-sm text-[var(--text-subtle)] mt-2">Trays contributing to total value (€7.00 per 100g)</p>
                </div>
                <button 
                  onClick={() => setShowValueBreakdown(false)} 
                  className="p-3 bg-[var(--glass-bg)] hover:bg-[rgba(255,255,255,0.1)] rounded-xl transition-colors border border-[rgba(255,255,255,0.1)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ready Now Section */}
              {trayValueBreakdown.readyTrays.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center">
                      <CheckCircle className="w-5 h-5 mr-3 text-[var(--mint)]" />
                      Ready Now
                    </h4>
                    <span className="text-sm font-bold text-[var(--mint)]">
                      €{financialStats.readyValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {trayValueBreakdown.readyTrays.map((item) => (
                      <div 
                        key={item.tray.id} 
                        className="glass-card p-4 flex items-center justify-between border-l-2 border-[var(--mint)]"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">
                              {item.crop2Name ? (
                                <span className="flex items-center gap-1">
                                  {item.cropName} + {item.crop2Name}
                                  <Package className="w-4 h-4 text-[var(--text-subtle)]" />
                                </span>
                              ) : (
                                item.cropName
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)]">
                            <span className="flex items-center">
                              <Scale className="w-3 h-3 mr-1" />
                              {item.yield.toFixed(0)}g yield
                            </span>
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {item.location}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-[var(--mint)]">€{item.value.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maturing Section */}
              {trayValueBreakdown.maturingTrays.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white flex items-center">
                      <Clock className="w-5 h-5 mr-3 text-[var(--peach)]" />
                      Maturing
                    </h4>
                    <span className="text-sm font-bold text-[var(--text-subtle)]">
                      €{financialStats.maturingValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {trayValueBreakdown.maturingTrays.map((item) => (
                      <div 
                        key={item.tray.id} 
                        className="glass-card p-4 flex items-center justify-between border-l-2 border-[var(--peach)]"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">
                              {item.crop2Name ? (
                                <span className="flex items-center gap-1">
                                  {item.cropName} + {item.crop2Name}
                                  <Package className="w-4 h-4 text-[var(--text-subtle)]" />
                                </span>
                              ) : (
                                item.cropName
                              )}
                            </span>
                            <span className="text-xs font-bold text-[var(--peach)] bg-[var(--peach)]/10 px-2 py-1 rounded-lg border border-[var(--peach)]/30">
                              {item.tray.stage}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[var(--text-subtle)]">
                            <span className="flex items-center">
                              <Scale className="w-3 h-3 mr-1" />
                              {item.yield.toFixed(0)}g yield
                            </span>
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {item.location}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-[var(--peach)]">€{item.value.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {trayValueBreakdown.readyTrays.length === 0 && trayValueBreakdown.maturingTrays.length === 0 && (
                <div className="text-center py-12 bg-[var(--glass-bg)] rounded-2xl border border-dashed border-[rgba(255,255,255,0.1)]">
                  <Sprout className="w-14 h-14 mx-auto mb-3 text-[var(--text-subtle)]" />
                  <p className="text-[var(--text-subtle)] font-bold text-sm mb-1">No active trays</p>
                  <p className="text-[var(--text-subtle)]/60 text-xs">Start planting to see value breakdown</p>
                </div>
              )}

              {/* Total Summary */}
              {(trayValueBreakdown.readyTrays.length > 0 || trayValueBreakdown.maturingTrays.length > 0) && (
                <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.1)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--text-subtle)] uppercase tracking-wide">Total Potential Value</span>
                    <span className="text-3xl font-bold text-white">€{financialStats.total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MemoizedDashboard = React.memo(Dashboard);
MemoizedDashboard.displayName = 'Dashboard';

export default MemoizedDashboard;
