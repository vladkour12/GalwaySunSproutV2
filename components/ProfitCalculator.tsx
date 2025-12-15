
import React, { useState, useEffect, useMemo } from 'react';
import { AppState } from '../types';
import { Calculator, Euro, Sprout, Zap, Box, Droplets, TrendingUp, AlertCircle, RefreshCw, Scale, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import CustomSelect from './CustomSelect';
import { quickElectricityCalc } from '../utils/electricityCalculator';

interface ProfitCalculatorProps {
  state: AppState;
}

const ProfitCalculator: React.FC<ProfitCalculatorProps> = ({ state }) => {
  // --- State ---
  const [selectedCropId, setSelectedCropId] = useState<string>('');
  
  // Inputs
  const [pricePer100g, setPricePer100g] = useState<number>(0);
  const [yieldPerTray, setYieldPerTray] = useState<number>(0);
  
  const [seedCost, setSeedCost] = useState<number>(0);
  const [soilCost, setSoilCost] = useState<number>(0.50);
  const [elecCost, setElecCost] = useState<number>(0.85); // Estimated per tray per cycle
  const [waterCost, setWaterCost] = useState<number>(0.15); // Water & Labor misc
  const [packagingCost, setPackagingCost] = useState<number>(0.40); // Clamshell/box

  const [chartWidth, setChartWidth] = useState(0);
  const chartRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Force re-measure on load and resize
    const updateWidth = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    // Add a small delay to allow layout to settle
    const timer = setTimeout(updateWidth, 100);
    
    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
      clearTimeout(timer);
    };
  }, []);

  // Effect: Auto-populate when crop changes
  useEffect(() => {
    if (!selectedCropId) return;
    
    const crop = state.crops.find(c => c.id === selectedCropId);
    if (crop) {
        // 1. Set Yield
        const yieldVal = crop.estimatedYieldPerTray || 0;
        setYieldPerTray(yieldVal);

        // 2. Set Price per 100g
        // Default to €6.00 per 100g, or use crop specific setting
        let calculatedPrice100g = crop.revenuePer100g || 6.00; 
        
        setPricePer100g(Number(calculatedPrice100g.toFixed(2)));
        
        // 3. Calculate Seed Cost
        let calculatedSeedCost = 0;
        if (crop.seedingRate && crop.seedingRate > 0) {
            // Prioritize Large pack as it's the likely bulk purchase for business
            if (crop.price1kg) {
                 const weight = crop.pkgWeightLarge || 1000;
                 calculatedSeedCost = (crop.seedingRate / weight) * crop.price1kg;
            } else if (crop.price500g) {
                 const weight = crop.pkgWeightSmall || 500;
                 calculatedSeedCost = (crop.seedingRate / weight) * crop.price500g;
            }
        }
        setSeedCost(Number(calculatedSeedCost.toFixed(2)));
    }
  }, [selectedCropId, state.crops]);

  // --- Calculations for Single Crop View ---
  // Revenue = (Yield / 100) * PricePer100g
  const revenuePerTray = (yieldPerTray / 100) * pricePer100g;
  
  const totalVariableCost = seedCost + soilCost + elecCost + waterCost + packagingCost;
  const netProfit = revenuePerTray - totalVariableCost;
  const margin = revenuePerTray > 0 ? (netProfit / revenuePerTray) * 100 : 0;
  
  const chartData = [
    { name: 'Seed', value: seedCost, color: '#0d9488' }, // Teal
    { name: 'Soil', value: soilCost, color: '#8b5cf6' }, // Violet
    { name: 'Electricity', value: elecCost, color: '#f59e0b' }, // Amber
    { name: 'Packaging', value: packagingCost, color: '#3b82f6' }, // Blue
    { name: 'Water/Misc', value: waterCost, color: '#64748b' }, // Slate
  ].filter(item => item.value > 0);

  const resetDefaults = () => {
    setSoilCost(0.50);
    setElecCost(0.85);
    setWaterCost(0.15);
    setPackagingCost(0.40);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1 mb-6">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Profit Calculator</h2>
        <p className="text-slate-500 text-sm">Analyze unit economics per 1020 tray.</p>
      </div>

      {/* 1. Crop Selector */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
         <CustomSelect 
            label="Select Variety"
            value={selectedCropId}
            onChange={(val) => setSelectedCropId(val)}
            options={[
               { value: "", label: "-- Choose a Crop to Auto-Fill --" },
               ...state.crops.map(crop => ({ value: crop.id, label: crop.name }))
            ]}
         />
         <div className="mt-3 flex items-center space-x-2 text-xs text-slate-400">
            <RefreshCw className="w-3 h-3" />
            <span>Selecting a crop automatically updates Yield, Seed Cost and Price estimates.</span>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Costs Input Section */}
        <div className="space-y-4 order-2 lg:order-1">
            {/* Revenue Input */}
            <div className="bg-teal-50 p-5 rounded-3xl border border-teal-100">
                <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-teal-200/50 rounded-lg text-teal-800">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-teal-900">Revenue Factors</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                   <div>
                       <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1">Price per 100g Bag</label>
                       <div className="relative">
                          <Euro className="w-5 h-5 absolute left-3 top-3.5 text-teal-600" />
                          <input 
                             type="number" 
                             value={pricePer100g || ''}
                             onChange={(e) => setPricePer100g(parseFloat(e.target.value) || 0)}
                             onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                             step="0.10"
                             className="w-full pl-10 p-3 bg-white border border-teal-200 rounded-xl text-lg font-bold text-teal-900 focus:ring-2 focus:ring-teal-500 outline-none"
                             placeholder="6.00"
                          />
                       </div>
                   </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-teal-200 flex justify-between items-center opacity-80">
                   <span className="text-xs font-bold text-teal-800">Gross Revenue / Tray</span>
                   <span className="text-sm font-bold text-teal-900">€{revenuePerTray.toFixed(2)}</span>
                </div>
            </div>

            {/* Variable Costs Inputs */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-800">Expense Breakdown</h3>
                    </div>
                    <button 
                       onClick={resetDefaults} 
                       className="text-[10px] font-bold text-slate-400 hover:text-teal-500 transition-colors"
                    >
                       Reset Defaults
                    </button>
                </div>
                
                <div className="space-y-4">
                   {/* Seed Cost */}
                   <div className="grid grid-cols-3 gap-4 items-center">
                       <label className="col-span-1 text-xs font-bold text-slate-500 flex items-center">
                          <Sprout className="w-3.5 h-3.5 mr-2 text-teal-500" />
                          Seed
                       </label>
                       <div className="col-span-2 relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">€</span>
                          <input 
                             type="number"
                             value={seedCost || ''}
                             onChange={(e) => setSeedCost(parseFloat(e.target.value) || 0)}
                             onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                             step="0.01"
                             className="w-full pl-7 p-2 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                             placeholder="0.00"
                          />
                       </div>
                   </div>

                   {/* Soil Cost */}
                   <div className="grid grid-cols-3 gap-4 items-center">
                       <label className="col-span-1 text-xs font-bold text-slate-500 flex items-center">
                          <Box className="w-3.5 h-3.5 mr-2 text-violet-500" />
                          Medium/Soil
                       </label>
                       <div className="col-span-2 relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">€</span>
                          <input 
                             type="number"
                             value={soilCost || ''}
                             onChange={(e) => setSoilCost(parseFloat(e.target.value) || 0)}
                             onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                             step="0.01"
                             className="w-full pl-7 p-2 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                             placeholder="0.00"
                          />
                       </div>
                   </div>

                   {/* Electricity Cost */}
                   <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-4 items-center">
                         <label className="col-span-1 text-xs font-bold text-slate-500 flex items-center justify-between">
                            <div className="flex items-center">
                               <Zap className="w-3.5 h-3.5 mr-2 text-amber-500" />
                               Electricity
                            </div>
                            <button
                               type="button"
                               onClick={() => setShowElecCalc(!showElecCalc)}
                               className="p-1 text-amber-500 hover:text-amber-600 rounded"
                               title="Calculate electricity costs"
                            >
                               <Info className="w-3.5 h-3.5" />
                            </button>
                         </label>
                         <div className="col-span-2 relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">€</span>
                            <input 
                               type="number"
                               value={elecCost || ''}
                               onChange={(e) => setElecCost(parseFloat(e.target.value) || 0)}
                               onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                               step="0.01"
                               className="w-full pl-7 p-2 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                               placeholder="0.00"
                            />
                         </div>
                      </div>
                      
                      {/* Electricity Calculator */}
                      {showElecCalc && selectedCrop && elecCalc && (
                         <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 text-xs">
                            <div className="flex justify-between items-center">
                               <h4 className="font-bold text-amber-900">Electricity Cost Calculator</h4>
                               <button onClick={() => setShowElecCalc(false)} className="text-amber-600 hover:text-amber-800">×</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <div>
                                  <label className="text-[10px] font-bold text-amber-700 uppercase">W per Shelf</label>
                                  <input type="number" value={elecWattagePerShelf} onChange={e => setElecWattagePerShelf(parseInt(e.target.value) || 100)} className="w-full p-1.5 bg-white border border-amber-200 rounded text-xs font-bold" />
                               </div>
                               <div>
                                  <label className="text-[10px] font-bold text-amber-700 uppercase">Trays/Shelf</label>
                                  <input type="number" value={elecTraysPerShelf} onChange={e => setElecTraysPerShelf(parseInt(e.target.value) || 4)} className="w-full p-1.5 bg-white border border-amber-200 rounded text-xs font-bold" />
                               </div>
                               <div>
                                  <label className="text-[10px] font-bold text-amber-700 uppercase">Hours/Day</label>
                                  <input type="number" value={elecHoursPerDay} onChange={e => setElecHoursPerDay(parseInt(e.target.value) || 16)} className="w-full p-1.5 bg-white border border-amber-200 rounded text-xs font-bold" />
                               </div>
                               <div>
                                  <label className="text-[10px] font-bold text-amber-700 uppercase">€/kWh</label>
                                  <input type="number" value={elecRatePerKwh} step="0.01" onChange={e => setElecRatePerKwh(parseFloat(e.target.value) || 0.32)} className="w-full p-1.5 bg-white border border-amber-200 rounded text-xs font-bold" />
                               </div>
                            </div>
                            <div className="pt-2 border-t border-amber-200 space-y-1">
                               <div className="flex justify-between text-amber-800">
                                  <span className="font-medium">Per Tray (Light Stage):</span>
                                  <span className="font-bold">€{elecCalc.costPerCyclePerTray.toFixed(2)}</span>
                               </div>
                               <div className="text-[10px] text-amber-600">
                                  {elecCalc.wattagePerTray.toFixed(0)}W/tray × {elecHoursPerDay}h/day × {selectedCrop.lightDays} days = €{elecCalc.costPerCyclePerTray.toFixed(2)}
                               </div>
                               <button
                                  type="button"
                                  onClick={() => {
                                     setElecCost(Number(elecCalc.costPerCyclePerTray.toFixed(2)));
                                     setShowElecCalc(false);
                                  }}
                                  className="w-full mt-2 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
                               >
                                  Use This Value
                               </button>
                            </div>
                         </div>
                      )}
                   </div>

                    {/* Packaging Cost */}
                   <div className="grid grid-cols-3 gap-4 items-center">
                       <label className="col-span-1 text-xs font-bold text-slate-500 flex items-center">
                          <Box className="w-3.5 h-3.5 mr-2 text-blue-500" />
                          Packaging
                       </label>
                       <div className="col-span-2 relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">€</span>
                          <input 
                             type="number"
                             value={packagingCost || ''}
                             onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                             onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                             step="0.01"
                             className="w-full pl-7 p-2 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                             placeholder="0.00"
                          />
                       </div>
                   </div>

                   {/* Water Cost */}
                   <div className="grid grid-cols-3 gap-4 items-center">
                       <label className="col-span-1 text-xs font-bold text-slate-500 flex items-center">
                          <Droplets className="w-3.5 h-3.5 mr-2 text-cyan-500" />
                          Water/Misc
                       </label>
                       <div className="col-span-2 relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">€</span>
                          <input 
                             type="number"
                             value={waterCost || ''}
                             onChange={(e) => setWaterCost(parseFloat(e.target.value) || 0)}
                             onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()}
                             step="0.01"
                             className="w-full pl-7 p-2 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                             placeholder="0.00"
                          />
                       </div>
                   </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-500">Total Costs</span>
                    <span className="text-xl font-bold text-slate-800">€{totalVariableCost.toFixed(2)}</span>
                </div>
            </div>
        </div>

        {/* 3. Results Section */}
        <div className="space-y-6 order-1 lg:order-2">
            {/* Net Profit Card */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-200 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
               <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Euro className="w-32 h-32 text-white" />
               </div>
               
               <div className="relative z-10 flex justify-between">
                  <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Net Profit per Tray</h3>
                      <div className={`text-4xl font-bold tracking-tight ${netProfit < 0 ? 'text-red-400' : 'text-white'}`}>
                          {netProfit < 0 ? '-' : ''}€{Math.abs(netProfit).toFixed(2)}
                      </div>
                  </div>
                  <div className="text-right">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Margin</h3>
                      <div className={`text-xl font-bold ${margin < 30 ? 'text-red-400' : margin < 50 ? 'text-amber-400' : 'text-teal-400'}`}>
                          {margin.toFixed(1)}%
                      </div>
                  </div>
               </div>

               <div className="relative z-10 mt-4">
                  {margin < 0 ? (
                      <div className="flex items-center text-red-300 text-xs font-medium">
                          <AlertCircle className="w-4 h-4 mr-1.5" />
                          Selling below cost. Adjust price or reduce expenses.
                      </div>
                  ) : margin < 40 ? (
                      <div className="flex items-center text-amber-300 text-xs font-medium">
                          <AlertCircle className="w-4 h-4 mr-1.5" />
                          Tight margin. Industry standard is often &gt;50%.
                      </div>
                  ) : (
                      <div className="flex items-center text-teal-300 text-xs font-medium">
                          <TrendingUp className="w-4 h-4 mr-1.5" />
                          Healthy profit margin!
                      </div>
                  )}
               </div>
            </div>

            {/* Cost Distribution Chart */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Cost Breakdown</h4>
                {totalVariableCost > 0 ? (
                  <div ref={chartRef} className="h-48 w-full" style={{ minHeight: 192 }}>
                    {chartWidth > 0 && (
                        <PieChart width={chartWidth} height={192}>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                           formatter={(value: number) => `€${value.toFixed(2)}`}
                           contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px', fontWeight: 600 }}
                        />
                        <Legend 
                          layout="vertical" 
                          verticalAlign="middle" 
                          align="right"
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}
                        />
                        </PieChart>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-300 text-sm">
                      No costs to display
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitCalculator;
