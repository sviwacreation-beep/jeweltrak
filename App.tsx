import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Warehouse } from './components/Warehouse';
import { Distributors } from './components/Distributors';
import { Scanner } from './components/Scanner';
import { Returns } from './components/Returns';
import { Sales } from './components/Sales';
import { Payouts } from './components/Payouts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Product, Distributor, ViewState, DistributorStock, SaleRecord, PayoutRecord } from './types';
import { isFirebaseInitialized } from './firebaseConfig';
import { WifiOff, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

// Import Firebase Services
import { 
  subscribeToCollection, 
  addProductToDb, 
  updateProductInDb, 
  deleteProductFromDb,
  addDistributorToDb,
  updateDistributorInDb,
  deleteDistributorFromDb,
  upsertDistributorStock,
  deleteDistributorStock,
  addSaleToDb,
  deleteSaleFromDb,
  addPayoutToDb,
  deletePayoutFromDb
} from './services/firebaseService';

// UUID Polyfill / Helper for older browsers or non-secure contexts
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // State is now just a mirror of the Database
  const [products, setProducts] = useState<Product[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [distributorStocks, setDistributorStocks] = useState<DistributorStock[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);

  // Monitor Network Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Real-time Subscriptions ---
  useEffect(() => {
    // We use a flag to track if we've received the initial load of products (critical data)
    // This prevents the app from flickering "Empty" before the cache loads
    let productsLoaded = false;
    
    // 1. Products (Critical)
    const unsubProducts = subscribeToCollection("products", (data) => {
        setProducts(data as Product[]);
        if (!productsLoaded) {
            productsLoaded = true;
            // Once products are loaded (from cache or cloud), we consider the app "Ready"
            setLoading(false);
        }
    });

    // 2. Other Collections
    const unsubDistributors = subscribeToCollection("distributors", (data) => setDistributors(data as Distributor[]));
    const unsubStocks = subscribeToCollection("distributorStocks", (data) => setDistributorStocks(data as DistributorStock[]));
    const unsubSales = subscribeToCollection("sales", (data) => setSalesHistory(data as SaleRecord[]));
    const unsubPayouts = subscribeToCollection("payouts", (data) => setPayouts(data as PayoutRecord[]));

    // Fallback: If no products exist (fresh app), remove loading screen after a short timeout
    const safetyTimeout = setTimeout(() => {
        setLoading(false);
    }, 2000);

    return () => {
      clearTimeout(safetyTimeout);
      unsubProducts();
      unsubDistributors();
      unsubStocks();
      unsubSales();
      unsubPayouts();
    };
  }, []);

  // --- Actions ---

  const handleAddProduct = async (product: Product) => {
    try { await addProductToDb(product); } catch (e) { alert("Error saving product."); console.error(e); }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    try { await updateProductInDb(updatedProduct); } catch (e) { console.error(e); }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProductFromDb(id);
      const relatedStocks = distributorStocks.filter(ds => ds.productId === id);
      relatedStocks.forEach(ds => deleteDistributorStock(ds.id));
    } catch (e) { console.error(e); }
  };

  const handleAddDistributor = async (distributor: Distributor) => {
    try { await addDistributorToDb(distributor); } catch (e) { console.error(e); }
  };

  const handleUpdateDistributor = async (distributor: Distributor) => {
    try { await updateDistributorInDb(distributor); } catch (e) { console.error(e); }
  };

  const handleDeleteDistributor = async (id: string) => {
    try {
      await deleteDistributorFromDb(id);
      const relatedStocks = distributorStocks.filter(ds => ds.distributorId === id);
      relatedStocks.forEach(ds => deleteDistributorStock(ds.id));
    } catch (e) { console.error(e); }
  };

  const handleTransferStock = async (productId: string, distributorId: string, quantity: number) => {
    // 1. Update Warehouse Stock
    const product = products.find(p => p.id === productId);
    if (product) {
        const newStock = Math.max(0, product.stock - quantity);
        await updateProductInDb({ ...product, stock: newStock });
    }

    // 2. Update Distributor Stock
    const existingStock = distributorStocks.find(ds => ds.distributorId === distributorId && ds.productId === productId);
    if (existingStock) {
        await upsertDistributorStock({
            ...existingStock,
            quantity: existingStock.quantity + quantity,
            lastUpdated: new Date().toISOString()
        });
    } else {
        await upsertDistributorStock({
            id: `${distributorId}_${productId}`, 
            distributorId,
            productId,
            quantity,
            lastUpdated: new Date().toISOString()
        });
    }
  };

  const handleReturnStock = async (distributorId: string, productId: string, quantity: number) => {
      const existingStock = distributorStocks.find(ds => ds.distributorId === distributorId && ds.productId === productId);
      if (existingStock) {
          await upsertDistributorStock({
              ...existingStock,
              quantity: Math.max(0, existingStock.quantity - quantity),
              lastUpdated: new Date().toISOString()
          });
      }
      const product = products.find(p => p.id === productId);
      if (product) {
          await updateProductInDb({ ...product, stock: product.stock + quantity });
      }
  };

  // Direct Sale Logic (Updated)
  const handleDirectSale = async (productId: string, quantity: number, salePrice: number, soldByDistributorId?: string) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      if (soldByDistributorId) {
          // Case A: Sold by Distributor -> Deduct from THEIR stock
          const distStock = distributorStocks.find(ds => ds.distributorId === soldByDistributorId && ds.productId === productId);
          
          if (!distStock || distStock.quantity < quantity) {
              alert("Error: Distributor does not have enough stock for this sale.");
              return; 
          }

          await upsertDistributorStock({
              ...distStock,
              quantity: distStock.quantity - quantity,
              lastUpdated: new Date().toISOString()
          });

      } else {
          // Case B: Sold by Store (Direct) -> Deduct from Warehouse
          if (product.stock < quantity) {
              alert("Error: Not enough stock in warehouse.");
              return;
          }
          await updateProductInDb({ ...product, stock: Math.max(0, product.stock - quantity) });
      }

      // Calculate Commission
      // Profit = Sale Price - Cost Price. 
      // If sold by distributor, they get the profit as commission.
      let commissionAmount = 0;
      if (soldByDistributorId) {
          const profitPerItem = salePrice - product.cost;
          commissionAmount = Math.max(0, profitPerItem * quantity);
      }

      // Add to Sales History
      const newSale: SaleRecord = {
          id: generateId(),
          productId,
          productName: product.name,
          quantity,
          salePrice,
          totalAmount: salePrice * quantity,
          date: new Date().toISOString(),
          soldByDistributorId: soldByDistributorId || null,
          commissionAmount,
          costPriceSnapshot: product.cost
      };
      await addSaleToDb(newSale);
  };

  // Delete Sale (Undo) - Logic Updated
  const handleDeleteSale = async (saleId: string) => {
      const sale = salesHistory.find(s => s.id === saleId);
      if (!sale) return;

      if (sale.soldByDistributorId) {
          // A: Return to Distributor Stock
          const distStock = distributorStocks.find(ds => ds.distributorId === sale.soldByDistributorId && ds.productId === sale.productId);
          if (distStock) {
               await upsertDistributorStock({
                   ...distStock,
                   quantity: distStock.quantity + sale.quantity,
                   lastUpdated: new Date().toISOString()
               });
          } else {
               // If stock record was deleted (empty), recreate it
               await upsertDistributorStock({
                   id: `${sale.soldByDistributorId}_${sale.productId}`,
                   distributorId: sale.soldByDistributorId,
                   productId: sale.productId,
                   quantity: sale.quantity,
                   lastUpdated: new Date().toISOString()
               });
          }
      } else {
          // B: Return to Warehouse
          const product = products.find(p => p.id === sale.productId);
          if (product) {
              await updateProductInDb({ ...product, stock: product.stock + sale.quantity });
          }
      }

      // Finally, delete the record
      await deleteSaleFromDb(saleId);
  };

  const handleRecordPayout = async (distributorId: string, amount: number, note: string, type: 'PAYMENT' | 'ADJUSTMENT_ADD' | 'ADJUSTMENT_DEDUCT' = 'PAYMENT') => {
      const newPayout: PayoutRecord = {
          id: generateId(),
          distributorId,
          amount,
          date: new Date().toISOString(),
          note,
          type
      };
      await addPayoutToDb(newPayout);
  };

  const handleDeletePayout = async (id: string) => {
      try { await deletePayoutFromDb(id); } catch(e) { console.error(e); }
  }

  if (loading) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
            <RefreshCw className="animate-spin text-violet-600" size={32} />
            <p className="font-medium">Loading JewelTrack...</p>
        </div>
      );
  }

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard products={products} distributors={distributors} distributorStocks={distributorStocks} />;
      case 'INVENTORY':
        return <Inventory products={products} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onDirectSale={(pid, qty, price) => handleDirectSale(pid, qty, price)} />;
      case 'WAREHOUSE':
        return <Warehouse products={products} />;
      case 'DISTRIBUTORS':
        return <Distributors distributors={distributors} products={products} distributorStocks={distributorStocks} onAddDistributor={handleAddDistributor} onUpdateDistributor={handleUpdateDistributor} onDeleteDistributor={handleDeleteDistributor} />;
      case 'SCANNER':
        return <Scanner products={products} distributors={distributors} onTransfer={handleTransferStock} />;
      case 'RETURNS':
        return <Returns distributors={distributors} products={products} distributorStocks={distributorStocks} onReturnStock={handleReturnStock} />;
      case 'SALES':
        return <Sales sales={salesHistory} products={products} distributors={distributors} distributorStocks={distributorStocks} onDirectSale={handleDirectSale} onDeleteSale={handleDeleteSale} />;
      case 'PAYOUTS':
        return <Payouts distributors={distributors} sales={salesHistory} payouts={payouts} onRecordPayout={handleRecordPayout} onDeletePayout={handleDeletePayout} />;
      default:
        return <Dashboard products={products} distributors={distributors} distributorStocks={distributorStocks} />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout currentView={currentView} onChangeView={setCurrentView}>
        
        {/* 1. Missing Config Warning (Demo Mode) */}
        {!isFirebaseInitialized && (
          <div className="bg-red-50 text-red-800 px-4 py-2 text-sm text-center font-medium border-b border-red-200 flex items-center justify-center gap-2">
              <CloudOff size={16} />
              Demo Mode: No database connected. Data is saved to Local Storage only.
          </div>
        )}

        {/* 2. Configured but Offline (Sync Pending) */}
        {isFirebaseInitialized && !isOnline && (
          <div className="bg-slate-800 text-slate-100 px-4 py-2 text-xs md:text-sm text-center font-medium border-b border-slate-700 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-4">
              <WifiOff size={14} className="text-amber-400" />
              <span>You are offline. Changes are saved locally and will <span className="text-amber-400 font-bold">auto-sync</span> when online.</span>
          </div>
        )}

        {renderView()}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;