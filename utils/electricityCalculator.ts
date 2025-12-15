/**
 * Electricity Cost Calculator for Microgreens
 * 
 * Assumptions:
 * - Typical Irish electricity rate: €0.30-0.35 per kWh (adjustable)
 * - Light stage duration: varies by crop (typically 5-10 days)
 * - Hours of light per day: typically 12-16 hours during light stage
 */

export interface ElectricityCalculationParams {
  wattagePerShelf: number; // Watts per shelf (e.g., 100W)
  traysPerShelf: number; // Number of trays per shelf (e.g., 4)
  hoursPerDay: number; // Hours of light per day (e.g., 12 or 16)
  lightDays: number; // Number of days in light stage (from crop data)
  electricityRatePerKwh: number; // € per kWh (e.g., 0.30 or 0.35)
}

export interface ElectricityCostBreakdown {
  wattagePerTray: number; // W
  costPerHourPerShelf: number; // €
  costPerHourPerTray: number; // €
  costPerDayPerShelf: number; // €
  costPerDayPerTray: number; // €
  costPerCyclePerShelf: number; // €
  costPerCyclePerTray: number; // €
  monthlyCostPerShelf: number; // € (assuming continuous operation)
  monthlyCostPerTray: number; // €
}

export function calculateElectricityCosts(params: ElectricityCalculationParams): ElectricityCostBreakdown {
  const {
    wattagePerShelf,
    traysPerShelf,
    hoursPerDay,
    lightDays,
    electricityRatePerKwh
  } = params;

  // Convert watts to kilowatts
  const kwPerShelf = wattagePerShelf / 1000;
  const wattagePerTray = wattagePerShelf / traysPerShelf;
  const kwPerTray = wattagePerTray / 1000;

  // Cost per hour
  const costPerHourPerShelf = kwPerShelf * electricityRatePerKwh;
  const costPerHourPerTray = kwPerTray * electricityRatePerKwh;

  // Cost per day
  const costPerDayPerShelf = costPerHourPerShelf * hoursPerDay;
  const costPerDayPerTray = costPerHourPerTray * hoursPerDay;

  // Cost per cycle (light stage duration)
  const costPerCyclePerShelf = costPerDayPerShelf * lightDays;
  const costPerCyclePerTray = costPerDayPerTray * lightDays;

  // Monthly cost (assuming lights run continuously during light stage)
  // For monthly, we estimate: if you start a new batch every cycle, average running time
  const monthlyCostPerShelf = costPerDayPerShelf * 30;
  const monthlyCostPerTray = costPerDayPerTray * 30;

  return {
    wattagePerTray,
    costPerHourPerShelf,
    costPerHourPerTray,
    costPerDayPerShelf,
    costPerDayPerTray,
    costPerCyclePerShelf,
    costPerCyclePerTray,
    monthlyCostPerShelf,
    monthlyCostPerTray
  };
}

/**
 * Quick calculation helper for standard setup
 */
export function quickElectricityCalc(
  wattagePerShelf: number = 100,
  traysPerShelf: number = 4,
  hoursPerDay: number = 16,
  lightDays: number = 7,
  electricityRatePerKwh: number = 0.32
): ElectricityCostBreakdown {
  return calculateElectricityCosts({
    wattagePerShelf,
    traysPerShelf,
    hoursPerDay,
    lightDays,
    electricityRatePerKwh
  });
}
