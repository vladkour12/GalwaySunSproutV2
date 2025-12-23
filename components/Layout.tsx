
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, AppState, Stage, Tray, CropType } from '../types';
import { Leaf, Sprout, Euro, Database, Calculator, LogOut, Bell, X, Clock, AlertCircle, Moon, Sun, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { getFarmAlerts } from '../services/alertService';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  alertCount?: number;
  appState?: AppState;
}

// Helper to get stage duration in hours
const getStageDurationHours = (stage: Stage, crop: CropType): number => {
  switch (stage) {
    case Stage.SEED: return 0;
    case Stage.SOAK: return crop.soakHours;
    case Stage.GERMINATION: return crop.germinationDays * 24;
    case Stage.BLACKOUT: return crop.blackoutDays * 24;
    case Stage.LIGHT: return crop.lightDays * 24;
    default: return 0;
  }
};

// Helper to get time to next stage
const getTimeToNextStage = (tray: Tray, crop: CropType) => {
  const start = new Date(tray.startDate).getTime();
  const durationHours = getStageDurationHours(tray.stage, crop);
  
  if (tray.stage === Stage.HARVEST_READY) return { hours: 0, text: "Harvest Now", isOverdue: false };

  const targetTime = start + (durationHours * 60 * 60 * 1000);
  const now = new Date().getTime();
  const diff = targetTime - now;

  if (diff < 0) return { hours: 0, text: "Overdue", isOverdue: true };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  let text = '';
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    text = `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m`;
  } else {
    text = `${minutes}m`;
  }
  
  return { hours, text, isOverdue: false };
};

