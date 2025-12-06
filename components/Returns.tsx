
import React, { useState, useRef, useEffect } from 'react';
import { Product, Distributor, DistributorStock } from '../types';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeftRight, RotateCcw, CheckCircle2, ScanLine, AlertCircle, X, Keyboard, Camera, StopCircle } from 'lucide-react';

interface ReturnsProps {
  distributors: Distributor[];
  products: Product[];
  distributorStocks: DistributorStock[];
  onReturnStock: (distributorId: string, productId: string, quantity: number) => void;
}

export const Returns: React.FC<ReturnsProps> = ({ distributors, products, distributorStocks, onReturnStock }) => {
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>('');
  
  // Scanner / Logic State
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [returnQty, setReturnQty] = useState<string>('1');
  const [successData, setSuccessData] = useState<{ product: Product, quantity: number } | null>(null);
  
  // Manual Input State
  const [manualSku, setManualSku] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Modes
  const [isBulkMode, setIsBulkMode] = useState(false);
  const isBulkModeRef = useRef(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
      isBulkModeRef.current = isBulkMode;
  }, [isBulkMode]);

  // Cleanup
  useEffect(() => {
    return () => {
        const scanner = scannerRef.current;
        if(scanner) {
            try {
                if (scanner.isScanning) {
                    scanner.stop()
                        .then(() => {
                            try { scanner.clear(); } catch(e) {}
                        })
                        .catch(console.error);
                } else {
                    try { scanner.clear(); } catch(e) {}
                }
            } catch (e) { console.warn(e); }
        }
    }
  }, []);

  // Filter suggestions
  const suggestions = manualSku.length > 0 
    ? products.filter(p => 
        (p.name.toLowerCase().includes(manualSku.toLowerCase()) || 
         p.sku.toLowerCase().includes(manualSku.toLowerCase()))
      ).slice(0, 5) 
    : [];

  const startScanner = () => {
      if (!selectedDistributorId) return;
      setError(null);
      setIsScanning(true);

      setTimeout(() => {
          if (scannerRef.current) {
             try { scannerRef.current.clear(); } catch(e){}
          }
          const html5QrCode = new Html5Qrcode("return-reader");
          scannerRef.current = html5QrCode;
          html5QrCode.start(
              { facingMode: "environment" },
              { 
                  fps: 10, 
                  // No aspectRatio
              },
              onScanSuccess,
              (err) => { /* ignore frame errors */ }
          ).catch(err => {
              console.error("Scanner start error", err);
              setIsScanning(false);
              setError("Camera failed to start. Check permissions.");
          });
      }, 100);
  };

  const stopScanner = async () => {
      if (scannerRef.current) {
          try {
              if (scannerRef.current.isScanning) {
                  await scannerRef.current.stop();
              }
              try { scannerRef.current.clear(); } catch(e) {}
          } catch(e) { console.error(e); }
          scannerRef.current = null;
      }
      setIsScanning(false);
  };

  const processProduct = (product: Product) => {
    // Check if distributor actually has this stock
    const stockRecord = distributorStocks.find(ds => ds.distributorId === selectedDistributorId && ds.productId === product.id);
    const availableQty = stockRecord ? stockRecord.quantity : 0;

    if (availableQty <= 0) {
        setError(`${distributors.find(d => d.id === selectedDistributorId)?.name} does not have any "${product.name}" in stock.`);
        return;
    }

    const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
    audio.play().catch(() => {});

    if (isBulkModeRef.current) {
        setPendingProduct(product);
        setReturnQty('1');
        setError(null);
    } else {
        // Single mode return
        onReturnStock(selectedDistributorId, product.id, 1);
        setSuccessData({ product, quantity: 1 });
        setError(null);
    }
    setManualSku('');
    setShowSuggestions(false);
  };

  const onScanSuccess = (decodedText: string) => {
      stopScanner(); // Stop immediately

      try {
          let product: Product | undefined;
          try {
              const data = JSON.parse(decodedText);
              if (data.id) product = products.find(p => p.id === data.id);
          } catch {
              product = products.find(p => p.sku === decodedText);
          }

          if (product) {
              processProduct(product);
          } else {
              setError("Product not found in system.");
          }
      } catch (e) {
          setError("Invalid QR.");
      }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualSku.trim()) return;

      const product = products.find(p => 
          p.sku.toLowerCase() === manualSku.toLowerCase().trim() || 
          p.name.toLowerCase() === manualSku.toLowerCase().trim()
      );

      if (product) {
          processProduct(product);
      } else {
          setError(`Product "${manualSku}" not found.`);
      }
  };

  const selectSuggestion = (product: Product) => {
      processProduct(product);
  };

  const confirmReturn = () => {
      if (pendingProduct && selectedDistributorId) {
          const qty = parseInt(returnQty);
          const stockRecord = distributorStocks.find(ds => ds.distributorId === selectedDistributorId && ds.productId === pendingProduct.id);
          const availableQty = stockRecord ? stockRecord.quantity : 0;

          if (qty <= 0) {
              setError("Quantity must be > 0");
              return;
          }
          if (qty > availableQty) {
              setError(`Distributor only has ${availableQty} units.`);
              return;
          }

          onReturnStock(selectedDistributorId, pendingProduct.id, qty);
          setSuccessData({ product: pendingProduct, quantity: qty });
          setPendingProduct(null);
          setError(null);
      }
  };

  const handleNext = () => {
      setSuccessData(null);
      startScanner(); // Restart for next
  };

  const cancelReturn = () => {
      setPendingProduct(null);
      setError(null);
      startScanner();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">Scan Returns</h2>
        <p className="text-slate-500">Scan QR or enter SKU to receive stock back from {distributors.find(d => d.id === selectedDistributorId)?.name || 'a distributor'}.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">Return From (Distributor)</label>
        <select 
            className="w-full p-3 border border-slate-300 rounded-lg bg-white text-slate-900 text-lg focus:ring-2 focus:ring-violet-500 outline-none"
            value={selectedDistributorId}
            onChange={(e) => {
                setSelectedDistributorId(e.target.value);
                setSuccessData(null);
                setPendingProduct(null);
                setError(null);
                stopScanner();
            }}
        >
            <option value="">-- Select Distributor --</option>
            {distributors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
            ))}
        </select>
        
        {selectedDistributorId && (
            <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-100">
                <span className={`text-sm font-medium ${!isBulkMode ? 'text-violet-700 font-bold' : 'text-slate-400'}`}>Single Item (1 pc)</span>
                <button 
                    onClick={() => setIsBulkMode(!isBulkMode)}
                    className={`w-14 h-7 flex items-center rounded-full p-1 duration-300 ease-in-out ${isBulkMode ? 'bg-violet-600' : 'bg-slate-300'}`}
                >
                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out ${isBulkMode ? 'translate-x-7' : ''}`}></div>
                </button>
                <span className={`text-sm font-medium ${isBulkMode ? 'text-violet-700 font-bold' : 'text-slate-400'}`}>Bulk / Multi</span>
            </div>
        )}
      </div>

      {selectedDistributorId && !pendingProduct && !successData && (
        <div className="space-y-6">
            
            {/* Camera Section */}
            <div className="space-y-4">
                {!isScanning ? (
                    <button 
                        onClick={startScanner}
                        className="w-full py-8 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-lg flex flex-col items-center justify-center gap-3 transition-transform active:scale-95"
                    >
                        <div className="bg-white/20 p-4 rounded-full">
                            <Camera size={40} />
                        </div>
                        <span className="text-xl font-bold">Start Return Scanner</span>
                    </button>
                ) : (
                    <div className="bg-black rounded-xl overflow-hidden shadow-lg border-4 border-slate-800 relative w-full max-w-sm mx-auto aspect-[3/4]">
                        <style>{`
                            #return-reader video {
                                object-fit: cover !important;
                                width: 100% !important;
                                height: 100% !important;

                            }
                        `}</style>
                        <div id="return-reader" className="w-full h-full"></div>
                        
                         {/* Visual Viewfinder Overlay - Square Box */}
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]">
                                <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-white -ml-1 -mt-1"></div>
                                <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-white -mr-1 -mt-1"></div>
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-white -ml-1 -mb-1"></div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-white -mr-1 -mb-1"></div>
                            </div>
                        </div>

                        <button 
                            onClick={stopScanner}
                            className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-black/70 backdrop-blur-sm z-10"
                        >
                            <StopCircle size={16} /> Stop
                        </button>
                         <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs pointer-events-none">
                            Scanning full frame...
                        </div>
                    </div>
                )}
            </div>

            {/* Manual SKU Entry */}
            <div className="relative flex items-center">
                <div className="absolute inset-x-0 h-px bg-slate-200"></div>
                <div className="relative z-10 bg-slate-50 px-4 mx-auto text-slate-400 text-sm font-medium">OR ENTER SKU</div>
            </div>

            <form onSubmit={handleManualSubmit} className="relative flex gap-2">
                <div className="relative flex-1">
                    <Keyboard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text"
                        value={manualSku}
                        onChange={(e) => {
                            setManualSku(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Type SKU or Name"
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900 shadow-sm"
                        autoComplete="off"
                    />
                     {/* Autocomplete Suggestions */}
                     {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                            {suggestions.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => selectSuggestion(p)}
                                    className="w-full text-left px-4 py-3 hover:bg-violet-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                                >
                                    <div className="w-8 h-8 rounded bg-slate-100 flex-shrink-0 overflow-hidden">
                                        <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800 text-sm">{p.name}</div>
                                        <div className="text-xs text-slate-500">SKU: {p.sku}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button 
                    type="submit"
                    className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-900 shadow-lg"
                >
                    Return
                </button>
            </form>
             {/* Click outside listener */}
             {showSuggestions && suggestions.length > 0 && (
                 <div className="fixed inset-0 z-10" onClick={() => setShowSuggestions(false)}></div>
            )}

             {/* Error Feedback */}
             {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex justify-between items-center animate-pulse">
                     <div className="flex items-center">
                         <div className="bg-red-100 p-2 rounded-full mr-3 text-red-600">
                            <AlertCircle size={24} />
                        </div>
                        <p className="text-red-800 font-medium">{error}</p>
                    </div>
                     <button 
                        onClick={() => setError(null)}
                        className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                        title="Dismiss"
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
      )}

      {/* SUCCESS SCREEN */}
      {successData && (
          <div className="bg-amber-500 rounded-xl p-8 text-white shadow-xl text-center flex flex-col items-center justify-center min-h-[400px]">
               <div className="bg-white/20 p-6 rounded-full mb-6 animate-bounce">
                  <RotateCcw size={64} className="text-white" />
               </div>
               <h3 className="text-3xl font-bold mb-2">Return Processed!</h3>
               <p className="text-amber-100 text-lg mb-8">
                  {successData.quantity}x {successData.product.name} returned to warehouse.
               </p>
               <button 
                  onClick={handleNext}
                  className="bg-white text-amber-600 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-amber-50 transition-transform active:scale-95 flex items-center gap-2"
                  autoFocus
               >
                  <ScanLine size={24} />
                  Scan Next Return
               </button>
          </div>
      )}

      {/* Quantity Modal (Only in Bulk Mode) */}
      {pendingProduct && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Return Stock</h3>
                      <button onClick={cancelReturn} className="text-slate-400"><X /></button>
                  </div>
                  
                  <div className="mb-6 text-center">
                      <div className="inline-block p-2 bg-slate-100 rounded-lg mb-2">
                        <img src={pendingProduct.imageUrl} className="w-20 h-20 object-cover rounded-md" alt="" />
                      </div>
                      <h4 className="font-medium text-slate-900">{pendingProduct.name}</h4>
                      <p className="text-sm text-slate-500 mb-1">SKU: {pendingProduct.sku}</p>
                      
                      {/* Check distributor stock */}
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">
                          Distributor has: {distributorStocks.find(ds => ds.distributorId === selectedDistributorId && ds.productId === pendingProduct?.id)?.quantity || 0}
                      </span>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Return</label>
                          <input 
                            type="number" 
                            min="1" 
                            value={returnQty}
                            onChange={(e) => setReturnQty(e.target.value)}
                            className="w-full text-center text-2xl font-bold p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900"
                            autoFocus
                          />
                      </div>

                      {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                      <div className="flex gap-3">
                          <button onClick={cancelReturn} className="flex-1 py-3 border border-slate-300 rounded-lg font-medium text-slate-600">Cancel</button>
                          <button onClick={confirmReturn} className="flex-1 py-3 bg-amber-500 text-white rounded-lg font-bold shadow-lg">Confirm</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
