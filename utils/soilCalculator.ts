/**
 * Soil/CGrowing Medium Cost Calculator
 * 
 * Calculates cost per tray based on:
 * - Cost per bag/unit
 * - Volume/weight per bag
 * - Amount used per tray
 */

export interface SoilCalculationParams {
  costPerBag: number; // € per bag
  volumePerBag: number; // Liters or kg per bag
  volumePerTray: number; // Liters or kg per 1020 tray
}

export interface SoilCostBreakdown {
  costPerUnit: number; // € per liter/kg
  costPerTray: number; // € per tray
}

export function calculateSoilCost(params: SoilCalculationParams): SoilCostBreakdown {
  const { costPerBag, volumePerBag, volumePerTray } = params;

  // Cost per unit (liter or kg)
  const costPerUnit = costPerBag / volumePerBag;

  // Cost per tray
  const costPerTray = costPerUnit * volumePerTray;

  return {
    costPerUnit,
    costPerTray
  };
}

/**
 * Quick calculation helper for standard setup
 */
export function quickSoilCalc(
  costPerBag: number = 12.00,
  volumePerBag: number = 50, // 50L bag
  volumePerTray: number = 3 // ~3L per 1020 tray
): SoilCostBreakdown {
  return calculateSoilCost({
    costPerBag,
    volumePerBag,
    volumePerTray
  });
}
