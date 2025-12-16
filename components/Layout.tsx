
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View } from '../types';
import { Leaf, Sprout, Euro, Database, Calculator, LogOut } from 'lucide-react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  alertCount?: number;
}

const LayoutComponent: React.FC<LayoutProps> = ({ children, currentView, onNavigate, onLogout, alertCount = 0 }) => {
  const mainRef = useRef<HTMLElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [bottomPadPx, setBottomPadPx] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  // Haptic feedback for navigation (if supported)
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration for navigation
    }
  }, []);

  // Optimized navigation handler
  const handleNavigate = useCallback((view: View) => {
    if (view === currentView || isNavigating) return;
    triggerHaptic();
    setIsNavigating(true);
    onNavigate(view);
    // Reset navigation state after animation
    setTimeout(() => setIsNavigating(false), 200);
  }, [currentView, onNavigate, isNavigating, triggerHaptic]);

  // Ensure view changes don't preserve an old scroll offset (common after using Crops).
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    // Reset scroll immediately
    el.scrollTop = 0;
    // Force a layout recalculation after a brief delay to clear any lingering height issues
    const id = window.setTimeout(() => {
    el.scrollTop = 0;
      // Force reflow to ensure layout is clean and reset any cached heights
      void el.offsetHeight;
      // Also trigger a resize event to ensure any listeners recalculate
      window.dispatchEvent(new Event('resize'));
    }, 100);
    return () => window.clearTimeout(id);
  }, [currentView]);

  // Make bottom padding match the fixed dock height (prevents excessive blank scroll space).
  useEffect(() => {
    const dockEl = dockRef.current;
    if (!dockEl) return;

    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

    const measure = () => {
      const rect = dockEl.getBoundingClientRect();
      const viewportH = window.innerHeight || 0;
      const viewportW = window.innerWidth || 0;
      
      // Calculate actual space needed: distance from bottom of viewport to top of dock
      const dockBottomMargin = 24; // bottom-6 = 24px
      const dockHeight = rect.height || 56;
      const spaceFromBottom = viewportH - rect.top;
      
      // On large screens (desktop), use minimal padding to prevent excessive empty space
      // On smaller screens (mobile/tablet), use more padding for comfortable scrolling
      const isLargeScreen = viewportW >= 1024; // lg breakpoint
      const basePadding = isLargeScreen 
        ? Math.ceil(dockHeight + dockBottomMargin + 8)  // Minimal padding on desktop
        : Math.ceil(spaceFromBottom + 12);  // Full space on mobile
      
      // Conservative clamp: tighter limits prevent huge empty spaces
      setBottomPadPx(clamp(basePadding, 56, isLargeScreen ? 96 : 128));
    };

    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(dockEl);
    window.addEventListener('resize', measure);

    // Re-measure after view changes to fix bottom padding (especially after navigating from crop page)
    const settleId = window.setTimeout(measure, 100);
    const settleId2 = window.setTimeout(measure, 300);

    return () => {
      window.clearTimeout(settleId);
      window.clearTimeout(settleId2);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [currentView]); // Recalculate when view changes to fix bottom spacing issues

  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Overview', icon: Leaf, color: 'from-emerald-500 to-teal-500' },
    { id: 'crops', label: 'My Crops', icon: Sprout, color: 'from-green-500 to-emerald-500' },
    { id: 'calculator', label: 'Profit', icon: Calculator, color: 'from-blue-500 to-cyan-500' },
    { id: 'finance', label: 'Finance', icon: Euro, color: 'from-amber-500 to-orange-500' },
    { id: 'data', label: 'Data', icon: Database, color: 'from-purple-500 to-pink-500' },
  ] as const, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 selection:bg-teal-200 selection:text-teal-900" style={{ minHeight: '100vh' }}>
      {/* Header - Enhanced */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 px-6 py-4 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 supports-[backdrop-filter]:bg-white/80 shadow-sm"
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center">
            {/* Business Name - Moved to Left */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Galway Sun Sprouts
                </h1>
            </motion.div>

            {/* Logout Button */}
            <motion.button 
               onClick={onLogout}
               className="p-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 active:scale-95"
               title="Sign Out / Back to Website"
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
            >
               <LogOut className="w-5 h-5" />
            </motion.button>
        </div>
      </motion.header>

      {/* Main Content with Transition */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ 
          paddingBottom: `calc(${bottomPadPx}px + env(safe-area-inset-bottom))`,
          minHeight: 0, // Prevent flex item from growing beyond content on large screens
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          overscrollBehavior: 'contain', // Prevent scroll chaining to body
          overscrollBehaviorY: 'contain' // Prevent pull-to-refresh
        }}
        onTouchStart={(e) => {
          // Store initial touch position for scroll detection
          const el = e.currentTarget;
          (el as any).__touchStartY = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          // Prevent scroll chaining when at boundaries
          const el = e.currentTarget;
          const { scrollTop, scrollHeight, clientHeight } = el;
          const touchStartY = (el as any).__touchStartY;
          const currentY = e.touches[0].clientY;
          const deltaY = currentY - touchStartY;
          
          // If at top and trying to scroll up, or at bottom and trying to scroll down
          const isAtTop = scrollTop <= 0;
          const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
          
          if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
            // Prevent scroll chaining to document body
            e.stopPropagation();
          }
        }}
      >
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          {/* Enhanced page transitions */}
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ 
                duration: 0.2, 
                ease: [0.4, 0, 0.2, 1],
                opacity: { duration: 0.15 }
              }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation - Enhanced Modern Dock */}
      <motion.nav 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100, damping: 20 }}
        className="fixed bottom-6 left-6 right-6 z-50"
      >
        <motion.div
          ref={dockRef}
          className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-[2rem] shadow-2xl shadow-slate-900/60 p-2.5 flex justify-between items-center"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => handleNavigate(item.id as View)}
                className="relative flex items-center justify-center outline-none focus:outline-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {/* Active Pill Background with Gradient */}
                {isActive && (
                   <motion.div 
                      layoutId="nav-pill"
                      className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-full shadow-lg shadow-teal-500/30`}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      initial={false}
                   />
                )}
                
                <motion.div 
                  className={`relative z-10 flex items-center px-3.5 py-2.5 transition-all duration-200 ${
                    isActive 
                      ? 'text-white' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                  }}
                >
                    <Icon 
                      className="w-5 h-5" 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    
                    {/* Animated Label with better animation */}
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.span 
                            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                            animate={{ width: 'auto', opacity: 1, marginLeft: 10 }}
                            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                            transition={{ 
                              duration: 0.25, 
                              ease: [0.4, 0, 0.2, 1],
                              opacity: { duration: 0.15 }
                            }}
                            className="text-xs font-bold whitespace-nowrap overflow-hidden"
                        >
                            {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                </motion.div>

                {/* Enhanced Alert Badge */}
                {!isActive && alertCount > 0 && (item.id === 'dashboard' || item.id === 'crops') && (
                   <motion.span 
                     className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 shadow-lg shadow-red-500/50"
                     animate={{ scale: [1, 1.2, 1] }}
                     transition={{ repeat: Infinity, duration: 2 }}
                   />
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </motion.nav>
    </div>
  );
};

const Layout = React.memo(LayoutComponent);
Layout.displayName = 'Layout';

export default Layout;
