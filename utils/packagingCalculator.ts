/**
 * Packaging Cost Calculator
 * 
 * Calculates cost per tray based on:
 * - Cost per bag
 * - Yield per tray
 * - Weight per bag (default 100g)
 */

export interface PackagingCalculationParams {
  costPerBag: number; // € per bag
  weightPerBag: number; // grams per bag (default 100g)
  yieldPerTray: number; // grams per tray
}

export interface PackagingCostBreakdown {
  bagsPerTray: number; // Number of bags needed
  totalCostPerTray: number; // € per tray
  costPer100g: number; // € per 100g packaged
}

export function calculatePackagingCost(params: PackagingCalculationParams): PackagingCostBreakdown {
  const { costPerBag, weightPerBag, yieldPerTray } = params;

  // Number of bags needed per tray
  const bagsPerTray = Math.ceil(yieldPerTray / weightPerBag);

  // Total cost per tray
  const totalCostPerTray = bagsPerTray * costPerBag;

  // Cost per 100g (useful for comparison)
  const costPer100g = (totalCostPerTray / yieldPerTray) * 100;

  return {
    bagsPerTray,
    totalCostPerTray,
    costPer100g
  };
}

/**
 * Quick calculation helper for standard setup
 * Default: 100g per bag
 */
export function quickPackagingCalc(
  costPerBag: number = 0.40,
  weightPerBag: number = 100, // 100g per bag
  yieldPerTray: number = 447 // 447g per tray (adjusted for 35cm x 55cm tray)
): PackagingCostBreakdown {
  return calculatePackagingCost({
    costPerBag,
    weightPerBag,
    yieldPerTray
  });
}
