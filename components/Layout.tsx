
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, AppState, Stage, Tray, CropType } from '../types';
import { Leaf, Home, TrendingUp, CreditCard, BarChart3, LogOut, Bell, X, Clock, AlertCircle, Moon, Sun, CheckCircle } from 'lucide-react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  
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
    // Close menu when navigating
    setIsMenuOpen(false);
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

  // Handle clicking outside menu to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menu = dockRef.current;
      if (menu && !menu.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Make bottom padding match the fixed dock height (prevents excessive blank scroll space).
  useEffect(() => {
    const dockEl = dockRef.current;
    if (!dockEl) return;

    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

    const measure = () => {
      const rect = dockEl.getBoundingClientRect();
      const viewportH = window.innerHeight || 0;
      
      // Calculate actual space needed: distance from bottom of viewport to top of dock
      // Use spaceFromBottom as the authoritative measurement since nav is fixed
      const spaceFromBottom = viewportH - rect.top;
      
      // Always use full space from bottom to ensure no overlap
      const padding = Math.ceil(spaceFromBottom + 16);
      
      // Set padding with large minimum to prevent any overlap - ensure everything stays above nav
      setBottomPadPx(Math.max(padding, 120));
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
    { id: 'dashboard', label: 'Overview', icon: Home, color: 'from-emerald-500 to-teal-500' },
    { id: 'crops', label: 'My Crops', icon: Leaf, color: 'from-green-500 to-emerald-500' },
    { id: 'calculator', label: 'Profit', icon: TrendingUp, color: 'from-blue-500 to-cyan-500' },
    { id: 'finance', label: 'Finance', icon: CreditCard, color: 'from-amber-500 to-orange-500' },
    { id: 'data', label: 'Data', icon: BarChart3, color: 'from-purple-500 to-pink-500' },
  ] as const, []);

  return (
    <div className="min-h-screen flex flex-col font-sans text-white selection:bg-accent-teal selection:text-dark-bg relative bg-dark-bg" style={{ minHeight: '100vh' }}>
      {/* Logo Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-dark-bg">
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
        className="sticky top-0 z-40 px-6 py-4 bg-dark-bg-secondary/95 backdrop-blur-xl border-b border-dark-bg-tertiary/60 supports-[backdrop-filter]:bg-dark-bg-secondary/80 shadow-sm"
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
                 className="relative w-10 h-10 rounded-lg bg-dark-bg-tertiary hover:bg-accent-teal/20 text-accent-teal hover:text-accent-teal transition-all duration-200 active:scale-95 flex items-center justify-center"
                 title={alertCount > 0 ? `${alertCount} notifications` : 'Notifications'}
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
              >
                 <Bell className="w-4 h-4" />
                 {alertCount > 0 && (
                   <motion.span 
                     className="absolute -top-1 -right-1 w-5 h-5 bg-accent-coral text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-dark-bg-secondary"
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
        className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 min-h-0"
        style={{ 
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
        <div className="max-w-4xl mx-auto p-4 sm:p-6 w-full">
          {/* Enhanced page transitions */}
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              style={{ position: 'relative', zIndex: 1 }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Hamburger Menu - Top Left Corner */}
      <motion.nav 
        ref={dockRef}
        className="fixed top-5 left-6 z-50"
      >
        {/* Hamburger Button */}
        <motion.button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="relative w-10 h-10 rounded-lg bg-dark-bg-tertiary hover:bg-accent-teal/20 text-accent-teal hover:text-accent-teal transition-all duration-200 active:scale-95 flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: isMenuOpen ? 90 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </motion.div>
        </motion.button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed top-5 left-16 h-10 bg-dark-bg-secondary/95 backdrop-blur-lg border border-dark-bg-tertiary rounded-lg shadow-2xl overflow-hidden z-50 flex items-center"
            >
              {/* Navigation Items */}
              <div className="flex items-center h-full">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => handleNavigate(item.id as View)}
                      className={`px-2 py-1 flex items-center justify-center transition-all duration-200 h-full ${
                        isActive
                          ? 'bg-accent-teal/20 text-accent-teal'
                          : 'text-slate-500 hover:bg-dark-bg-tertiary hover:text-accent-teal'
                      }`}
                      title={item.label}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-dark-bg-tertiary mx-1"></div>

              {/* Logout Button */}
              <motion.button
                onClick={onLogout}
                className="px-2 py-1 flex items-center justify-center text-accent-coral hover:bg-accent-coral/20 transition-all duration-200 h-full"
                title="Sign Out"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 10 }} 
              className="bg-dark-bg-secondary w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Notifications</h3>
                  <p className="text-sm text-slate-400 mt-1">Current alerts and upcoming tasks</p>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)} 
                  className="p-3 bg-dark-bg-tertiary rounded-full hover:bg-dark-bg-tertiary/80 active:bg-dark-bg-tertiary/60 transition-colors text-white"
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
