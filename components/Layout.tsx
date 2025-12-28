
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
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hasOverlay, setHasOverlay] = useState(false);
  
  // Update time every minute for live timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    setCurrentTime(new Date());
    return () => clearInterval(interval);
  }, []);

  // Detect global overlays (modals, dialogs) and hide dock when present
  useEffect(() => {
    const selectors = '[data-overlay-active],[data-modal],[data-dialog],[role="dialog"],.modal,.drawer,.fixed.inset-0';
    const check = () => setHasOverlay(showNotifications || Boolean(document.querySelector(selectors)));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const interval = window.setInterval(check, 400);
    window.addEventListener('keyup', check);
    window.addEventListener('click', check, true);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.removeEventListener('keyup', check);
      window.removeEventListener('click', check, true);
    };
  }, [showNotifications]);
  
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
    { id: 'dashboard', label: 'Overview', icon: Home, color: 'bg-[var(--mint)]/20 text-[var(--mint)]' },
    { id: 'crops', label: 'My Crops', icon: Leaf, color: 'bg-[var(--lavender)]/20 text-[var(--lavender)]' },
    { id: 'calculator', label: 'Profit', icon: TrendingUp, color: 'bg-[var(--aqua)]/20 text-[var(--aqua)]' },
    { id: 'finance', label: 'Finance', icon: CreditCard, color: 'bg-[var(--peach)]/20 text-[var(--peach)]' },
    { id: 'data', label: 'Data', icon: BarChart3, color: 'bg-[var(--text-subtle)]/20 text-[var(--text-subtle)]' },
  ] as const, []);

  return (
    <div
      className="min-h-screen flex flex-col font-sans text-white selection:bg-[var(--mint)] selection:text-[var(--ultra-bg)] relative"
      style={{ minHeight: '100vh', paddingBottom: `max(${bottomPadPx}px, calc(env(safe-area-inset-bottom, 0px) + 120px))` }}
    >
      {/* Header - Enhanced Ultra Dark Glass */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-40 px-6 py-4 glass-card border-b supports-[backdrop-filter]:bg-[rgba(5,6,8,0.8)] shadow-sm"
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
                <h1 className="text-lg font-bold tracking-tight text-[var(--text-strong)]">
                  Galway Sun Sprouts
                </h1>
            </motion.div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Notification Button */}
                <motion.button 
                  onClick={() => setShowNotifications(true)}
                  className="relative w-10 h-10 rounded-xl bg-[var(--mint)]/20 hover:bg-[var(--mint)]/30 text-[var(--mint)] transition-all duration-200 active:scale-95 flex items-center justify-center"
                 title={alertCount > 0 ? `${alertCount} notifications` : 'Notifications'}
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
              >
                 <Bell className="w-4 h-4" />
                 {alertCount > 0 && (
                   <motion.span 
                     className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/80 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--ultra-bg)]"
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
                  className="p-2 rounded-xl text-[var(--text-subtle)] hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 active:scale-95"
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

      {/* Bottom Navigation - pill dock */}
      <motion.nav 
        ref={dockRef}
        className="fixed bottom-5 inset-x-0 z-50 flex justify-center"
        animate={{ opacity: hasOverlay ? 0 : 1, y: hasOverlay ? 12 : 0 }}
        style={{ pointerEvents: hasOverlay ? 'none' : 'auto' }}
      >
        <div
          className="relative w-full px-2 sm:px-3"
          style={{ maxWidth: '760px' }}
        >
          <div className="absolute inset-0 rounded-[18px] bg-gradient-to-r from-[#1f2a3d] via-[#1a1f2a] to-[#1f2a3d] opacity-70 blur-md pointer-events-none" />
          <div className="relative bg-[rgba(12,13,18,0.88)] border border-[rgba(255,255,255,0.05)] rounded-[18px] px-1.5 py-1.5 backdrop-blur-xl shadow-[0_12px_26px_rgba(0,0,0,0.3)]">
            <div className="flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNavigate(item.id as View)}
                    className={`relative flex-1 min-w-[48px] rounded-lg py-1.5 px-1 flex flex-col items-center justify-center overflow-hidden transition-all duration-200 ${
                      isActive ? 'text-[#9ac2ff]' : 'text-[var(--text-subtle)] hover:text-white'
                    }`}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-lg bg-[rgba(101,140,255,0.12)] border border-[rgba(101,140,255,0.26)] shadow-[0_6px_18px_rgba(101,140,255,0.2)]"
                        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                      />
                    )}
                    {isActive && (
                      <motion.span
                        layoutId="nav-dot"
                        className="absolute -top-2 w-2 h-2 rounded-full bg-[#91b5ff] shadow-[0_0_0_4px_rgba(145,181,255,0.2)]"
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    <div className={`relative w-9 h-9 rounded-md flex items-center justify-center text-sm ${item.color} ${isActive ? 'bg-[#91b5ff]/15 text-[#91b5ff]' : ''}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <motion.span
                      className="relative text-[8.5px] font-semibold mt-0.5 tracking-wide"
                      animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 6 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      {item.label}
                    </motion.span>
                  </motion.button>
                );
              })}

              <div className="w-px h-8 bg-[rgba(255,255,255,0.05)] mx-1" />

              <motion.button
                onClick={onLogout}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-[rgba(255,79,79,0.14)] border border-[rgba(255,79,79,0.3)] text-red-200 hover:text-white hover:bg-[rgba(255,79,79,0.2)] transition-all duration-200 flex items-center justify-center"
                whileTap={{ scale: 0.95 }}
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-40 bg-ocean-dark/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 10 }} 
              className="bg-ocean-primary w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Notifications</h3>
                  <p className="text-sm text-ocean-light mt-1">Current alerts and upcoming tasks</p>
                </div>
                <button 
                  onClick={() => setShowNotifications(false)} 
                  className="p-3 bg-ocean-secondary rounded-full hover:bg-ocean-accent active:bg-ocean-accent transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Alerts */}
              {currentAlerts.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-ocean-light uppercase tracking-wider mb-3 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-red-400" />
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
                          alert.type === 'urgent' ? 'bg-red-500/10 border-red-500/30 text-white' :
                          alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-white' :
                          'bg-ocean-secondary/20 border-ocean-accent/30 text-white'
                        }`}
                      >
                        <p className="font-bold text-white text-sm">{alert.title}</p>
                        <p className="text-xs text-ocean-light mt-1">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Notifications */}
              {upcomingNotifications.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-ocean-light uppercase tracking-wider mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-ocean-accent" />
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
                          className="p-4 rounded-xl border bg-ocean-secondary/20 border-ocean-accent/30 text-white flex items-start justify-between cursor-pointer hover:shadow-md transition-all"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-4 h-4 text-ocean-accent" />
                              <p className="font-bold text-white text-sm">{notif.action}</p>
                            </div>
                            <p className="text-xs text-ocean-light mt-1">{notif.tray.location}</p>
                          </div>
                          <span className="text-xs font-bold text-ocean-accent bg-ocean-primary px-2 py-1 rounded-full border border-ocean-accent/30 ml-2 whitespace-nowrap">
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
                <div className="text-center py-12 bg-ocean-secondary/10 rounded-2xl border border-dashed border-ocean-secondary/40">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-ocean-secondary" />
                  <p className="text-ocean-light font-bold text-sm mb-1">No notifications</p>
                  <p className="text-ocean-contrast text-xs">All tasks are on schedule</p>
                </div>
              )}

              {/* Footer Action */}
              {(currentAlerts.length > 0 || upcomingNotifications.length > 0) && (
                <div className="mt-6 pt-4 border-t border-ocean-secondary/40">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      // Store intent to show calendar tab
                      localStorage.setItem('galway_show_calendar', 'true');
                      onNavigate('crops');
                    }}
                    className="w-full py-3 bg-ocean-accent text-white font-bold rounded-xl hover:bg-ocean-accent/90 transition-colors"
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
