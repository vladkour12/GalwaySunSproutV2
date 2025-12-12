import { AppState, Stage, Alert } from '../types';

export const getFarmAlerts = (state: AppState): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0-6

  // 1. Routine Checks (Monday & Thursday)
  const activeTrays = state.trays.filter(t => t.stage !== Stage.HARVESTED && t.stage !== Stage.COMPOST && t.stage !== Stage.MAINTENANCE);
  
  if ((dayOfWeek === 1 || dayOfWeek === 4) && activeTrays.length > 0) {
     alerts.push({
        id: `routine-clean-${now.toDateString()}`,
        type: 'routine',
        title: 'Deep Clean & Airflow Check',
        message: `${activeTrays.length} active trays need inspection`,
        linkTo: 'crops'
     });
  }

  // 2. Tray Stage Checks
  state.trays.forEach(tray => {
    if (tray.stage === Stage.HARVESTED || tray.stage === Stage.COMPOST || tray.stage === Stage.MAINTENANCE) return;

    const crop = state.crops.find(c => c.id === tray.cropTypeId);
    if (!crop) return;

    const startDate = new Date(tray.startDate);
    if (isNaN(startDate.getTime())) return;

    const diffMs = now.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // A. Soaking Overdue
    if (tray.stage === Stage.SOAK) {
       const threshold = crop.soakHours;
       if (threshold > 0 && diffHours > threshold + 2) {
          alerts.push({
             id: `soak-${tray.id}`,
             type: 'urgent',
             title: 'Over-soaking Alert',
             message: `${crop.name} soaking for ${Math.round(diffHours)}h (Target: ${threshold}h)`,
             linkTo: 'crops',
             trayId: tray.id
          });
       }
    } 
    // B. Germination Done -> Move to Blackout
    else if (tray.stage === Stage.GERMINATION) {
       const threshold = crop.germinationDays;
       if (diffDays > threshold + 0.5) {
          alerts.push({
             id: `germ-${tray.id}`,
             type: 'warning',
             title: 'Move to Blackout',
             message: `${crop.name} finished germination (${Math.round(diffDays)}d)`,
             linkTo: 'crops',
             trayId: tray.id
          });
       }
    }
    // C. Blackout Done -> Uncover
    else if (tray.stage === Stage.BLACKOUT) {
       const threshold = crop.blackoutDays;
       if (diffDays > threshold + 0.5) {
          alerts.push({
             id: `blackout-${tray.id}`,
             type: 'warning',
             title: 'Uncover / Lights On',
             message: `${crop.name} finished blackout (${Math.round(diffDays)}d)`,
             linkTo: 'crops',
             trayId: tray.id
          });
       }
    }
    // D. Harvest Overdue
    else if (tray.stage === Stage.LIGHT) {
       const threshold = crop.lightDays;
       if (diffDays > threshold + 2) {
          alerts.push({
             id: `harvest-${tray.id}`,
             type: 'urgent',
             title: 'Harvest Overdue',
             message: `${crop.name} ready for ${Math.round(diffDays - threshold)} extra days`,
             linkTo: 'crops',
             trayId: tray.id
          });
       }
    }
  });

  // Sort: Urgent first, then Warning, then Routine
  return alerts.sort((a, b) => {
     const score = (type: string) => {
        if (type === 'urgent') return 3;
        if (type === 'warning') return 2;
        if (type === 'routine') return 1;
        return 0;
     };
     return score(b.type) - score(a.type);
  });
};

