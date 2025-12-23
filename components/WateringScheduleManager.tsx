import React, { useState, useMemo } from 'react';
import { Droplet, CheckCircle, AlertCircle } from 'lucide-react';
import { CropType, Tray, Stage, WaterSchedule } from '../types';

interface WateringScheduleManagerProps {
  crops: CropType[];
  trays: Tray[];
  waterSchedules: WaterSchedule[];
  onUpdateSchedule: (schedule: WaterSchedule) => void;
  onWaterTray: (trayId: string, scheduleId: string) => void;
}

const WATERING_FREQUENCY: Record<string, number> = {
  'Seed': 24, // Water every 24 hours
  'Soak': 0, // No watering during soak
  'Germination': 12, // Twice daily
  'Blackout': 12, // Twice daily
  'Light': 8, // Three times daily
  'Harvest Ready': 4, // Multiple times daily
  'Harvested': 0,
  'Compost': 0,
  'Maintenance': 0,
};

export const WateringScheduleManager: React.FC<WateringScheduleManagerProps> = ({
  crops,
  trays,
  waterSchedules,
  onUpdateSchedule,
  onWaterTray,
}) => {
  const [selectedTrayId, setSelectedTrayId] = useState<string | null>(null);

  // Get active trays (not harvested or composted)
  const activeTrays = useMemo(() => {
    return trays.filter((t) => t.stage !== Stage.HARVESTED && t.stage !== Stage.COMPOST);
  }, [trays]);

  // Get watering due soon (within next 2 hours)
  const dueSoon = useMemo(() => {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return activeTrays.filter((tray) => {
      const schedule = waterSchedules.find((s) => s.trayId === tray.id);
      if (!schedule) return false;
      const nextWatering = new Date(schedule.nextWateringAt);
      return nextWatering <= twoHoursLater;
    });
  }, [activeTrays, waterSchedules]);

  // Get crop name by ID
  const getCropName = (cropId: string) => {
    const crop = crops.find((c) => c.id === cropId);
    return crop?.name || 'Unknown';
  };

  // Handle watering a tray
  const handleWaterTray = (trayId: string) => {
    const schedule = waterSchedules.find((s) => s.trayId === trayId);
    if (!schedule) return;

    const now = new Date();
    const nextWatering = new Date(
      now.getTime() + schedule.wateringFrequencyHours * 60 * 60 * 1000
    );

    const updatedSchedule: WaterSchedule = {
      ...schedule,
      lastWateredAt: now.toISOString(),
      nextWateringAt: nextWatering.toISOString(),
    };

    onWaterTray(trayId, schedule.id);
    onUpdateSchedule(updatedSchedule);
  };

  // Get time until watering
  const getTimeUntilWatering = (nextWateringAt: string): string => {
    const now = new Date();
    const nextWatering = new Date(nextWateringAt);
    const diff = nextWatering.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / (60 * 1000));
      return `${mins}m`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h`;
    }
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}d`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Droplet className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-slate-900">Watering Schedule</h2>
      </div>

      {/* Urgent Alerts */}
      {dueSoon.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-900">Watering Due Soon</h3>
              <p className="text-orange-800 mt-1">
                {dueSoon.length} tray{dueSoon.length !== 1 ? 's' : ''} need watering within the next 2 hours
              </p>
              <div className="mt-3 space-y-2">
                {dueSoon.map((tray) => (
                  <button
                    key={tray.id}
                    onClick={() => handleWaterTray(tray.id)}
                    className="w-full text-left bg-slate-700 hover:bg-slate-600 border border-orange-600 rounded-lg p-3 transition-colors"
                  >
                    <p className="font-medium text-slate-100">
                      {getCropName(tray.cropTypeId)} - {tray.location}
                    </p>
                    <p className="text-sm text-orange-400">
                      Water now →
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Trays Watering Status */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900">Active Trays</h3>
        <div className="space-y-3">
          {activeTrays.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-600">
              No active trays
            </div>
          ) : (
            activeTrays.map((tray) => {
              const schedule = waterSchedules.find((s) => s.trayId === tray.id);
              const timeUntil = schedule ? getTimeUntilWatering(schedule.nextWateringAt) : 'N/A';
              const isOverdue =
                schedule && new Date(schedule.nextWateringAt) < new Date();

              return (
                <div
                  key={tray.id}
                  className={`border rounded-lg p-4 ${
                    isOverdue
                      ? 'bg-red-900/30 border-red-600'
                      : 'bg-slate-700 border-slate-600 hover:border-blue-500'
                  } transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">
                        {getCropName(tray.cropTypeId)}
                      </p>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <p className="text-slate-600">Location</p>
                          <p className="font-medium text-slate-900">{tray.location}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Stage</p>
                          <p className="font-medium text-slate-900">{tray.stage}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Frequency</p>
                          <p className="font-medium text-slate-900">
                            {schedule?.wateringFrequencyHours ? `Every ${schedule.wateringFrequencyHours}h` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      {schedule?.lastWateredAt && (
                        <p className="text-xs text-slate-500 mt-2">
                          Last watered: {new Date(schedule.lastWateredAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <div
                        className={`text-lg font-bold ${
                          isOverdue ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {timeUntil}
                      </div>
                      <p className="text-xs text-slate-600 mb-3">
                        {isOverdue ? 'Overdue' : 'Until watering'}
                      </p>
                      <button
                        onClick={() => handleWaterTray(tray.id)}
                        className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                      >
                        <Droplet className="w-4 h-4" />
                        <span>Water Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Watering Frequency by Stage</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {Object.entries(WATERING_FREQUENCY).map(([stage, freq]) => (
            freq > 0 && (
              <div key={stage} className="text-blue-800">
                <span className="font-medium">{stage}:</span> Every {freq}h
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
};

export default WateringScheduleManager;
