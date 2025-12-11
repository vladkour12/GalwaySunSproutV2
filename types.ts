
export enum Stage {
  SEED = 'Seed',
  SOAK = 'Soak',
  GERMINATION = 'Germination', // Weighted/Stacking
  BLACKOUT = 'Blackout',
  LIGHT = 'Light',
  HARVEST_READY = 'Harvest Ready',
  HARVESTED = 'Harvested',
  COMPOST = 'Compost', // Failed
  MAINTENANCE = 'Maintenance' // Cleaning/Repair
}

export interface CropType {
  id: string;
  name: string;
  scientificName?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Intermediate' | 'Difficult' | 'Medium-Difficult';
  seedingRate?: number; // grams per 10x20 tray
  soakHours: number;
  germinationDays: number;
  blackoutDays: number;
  lightDays: number;
  estimatedYieldPerTray: number; // in grams
  pricePerTray: number; // Selling price estimate
  revenuePer100g?: number; // Market selling price per 100g (default 6.00)
  price500g?: number; // Price for Small Pack
  price1kg?: number;  // Price for Large Pack
  pkgWeightSmall?: number; // Weight of Small Pack in grams (default 500)
  pkgWeightLarge?: number; // Weight of Large Pack in grams (default 1000)
  color: string;
  summary?: string; // Notes
  imageUrl?: string;
}

export interface Tray {
  id: string;
  cropTypeId: string;
  startDate: string; // ISO string (Start of CURRENT stage)
  plantedAt?: string; // ISO string (Original planting date)
  stage: Stage;
  notes: string;
  location: string; // e.g., "Shelf 1-A"
  capacity?: number; // Target yield/capacity in grams
  yield?: number; // Actual harvested yield in grams
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  type: 'Restaurant' | 'Wholesaler' | 'Individual';
  contact: string;
  email: string;
  notes: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  customerId?: string; // Optional link to a customer
  payee?: string; // Business/Restaurant/Vendor Name
}

export interface AppState {
  crops: CropType[];
  trays: Tray[];
  transactions: Transaction[];
  customers: Customer[];
}

export type View = 'dashboard' | 'crops' | 'finance' | 'ai' | 'data' | 'calculator';
