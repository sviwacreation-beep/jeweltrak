
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  updateDoc,
  query
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Product, Distributor, DistributorStock, SaleRecord, PayoutRecord } from "../types";

// --- LocalStorage Helpers (Offline Mode) ---

const toNumber = (value: unknown, fallback = 0): number => {
  const normalized = typeof value === "string" ? value.trim() : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringValue = (value: unknown, fallback = ""): string => {
  return typeof value === "string" ? value : fallback;
};

const normalizeProduct = (item: any): Product => ({
  id: toStringValue(item?.id),
  sku: toStringValue(item?.sku),
  name: toStringValue(item?.name),
  description: toStringValue(item?.description),
  price: toNumber(item?.price),
  cost: toNumber(item?.cost),
  imageUrl: toStringValue(item?.imageUrl),
  stock: toNumber(item?.stock),
  createdAt: toStringValue(item?.createdAt),
});

const normalizeDistributor = (item: any): Distributor => ({
  id: toStringValue(item?.id),
  name: toStringValue(item?.name),
  phone: toStringValue(item?.phone),
  email: toStringValue(item?.email),
  location: toStringValue(item?.location),
  joinedAt: toStringValue(item?.joinedAt),
});

const normalizeDistributorStock = (item: any): DistributorStock => ({
  id: toStringValue(item?.id),
  distributorId: toStringValue(item?.distributorId),
  productId: toStringValue(item?.productId),
  quantity: toNumber(item?.quantity),
  lastUpdated: toStringValue(item?.lastUpdated),
});

const normalizeSale = (item: any): SaleRecord => ({
  id: toStringValue(item?.id),
  productId: toStringValue(item?.productId),
  productName: toStringValue(item?.productName),
  quantity: toNumber(item?.quantity),
  salePrice: toNumber(item?.salePrice),
  totalAmount: toNumber(item?.totalAmount),
  date: toStringValue(item?.date),
  soldByDistributorId: item?.soldByDistributorId == null ? null : toStringValue(item?.soldByDistributorId),
  commissionAmount: item?.commissionAmount == null ? undefined : toNumber(item?.commissionAmount),
  costPriceSnapshot: item?.costPriceSnapshot == null ? undefined : toNumber(item?.costPriceSnapshot),
});

const normalizePayout = (item: any): PayoutRecord => ({
  id: toStringValue(item?.id),
  distributorId: toStringValue(item?.distributorId),
  amount: toNumber(item?.amount),
  date: toStringValue(item?.date),
  note: item?.note == null ? undefined : toStringValue(item?.note),
  type:
    item?.type === "ADJUSTMENT_ADD" || item?.type === "ADJUSTMENT_DEDUCT" || item?.type === "PAYMENT"
      ? item.type
      : "PAYMENT",
});

const normalizeCollectionData = (collectionName: string, data: any[]) => {
  switch (collectionName) {
    case "products":
      return data.map(normalizeProduct);
    case "distributors":
      return data.map(normalizeDistributor);
    case "distributorStocks":
      return data.map(normalizeDistributorStock);
    case "sales":
      return data.map(normalizeSale);
    case "payouts":
      return data.map(normalizePayout);
    default:
      return data;
  }
};

const getLocal = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    return [];
  }
};

const setLocal = (key: string, data: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Dispatch event to notify listeners in same tab
    window.dispatchEvent(new Event(`local-update-${key}`));
  } catch (e) {
    console.error("Error saving to local storage", e);
    alert("Storage full! Cannot save data.");
  }
};

// --- Real-time Listeners ---

export const subscribeToCollection = (collectionName: string, callback: (data: any[]) => void) => {
  // 1. Firebase Mode
  if (db) {
    try {
      const q = query(collection(db, collectionName));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(normalizeCollectionData(collectionName, data));
      }, (error) => {
        console.error(`Error subscribing to ${collectionName}:`, error);
        callback([]);
      });
    } catch (e) {
      console.error(`Error initializing subscription for ${collectionName}:`, e);
      return () => {};
    }
  }

  // 2. Offline Mode (LocalStorage)
  const data = getLocal(collectionName);
  callback(normalizeCollectionData(collectionName, data));

  const handleLocalUpdate = () => {
    const updatedData = getLocal(collectionName);
    callback(normalizeCollectionData(collectionName, updatedData));
  };

  window.addEventListener(`local-update-${collectionName}`, handleLocalUpdate);
  
  return () => {
    window.removeEventListener(`local-update-${collectionName}`, handleLocalUpdate);
  };
};

