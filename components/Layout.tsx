
import React from 'react';
import { View } from '../types';
import { Leaf, Sprout, Euro, Sparkles, Database, Calculator, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, onLogout }) => {
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
      <main className="flex-1 overflow-y-auto pb-32 overflow-x-hidden">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
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

      {/* Bottom Navigation - Docked */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-white/10 pb-safe">
        <div className="max-w-md mx-auto flex justify-between items-center px-4 py-2 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as View)}
                className={`relative flex flex-col items-center justify-center w-14 h-14 min-w-[3.5rem] transition-all duration-150 group ${
                  isActive ? 'text-white' : 'hover:text-slate-200 text-slate-500'
                }`}
              >
                {isActive && (
                   <motion.span 
                      layoutId="nav-pill"
                      className="absolute -top-2 w-10 h-1 bg-teal-500 rounded-b-full shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                      transition={{ type: "spring", stiffness: 600, damping: 30 }}
                   />
                )}
                <Icon 
                  className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                <span className={`text-[9px] font-medium mt-1 transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
