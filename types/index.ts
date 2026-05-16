export type BusinessType = 'restaurant' | 'supermarket' | 'store' | 'cafe' | 'other';

export type ItemUnit = 'ק"ג' | 'גרם' | 'ליטר' | 'מ"ל' | 'יחידה' | 'בקבוק' | 'ארגז' | 'שקית' | 'אחר';

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  branch: string;
  ownerId: string;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: ItemUnit;
  stock: number;
  minStock: number;
  price: number;
  supplier: string;
  sku: string;
  lastUpdated: Date;
  lastUpdatedBy: 'manual' | 'invoice' | 'sale';
}

export const DEFAULT_CATEGORIES = [
  'בשר', 'ירקות', 'פירות', 'דגים', 'יבשים',
  'אלכוהול', 'חלב וביצים', 'מאפייה', 'אחר',
];

export const UNITS: ItemUnit[] = [
  'ק"ג', 'גרם', 'ליטר', 'מ"ל', 'יחידה', 'בקבוק', 'ארגז', 'שקית', 'אחר',
];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: 'מסעדה',
  supermarket: 'סופרמרקט',
  store: 'חנות',
  cafe: 'קפה',
  other: 'אחר',
};