const LayoutComponent: React.FC<LayoutProps> = ({ children, currentView, onNavigate, onLogout, alertCount = 0, appState }) => {
  const mainRef = useRef<HTMLElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [bottomPadPx, setBottomPadPx] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every minute for live timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    setCurrentTime(new Date());
    return () => clearInterval(interval);
  }, []);
  
  // Calculate upcoming notifications
  const upcomingNotifications = useMemo(() => {
    if (!appState) return [];
    
    const upcoming: Array<{ tray: Tray; crop: CropType; crop2?: CropType; timeInfo: { hours: number; text: string; isOverdue: boolean }; action: string; icon: any }> = [];
    const activeTrays = appState.trays.filter(t => t.stage !== Stage.HARVESTED && t.stage !== Stage.COMPOST && t.stage !== Stage.MAINTENANCE);
    
    activeTrays.forEach(tray => {
      const crop = appState.crops.find(c => c.id === tray.cropTypeId);
      const crop2 = tray.cropTypeId2 ? appState.crops.find(c => c.id === tray.cropTypeId2) : null;
      if (!crop) return;
      
      const timeInfo = getTimeToNextStage(tray, crop);
      
      // Only show tasks coming up within 24 hours
      if (timeInfo.hours > 0 && timeInfo.hours <= 24 && !timeInfo.isOverdue) {
        let action = '';
        let icon = Clock;
        
        if (tray.stage === Stage.SOAK) {
          action = `Move ${crop2 ? `${crop.name} + ${crop2.name}` : crop.name} to Germination`;
          icon = Droplet;
        } else if (tray.stage === Stage.GERMINATION) {
          action = `Blackout ${crop2 ? `${crop.name} + ${crop2.name}` : crop.name}`;
          icon = Moon;
        } else if (tray.stage === Stage.BLACKOUT) {
          action = `Uncover ${crop2 ? `${crop.name} + ${crop2.name}` : crop.name}`;
          icon = Sun;
        } else if (tray.stage === Stage.LIGHT) {
          action = `Harvest ${crop2 ? `${crop.name} + ${crop2.name}` : crop.name}`;
          icon = CheckCircle;
        }
        
        if (action) {
          upcoming.push({ tray, crop, crop2, timeInfo, action, icon });
        }
      }
    });
    
    // Sort by time (soonest first)
    return upcoming.sort((a, b) => a.timeInfo.hours - b.timeInfo.hours);
  }, [appState, currentTime]);
  
  // Get current alerts
  const currentAlerts = useMemo(() => {
    if (!appState) return [];
    return getFarmAlerts(appState);
  }, [appState]);

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
    <div className="min-h-screen flex flex-col font-sans text-slate-900 selection:bg-teal-200 selection:text-teal-900 relative" style={{ minHeight: '100vh' }}>
      {/* Logo Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img 
          src="/logo.png" 
          alt="Galway Sun Sprouts Logo" 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] opacity-[0.4] object-contain"
          style={{ maxWidth: '95vw', maxHeight: '95vh' }}
        />
      </div>
      
      {/* Header - Enhanced */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 px-6 py-4 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 supports-[backdrop-filter]:bg-white/80 shadow-sm"
      >
        <div className="max-w-4xl mx-auto flex justify-between items-center">
            {/* Spacer for balance */}
            <div className="w-10"></div>
            
            {/* Business Name - Centered */}
            <motion.div 
              className="flex-1 text-center"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Galway Sun Sprouts
                </h1>
            </motion.div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Notification Button */}
              <motion.button 
                 onClick={() => setShowNotifications(true)}
                 className="relative w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-all duration-200 active:scale-95 flex items-center justify-center"
                 title={alertCount > 0 ? `${alertCount} notifications` : 'Notifications'}
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
              >
                 <Bell className="w-4 h-4" />
                 {alertCount > 0 && (
                   <motion.span 
                     className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white"
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ type: "spring", stiffness: 500, damping: 15 }}
                   >
                     {alertCount > 9 ? '9+' : alertCount}
                   </motion.span>
                 )}
              </motion.button>

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
        </div>
      </motion.header>

      {/* Main Content with Transition */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative z-10"
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
          className="max-w-3xl mx-auto bg-gradient-to-br from-slate-900/99 via-slate-800/99 to-slate-900/99 backdrop-blur-3xl border border-white/20 rounded-full shadow-2xl shadow-slate-950/90 px-2 py-3 flex justify-center items-center gap-1"
          whileHover={{ scale: 1.01, boxShadow: "0 0 40px rgba(0,0,0,0.6)" }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Divider line effect background */}
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </div>

          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <motion.div
                key={item.id}
                className="relative flex-1 max-w-xs"
              >
                {/* Divider between items */}
                {index > 0 && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none"></div>
                )}

                <motion.button
                  onClick={() => handleNavigate(item.id as View)}
                  className="relative w-full flex items-center justify-center outline-none focus:outline-none py-2.5 px-3 group"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  title={item.label}
                >
                  {/* Active Pill Background with Enhanced Gradient and Glow */}
                  {isActive && (
                    <>
                      <motion.div 
                        layoutId="nav-pill"
                        className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-2xl shadow-2xl`}
                        style={{
                          boxShadow: `0 0 30px rgba(${item.color.includes('emerald') ? '16,185,129' : item.color.includes('green') ? '34,197,94' : item.color.includes('blue') ? '59,130,246' : item.color.includes('amber') ? '217,119,6' : '147,51,234'}, 0.4), 0 0 60px rgba(${item.color.includes('emerald') ? '16,185,129' : item.color.includes('green') ? '34,197,94' : item.color.includes('blue') ? '59,130,246' : item.color.includes('amber') ? '217,119,6' : '147,51,234'}, 0.1)`
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        initial={false}
                      />
                      <motion.div 
                        className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-2xl opacity-20 blur-lg`}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        initial={false}
                      />
                    </>
                  )}
                  
                  {/* Hover background glow for inactive items */}
                  {!isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      initial={false}
                    />
                  )}
                  
                  <motion.div 
                    className={`relative z-10 flex items-center gap-2 px-1 transition-all duration-200 rounded-2xl`}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                  >
                    <motion.div
                      animate={{
                        y: isActive ? -2 : 0,
                        scale: isActive ? 1.2 : 1,
                        filter: isActive ? 'drop-shadow(0 0 8px currentColor)' : 'drop-shadow(0 0 0px)',
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon 
                        className={`w-5.5 h-5.5 transition-all duration-200 ${
                          isActive 
                            ? 'text-white drop-shadow-lg' 
                            : 'text-slate-400 group-hover:text-white'
                        }`}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    </motion.div>
                    
                    {/* Animated Label with improved styling */}
                    <AnimatePresence initial={false} mode="popLayout">
                      {isActive && (
                        <motion.span 
                          initial={{ width: 0, opacity: 0, marginRight: -4 }}
                          animate={{ width: 'auto', opacity: 1, marginRight: 0 }}
                          exit={{ width: 0, opacity: 0, marginRight: -4 }}
                          transition={{ 
                            duration: 0.4, 
                            ease: [0.34, 1.56, 0.64, 1],
                            opacity: { duration: 0.25 }
                          }}
                          className="text-xs font-bold whitespace-nowrap overflow-hidden text-white drop-shadow-lg tracking-wide"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Ripple effect on click */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-white/30"
                      initial={{ opacity: 1, scale: 0.8 }}
                      animate={{ opacity: 0, scale: 1.2 }}
                      transition={{ duration: 0.5 }}
                      key={`ripple-${item.id}`}
                    />
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.nav>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 10 }} 
              className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Notifications</h3>
                  <p className="text-sm text-slate-500 mt-1">Current alerts and upcoming tasks</p>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)} 
                  className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 active:bg-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Alerts */}
              {currentAlerts.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                    Action Needed
                  </h4>
                  <div className="space-y-2">
                    {currentAlerts.map((alert) => (
                      <div 
                        key={alert.id}
                        onClick={() => {
                          setShowNotifications(false);
                          // Store intent to show calendar tab
                          localStorage.setItem('galway_show_calendar', 'true');
                          onNavigate('crops');
                        }}
                        className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
                          alert.type === 'urgent' ? 'bg-red-50 border-red-100' :
                          alert.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                          'bg-blue-50 border-blue-100'
                        }`}
                      >
                        <p className="font-bold text-slate-800 text-sm">{alert.title}</p>
                        <p className="text-xs text-slate-600 mt-1">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Notifications */}
              {upcomingNotifications.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    Coming Soon
                  </h4>
                  <div className="space-y-2">
                    {upcomingNotifications.map((notif, idx) => {
                      const Icon = notif.icon;
                      return (
                        <div 
                          key={`${notif.tray.id}-${idx}`}
                          onClick={() => {
                            setShowNotifications(false);
                            // Store intent to show calendar tab
                            localStorage.setItem('galway_show_calendar', 'true');
                            onNavigate('crops');
                          }}
                          className="p-4 rounded-xl border bg-blue-50 border-blue-100 flex items-start justify-between cursor-pointer hover:shadow-md transition-all"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-4 h-4 text-blue-600" />
                              <p className="font-bold text-slate-800 text-sm">{notif.action}</p>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{notif.tray.location}</p>
                          </div>
                          <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded-full border border-blue-200 ml-2 whitespace-nowrap">
                            {notif.timeInfo.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {currentAlerts.length === 0 && upcomingNotifications.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-bold text-sm mb-1">No notifications</p>
                  <p className="text-slate-400 text-xs">All tasks are on schedule</p>
                </div>
              )}

              {/* Footer Action */}
              {(currentAlerts.length > 0 || upcomingNotifications.length > 0) && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      // Store intent to show calendar tab
                      localStorage.setItem('galway_show_calendar', 'true');
                      onNavigate('crops');
                    }}
                    className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors"
                  >
                    View All in Calendar
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Layout = React.memo(LayoutComponent);
Layout.displayName = 'Layout';

export default Layout;
