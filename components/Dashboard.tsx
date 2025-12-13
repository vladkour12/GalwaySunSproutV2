
import React, { useMemo } from 'react';
import { AppState, Stage } from '../types';
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
  Clock
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface DashboardProps {
  state: AppState;
  onNavigate: (view: any) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate }) => {
  
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
      if (!crop) return;

      let trayValue = 0;
      // Calculate value based on Yield * Market Price (€7.00 / 100g)
      if (crop.estimatedYieldPerTray) {
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
  const smartAlerts = useMemo(() => {
    return getFarmAlerts(state);
  }, [state]);

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
            color: 'bg-teal-100 text-teal-600'
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
             color: tray.stage === Stage.HARVESTED ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-600'
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
          color: tx.type === 'income' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
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

  // Updated Colors: Teal as primary
  const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Top Header */}
      <motion.div variants={item} className="flex flex-col space-y-1 mb-2">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Farm Overview</h2>
        <p className="text-slate-500 text-sm">Welcome back. Here's what's happening in the shed.</p>
      </motion.div>

      {/* --- Key Metrics Grid --- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Metric 1: Active Trays */}
        <motion.div 
          variants={item}
          className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-teal-200 transition-colors"
          onClick={() => onNavigate('crops')}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Sun className="w-20 h-20 text-teal-900" />
          </div>
          <div className="flex justify-between items-start z-10">
            <div className="p-2.5 bg-teal-50 rounded-2xl text-teal-600">
              <Sun className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 z-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">{activeTrays.length}</h3>
            <p className="text-sm font-medium text-slate-500">Active Trays</p>
          </div>
        </motion.div>

        {/* Metric 2: Harvest Ready */}
        <motion.div 
          variants={item}
          className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:border-amber-200 transition-colors group relative overflow-hidden"
          onClick={() => onNavigate('crops')}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <CheckCircle className="w-20 h-20 text-amber-900" />
          </div>
          <div className="flex justify-between items-start z-10">
             <div className="p-2.5 bg-amber-50 rounded-2xl text-amber-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            {readyToHarvest.length > 0 && (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
          </div>
          <div className="mt-4 z-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">{readyToHarvest.length}</h3>
            <p className="text-sm font-medium text-slate-500">Ready to Cut</p>
          </div>
        </motion.div>

        {/* Metric 3: Revenue Breakdown */}
        <motion.div 
          variants={item}
          className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-3xl shadow-xl shadow-slate-200 col-span-2 relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
           <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <TrendingUp className="w-24 h-24 text-white" />
           </div>
           
           <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Potential Value</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">€{financialStats.total.toFixed(2)}</h3>
                 </div>
                 <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-teal-400">
                    <ArrowUpRight className="w-5 h-5" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                 <div>
                    <span className="text-xs text-slate-400 block mb-0.5">Ready Now</span>
                    <span className="text-lg font-bold text-teal-400">€{financialStats.readyValue.toFixed(2)}</span>
                 </div>
                 <div>
                    <span className="text-xs text-slate-400 block mb-0.5">Maturing</span>
                    <span className="text-lg font-bold text-blue-300">€{financialStats.maturingValue.toFixed(2)}</span>
                 </div>
              </div>
           </div>
        </motion.div>
      </div>

      {/* --- Alerts & Activity Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         
         {/* Smart Alerts */}
         <motion.div variants={item} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center space-x-2 mb-4">
               <Bell className="w-5 h-5 text-slate-400" />
               <h3 className="font-bold text-slate-800">Action Needed</h3>
            </div>
            
            <div className="space-y-3">
               {smartAlerts.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                     <CheckCircle className="w-8 h-8 text-teal-300 mx-auto mb-2" />
                     <p className="text-sm font-medium text-slate-500">Everything looks good!</p>
                  </div>
               ) : (
                  smartAlerts.map(alert => {
                     let styles = "bg-slate-50 border-slate-100";
                     let iconColor = "text-slate-500";
                     let titleColor = "text-slate-800";
                     let msgColor = "text-slate-600";
                     let Icon = AlertCircle;

                     if (alert.type === 'urgent') {
                        styles = "bg-red-50 border-red-100";
                        iconColor = "text-red-500";
                        titleColor = "text-red-800";
                        msgColor = "text-red-600";
                     } else if (alert.type === 'warning') {
                        styles = "bg-amber-50 border-amber-100";
                        iconColor = "text-amber-500";
                        titleColor = "text-amber-800";
                        msgColor = "text-amber-600";
                     } else if (alert.type === 'routine') {
                        styles = "bg-blue-50 border-blue-100";
                        iconColor = "text-blue-500";
                        titleColor = "text-blue-800";
                        msgColor = "text-blue-600";
                        Icon = Droplets;
                     }

                     return (
                        <div key={alert.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-transform hover:scale-[1.02] cursor-pointer ${styles}`} onClick={() => onNavigate(alert.linkTo || 'crops')}>
                           <div className="flex items-center space-x-3">
                              <Icon className={`w-5 h-5 ${iconColor}`} />
                              <div>
                                 <p className={`text-sm font-bold ${titleColor}`}>{alert.title}</p>
                                 <p className={`text-xs ${msgColor}`}>{alert.message}</p>
                              </div>
                           </div>
                           <ChevronRight className={`w-4 h-4 opacity-50 ${iconColor}`} />
                        </div>
                     );
                  })
               )}
            </div>
         </motion.div>

         {/* Recent Activity */}
         <motion.div variants={item} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <h3 className="font-bold text-slate-800">Recent Activity</h3>
               </div>
               <button onClick={() => onNavigate('data')} className="text-xs font-bold text-teal-600 hover:text-teal-700">View All</button>
            </div>

            <div className="space-y-4">
               {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No activity recorded yet.</div>
               ) : (
                  recentActivity.map((activity, idx) => {
                     const Icon = activity.icon;
                     return (
                        <div key={activity.id} className="flex items-start space-x-3 relative">
                           {/* Connector Line */}
                           {idx !== recentActivity.length - 1 && (
                              <div className="absolute left-[15px] top-8 bottom-[-16px] w-0.5 bg-slate-100"></div>
                           )}
                           
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${activity.color}`}>
                              <Icon className="w-4 h-4" />
                           </div>
                           <div className="flex-1 pt-0.5">
                              <div className="flex justify-between items-start">
                                 <h4 className="text-sm font-bold text-slate-800">{activity.title}</h4>
                                 <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                                    {activity.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                 </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{activity.subtitle}</p>
                           </div>
                        </div>
                     );
                  })
               )}
            </div>
         </motion.div>
      </div>

      {/* --- Production Pipeline Chart --- */}
      <motion.div variants={item} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <Droplets className="w-5 h-5 mr-2 text-blue-500" />
              Production Pipeline
            </h3>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="h-48 w-48 flex-shrink-0 relative">
               {/* Center text for Donut */}
              {activeTrays.length > 0 && (
                 <motion.div 
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                 >
                    <span className="text-3xl font-bold text-slate-800">{activeTrays.length}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trays</span>
                 </motion.div>
              )}
              
              {activeTrays.length > 0 ? (
                <div style={{ width: '100%', height: 192 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      cornerRadius={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px', fontWeight: 600 }}
                    />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-full w-full rounded-full border-4 border-dashed border-slate-100 flex items-center justify-center">
                   <Sprout className="w-8 h-8 text-slate-300" />
                </div>
              )}
            </div>
            
            <div className="flex-1 w-full grid grid-cols-2 gap-3">
              {chartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <div className="flex flex-col">
                     <span className="text-xs font-bold text-slate-700">{entry.name}</span>
                     <span className="text-xs text-slate-400">{entry.value} Trays</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