// --- Products ---

export const addProductToDb = async (product: Product) => {
  if (db) {
    await setDoc(doc(db, "products", product.id), product);
  } else {
    const items = getLocal("products");
    items.push(product);
    setLocal("products", items);
  }
};

export const updateProductInDb = async (product: Product) => {
  if (db) {
    await updateDoc(doc(db, "products", product.id), { ...product });
  } else {
    const items = getLocal("products");
    const index = items.findIndex((p: Product) => p.id === product.id);
    if (index !== -1) {
      items[index] = product;
      setLocal("products", items);
    }
  }
};

export const deleteProductFromDb = async (id: string) => {
  if (db) {
    await deleteDoc(doc(db, "products", id));
  } else {
    const items = getLocal("products");
    const filtered = items.filter((p: Product) => p.id !== id);
    setLocal("products", filtered);
  }
};

// --- Distributors ---

export const addDistributorToDb = async (distributor: Distributor) => {
  if (db) {
    await setDoc(doc(db, "distributors", distributor.id), distributor);
  } else {
    const items = getLocal("distributors");
    items.push(distributor);
    setLocal("distributors", items);
  }
};

export const updateDistributorInDb = async (distributor: Distributor) => {
  if (db) {
    await updateDoc(doc(db, "distributors", distributor.id), { ...distributor });
  } else {
    const items = getLocal("distributors");
    const index = items.findIndex((d: Distributor) => d.id === distributor.id);
    if (index !== -1) {
      items[index] = distributor;
      setLocal("distributors", items);
    }
  }
};

export const deleteDistributorFromDb = async (id: string) => {
  if (db) {
    await deleteDoc(doc(db, "distributors", id));
  } else {
    const items = getLocal("distributors");
    const filtered = items.filter((d: Distributor) => d.id !== id);
    setLocal("distributors", filtered);
  }
};

// --- Stock Transfers (Distributor Stocks) ---

export const upsertDistributorStock = async (stockRecord: DistributorStock) => {
  const id = stockRecord.id || `${stockRecord.distributorId}_${stockRecord.productId}`;
  const recordWithId = { ...stockRecord, id };

  if (db) {
    await setDoc(doc(db, "distributorStocks", id), recordWithId);
  } else {
    const items = getLocal("distributorStocks");
    const index = items.findIndex((s: DistributorStock) => s.id === id);
    if (index !== -1) {
      items[index] = recordWithId;
    } else {
      items.push(recordWithId);
    }
    setLocal("distributorStocks", items);
  }
};

export const deleteDistributorStock = async (id: string) => {
  if (db) {
    await deleteDoc(doc(db, "distributorStocks", id));
  } else {
    const items = getLocal("distributorStocks");
    const filtered = items.filter((s: DistributorStock) => s.id !== id);
    setLocal("distributorStocks", filtered);
  }
};

// --- Sales ---

export const addSaleToDb = async (sale: SaleRecord) => {
  if (db) {
    await setDoc(doc(db, "sales", sale.id), sale);
  } else {
    const items = getLocal("sales");
    items.push(sale);
    setLocal("sales", items);
  }
};

export const deleteSaleFromDb = async (id: string) => {
  if (db) {
    await deleteDoc(doc(db, "sales", id));
  } else {
    const items = getLocal("sales");
    const filtered = items.filter((s: SaleRecord) => s.id !== id);
    setLocal("sales", filtered);
  }
};

// --- Payouts ---

export const addPayoutToDb = async (payout: PayoutRecord) => {
  if (db) {
    await setDoc(doc(db, "payouts", payout.id), payout);
  } else {
    const items = getLocal("payouts");
    items.push(payout);
    setLocal("payouts", items);
  }
};

export const deletePayoutFromDb = async (id: string) => {
  if (db) {
    await deleteDoc(doc(db, "payouts", id));
  } else {
    const items = getLocal("payouts");
    const filtered = items.filter((p: PayoutRecord) => p.id !== id);
    setLocal("payouts", filtered);
  }
};
