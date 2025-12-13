
import React, { useEffect, useRef } from 'react';
import { View } from '../types';
import { Leaf, Sprout, Euro, Sparkles, Database, Calculator, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  alertCount?: number;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, onLogout, alertCount = 0 }) => {
  const mainRef = useRef<HTMLElement | null>(null);

  // Ensure view changes don't preserve an old scroll offset (common after using Crops).
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [currentView]);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Leaf },
    { id: 'crops', label: 'My Crops', icon: Sprout },
    { id: 'calculator', label: 'Profit', icon: Calculator },
    { id: 'finance', label: 'Finance', icon: Euro },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'ai', label: 'Assistant', icon: Sparkles },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 selection:bg-teal-200 selection:text-teal-900">
      {/* Header */}
      <header className="sticky top-0 z-40 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-4xl mx-auto flex justify-between items-center relative">
            {/* Absolute Centered Title */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none">
                <h1 className="text-xl font-bold tracking-tight text-slate-800">Galway Sun Sprouts</h1>
            </div>

            {/* Spacer to balance flex if needed, or just leave empty since we use absolute positioning for title */}
            <div></div>

            {/* Logout Button */}
            <button 
               onClick={onLogout}
               className="relative z-10 p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
               title="Sign Out / Back to Website"
            >
               <LogOut className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Main Content with Transition */}
      <main ref={mainRef} className="flex-1 overflow-y-auto pb-32 overflow-x-hidden">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          {/* Avoid mode="wait" deadlocks that can leave the UI blank on mobile */}
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 2, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -2, scale: 0.995 }}
              transition={{ duration: 0.08, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation - Modern Animated Dock */}
      <nav className="fixed bottom-6 left-6 right-6 z-50">
        <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl shadow-slate-900/50 p-2 flex justify-between items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as View)}
                className="relative flex items-center justify-center outline-none focus:outline-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Active Pill Background */}
                {isActive && (
                   <motion.div 
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-teal-500 rounded-full shadow-[0_0_15px_rgba(20,184,166,0.4)]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                   />
                )}
                
                <div className={`relative z-10 flex items-center px-3 py-2.5 transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                    <Icon 
                      className="w-5 h-5" 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    
                    {/* Animated Label */}
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.span 
                            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                            animate={{ width: 'auto', opacity: 1, marginLeft: 8 }}
                            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="text-xs font-bold whitespace-nowrap overflow-hidden"
                        >
                            {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                </div>

                {/* Alert Badge */}
                {!isActive && alertCount > 0 && (item.id === 'dashboard' || item.id === 'crops') && (
                   <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-slate-900"></span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
