
export interface Product {
  id: string;
  sku: string; // The "number" the user wants to stick on the product
  name: string;
  description: string;
  price: number;
  cost: number;
  imageUrl: string;
  stock: number; // Quantity currently in Warehouse
  createdAt: string;
}

export interface Distributor {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  joinedAt: string;
}

// New interface to track how much stock a distributor has of a specific product
export interface DistributorStock {
  id: string;
  distributorId: string;
  productId: string;
  quantity: number;
  lastUpdated: string;
}

export interface SaleRecord {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  totalAmount: number;
  date: string;
  
  // New fields for Commissions
  soldByDistributorId?: string | null; // null means sold by "Me" (Store)
  commissionAmount?: number; // Calculated profit sharing
  costPriceSnapshot?: number; // Cost at time of sale (for accurate profit calc)
}

export interface PayoutRecord {
  id: string;
  distributorId: string;
  amount: number; // Positive = Payment to distributor (reduces balance), Negative (if adjustment) = Increases balance
  date: string;
  note?: string;
  type: 'PAYMENT' | 'ADJUSTMENT_ADD' | 'ADJUSTMENT_DEDUCT'; // Distinguish types
}

export type ViewState = 'DASHBOARD' | 'INVENTORY' | 'WAREHOUSE' | 'DISTRIBUTORS' | 'SCANNER' | 'RETURNS' | 'SALES' | 'PAYOUTS' | 'SETTINGS';