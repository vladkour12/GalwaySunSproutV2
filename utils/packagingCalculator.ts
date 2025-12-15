/**
 * Packaging Cost Calculator
 * 
 * Calculates cost per tray based on:
 * - Cost per container/unit
 * - Yield per tray
 * - Weight per container
 */

export interface PackagingCalculationParams {
  costPerContainer: number; // € per container/clamshell/box
  weightPerContainer: number; // grams per container (e.g., 100g, 500g)
  yieldPerTray: number; // grams per tray
}

export interface PackagingCostBreakdown {
  containersPerTray: number; // Number of containers needed
  totalCostPerTray: number; // € per tray
  costPer100g: number; // € per 100g packaged
}

export function calculatePackagingCost(params: PackagingCalculationParams): PackagingCostBreakdown {
  const { costPerContainer, weightPerContainer, yieldPerTray } = params;

  // Number of containers needed per tray
  const containersPerTray = Math.ceil(yieldPerTray / weightPerContainer);

  // Total cost per tray
  const totalCostPerTray = containersPerTray * costPerContainer;

  // Cost per 100g (useful for comparison)
  const costPer100g = (totalCostPerTray / yieldPerTray) * 100;

  return {
    containersPerTray,
    totalCostPerTray,
    costPer100g
  };
}

/**
 * Quick calculation helper for standard setup
 */
export function quickPackagingCalc(
  costPerContainer: number = 0.40,
  weightPerContainer: number = 100, // 100g container
  yieldPerTray: number = 300 // 300g per tray
): PackagingCostBreakdown {
  return calculatePackagingCost({
    costPerContainer,
    weightPerContainer,
    yieldPerTray
  });
}
