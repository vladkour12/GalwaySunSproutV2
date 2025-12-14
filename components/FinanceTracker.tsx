
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Customer, Transaction } from '../types';
import { ArrowDownLeft, ArrowUpRight, Plus, LayoutGrid, Users, User, Mail, Trash2, Edit2, Calendar, Store, ShoppingBag, Utensils, Zap, Package, Sprout, Layers, Megaphone, Download, X, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from './CustomSelect';

interface FinanceTrackerProps {
  state: AppState;
  onAddTransaction: (type: 'income' | 'expense', amount: number, category: string, desc: string, customerId?: string, payee?: string) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

// Helper hoisted out
const getCategoryIcon = (cat: string, type: 'income' | 'expense') => {
  if (type === 'income') {
    switch(cat) {
      case 'Sales': return <ShoppingBag className="w-5 h-5" />;
      case 'Restaurant': return <Utensils className="w-5 h-5" />;
      case 'Market': return <Store className="w-5 h-5" />;
      case 'Subscription': return <Calendar className="w-5 h-5" />;
      default: return <ArrowUpRight className="w-5 h-5" />;
    }
  } else {
    switch(cat) {
      case 'Seeds': return <Sprout className="w-5 h-5" />;
      case 'Soil': return <Layers className="w-5 h-5" />;
      case 'Equipment': return <Layers className="w-5 h-5" />;
      case 'Utilities': return <Zap className="w-5 h-5" />;
      case 'Packaging': return <Package className="w-5 h-5" />;
      case 'Marketing': return <Megaphone className="w-5 h-5" />;
      default: return <ArrowDownLeft className="w-5 h-5" />;
    }
  }
};

const FinanceTracker: React.FC<FinanceTrackerProps> = ({ 
  state, 
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer
}) => {
  const [isTouchUI, setIsTouchUI] = useState(false);
  const [showCharts] = useState(true); // Always show, we control render via width check

  useEffect(() => {
    // Mobile browsers can feel "unresponsive" when heavy charts intercept touch events or run animations.
    // Detect coarse pointer and optimize interactions accordingly.
    try {
      const mq = window.matchMedia?.('(pointer: coarse)');
      const update = () => setIsTouchUI(Boolean(mq?.matches));
      update();
      mq?.addEventListener?.('change', update);
      return () => mq?.removeEventListener?.('change', update);
    } catch {
      // no-op
    }
  }, []);

  const [chartWidth, setChartWidth] = useState(0);
  const chartRef1 = React.useRef<HTMLDivElement>(null);
  const chartRef2 = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      // Just grab one, they are usually same width in the grid
      if (chartRef1.current) {
        setChartWidth(chartRef1.current.offsetWidth);
      }
    };
    updateWidth();
    const timer = setTimeout(updateWidth, 200);
    window.addEventListener('resize', updateWidth);
    return () => {
        window.removeEventListener('resize', updateWidth);
        clearTimeout(timer);
    }
  }, []);

  // Removed redundant chart deferral effect, using manual width instead

  const [viewMode, setViewMode] = useState<'transactions' | 'customers'>('transactions');
  const [showTxForm, setShowTxForm] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [timeRange, setTimeRange] = useState<'month' | 'last_month' | 'year' | 'all'>('month');

  // Transaction Form State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [payee, setPayee] = useState('');

  // Customer Form State
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer>>({});

  useEffect(() => {
    if (editingTx) {
      setType(editingTx.type);
      setDate(new Date(editingTx.date).toISOString().split('T')[0]);
      setAmount(editingTx.amount.toString());
      setCategory(editingTx.category);
      setDescription(editingTx.description);
      setSelectedCustomerId(editingTx.customerId || '');
      setPayee(editingTx.payee || '');
      setShowTxForm(true);
    }
  }, [editingTx]);

  const filteredTransactions = useMemo(() => {
    if (timeRange === 'all') return state.transactions;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return state.transactions.filter(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false; // Skip invalid dates
      if (timeRange === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (timeRange === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      }
      if (timeRange === 'year') return d.getFullYear() === currentYear;
      return true;
    });
  }, [state.transactions, timeRange]);

  const financials = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, netProfit: income - expenses };
  }, [filteredTransactions]);

  const payeeSuggestions = useMemo(() => {
     const uniquePayees = new Set<string>();
     state.transactions.filter(t => t.type === type).forEach(t => { if (t.payee) uniquePayees.add(t.payee); });
     return Array.from(uniquePayees);
  }, [state.transactions, type]);

  const cashFlowData = useMemo(() => {
    const dailyMap = new Map<string, { date: string; income: number; expense: number }>();
    filteredTransactions.forEach(t => {
       const d = new Date(t.date);
       if (isNaN(d.getTime())) return;
       const dateKey = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
       if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { date: dateKey, income: 0, expense: 0 });
       const entry = dailyMap.get(dateKey)!;
       t.type === 'income' ? entry.income += t.amount : entry.expense += t.amount;
    });
    return Array.from(dailyMap.values()).reverse().slice(0, 7).reverse(); 
  }, [filteredTransactions]);

  const expenseCategoryData = useMemo(() => {
     const catMap = new Map<string, number>();
     filteredTransactions.filter(t => t.type === 'expense').forEach(t => catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount));
     const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#3b82f6', '#64748b'];
     return Array.from(catMap.entries()).map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }));
  }, [filteredTransactions]);

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    
    let finalPayee = payee;
    if (type === 'income' && selectedCustomerId && !finalPayee) {
       const cust = state.customers.find(c => c.id === selectedCustomerId);
       if (cust) finalPayee = cust.name;
    }

    if (editingTx) {
       onUpdateTransaction({ ...editingTx, type, amount: parseFloat(amount), category, description, customerId: selectedCustomerId || undefined, payee: finalPayee, date: new Date(date).toISOString() });
       setEditingTx(null);
    } else {
       onAddTransaction(type, parseFloat(amount), category, description, selectedCustomerId || undefined, finalPayee);
    }
    setShowTxForm(false);
    resetForm();
  };

  const resetForm = () => {
    setAmount(''); setCategory(''); setDescription(''); setSelectedCustomerId(''); setPayee(''); setEditingTx(null); setDate(new Date().toISOString().split('T')[0]);
  };

  const handleExportCSV = () => {
     if (filteredTransactions.length === 0) return;
     const headers = ['Date', 'Type', 'Category', 'Payee', 'Description', 'Amount (€)'];
     const rows = filteredTransactions.map(t => {
        const d = new Date(t.date);
        return [
          isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString(), 
          t.type, 
          t.category, 
          t.payee || '', 
          `"${t.description.replace(/"/g, '""')}"`, 
          t.amount.toFixed(2)
        ];
     });
     const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
     const link = document.createElement("a");
     link.setAttribute("href", encodeURI(csvContent));
     link.setAttribute("download", `finance_report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const openNewCustomerModal = () => { setEditingCustomer({ name: '', type: 'Restaurant', contact: '', email: '', notes: '' }); setShowCustomerModal(true); };
  const openEditCustomerModal = (customer: Customer) => { setEditingCustomer({ ...customer }); setShowCustomerModal(true); };
  const handleSaveCustomer = () => {
    if (!editingCustomer.name) return;
    editingCustomer.id ? onUpdateCustomer(editingCustomer as Customer) : onAddCustomer(editingCustomer as Customer);
    setShowCustomerModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
           <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{viewMode === 'transactions' ? 'Finances' : 'Customers'}</h2>
              <p className="text-xs text-slate-500 font-medium">{viewMode === 'transactions' ? 'Cash Flow & Records' : 'Client Management'}</p>
           </div>
           <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setViewMode('transactions')} className={`p-2 rounded-lg transition-all ${viewMode === 'transactions' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><LayoutGrid className="w-5 h-5" /></button>
              <button onClick={() => setViewMode('customers')} className={`p-2 rounded-lg transition-all ${viewMode === 'customers' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400'}`}><Users className="w-5 h-5" /></button>
           </div>
        </div>

        {viewMode === 'transactions' ? (
          <motion.button
            whileHover={isTouchUI ? undefined : { scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => { if (showTxForm) { setShowTxForm(false); resetForm(); } else { setShowTxForm(true); resetForm(); } }}
            style={{ touchAction: 'manipulation' }}
            className={`w-full py-3 rounded-2xl shadow-lg flex items-center justify-center text-sm font-bold transition-all ${showTxForm ? 'bg-slate-100 text-slate-600 shadow-none' : 'bg-slate-900 text-white shadow-slate-200'}`}
          >
            {showTxForm ? 'Cancel Entry' : <><Plus className="w-4 h-4 mr-2" /> Add Transaction</>}
          </motion.button>
        ) : (
          <motion.button
            whileHover={isTouchUI ? undefined : { scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={openNewCustomerModal}
            style={{ touchAction: 'manipulation' }}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-2xl shadow-lg shadow-teal-200 flex items-center justify-center text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </motion.button>
        )}
      </div>

      {viewMode === 'transactions' && (
        <div className="space-y-6">
          <AnimatePresence>
          {showTxForm && (
            <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} onSubmit={handleTxSubmit} className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-5 relative overflow-hidden">
               <div className={`pointer-events-none absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${editingTx ? 'from-amber-400 to-orange-500' : 'from-teal-400 to-blue-500'}`}></div>
               <h3 className="text-sm font-bold text-slate-800">{editingTx ? 'Edit Transaction' : 'New Transaction'}</h3>
               <div className="bg-slate-100 p-1.5 rounded-2xl flex relative">
                 <motion.div className="pointer-events-none absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm" animate={{ x: type === 'expense' ? '100%' : '0%' }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                 <button type="button" onClick={() => setType('income')} onPointerUp={() => setType('income')} style={{ touchAction: 'manipulation' }} className={`relative flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 ${type === 'income' ? 'text-teal-700' : 'text-slate-500'}`}>Income</button>
                 <button type="button" onClick={() => setType('expense')} onPointerUp={() => setType('expense')} style={{ touchAction: 'manipulation' }} className={`relative flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 ${type === 'expense' ? 'text-red-700' : 'text-slate-500'}`}>Expense</button>
               </div>
               <div className="space-y-4">
                  <div className="relative"><span className="absolute left-4 top-3.5 text-slate-400 font-medium">€</span><input type="number" value={amount} onChange={e => setAmount(e.target.value)} onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()} className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300 transition-all" placeholder="0.00" required /></div>
                  {editingTx && ( <div className="relative"><Calendar className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-base font-bold text-slate-700 focus:ring-2 focus:ring-teal-100 outline-none" /></div> )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="relative">
                       {type === 'income' && <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-teal-600 font-bold z-10">Sales Channel</label>}
                       <CustomSelect 
                          value={category} 
                          onChange={(val) => setCategory(val)} 
                          options={
                            type === 'income' 
                              ? [
                                  { value: "", label: 'Select Sales Channel...' },
                                  { value: "Sales", label: 'Direct Sales' },
                                  { value: "Restaurant", label: 'Restaurant Delivery' },
                                  { value: "Market", label: 'Farmers Market' },
                                  { value: "Subscription", label: 'Subscription' }
                                ]
                              : [
                                  { value: "", label: 'Select Category...' },
                                  { value: "Seeds", label: 'Seeds' },
                                  { value: "Soil", label: 'Soil/Medium' },
                                  { value: "Utilities", label: 'Utilities' },
                                  { value: "Packaging", label: 'Packaging' },
                                  { value: "Marketing", label: 'Marketing' },
                                  { value: "Equipment", label: 'Equipment' }
                                ]
                          }
                       />
                     </div>
                     {type === 'income' ? (
                       <div className="relative">
                          <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-teal-600 font-bold z-10">Customer (Optional)</label>
                          <CustomSelect 
                             value={selectedCustomerId} 
                             onChange={(val) => setSelectedCustomerId(val)} 
                             options={[
                                { value: "", label: "Guest / General Sales" },
                                ...state.customers.map(c => ({ value: c.id, label: c.name }))
                             ]}
                          />
                       </div>
                     ) : (
                        <div className="relative"><input type="text" value={payee} onChange={e => setPayee(e.target.value)} list="payee-suggestions" placeholder="Payee / Vendor" className="w-full p-3.5 bg-slate-50 border-none rounded-2xl text-base font-medium text-slate-700 focus:ring-2 focus:ring-teal-100 outline-none" /><datalist id="payee-suggestions">{payeeSuggestions.map((p, i) => <option key={i} value={p} />)}</datalist></div>
                     )}
                  </div>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3.5 bg-slate-50 border-none rounded-2xl text-base font-medium text-slate-700 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300 outline-none" placeholder="Description (e.g. Weekly Farmers Market)" />
               </div>
               <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => { setShowTxForm(false); resetForm(); }} className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-lg shadow-teal-200 transition-colors">{editingTx ? 'Update Record' : 'Save Transaction'}</button>
               </div>
            </motion.form>
          )}
          </AnimatePresence>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-teal-50 p-5 rounded-3xl border border-teal-100 flex flex-col justify-between"><span className="text-teal-600 text-xs font-bold uppercase tracking-wider">Total Income</span><div className="text-2xl font-bold text-teal-800 mt-1">€{financials.income.toFixed(2)}</div></div>
             <div className="bg-red-50 p-5 rounded-3xl border border-red-100 flex flex-col justify-between"><span className="text-red-600 text-xs font-bold uppercase tracking-wider">Total Expenses</span><div className="text-2xl font-bold text-red-800 mt-1">€{financials.expenses.toFixed(2)}</div></div>
             <div className={`p-5 rounded-3xl border flex flex-col justify-between ${financials.netProfit >= 0 ? 'bg-slate-900 text-white border-slate-800' : 'bg-orange-50 text-orange-800 border-orange-100'}`}><span className={`text-xs font-bold uppercase tracking-wider ${financials.netProfit >= 0 ? 'text-slate-400' : 'text-orange-600'}`}>Net Profit</span><div className="text-2xl font-bold mt-1">€{financials.netProfit.toFixed(2)}</div></div>
          </motion.div>

          {true ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4">Cash Flow (Last 7 Days)</h4>
                <div ref={chartRef1} className="h-48 w-full" style={{ minHeight: 192, position: 'relative' }}>
                  {chartWidth > 0 && (
                    <BarChart width={chartWidth} height={192} data={cashFlowData}>
                      <XAxis dataKey="date" hide />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                      <Bar dataKey="income" fill="#0d9488" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  )}
                </div>
                {isTouchUI && <p className="mt-2 text-[10px] text-slate-400 font-bold">Charts are view-only on mobile.</p>}
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4">Expenses by Category</h4>
                <div ref={chartRef2} className="h-48 w-full" style={{ minHeight: 192, position: 'relative' }}>
                  {chartWidth > 0 && (
                    <PieChart width={chartWidth} height={192}>
                      <Pie data={expenseCategoryData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" isAnimationActive={false}>
                        {expenseCategoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  )}
                </div>
                {isTouchUI && <p className="mt-2 text-[10px] text-slate-400 font-bold">Charts are view-only on mobile.</p>}
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="h-48 w-full rounded-2xl bg-slate-50 border border-slate-100 animate-pulse" />
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="h-48 w-full rounded-2xl bg-slate-50 border border-slate-100 animate-pulse" />
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Recent Transactions</h3>
                <div className="flex space-x-2 items-center">
                   <div className="w-40">
                      <CustomSelect 
                         value={timeRange}
                         onChange={(val) => setTimeRange(val as any)}
                         options={[
                            { value: "month", label: "This Month" },
                            { value: "last_month", label: "Last Month" },
                            { value: "year", label: "This Year" },
                            { value: "all", label: "All Time" }
                         ]}
                         className="text-xs"
                      />
                   </div>
                   <button onClick={handleExportCSV} className="p-1 text-slate-400 hover:text-teal-600"><Download className="w-4 h-4" /></button>
                </div>
             </div>
             <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }} className="divide-y divide-slate-50">
                {filteredTransactions.slice().reverse().map(tx => (
                   <motion.div key={tx.id} variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center space-x-3">
                         <div className={`p-2.5 rounded-xl ${tx.type === 'income' ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'}`}>{getCategoryIcon(tx.category, tx.type)}</div>
                         <div><div className="font-bold text-slate-800 text-sm">{tx.description || tx.category}</div><div className="text-[10px] text-slate-400 font-medium">{(() => { const d = new Date(tx.date); return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString(); })()} • {tx.payee || tx.customerId ? (tx.payee || state.customers.find(c => c.id === tx.customerId)?.name) : 'General'}</div></div>
                      </div>
                      <div className="flex items-center space-x-3"><span className={`font-bold text-sm ${tx.type === 'income' ? 'text-teal-600' : 'text-slate-900'}`}>{tx.type === 'income' ? '+' : '-'}€{tx.amount.toFixed(2)}</span><div className="flex space-x-1"><button onClick={() => setEditingTx(tx)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 rounded-lg active:bg-blue-50"><Edit2 className="w-4 h-4" /></button><button onClick={() => onDeleteTransaction(tx.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg active:bg-red-50"><Trash2 className="w-4 h-4" /></button></div></div>
                   </motion.div>
                ))}
                {filteredTransactions.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No transactions found for this period.</div>}
             </motion.div>
          </div>
        </div>
      )}

      {viewMode === 'customers' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.customers.map(cust => (
               <motion.div key={cust.id} whileHover={{ scale: 1.01 }} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative">
                  <div className="absolute top-4 right-4 flex space-x-1"><button onClick={() => openEditCustomerModal(cust)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 rounded-lg active:bg-blue-50"><Edit2 className="w-4 h-4" /></button><button onClick={() => onDeleteCustomer(cust.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg active:bg-red-50"><Trash2 className="w-4 h-4" /></button></div>
                  <div className="flex items-center space-x-3 mb-4"><div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-lg font-bold">{cust.name.charAt(0)}</div><div><h3 className="font-bold text-slate-800">{cust.name}</h3><span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">{cust.type}</span></div></div>
                  <div className="space-y-2 mb-4"><div className="flex items-center text-xs text-slate-500"><User className="w-3.5 h-3.5 mr-2" />{cust.contact}</div><div className="flex items-center text-xs text-slate-500"><Mail className="w-3.5 h-3.5 mr-2" />{cust.email}</div>{cust.notes && <div className="text-[10px] text-slate-400 italic mt-2 bg-yellow-50 p-2 rounded-lg border border-yellow-100">"{cust.notes}"</div>}</div>
               </motion.div>
            ))}
            {state.customers.length === 0 && <div className="col-span-1 md:col-span-2 text-center py-12 text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200"><Users className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>No customers added yet.</p></div>}
         </div>
      )}

      <AnimatePresence>
      {showCustomerModal && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 max-h-[85vh] overflow-y-auto">
               <div className="flex justify-between items-center">
                   <h3 className="text-lg font-bold text-slate-800">{editingCustomer.id ? 'Edit Customer' : 'Add New Customer'}</h3>
                   <button onClick={() => setShowCustomerModal(false)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 active:bg-slate-300 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
               </div>
               <div className="space-y-3">
                  <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label><input type="text" value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none" /></div>
                  <div>
                     <CustomSelect 
                        label="Type"
                        value={editingCustomer.type || 'Restaurant'}
                        onChange={(val) => setEditingCustomer({...editingCustomer, type: val as any})}
                        options={[
                           { value: "Restaurant", label: "Restaurant" },
                           { value: "Wholesaler", label: "Wholesaler" },
                           { value: "Individual", label: "Individual" }
                        ]}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Person</label><input type="text" value={editingCustomer.contact} onChange={e => setEditingCustomer({...editingCustomer, contact: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-medium focus:ring-2 focus:ring-teal-500 outline-none" /></div><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label><input type="email" value={editingCustomer.email} onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-medium focus:ring-2 focus:ring-teal-500 outline-none" /></div></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</label><textarea value={editingCustomer.notes} onChange={e => setEditingCustomer({...editingCustomer, notes: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-medium focus:ring-2 focus:ring-teal-500 outline-none resize-none h-20" /></div>
               </div>
               <div className="flex space-x-3 pt-2"><button onClick={() => setShowCustomerModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl">Cancel</button><button onClick={handleSaveCustomer} className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-200">Save Customer</button></div>
            </motion.div>
         </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default FinanceTracker;
