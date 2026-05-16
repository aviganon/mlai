export type BusinessType = 'restaurant' | 'supermarket' | 'store' | 'cafe' | 'other';

export type ItemUnit = 'ק"ג' | 'גרם' | 'ליטר' | 'מ"ל' | 'יחידה' | 'בקבוק' | 'ארגז' | 'שקית' | 'זוג' | 'מטר' | 'אחר';

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
  packSize?: number;
  minOrder?: number;
  deliveryDays?: number;
  targetStock?: number;
}

export const DEFAULT_CATEGORIES = [
  'בשר', 'ירקות', 'פירות', 'דגים', 'יבשים',
  'אלכוהול', 'חלב וביצים', 'מאפייה', 'אחר',
];

export const UNITS: ItemUnit[] = [
  'ק"ג', 'גרם', 'ליטר', 'מ"ל', 'יחידה', 'בקבוק', 'ארגז', 'שקית', 'זוג', 'מטר', 'אחר',
];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: 'מסעדה',
  supermarket: 'סופרמרקט',
  store: 'חנות',
  cafe: 'קפה',
  other: 'אחר',
};

export interface MlaiUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isOwner: boolean;
  businessId: string | null;
  role: 'owner' | 'buyer' | 'employee';
  lastSeen: Date;
  createdAt: Date;
}

export interface Domain {
  id: string;
  name: string;
  icon: string;
  categories: string[];
  units: ItemUnit[];
  isDefault: boolean;
}

export interface BusinessMember {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'owner' | 'buyer' | 'employee';
  addedAt: Date;
}

export const DEFAULT_DOMAIN_CATEGORIES: Record<BusinessType, string[]> = {
  restaurant: ['בשר', 'עוף', 'ירקות', 'פירות', 'דגים', 'יבשים', 'אלכוהול', 'חלב וביצים', 'מאפייה', 'רטבים ותבלינים', 'אחר'],
  cafe: ['קפה וחליטות', 'חלב וחלופות', 'סירופים', 'מאפים', 'חטיפים', 'כלים חד-פעמיים', 'אחר'],
  supermarket: ['פירות וירקות', 'מוצרי חלב', 'קצבייה', 'דגים', 'אוכל יבש', 'שתייה', 'מוצרי ניקיון', 'חטיפים', 'אחר'],
  store: ['בגדים', 'נעליים', 'אביזרים', 'תיקים', 'אחר'],
  other: ['כללי', 'חומרים', 'ציוד', 'אחר'],
};

export const DEFAULT_DOMAIN_UNITS: Record<BusinessType, ItemUnit[]> = {
  restaurant: ['ק"ג', 'גרם', 'ליטר', 'מ"ל', 'יחידה', 'ארגז', 'שקית', 'אחר'],
  cafe: ['ק"ג', 'גרם', 'ליטר', 'מ"ל', 'יחידה', 'שקית', 'בקבוק', 'אחר'],
  supermarket: ['יחידה', 'ק"ג', 'ליטר', 'ארגז', 'שקית', 'בקבוק', 'אחר'],
  store: ['יחידה', 'זוג', 'ארגז', 'אחר'],
  other: ['יחידה', 'ק"ג', 'ליטר', 'מטר', 'אחר'],
};

export interface InvoiceLogEntry {
  id: string;
  parsedAt: Date;
  supplier: string;
  itemsUpdated: number;
  items: Array<{ name: string; quantity: number; unit: string; price: number; itemId?: string }>;
  rawText: string;
  status: 'success' | 'error';
  error?: string;
}

export interface ReorderSuggestion {
  id: string;
  itemId: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  suggestedOrderQty: number;
  supplier: string;
  unit: string;
  createdAt: Date;
}

export interface SupplierDetails {
  name: string;
  phone?: string;
  email?: string;
  deliveryDays?: number;
  notes?: string;
  updatedAt?: Date;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  supplier: string;
  qty: number;
  unit: string;
  price: number;
}

export interface PurchaseOrder {
  id: string;
  items: PurchaseOrderItem[];
  status: 'pending' | 'approved' | 'received';
  createdAt: Date;
  createdBy: string;
  totalEstimate: number;
}
