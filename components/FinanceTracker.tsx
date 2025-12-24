
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Customer, Transaction } from '../types';
import { ArrowDownLeft, ArrowUpRight, Plus, LayoutGrid, Users, User, Mail, Trash2, Edit2, Calendar, Store, ShoppingBag, Utensils, Zap, Package, Sprout, Layers, Megaphone, Download, X, DollarSign, Receipt, Upload, Image as ImageIcon, Building2, Search, Filter, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from './CustomSelect';
import { saveFinancePreferences, loadFinancePreferences } from '../utils/persistence';
import { compressImage } from '../utils/imageConverter';

interface FinanceTrackerProps {
  state: AppState;
  onAddTransaction: (type: 'income' | 'expense', amount: number, category: string, desc: string, customerId?: string, payee?: string, receiptImage?: string, isBusinessExpense?: boolean) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  orderManagerElement?: React.ReactNode;
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
  onDeleteCustomer,
  orderManagerElement
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

  // Load saved preferences
  const savedPrefs = loadFinancePreferences();
  const [viewMode, setViewMode] = useState<'transactions' | 'customers' | 'expenses'>(savedPrefs.viewMode || 'transactions');
  const [showTxForm, setShowTxForm] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [timeRange, setTimeRange] = useState<'month' | 'last_month' | 'year' | 'all'>(savedPrefs.timeRange);
  
  // Business Expense Form State
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expensePayee, setExpensePayee] = useState('');
  const [expenseReceipt, setExpenseReceipt] = useState<string>('');
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  
  // Business Expenses Filtering & Search
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');

  // Save preferences when they change
  useEffect(() => {
    saveFinancePreferences({ viewMode, timeRange });
  }, [viewMode, timeRange]);

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
    // Filter out business expenses from regular transactions view
    // Only show transactions that are NOT business expenses (undefined or false)
    const nonBusinessTransactions = state.transactions.filter(t => t.isBusinessExpense !== true);
    
    if (timeRange === 'all') return nonBusinessTransactions;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return nonBusinessTransactions.filter(t => {
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
     // Only include payees from non-business expenses for suggestions
     state.transactions
       .filter(t => t.type === type && t.isBusinessExpense !== true)
       .forEach(t => { if (t.payee) uniquePayees.add(t.payee); });
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

  // Business Investments Summary Data
  const allBusinessExpenses = useMemo(() => {
    return state.transactions.filter(t => t.isBusinessExpense === true || t.isBusinessExpense === 'true');
  }, [state.transactions]);

  const businessExpensesByTimeRange = useMemo(() => {
    return allBusinessExpenses.filter(t => {
      if (timeRange === 'all') return true;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      if (timeRange === 'month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (timeRange === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      }
      if (timeRange === 'year') return d.getFullYear() === currentYear;
      return true;
    });
  }, [allBusinessExpenses, timeRange]);

  const businessExpensesSummary = useMemo(() => {
    const totalSpent = allBusinessExpenses.reduce((sum, t) => sum + t.amount, 0);
    const periodTotal = businessExpensesByTimeRange.reduce((sum, t) => sum + t.amount, 0);
    
    // Category breakdown
    const catMap = new Map<string, number>();
    businessExpensesByTimeRange.forEach(t => {
      const cat = t.category || 'Uncategorized';
      catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
    });
    const categoryBreakdown = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value, percentage: periodTotal > 0 ? (value / periodTotal) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
    
    // Monthly trend (last 6 months)
    const monthlyMap = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyMap.set(key, 0);
    }
    
    allBusinessExpenses.forEach(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + t.amount);
      }
    });
    
    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, amount]) => ({ month, amount }));
    
    return {
      totalSpent,
      periodTotal,
      categoryBreakdown,
      monthlyTrend,
      totalItems: allBusinessExpenses.length
    };
  }, [allBusinessExpenses, businessExpensesByTimeRange]);

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
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {viewMode === 'transactions' ? 'Finances' : viewMode === 'customers' ? 'Customers' : 'Business Expenses'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {viewMode === 'transactions' ? 'Cash Flow & Records' : viewMode === 'customers' ? 'Client Management' : 'Track Business Spending'}
              </p>
           </div>
           <div className="flex bg-slate-700 p-1 rounded-xl relative z-10">
              <button onClick={() => setViewMode('transactions')} style={{ position: 'relative', zIndex: 10 }} className={`p-2 rounded-lg transition-all ${viewMode === 'transactions' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400'}`}><LayoutGrid className="w-5 h-5" /></button>
              <button onClick={() => setViewMode('customers')} style={{ position: 'relative', zIndex: 10 }} className={`p-2 rounded-lg transition-all ${viewMode === 'customers' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}><Users className="w-5 h-5" /></button>
              <button onClick={() => setViewMode('expenses')} style={{ position: 'relative', zIndex: 10 }} className={`p-2 rounded-lg transition-all ${viewMode === 'expenses' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400'}`}><Building2 className="w-5 h-5" /></button>
           </div>
        </div>

        {viewMode === 'transactions' ? (
          <motion.button
            whileHover={isTouchUI ? undefined : { scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => { if (showTxForm) { setShowTxForm(false); resetForm(); } else { setShowTxForm(true); resetForm(); } }}
            style={{ touchAction: 'manipulation', position: 'relative', zIndex: 10 }}
            className={`w-full py-3 rounded-2xl shadow-lg flex items-center justify-center text-sm font-bold transition-all ${showTxForm ? 'bg-slate-100 text-slate-600 shadow-none' : 'bg-slate-900 text-white shadow-slate-200'}`}
          >
            {showTxForm ? 'Cancel Entry' : <><Plus className="w-4 h-4 mr-2" /> Add Transaction</>}
          </motion.button>
        ) : viewMode === 'customers' ? (
          <motion.button
            whileHover={isTouchUI ? undefined : { scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={openNewCustomerModal}
            style={{ touchAction: 'manipulation', position: 'relative', zIndex: 10 }}
            className="w-full bg-white hover:bg-slate-100 text-slate-800 py-3 rounded-2xl shadow-lg flex items-center justify-center text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </motion.button>
        ) : (
          <motion.button
            whileHover={isTouchUI ? undefined : { scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => { 
              if (showExpenseForm) { 
                setShowExpenseForm(false); 
                setExpenseAmount(''); 
                setExpenseCategory(''); 
                setExpenseDescription(''); 
                setExpensePayee(''); 
                setExpenseReceipt(''); 
                setEditingExpense(null);
                setExpenseDate(new Date().toISOString().split('T')[0]);
              } else { 
                setShowExpenseForm(true); 
              } 
            }}
            style={{ touchAction: 'manipulation', position: 'relative', zIndex: 10 }}
            className={`w-full py-3 rounded-2xl shadow-lg flex items-center justify-center text-sm font-bold transition-all ${showExpenseForm ? 'bg-slate-100 text-slate-600 shadow-none' : 'bg-purple-600 text-white shadow-purple-200'}`}
          >
            {showExpenseForm ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> Add Business Investment</>}
          </motion.button>
        )}
      </div>

      {viewMode === 'transactions' && (
        <div className="space-y-6">
          <AnimatePresence>
          {showTxForm && (
            <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} onSubmit={handleTxSubmit} className="bg-slate-800 p-6 rounded-3xl shadow-xl shadow-purple-900/30 border border-slate-700 space-y-5 relative overflow-hidden">
               <div className={`pointer-events-none absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${editingTx ? 'from-amber-400 to-orange-500' : 'from-teal-400 to-blue-500'}`}></div>
               <h3 className="text-sm font-bold text-slate-800">{editingTx ? 'Edit Transaction' : 'New Transaction'}</h3>
               <div className="bg-slate-100 p-1.5 rounded-2xl flex relative">
                 <motion.div className="pointer-events-none absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-purple-600 rounded-xl shadow-sm" animate={{ x: type === 'expense' ? '100%' : '0%' }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                 <button type="button" onClick={() => setType('income')} onPointerUp={() => setType('income')} style={{ touchAction: 'manipulation' }} className={`relative flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 ${type === 'income' ? 'text-teal-700' : 'text-slate-500'}`}>Income</button>
                 <button type="button" onClick={() => setType('expense')} onPointerUp={() => setType('expense')} style={{ touchAction: 'manipulation' }} className={`relative flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors z-10 ${type === 'expense' ? 'text-red-700' : 'text-slate-500'}`}>Expense</button>
               </div>
               <div className="space-y-4">
                  <div className="relative"><span className="absolute left-4 top-3.5 text-slate-400 font-medium">€</span><input type="number" value={amount} onChange={e => setAmount(e.target.value)} onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()} className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-teal-100 placeholder:text-slate-300 transition-all" placeholder="0.00" required /></div>
                  {editingTx && ( <div className="relative"><Calendar className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" /><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-base font-bold text-slate-700 focus:ring-2 focus:ring-teal-100 outline-none" /></div> )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="relative">
                       {type === 'income' && <label className="absolute -top-2 left-3 bg-slate-800 px-1 text-[10px] text-purple-400 font-bold z-10">Sales Channel</label>}
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
                          <label className="absolute -top-2 left-3 bg-slate-800 px-1 text-[10px] text-blue-400 font-bold z-10">Customer (Optional)</label>
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
                  <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-white text-slate-800 font-bold hover:bg-slate-100 shadow-lg transition-colors">{editingTx ? 'Update Record' : 'Save Transaction'}</button>
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
              <div className="bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-700 relative z-0">
                <h4 className="text-sm font-bold text-white mb-4">Cash Flow (Last 7 Days)</h4>
                <div ref={chartRef1} className="h-48 w-full" style={{ minHeight: 192, position: 'relative', pointerEvents: 'none' }}>
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
              <div className="bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-700 relative z-0">
                <h4 className="text-sm font-bold text-white mb-4">Expenses by Category</h4>
                <div ref={chartRef2} className="h-48 w-full" style={{ minHeight: 192, position: 'relative', pointerEvents: 'none' }}>
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
              <div className="bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-700">
                <div className="h-48 w-full rounded-2xl bg-slate-700 border border-slate-600 animate-pulse" />
              </div>
              <div className="bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-700">
                <div className="h-48 w-full rounded-2xl bg-slate-700 border border-slate-600 animate-pulse" />
              </div>
            </div>
          )}

          <div className="bg-slate-800 rounded-3xl shadow-sm border border-slate-700 overflow-hidden">
             <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-700/50">
                <h3 className="font-bold text-white">Recent Transactions</h3>
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
             </motion.div>
          </div>
        </div>
      )}

      {viewMode === 'customers' && (
         <>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.customers.map(cust => (
                 <motion.div key={cust.id} whileHover={{ scale: 1.01 }} className="bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-700 hover:shadow-md transition-all group relative">
                    <div className="absolute top-4 right-4 flex space-x-1"><button onClick={() => openEditCustomerModal(cust)} className="p-2 text-slate-400 hover:text-blue-400 bg-slate-700 rounded-lg active:bg-blue-900"><Edit2 className="w-4 h-4" /></button><button onClick={() => onDeleteCustomer(cust.id)} className="p-2 text-slate-400 hover:text-red-400 bg-slate-700 rounded-lg active:bg-red-900"><Trash2 className="w-4 h-4" /></button></div>
                    <div className="flex items-center space-x-3 mb-4"><div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-lg font-bold">{cust.name.charAt(0)}</div><div><h3 className="font-bold text-white">{cust.name}</h3><span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600">{cust.type}</span></div></div>
                    <div className="space-y-2 mb-4"><div className="flex items-center text-xs text-slate-400"><User className="w-3.5 h-3.5 mr-2" />{cust.contact}</div><div className="flex items-center text-xs text-slate-400"><Mail className="w-3.5 h-3.5 mr-2" />{cust.email}</div>{cust.notes && <div className="text-[10px] text-slate-300 italic mt-2 bg-slate-700 p-2 rounded-lg border border-slate-600">"{cust.notes}"</div>}</div>
                 </motion.div>
              ))}
              {state.customers.length === 0 && <div className="col-span-1 md:col-span-2 text-center py-12 text-slate-400 bg-slate-800 rounded-3xl border border-dashed border-slate-700"><Users className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>No customers added yet.</p></div>}
           </div>
           {orderManagerElement && <div className="mt-8">{orderManagerElement}</div>}
         </>
      )}

      <AnimatePresence>
      {showCustomerModal && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 max-h-[85vh] overflow-y-auto">
               <div className="flex justify-between items-center">
                   <h3 className="text-lg font-bold text-white">{editingCustomer.id ? 'Edit Customer' : 'Add New Customer'}</h3>
                   <button onClick={() => setShowCustomerModal(false)} className="p-3 bg-slate-700 rounded-full hover:bg-slate-600 active:bg-slate-500 transition-colors"><X className="w-5 h-5 text-slate-300" /></button>
               </div>
               <div className="space-y-3">
                  <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Name</label><input type="text" value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} className="w-full p-3 bg-slate-700 border border-slate-600 text-white rounded-xl text-base font-bold focus:ring-2 focus:ring-purple-500 outline-none" /></div>
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
                  <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Person</label><input type="text" value={editingCustomer.contact} onChange={e => setEditingCustomer({...editingCustomer, contact: e.target.value})} className="w-full p-3 bg-slate-700 border border-slate-600 text-white rounded-xl text-base font-medium focus:ring-2 focus:ring-purple-500 outline-none" /></div><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label><input type="email" value={editingCustomer.email} onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} className="w-full p-3 bg-slate-700 border border-slate-600 text-white rounded-xl text-base font-medium focus:ring-2 focus:ring-purple-500 outline-none" /></div></div>
                  <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</label><textarea value={editingCustomer.notes} onChange={e => setEditingCustomer({...editingCustomer, notes: e.target.value})} className="w-full p-3 bg-slate-700 border border-slate-600 text-white rounded-xl text-base font-medium focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20" /></div>
               </div>
               <div className="flex space-x-3 pt-2"><button onClick={() => setShowCustomerModal(false)} className="flex-1 py-3 bg-white border border-white text-slate-800 font-bold rounded-xl hover:bg-slate-100">Cancel</button><button onClick={handleSaveCustomer} className="flex-1 py-3 bg-white text-slate-800 font-bold rounded-xl shadow-lg hover:bg-slate-100">Save Customer</button></div>
            </motion.div>
         </motion.div>
      )}
      </AnimatePresence>

      {/* Business Expenses Tab */}
      {viewMode === 'expenses' && (
        <div className="space-y-6">
          {/* Expense Form */}
          <AnimatePresence>
            {showExpenseForm && (
              <motion.form 
                data-expense-form
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!expenseAmount || !expenseCategory) return;
                  
                  if (editingExpense) {
                    onUpdateTransaction({
                      ...editingExpense,
                      type: 'expense',
                      amount: parseFloat(expenseAmount),
                      category: expenseCategory,
                      description: expenseDescription,
                      payee: expensePayee,
                      date: new Date(expenseDate).toISOString(),
                      receiptImage: expenseReceipt,
                      isBusinessExpense: true
                    });
                    setEditingExpense(null);
                  } else {
                    onAddTransaction('expense', parseFloat(expenseAmount), expenseCategory, expenseDescription, undefined, expensePayee, expenseReceipt, true);
                  }
                  
                  // Keep viewMode on expenses tab and reset form
                  setViewMode('expenses');
                  setShowExpenseForm(false);
                  setExpenseAmount('');
                  setExpenseCategory('');
                  setExpenseDescription('');
                  setExpensePayee('');
                  setExpenseReceipt('');
                  setExpenseDate(new Date().toISOString().split('T')[0]);
                }}
                className="bg-slate-800 p-6 rounded-3xl shadow-xl shadow-purple-900/30 border border-slate-700 space-y-5 relative overflow-hidden"
              >
                <div className="pointer-events-none absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-pink-500"></div>
                <h3 className="text-sm font-bold text-white">{editingExpense ? 'Edit Business Investment' : 'New Business Investment'}</h3>
                <p className="text-xs text-slate-400 -mt-1 mb-2">Infrastructure, upgrades, and business setup costs (separate from production expenses)</p>
                
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-400 font-medium">€</span>
                    <input 
                      type="number" 
                      value={expenseAmount} 
                      onChange={e => setExpenseAmount(e.target.value)} 
                      onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.target.select()} 
                      className="w-full pl-8 pr-4 py-3.5 bg-slate-700 border-none rounded-2xl text-lg font-bold text-white focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 transition-all" 
                      placeholder="0.00" 
                      required 
                    />
                  </div>
                  
                  <div className="relative">
                    <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="date" 
                      value={expenseDate} 
                      onChange={e => setExpenseDate(e.target.value)} 
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-700 border-none rounded-2xl text-base font-bold text-white focus:ring-2 focus:ring-purple-500 outline-none" 
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <label className="absolute -top-2 left-3 bg-slate-800 px-1 text-[10px] text-purple-400 font-bold z-10">Category</label>
                      <CustomSelect 
                        value={expenseCategory} 
                        onChange={(val) => setExpenseCategory(val)} 
                        options={[
                          { value: "", label: 'Select Category...' },
                          { value: "Shed Upgrade", label: 'Shed Upgrade / Renovation' },
                          { value: "Land Rent", label: 'Land / Space Rent' },
                          { value: "Infrastructure", label: 'Infrastructure / Setup' },
                          { value: "Testing", label: 'Testing / R&D' },
                          { value: "Equipment", label: 'Equipment Purchase' },
                          { value: "Lights", label: 'Lights / Lighting System' },
                          { value: "Tools", label: 'Tools / Hardware' },
                          { value: "Other", label: 'Other Business Investment' }
                        ]}
                      />
                    </div>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={expensePayee} 
                        onChange={e => setExpensePayee(e.target.value)} 
                        placeholder="Vendor / Store Name" 
                        className="w-full p-3.5 bg-slate-700 border-none rounded-2xl text-base font-medium text-white focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 outline-none" 
                      />
                    </div>
                  </div>
                  
                  <input 
                    type="text" 
                    value={expenseDescription} 
                    onChange={e => setExpenseDescription(e.target.value)} 
                    className="w-full p-3.5 bg-slate-50 border-none rounded-2xl text-base font-medium text-slate-700 focus:ring-2 focus:ring-purple-100 placeholder:text-slate-300 outline-none" 
                    placeholder="Description (e.g. LED Grow Lights for Shelf 1)" 
                  />
                  
                  {/* Receipt Upload */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-purple-600 uppercase tracking-wider">Receipt / Document</label>
                    <div className="space-y-3">
                      {expenseReceipt ? (
                        <div className="relative">
                          <img 
                            src={expenseReceipt} 
                            alt="Receipt" 
                            className="w-full h-48 object-contain rounded-xl border-2 border-purple-200 bg-slate-50"
                          />
                          <button
                            type="button"
                            onClick={() => setExpenseReceipt('')}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer bg-purple-50 hover:bg-purple-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-2 text-purple-500" />
                              <p className="text-sm font-bold text-purple-600">Click to upload receipt</p>
                              <p className="text-xs text-purple-400 mt-1">or take a photo</p>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment"
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const compressed = await compressImage(file);
                                    setExpenseReceipt(compressed);
                                  } catch (error) {
                                    console.error('Failed to compress image:', error);
                                    // Fallback to uncompressed
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setExpenseReceipt(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }
                              }}
                            />
                          </label>
                          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex items-center justify-center pt-3 pb-3">
                              <ImageIcon className="w-5 h-5 mr-2 text-slate-500" />
                              <p className="text-sm font-bold text-slate-600">Choose from gallery</p>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const compressed = await compressImage(file);
                                    setExpenseReceipt(compressed);
                                  } catch (error) {
                                    console.error('Failed to compress image:', error);
                                    // Fallback to uncompressed
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setExpenseReceipt(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => { 
                      setShowExpenseForm(false); 
                      setExpenseAmount(''); 
                      setExpenseCategory(''); 
                      setExpenseDescription(''); 
                      setExpensePayee(''); 
                      setExpenseReceipt(''); 
                      setEditingExpense(null);
                      setExpenseDate(new Date().toISOString().split('T')[0]);
                    }} 
                    className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3.5 rounded-2xl bg-white text-slate-800 font-bold hover:bg-slate-100 shadow-lg transition-colors"
                  >
                    {editingExpense ? 'Update Investment' : 'Save Investment'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Summary Block */}
          <div className="space-y-4">
            {/* Main Summary Card */}
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 text-white p-6 rounded-3xl shadow-xl shadow-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-purple-200 text-xs font-bold uppercase tracking-wider mb-1">Total Business Investments</p>
                  <h3 className="text-3xl font-bold text-white tracking-tight">€{businessExpensesSummary.totalSpent.toFixed(2)}</h3>
                </div>
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-purple-200">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3">
                  <p className="text-purple-300 text-[10px] font-bold uppercase mb-1">This Period</p>
                  <p className="text-xl font-bold text-white">€{businessExpensesSummary.periodTotal.toFixed(2)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3">
                  <p className="text-purple-300 text-[10px] font-bold uppercase mb-1">Total Items</p>
                  <p className="text-xl font-bold text-white">{businessExpensesSummary.totalItems}</p>
                </div>
              </div>
              <p className="text-purple-300 text-[10px] italic mt-3">Infrastructure, upgrades, and setup costs (excluded from production finances)</p>
            </div>
            
            {/* Category Breakdown */}
            {businessExpensesSummary.categoryBreakdown.length > 0 && (
              <div className="bg-slate-800 rounded-3xl shadow-sm border border-slate-700 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-white flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2 text-purple-400" />
                    Category Breakdown
                  </h4>
                  <span className="text-xs text-slate-400">{timeRange === 'all' ? 'All Time' : timeRange === 'month' ? 'This Month' : timeRange === 'year' ? 'This Year' : 'Last Month'}</span>
                </div>
                <div className="space-y-3">
                  {businessExpensesSummary.categoryBreakdown.slice(0, 5).map((cat, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{cat.name}</span>
                        <span className="font-bold text-purple-600">€{cat.value.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Monthly Trend */}
            {businessExpensesSummary.monthlyTrend.length > 0 && (
              <div className="bg-slate-800 rounded-3xl shadow-sm border border-slate-700 p-5">
                <h4 className="font-bold text-white flex items-center mb-4">
                  <TrendingUp className="w-4 h-4 mr-2 text-purple-400" />
                  Last 6 Months
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {businessExpensesSummary.monthlyTrend.map((month, idx) => (
                    <div key={idx} className="text-center">
                      <p className="text-[10px] text-slate-500 mb-1">{month.month}</p>
                      <p className="text-sm font-bold text-purple-600">€{month.amount.toFixed(0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Business Expenses List */}
          <div className="bg-slate-800 rounded-3xl shadow-sm border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-700/50 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center">
                  <Receipt className="w-4 h-4 mr-2 text-purple-400" />
                  Business Investments
                </h3>
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
              </div>
              
              {/* Search and Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={expenseSearchQuery}
                    onChange={(e) => setExpenseSearchQuery(e.target.value)}
                    placeholder="Search investments..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <CustomSelect
                    value={expenseCategoryFilter}
                    onChange={(val) => setExpenseCategoryFilter(val)}
                    options={[
                      { value: "all", label: "All Categories" },
                      { value: "Shed Upgrade", label: "Shed Upgrade" },
                      { value: "Land Rent", label: "Land Rent" },
                      { value: "Infrastructure", label: "Infrastructure" },
                      { value: "Testing", label: "Testing" },
                      { value: "Equipment", label: "Equipment" },
                      { value: "Lights", label: "Lights" },
                      { value: "Tools", label: "Tools" },
                      { value: "Other", label: "Other" }
                    ]}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-slate-50">
              {(() => {
                let businessExpenses = [...businessExpensesByTimeRange];
                
                // Apply category filter
                if (expenseCategoryFilter !== 'all') {
                  businessExpenses = businessExpenses.filter(t => t.category === expenseCategoryFilter);
                }
                
                // Apply search filter
                if (expenseSearchQuery.trim()) {
                  const query = expenseSearchQuery.toLowerCase();
                  businessExpenses = businessExpenses.filter(t => 
                    (t.description || '').toLowerCase().includes(query) ||
                    (t.category || '').toLowerCase().includes(query) ||
                    (t.payee || '').toLowerCase().includes(query) ||
                    t.amount.toString().includes(query)
                  );
                }
                
                businessExpenses = businessExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                if (businessExpenses.length === 0) {
                  return null;
                }
                
                return businessExpenses.map(expense => (
                  <motion.div 
                    key={expense.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-start gap-3 sm:gap-4 overflow-hidden">
                      {/* Receipt Thumbnail */}
                      {expense.receiptImage ? (
                        <div className="flex-shrink-0">
                          <img 
                            src={expense.receiptImage} 
                            alt="Receipt" 
                            className="w-20 h-20 object-cover rounded-xl border-2 border-purple-200 cursor-pointer hover:border-purple-400 transition-colors"
                            onClick={() => {
                              // Open full size image in modal
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4';
                              modal.onclick = (e) => {
                                if (e.target === modal) modal.remove();
                              };
                              
                              const container = document.createElement('div');
                              container.className = 'relative max-w-full max-h-full';
                              
                              const img = document.createElement('img');
                              img.src = expense.receiptImage!;
                              img.className = 'max-w-full max-h-full object-contain rounded-xl';
                              
                              const closeBtn = document.createElement('button');
                              closeBtn.className = 'absolute -top-10 right-0 p-2 bg-white text-black rounded-full hover:bg-slate-200 transition-colors font-bold text-xl w-10 h-10 flex items-center justify-center';
                              closeBtn.textContent = '×';
                              closeBtn.onclick = (e) => {
                                e.stopPropagation();
                                modal.remove();
                              };
                              
                              container.appendChild(img);
                              container.appendChild(closeBtn);
                              modal.appendChild(container);
                              document.body.appendChild(modal);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                          <Receipt className="w-8 h-8 text-slate-300" />
                        </div>
                      )}
                      
                      {/* Expense Details */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-800 text-sm break-words">{expense.description || expense.category}</h4>
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                                {expense.category}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              <span className="whitespace-nowrap">{new Date(expense.date).toLocaleDateString()}</span>
                              {expense.payee && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[150px]">{expense.payee}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-base sm:text-lg font-bold text-purple-600 whitespace-nowrap">€{expense.amount.toFixed(2)}</span>
                            <div className={`flex space-x-1 ${isTouchUI ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingExpense(expense);
                                  setExpenseAmount(expense.amount.toString());
                                  setExpenseCategory(expense.category);
                                  setExpenseDescription(expense.description);
                                  setExpensePayee(expense.payee || '');
                                  setExpenseReceipt(expense.receiptImage || '');
                                  setExpenseDate(new Date(expense.date).toISOString().split('T')[0]);
                                  setShowExpenseForm(true);
                                  // Scroll to form
                                  setTimeout(() => {
                                    const form = document.querySelector('[data-expense-form]');
                                    form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 100);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-500 bg-slate-50 rounded-lg active:bg-blue-50 flex-shrink-0 transition-colors"
                                title="Edit investment"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this investment?')) {
                                    onDeleteTransaction(expense.id);
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg active:bg-red-50 flex-shrink-0 transition-colors"
                                title="Delete investment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MemoizedFinanceTracker = React.memo(FinanceTracker);
MemoizedFinanceTracker.displayName = 'FinanceTracker';

export default MemoizedFinanceTracker;
