
import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../types';
import { Plus, Trash2, Printer, Loader2, Wand2, Check, X, Upload, Image as ImageIcon, Search, Pencil, ShoppingBag, AlertTriangle, AlertCircle, Camera, FileDown } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { generateProductDescription } from '../services/geminiService';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Remove: "data:application/pdf;base64,"
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
};


interface InventoryProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onDirectSale: (productId: string, quantity: number, salePrice: number) => void;
}

// UUID Helper
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct, onDirectSale }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('1'); 
  const [imagePreview, setImagePreview] = useState<string>('');
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sell Modal State
  const [selectedProductForSale, setSelectedProductForSale] = useState<Product | null>(null);
  const [sellQty, setSellQty] = useState('1');
  const [sellPrice, setSellPrice] = useState('');

  // Category State
  const [categories, setCategories] = useState(['Necklace', 'Earrings', 'Bangle', 'Ring', 'Bracelet', 'Mangalsutra', 'Set']);
  const [type, setType] = useState('Necklace');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Print State
  const [printingProduct, setPrintingProduct] = useState<Product | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Filter products
  const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Camera Logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraOpen) {
        const startCam = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access error:", err);
                alert("Could not access camera. Please ensure you have granted permission.");
                setIsCameraOpen(false);
            }
        };
        startCam();
    }

    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [isCameraOpen]);

  // Helper: Compress Image to prevent Storage Quota Errors
  const compressImage = (sourceCanvas: HTMLCanvasElement, quality = 0.7): string => {
      // Create a temporary canvas to resize
      const MAX_WIDTH = 600; // Limit width to 600px
      const scale = sourceCanvas.width > MAX_WIDTH ? MAX_WIDTH / sourceCanvas.width : 1;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sourceCanvas.width * scale;
      tempCanvas.height = sourceCanvas.height * scale;
      
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(sourceCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
          // Export as JPEG with reduced quality
          return tempCanvas.toDataURL('image/jpeg', quality);
      }
      return sourceCanvas.toDataURL('image/jpeg', quality);
  };

  const capturePhoto = () => {
      if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0);
              const dataUrl = compressImage(canvas); // Compress before saving
              setImagePreview(dataUrl);
              setIsCameraOpen(false);
          }
      }
  };

  const handleGenerateDescription = async () => {
    if (!name) return;
    setIsGenerating(true);
    const desc = await generateProductDescription(name, type);
    setDescription(desc);
    setIsGenerating(false);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setCategories([...categories, newCategoryName.trim()]);
      setType(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(img, 0, 0);
              const compressedDataUrl = compressImage(canvas);
              setImagePreview(compressedDataUrl);
          }
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const openAddModal = () => {
      setEditingId(null);
      resetForm();
      setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
      setEditingId(product.id);
      setSku(product.sku);
      setName(product.name);
      setDescription(product.description);
      setPrice(product.price.toString());
      setCost(product.cost.toString());
      setStock(product.stock.toString());
      setImagePreview(product.imageUrl);
      setIsModalOpen(true);
  };

  const openSellModal = (product: Product) => {
      setSelectedProductForSale(product);
      setSellQty('1');
      setSellPrice(product.price.toString());
      setIsSellModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = () => {
      if (productToDelete) {
          onDeleteProduct(productToDelete.id);
          setProductToDelete(null);
      }
  };

  const isSkuDuplicate = products.some(p => p.sku === sku && p.id !== editingId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for Duplicate SKU
    if (isSkuDuplicate) {
        alert(`Error: A product with SKU "${sku}" already exists. Please use a unique SKU.`);
        return;
    }

    if (editingId) {
        // Update existing
        const updatedProduct: Product = {
            id: editingId,
            sku,
            name,
            description,
            price: parseFloat(price) || 0,
            cost: parseFloat(cost) || 0,
            stock: parseInt(stock) || 0,
            imageUrl: imagePreview || `https://picsum.photos/seed/${sku}/200/200`,
            createdAt: new Date().toISOString(), 
        };
        const original = products.find(p => p.id === editingId);
        if (original) updatedProduct.createdAt = original.createdAt;
        
        onUpdateProduct(updatedProduct);
    } else {
        // Create new
        const newProduct: Product = {
            id: generateId(),
            sku,
            name,
            description,
            price: parseFloat(price) || 0,
            cost: parseFloat(cost) || 0,
            stock: parseInt(stock) || 0,
            imageUrl: imagePreview || `https://picsum.photos/seed/${sku}/200/200`,
            createdAt: new Date().toISOString(),
        };
        onAddProduct(newProduct);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleSellSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedProductForSale) {
          const qty = parseInt(sellQty);
          const price = parseFloat(sellPrice);
          if (qty > 0 && qty <= selectedProductForSale.stock) {
              onDirectSale(selectedProductForSale.id, qty, price);
              setIsSellModalOpen(false);
          } else {
              alert("Invalid Quantity");
          }
      }
  };

  const resetForm = () => {
    setSku('');
    setName('');
    setDescription('');
    setPrice('');
    setCost('');
    setStock('1');
    setImagePreview('');
    setType(categories[0]);
  };


  const openPrintModal = (product: Product) => {
    setPrintingProduct(product);
  };

const handlePrint = async () => {
  // If running inside Capacitor native app (APK)
  if (Capacitor.isNativePlatform()) {
    // On native, we’ll reuse the PDF generation + share flow
    await handleDownloadPdf();
    return;
  }

  // On normal web (browser): use regular print
  setTimeout(() => {
    window.print();
  }, 100);
};


  const handleDownloadPdf = async () => {
    if (!printingProduct) return;
    setIsPdfGenerating(true);

    const originalElement = document.getElementById('printable-label');
    if (!originalElement) {
        alert("Could not find label element");
        setIsPdfGenerating(false);
        return;
    }

    // Clone the element for high-res capture (ignoring on-screen scaling)
    const clonedElement = originalElement.cloneNode(true) as HTMLElement;
    
    // CRITICAL FIX: Manually copy canvas content because cloneNode(true) creates empty canvases
    const originalCanvases = originalElement.querySelectorAll('canvas');
    const clonedCanvases = clonedElement.querySelectorAll('canvas');
    
    Array.from(originalCanvases).forEach((orig, index) => {
        const clone = clonedCanvases[index];
        if (clone) {
            const ctx = clone.getContext('2d');
            if (ctx) {
                // Explicitly set width/height to match original's internal bitmap size
                clone.width = orig.width;
                clone.height = orig.height;
                ctx.drawImage(orig, 0, 0);
            }
        }
    });

    // Style the clone to be perfect for capture
    clonedElement.style.position = 'fixed';
    clonedElement.style.top = '-9999px';
    clonedElement.style.left = '-9999px';
    // Reset transform to ensure full size capture
    clonedElement.style.transform = 'none'; 
    clonedElement.style.minWidth = '400px';
    clonedElement.style.width = '400px';
    clonedElement.style.height = '180px';
    clonedElement.style.visibility = 'visible';
    
    document.body.appendChild(clonedElement);

    try {
        // @ts-ignore - html2canvas is loaded from CDN
        if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            throw new Error("PDF libraries not loaded yet. Please wait or check connection.");
        }

        // @ts-ignore
        const canvas = await window.html2canvas(clonedElement, { 
            scale: 4, // High resolution
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');

      // @ts-ignore
      const { jsPDF } = window.jspdf;
      // Label size is 400px x 180px
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [400, 180],
        hotfixes: ['px_scaling']
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 400, 180);

      // Use a consistent filename
      const fileName = `${printingProduct.sku}-label.pdf`;

      if (Capacitor.isNativePlatform()) {
        // 👉 Native (APK): save file and open share sheet
        const pdfBlob = pdf.output('blob');
        const base64Data = await blobToBase64(pdfBlob);

        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });

        await Share.share({
          title: 'Product Label',
          text: 'Share or print this product label.',
          url: result.uri,
          dialogTitle: 'Share product label',
        });
      } else {
        // 👉 Web: fallback to normal save
        pdf.save(fileName);
      }

        
    } catch (e) {
        console.error(e);
        alert("Error creating PDF. Please use the 'Print' button and select 'Save as PDF'.");
    } finally {
        if (document.body.contains(clonedElement)) {
            document.body.removeChild(clonedElement);
        }
        setIsPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Screen Content - Hidden during Print */}
      <div className="no-print space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">All Products</h2>
              <p className="text-slate-500">Manage your product catalog.</p>
            </div>
            <button 
              onClick={openAddModal}
              className="bg-violet-700 hover:bg-violet-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all w-full md:w-auto justify-center"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input 
                  type="text" 
                  placeholder="Search by Name or SKU..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none shadow-sm bg-white text-slate-900"
              />
          </div>

          {/* Product List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-slate-700">Product</th>
                    <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-slate-700">SKU</th>
                    <th className="hidden md:table-cell px-6 py-4 font-semibold text-slate-700">Price</th>
                    <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-slate-700">Stock</th>
                    <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-slate-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            No products found matching your search.
                        </td>
                    </tr>
                  ) : filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <div className="flex items-center gap-3">
                          <img src={product.imageUrl} alt={product.name} className="w-8 h-8 md:w-10 md:h-10 rounded-md object-cover bg-slate-200 border border-slate-200" />
                          <div>
                            <div className="font-medium text-slate-900 line-clamp-1">{product.name}</div>
                            <div className="text-xs text-slate-500 md:hidden">₹{product.price.toFixed(0)}</div>
                            <div className="text-xs text-slate-500 hidden md:block truncate max-w-[200px]">{product.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 font-mono text-slate-600">{product.sku}</td>
                      <td className="hidden md:table-cell px-6 py-4 text-slate-900">₹{product.price.toFixed(2)}</td>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap
                          ${product.stock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          {product.stock > 0 ? `${product.stock} Units` : 'Out'}
                        </span>
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-right">
                        <div className="flex justify-end items-center gap-3 md:gap-2">
                            <button 
                                onClick={() => openSellModal(product)}
                                className="text-slate-400 hover:text-emerald-600 transition-colors"
                                title="Direct Sell"
                                disabled={product.stock <= 0}
                            >
                            <ShoppingBag size={18} />
                            </button>
                            <button 
                                onClick={() => openEditModal(product)}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                title="Edit"
                            >
                            <Pencil size={18} />
                            </button>
                            {/* Printer button visible on all devices */}
                            <button 
                                onClick={() => openPrintModal(product)}
                                className="text-slate-400 hover:text-violet-600 transition-colors"
                                title="Print QR"
                            >
                            <Printer size={18} />
                            </button>
                            <button 
                                onClick={() => handleDeleteClick(product)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete"
                            >
                            <Trash2 size={18} />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Image Input Section */}
              <div className="flex flex-col items-center gap-4 mb-4">
                 <div className={`w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50
                        ${imagePreview ? 'border-violet-500' : 'border-slate-300'}`}>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center text-slate-400 p-2">
                                <ImageIcon className="mx-auto mb-1" size={24} />
                                <span className="text-xs">No Image</span>
                            </div>
                        )}
                 </div>
                 
                 <div className="flex gap-2">
                    <label className="cursor-pointer px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2">
                        <Upload size={16} />
                        Upload
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                    </label>
                    <button 
                        type="button" 
                        onClick={() => setIsCameraOpen(true)}
                        className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                        <Camera size={16} />
                        Take Photo
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SKU / Number</label>
                  <input 
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="e.g. 1001"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none bg-white text-slate-900 ${isSkuDuplicate ? 'border-red-500 ring-red-200' : 'border-slate-300 focus:ring-violet-500'}`}
                  />
                  {isSkuDuplicate && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600 font-medium">
                        <AlertCircle size={12} />
                        <span>Warning: SKU already exists!</span>
                    </div>
                  )}
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                   <input 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Antique Set"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900"
                   />
                </div>
              </div>

              {/* AI Helper Section */}
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                        <Wand2 size={12} /> AI Smart Description
                    </span>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-medium text-amber-800 mb-1">Category</label>
                    <div className="flex gap-2">
                      {isAddingCategory ? (
                        <div className="flex-1 flex gap-2">
                          <input 
                            autoFocus
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="New Category Name"
                            className="flex-1 px-2 py-1 text-sm border border-amber-300 rounded bg-white text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                          <button 
                            type="button" 
                            onClick={handleAddCategory}
                            className="p-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setIsAddingCategory(false)}
                            className="p-1 bg-white text-amber-600 border border-amber-200 rounded hover:bg-amber-50"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <select 
                            value={type} 
                            onChange={e => setType(e.target.value)} 
                            className="flex-1 text-sm px-2 py-2 rounded border border-amber-200 bg-white text-slate-900 outline-none focus:border-amber-400"
                          >
                             {categories.map(cat => (
                               <option key={cat} value={cat}>{cat}</option>
                             ))}
                          </select>
                          <button 
                            type="button"
                            onClick={() => setIsAddingCategory(true)}
                            className="px-3 py-1 bg-white border border-amber-200 rounded text-amber-700 hover:bg-amber-100 hover:text-amber-800 transition-colors"
                            title="Add new category"
                          >
                            <Plus size={16} />
                          </button>
                        </>
                      )}
                    </div>
                 </div>

                 <button 
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGenerating || !name}
                    className="w-full text-xs bg-white border border-amber-300 py-2 rounded text-amber-800 hover:text-amber-900 hover:bg-amber-50 transition-colors flex justify-center items-center gap-2 mt-2"
                 >
                    {isGenerating ? <Loader2 className="animate-spin" size={14} /> : 'Generate Description'}
                 </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none text-sm bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                   <input 
                    type="number"
                    min="0"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900 font-bold"
                   />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost (₹)</label>
                  <input 
                    type="number"
                    value={cost}
                    onChange={e => setCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900"
                  />
                </div>
                <div className="col-span-1">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Sell (₹)</label>
                   <input 
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900"
                   />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 bg-white">Cancel</button>
                <button 
                    type="submit" 
                    disabled={isSkuDuplicate}
                    className={`flex-1 px-4 py-2 text-white rounded-lg shadow-lg ${isSkuDuplicate ? 'bg-slate-400 cursor-not-allowed' : 'bg-violet-700 hover:bg-violet-800 shadow-violet-200'}`}
                >
                    {editingId ? 'Update' : 'Save'} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
            <div className="relative w-full max-w-lg aspect-[3/4] bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
                <button 
                    onClick={() => setIsCameraOpen(false)}
                    className="text-white bg-slate-800/50 p-4 rounded-full backdrop-blur-sm"
                >
                    <X size={24} />
                </button>
                <button 
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 shadow-lg active:scale-95 transition-transform"
                >
                </button>
                <div className="w-14"></div> {/* Spacer for balance */}
            </div>
        </div>
      )}
      

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border-t-4 border-red-500">
                <div className="flex items-center gap-3 mb-4 text-red-600">
                   <div className="p-2 bg-red-100 rounded-full">
                     <AlertTriangle size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900">Delete Product?</h3>
                </div>
                <p className="text-slate-600 mb-2">Are you sure you want to delete <span className="font-bold text-slate-900">"{productToDelete.name}"</span>?</p>
                <p className="text-sm text-slate-500 mb-6">This action cannot be undone and will remove it from all records.</p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setProductToDelete(null)}
                        className="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 bg-white"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Sell Modal */}
      {isSellModalOpen && selectedProductForSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
                <div className="text-center mb-6">
                    <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                        <ShoppingBag />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Direct Sale</h3>
                    <p className="text-slate-500 text-sm">{selectedProductForSale.name}</p>
                    <p className="text-xs text-slate-400">Available: {selectedProductForSale.stock}</p>
                </div>

                <form onSubmit={handleSellSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Sold</label>
                        <input 
                            type="number" min="1" max={selectedProductForSale.stock}
                            value={sellQty} onChange={e => setSellQty(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-center font-bold text-lg bg-white text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Total Sale Price (₹)</label>
                        <input 
                            type="number"
                            value={sellPrice} onChange={e => setSellPrice(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-center bg-white text-slate-900"
                        />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button type="button" onClick={() => setIsSellModalOpen(false)} className="flex-1 py-2 border rounded-lg hover:bg-slate-50 bg-white">Cancel</button>
                        <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Confirm Sale</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Print Preview Modal - Visible during print (label only) */}
      {printingProduct && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
             {/* Main Modal Content */}
             <div className="bg-white p-4 md:p-8 rounded-lg shadow-2xl flex flex-col items-center gap-6 max-w-lg w-full print:shadow-none print:w-auto print:h-auto print:block print:static">
                
                {/* Header (Hidden when printing) */}
                <div className="w-full flex justify-between items-center no-print">
                   <h3 className="text-xl font-bold text-slate-800">Print Label Preview</h3>
                   <button onClick={() => setPrintingProduct(null)} className="text-slate-400 hover:text-slate-600"><XIcon />
                   </button>
                </div>

                {/* The Label Area - Scaled for mobile preview */}
                <div className="w-full flex justify-center no-print pb-2 overflow-hidden bg-slate-100 rounded-lg py-4">
                    <div className="transform scale-[0.65] sm:scale-100 origin-center">
                        <div id="printable-label" className="border-2 border-black min-w-[400px] w-[400px] h-[180px] bg-white text-black p-4 flex flex-row items-center justify-between gap-6 overflow-hidden">
                            <div className="flex-1 flex flex-col justify-center h-full">
                                <p className="text-xl font-bold truncate mb-3 leading-tight">{printingProduct.name}</p>
                                <div className="bg-black text-white px-3 py-1 inline-block self-start mb-3">
                                    <p className="text-5xl font-mono font-black">{printingProduct.sku}</p>
                                </div>
                                <p className="text-lg font-bold">₹{printingProduct.price}</p>
                            </div>
                            <div className="flex-shrink-0 border-l-2 border-dashed border-slate-300 pl-4 h-full flex items-center justify-center">
                                <QRCodeCanvas 
                                    value={JSON.stringify({ id: printingProduct.id, sku: printingProduct.sku })} 
                                    size={120}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Print Version of Label (Hidden on Screen, Visible on Print) */}
                {/* Force absolute positioning to ensure it's the only thing visible on paper */}
                <div className="hidden print:flex border-2 border-black w-[400px] h-[180px] bg-white text-black p-4 flex-row items-center justify-between gap-6 overflow-hidden absolute top-0 left-0 m-0 print:absolute print:top-0 print:left-0">
                    <div className="flex-1 flex flex-col justify-center h-full">
                        <p className="text-xl font-bold truncate mb-3 leading-tight">{printingProduct.name}</p>
                        <div className="bg-black text-white px-3 py-1 inline-block self-start mb-3">
                            <p className="text-5xl font-mono font-black">{printingProduct.sku}</p>
                        </div>
                        <p className="text-lg font-bold">₹{printingProduct.price}</p>
                    </div>
                    <div className="flex-shrink-0 border-l-2 border-dashed border-slate-300 pl-4 h-full flex items-center justify-center">
                        <QRCodeCanvas 
                            value={JSON.stringify({ id: printingProduct.id, sku: printingProduct.sku })} 
                            size={120}
                        />
                    </div>
                </div>

                {/* Actions (Hidden when printing) */}
                <div className="flex gap-4 w-full no-print">
                   <button 
                        onClick={handleDownloadPdf}
                        disabled={isPdfGenerating}
                        className="flex-1 py-3 border border-violet-200 text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 font-bold flex items-center justify-center gap-2"
                   >
                     {isPdfGenerating ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />}
                     Save as PDF
                   </button>
                   <button 
                        onClick={handlePrint}
                        className="flex-1 py-3 bg-violet-700 text-white rounded-lg hover:bg-violet-800 font-bold flex items-center justify-center gap-2"
                   >
                     <Printer size={18} /> Print Label
                   </button>
                </div>
                <p className="text-xs text-slate-400 no-print text-center">
                    Note: If the label does not appear, check "Background Graphics" in printer settings.
                </p>
             </div>
        </div>
      )}
    </div>
  );
};

// Simple X icon component
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
