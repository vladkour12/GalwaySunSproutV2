
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
  seedingRate?: number; // grams per 10x20 shallow tray (35cm x 55cm)
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
  category?: string; // e.g., 'Spicy', 'Mild', 'Peppery', 'Nutty', 'Sweet'
  optimalTemperature?: number; // Celsius
  storageDays?: number; // Shelf life in days
  growingTips?: string; // Additional growing instructions
  nutritionInfo?: string; // Nutritional highlights
}

export interface Tray {
  id: string;
  cropTypeId: string;
  cropTypeId2?: string; // Optional second crop for half-half trays
  startDate: string; // ISO string (Start of CURRENT stage)
  plantedAt?: string; // ISO string (Original planting date)
  stage: Stage;
  notes: string;
  location: string; // e.g., "Shelf 1-A"
  capacity?: number; // Target yield/capacity in grams
  yield?: number; // Actual harvested yield in grams
  updatedAt: string;
  stageUpdateAt?: string; // ISO string (when stage last changed)
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
  receiptImage?: string; // Base64 encoded receipt/document image
  isBusinessExpense?: boolean; // Flag for business expenses (lights, shed upgrades, etc.)
}

export interface Location {
  id: string;
  name: string; // e.g., "Shelf 1-A", "Grow Room 1", "Backyard"
  capacity: number; // Number of trays it can hold
  description?: string;
  temperature?: number; // Current temperature
  humidity?: number; // Current humidity
}

export interface Order {
  id: string;
  customerId: string;
  date: string; // Order date (ISO string)
  dueDate: string; // Expected delivery/harvest date (ISO string)
  status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'delivered' | 'cancelled';
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  cropId: string;
  quantity: number; // Number of trays
  unitPrice: number;
  subtotal: number;
  notes?: string;
}

export interface WaterSchedule {
  id: string;
  trayId: string;
  stage: Stage;
  wateringFrequencyHours: number; // How often to water in this stage
  nextWateringAt: string; // ISO string (when next watering is due)
  lastWateredAt?: string; // ISO string (when last watered)
  notes?: string;
}

export interface AppState {
  crops: CropType[];
  trays: Tray[];
  transactions: Transaction[];
  customers: Customer[];
  locations?: Location[];
  orders?: Order[];
  waterSchedules?: WaterSchedule[];
}

export type View = 'dashboard' | 'crops' | 'finance' | 'data' | 'calculator';

export interface Alert {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'routine';
  title: string;
  message: string;
  linkTo?: View;
  trayId?: string;
}
