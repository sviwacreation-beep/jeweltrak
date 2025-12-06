
import React, { useState, useEffect, useRef } from 'react';
import { SaleRecord, Product, Distributor, DistributorStock } from '../types';
import { ShoppingBag, ScanBarcode, X, Camera, StopCircle, Search, Plus, User, Trash2, AlertTriangle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface SalesProps {
  sales: SaleRecord[];
  products: Product[];
  distributors: Distributor[];
  distributorStocks: DistributorStock[];
  onDirectSale: (productId: string, quantity: number, salePrice: number, soldByDistributorId?: string) => void;
  onDeleteSale: (saleId: string) => void;
}

export const Sales: React.FC<SalesProps> = ({ sales, products, distributors, distributorStocks, onDirectSale, onDeleteSale }) => {
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string|null>(null);
  
  // Manual Search State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSearchTerm, setManualSearchTerm] = useState('');

  // Sell Form State
  const [sellQty, setSellQty] = useState('1');
  const [sellPrice, setSellPrice] = useState('');
  const [soldBy, setSoldBy] = useState<string>(''); // '' = Me, otherwise Distributor ID
  
  // Delete Modal State
  const [saleToDelete, setSaleToDelete] = useState<SaleRecord | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  // Helper to get total distributor stock for a product
  const getDistributorTotalStock = (productId: string) => {
      return distributorStocks
        .filter(ds => ds.productId === productId)
        .reduce((sum, ds) => sum + ds.quantity, 0);
  };

  // Filter products for manual search
  // SHOW if: Name matches AND (Warehouse Stock > 0 OR Any Distributor has Stock)
  const searchResults = manualSearchTerm.trim() === '' 
    ? [] 
    : products.filter(p => {
        const matchesName = (p.name.toLowerCase().includes(manualSearchTerm.toLowerCase()) || 
                             p.sku.toLowerCase().includes(manualSearchTerm.toLowerCase()));
        
        const hasStockAnywhere = p.stock > 0 || getDistributorTotalStock(p.id) > 0;
        
        return matchesName && hasStockAnywhere;
      });

  useEffect(() => {
    return () => {
        const scanner = scannerRef.current;
        if(scanner) {
            try {
                if(scanner.isScanning) {
                    scanner.stop().then(() => {
                        try { scanner.clear(); } catch(e){}
                    }).catch(console.error);
                } else {
                    try { scanner.clear(); } catch(e){}
                }
            } catch(e) { console.warn(e); }
        }
    }
  }, []);

  const startScanner = () => {
      setIsScanning(true);
      setScanError(null);
      setTimeout(() => {
        if(scannerRef.current) {
            try{ scannerRef.current.clear(); } catch(e){}
        }
        const html5QrCode = new Html5Qrcode("sales-reader");
        scannerRef.current = html5QrCode;
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10 },
            onScanSuccess,
            (err) => {}
        ).catch(err => {
            console.error(err);
            setIsScanning(false);
            setScanError("Failed to start camera.");
        });
      }, 100);
  };

  const stopScanner = async () => {
      if(scannerRef.current) {
          try {
              if (scannerRef.current.isScanning) {
                  await scannerRef.current.stop();
              }
              try { scannerRef.current.clear(); } catch(e){}
          } catch(e) { console.error(e); }
          scannerRef.current = null;
      }
      setIsScanning(false);
  };

  const onScanSuccess = (decodedText: string) => {
      stopScanner();
      try {
          let product: Product | undefined;
          try {
              const data = JSON.parse(decodedText);
              if (data.id) product = products.find(p => p.id === data.id);
          } catch {
              product = products.find(p => p.sku === decodedText);
          }

          if (product) {
              selectProductForSale(product);
              setIsScannerModalOpen(false);
          } else {
              alert("Product not found!");
          }
      } catch (e) {
          alert("Invalid QR Code");
      }
  };

  const selectProductForSale = (product: Product) => {
      const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
      audio.play().catch(() => {});
      
      setSelectedProduct(product);
      setSellQty('1');
      setSellPrice(product.price.toString());
      setSoldBy(''); // Default to Me
      setIsManualModalOpen(false);
  };

  // Determine Available Stock based on selection
  const getAvailableStockForSelection = () => {
      if (!selectedProduct) return 0;
      if (!soldBy) return selectedProduct.stock; // Warehouse
      
      const distStock = distributorStocks.find(ds => ds.productId === selectedProduct.id && ds.distributorId === soldBy);
      return distStock ? distStock.quantity : 0;
  };

  const availableStock = getAvailableStockForSelection();

  const handleSellSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct) {
        const qty = parseInt(sellQty);
        const price = parseFloat(sellPrice);
        
        // Validate against the SPECIFIC source stock
        if (qty > 0 && qty <= availableStock) {
            onDirectSale(selectedProduct.id, qty, price, soldBy || undefined);
            setSelectedProduct(null);
        } else {
            alert(`Invalid Quantity. Source only has ${availableStock} units.`);
        }
    }
  };

  const closeScannerModal = () => {
      stopScanner();
      setIsScannerModalOpen(false);
  };

  const initiateDelete = (sale: SaleRecord) => {
      setSaleToDelete(sale);
  };

  const confirmDelete = () => {
      if (saleToDelete) {
          onDeleteSale(saleToDelete.id);
          setSaleToDelete(null);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Direct Sales History</h2>
          <p className="text-slate-500">Log of items sold directly.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={() => setIsManualModalOpen(true)}
                className="flex-1 md:flex-none justify-center bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
            >
                <Plus size={20} />
                Manual Sale
            </button>
            <button 
                onClick={() => setIsScannerModalOpen(true)}
                className="flex-1 md:flex-none justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm shadow-emerald-200"
            >
                <ScanBarcode size={20} />
                Scan to Sell
            </button>
        </div>
      </div>
      
      <div className="bg-white border border-slate-200 px-4 py-4 rounded-xl shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs text-slate-500 font-medium uppercase">Total Revenue (All Time)</p>
                <p className="text-2xl font-bold text-emerald-600">₹{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-full text-emerald-600">
                <ShoppingBag size={24} />
            </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3 md:px-6 md:py-4">Date</th>
                <th className="px-4 py-3 md:px-6 md:py-4">Product</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-center">Qty</th>
                <th className="px-4 py-3 md:px-6 md:py-4">Sold By</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-right">Total</th>
                <th className="px-4 py-3 md:px-6 md:py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 flex flex-col items-center">
                        <ShoppingBag className="mb-2 text-slate-300" size={32} />
                        <span className="text-lg font-medium text-slate-700">No sales recorded yet</span>
                        <span className="text-sm text-slate-400">Scan items or add manual sales.</span>
                    </td>
                </tr>
              ) : sales.map((sale) => {
                const sellerName = sale.soldByDistributorId 
                    ? distributors.find(d => d.id === sale.soldByDistributorId)?.name || 'Unknown Distributor'
                    : 'Direct / Store';
                
                return (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 md:px-6 md:py-4 text-slate-500 whitespace-nowrap text-xs md:text-sm">
                        {new Date(sale.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 font-medium text-slate-900">{sale.productName}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-bold text-xs">
                            {sale.quantity}
                        </span>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-slate-600 text-xs">
                        <span className={`px-2 py-1 rounded border ${sale.soldByDistributorId ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                           {sellerName}
                        </span>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right font-bold text-slate-900">₹{sale.totalAmount}</td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                        <button 
                            onClick={() => initiateDelete(sale)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Sale"
                        >
                            <Trash2 size={16} />
                        </button>
                    </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {saleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl border-t-4 border-red-500">
                <div className="flex items-center gap-3 mb-4 text-red-600">
                   <div className="p-2 bg-red-100 rounded-full">
                     <AlertTriangle size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900">Undo Sale?</h3>
                </div>
                <p className="text-slate-600 mb-2">Are you sure you want to delete this sale for <span className="font-bold text-slate-900">"{saleToDelete.productName}"</span>?</p>
                <p className="text-sm text-slate-500 mb-6">This will remove the revenue record and <span className="font-bold text-slate-700">restock the items</span> back to inventory.</p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setSaleToDelete(null)}
                        className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 bg-white"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200"
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MANUAL SEARCH MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-slate-800">Add Sale</h3>
                     <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                 </div>
                 <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" autoFocus placeholder="Search SKU or Name..." 
                        value={manualSearchTerm} onChange={(e) => setManualSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 text-slate-900"
                    />
                 </div>
                 <div className="flex-1 overflow-y-auto min-h-[200px]">
                    {manualSearchTerm === '' ? (
                         <div className="text-center text-slate-400 mt-8">Type to search for products</div>
                    ) : searchResults.length === 0 ? (
                         <div className="text-center text-slate-500 mt-8">No matching products found in stock.</div>
                    ) : (
                        <div className="space-y-2">
                            {searchResults.map(p => {
                                const distStock = getDistributorTotalStock(p.id);
                                return (
                                <button key={p.id} onClick={() => selectProductForSale(p)} className="w-full text-left p-3 rounded-lg border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-colors flex items-center gap-3">
                                    <img src={p.imageUrl} alt="" className="w-10 h-10 rounded bg-slate-200 object-cover" />
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                        <div className="text-xs text-slate-500">SKU: {p.sku}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-emerald-600">₹{p.price}</div>
                                        <div className="text-xs text-slate-400">
                                            {p.stock > 0 ? `WH: ${p.stock}` : ''}
                                            {p.stock > 0 && distStock > 0 ? ' | ' : ''}
                                            {distStock > 0 ? `Dist: ${distStock}` : ''}
                                            {p.stock === 0 && distStock === 0 ? 'Out of Stock' : ''}
                                        </div>
                                    </div>
                                </button>
                                );
                            })}
                        </div>
                    )}
                 </div>
             </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      {isScannerModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-md p-6 relative flex flex-col items-center">
                  <button onClick={closeScannerModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X /></button>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Scan Product to Sell</h3>
                  <div className="bg-black rounded-lg overflow-hidden w-full max-w-[300px] aspect-[3/4] relative border-2 border-slate-300 flex items-center justify-center">
                     {!isScanning ? (
                         <button onClick={startScanner} className="bg-emerald-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg">
                             <Camera size={20} /> Start Camera
                         </button>
                     ) : (
                         <>
                            <style>{`#sales-reader video { object-fit: cover !important; width: 100% !important; height: 100% !important}`}</style>
                            <div id="sales-reader" className="w-full h-full"></div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-56 h-56 border-2 border-white/50 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]">
                                    {/* Corners */}
                                </div>
                            </div>
                            <button onClick={stopScanner} className="absolute bottom-4 bg-black/50 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-black/70 backdrop-blur-sm z-10">
                                <StopCircle size={14} /> Stop
                            </button>
                         </>
                     )}
                     {scanError && !isScanning && <div className="absolute bottom-4 text-red-600 text-sm font-medium bg-red-50 px-3 py-1 rounded-full">{scanError}</div>}
                  </div>
              </div>
          </div>
      )}

      {/* SELL FORM MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 mx-auto mb-3 rounded-lg overflow-hidden border border-slate-200">
                        <img src={selectedProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedProduct.name}</h3>
                    <p className="text-sm text-slate-500">SKU: {selectedProduct.sku}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full font-bold ${availableStock > 0 ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-700'}`}>
                        Available Stock: {availableStock}
                    </span>
                </div>

                <form onSubmit={handleSellSubmit} className="space-y-4">
                    
                    {/* SOLD BY DISTRIBUTOR SELECTION - Moved Up */}
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Sold By (Source)</label>
                         <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                                value={soldBy}
                                onChange={e => setSoldBy(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900 appearance-none"
                            >
                                <option value="">Direct / Warehouse (Stock: {selectedProduct.stock})</option>
                                {distributors.map(d => {
                                    const dStock = distributorStocks.find(ds => ds.productId === selectedProduct.id && ds.distributorId === d.id)?.quantity || 0;
                                    return (
                                        <option key={d.id} value={d.id}>{d.name} (Stock: {dStock})</option>
                                    );
                                })}
                            </select>
                         </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Sold</label>
                        <input 
                            type="number" min="1" max={Math.max(1, availableStock)} 
                            value={sellQty} onChange={e => setSellQty(e.target.value)} 
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-center font-bold text-lg bg-white text-slate-900" 
                            autoFocus 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Total Sale Price (₹)</label>
                        <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-center bg-white text-slate-900" />
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button type="button" onClick={() => setSelectedProduct(null)} className="flex-1 py-2 border rounded-lg hover:bg-slate-50 bg-white">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={availableStock <= 0}
                            className={`flex-1 py-2 text-white rounded-lg font-bold ${availableStock > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'}`}
                        >
                            Confirm Sale
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
