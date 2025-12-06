
import React, { useState } from 'react';
import { Distributor, Product, DistributorStock } from '../types';
import { UserPlus, MapPin, Phone, PackageOpen, Users, Search, Trash2, AlertTriangle, ArrowLeft, Wallet, FileDown, Loader2, Pencil, X } from 'lucide-react';

interface DistributorsProps {
  distributors: Distributor[];
  products: Product[];
  distributorStocks: DistributorStock[];
  onAddDistributor: (d: Distributor) => void;
  onUpdateDistributor: (d: Distributor) => void;
  onDeleteDistributor: (id: string) => void;
}

// UUID Helper
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const Distributors: React.FC<DistributorsProps> = ({ distributors, products, distributorStocks, onAddDistributor, onUpdateDistributor, onDeleteDistributor }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(null);
  const [distributorToDelete, setDistributorToDelete] = useState<Distributor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  const openAddModal = () => {
      setEditingId(null);
      setName('');
      setPhone('');
      setLocation('');
      setIsModalOpen(true);
  };

  const openEditModal = (d: Distributor) => {
      setEditingId(d.id);
      setName(d.name);
      setPhone(d.phone);
      setLocation(d.location);
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
        // Update
        const original = distributors.find(d => d.id === editingId);
        if (original) {
            onUpdateDistributor({
                ...original,
                name,
                phone,
                location
            });
        }
    } else {
        // Add
        onAddDistributor({
          id: generateId(),
          name,
          phone,
          email: '',
          location,
          joinedAt: new Date().toISOString()
        });
    }
    
    setIsModalOpen(false);
    setName('');
    setPhone('');
    setLocation('');
  };

  const confirmDelete = () => {
      if (distributorToDelete) {
          onDeleteDistributor(distributorToDelete.id);
          if (selectedDistributorId === distributorToDelete.id) {
              setSelectedDistributorId(null);
          }
          setDistributorToDelete(null);
      }
  };

  const handleExportPdf = async () => {
    if (!selectedDistributor) return;
    setIsExporting(true);

    try {
        // @ts-ignore
        if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            throw new Error("PDF libraries not loaded yet. Please wait.");
        }

        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 width in mm
        
        // Find all pages in the hidden report container
        const reportContainer = document.getElementById('distributor-report-container');
        if (!reportContainer) throw new Error("Report container not found");
        
        // Show temporarily
        reportContainer.style.display = 'block';
        
        const pages = reportContainer.querySelectorAll('.report-page');
        
        for (let i = 0; i < pages.length; i++) {
             const pageElement = pages[i] as HTMLElement;
             
             // @ts-ignore
             const canvas = await window.html2canvas(pageElement, { 
                scale: 2, 
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false
             });
             
             const imgData = canvas.toDataURL('image/png');
             const imgHeight = (canvas.height * imgWidth) / canvas.width;
             
             if (i > 0) pdf.addPage();
             pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        }

        reportContainer.style.display = 'none';
        pdf.save(`${selectedDistributor.name.replace(/\s+/g, '_')}_Stock_Report.pdf`);
        
    } catch (e) {
        console.error(e);
        alert("Error creating PDF. Please check internet connection for libraries.");
    } finally {
        const reportContainer = document.getElementById('distributor-report-container');
        if (reportContainer) reportContainer.style.display = 'none';
        setIsExporting(false);
    }
  };

  const filteredDistributors = distributors.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDistributor = distributors.find(d => d.id === selectedDistributorId);
  
  // Logic to find items held by selected distributor
  const heldItems = selectedDistributorId 
    ? distributorStocks
        .filter(ds => ds.distributorId === selectedDistributorId && ds.quantity > 0)
        .map(ds => {
            const product = products.find(p => p.id === ds.productId);
            return {
                ...product,
                heldQuantity: ds.quantity,
                lastUpdated: ds.lastUpdated
            };
        })
        .filter(item => item.id) // Filter out if product was deleted
        .filter(item => 
           (item.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
            item.sku?.toLowerCase().includes(productSearchTerm.toLowerCase()))
        )
    : [];
  
  const totalSellingValueWithDistributor = heldItems.reduce((sum, item) => sum + (item.price! * item.heldQuantity), 0);
  const totalCostValueWithDistributor = heldItems.reduce((sum, item) => sum + (item.cost! * item.heldQuantity), 0);

  // Pagination Logic for Report
  const ITEMS_PER_PAGE_FIRST = 12; // First page has big header
  const ITEMS_PER_PAGE_REST = 16;  // Subsequent pages can fit more
  
  const reportPages = [];
  
  if (heldItems.length === 0) {
      reportPages.push([]);
  } else {
      // First page
      reportPages.push(heldItems.slice(0, ITEMS_PER_PAGE_FIRST));
      
      // Rest of pages
      let remaining = heldItems.slice(ITEMS_PER_PAGE_FIRST);
      while (remaining.length > 0) {
          reportPages.push(remaining.slice(0, ITEMS_PER_PAGE_REST));
          remaining = remaining.slice(ITEMS_PER_PAGE_REST);
      }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className={`flex justify-between items-center ${selectedDistributorId ? 'hidden lg:flex' : 'flex'}`}>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Distributors</h2>
          <p className="text-slate-500">Manage partners and view their stock.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <UserPlus size={18} />
          <span className="hidden sm:inline">New Distributor</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Distributor Search - Hidden on mobile if viewing details */}
      <div className={`relative ${selectedDistributorId ? 'hidden lg:block' : 'block'}`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input 
              type="text" 
              placeholder="Search distributors..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900"
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* List of Distributors */}
        {/* On Mobile: Hidden if a distributor is selected */}
        <div className={`lg:col-span-1 space-y-3 overflow-y-auto pr-2 ${selectedDistributorId ? 'hidden lg:block' : 'block'}`}>
          {filteredDistributors.map(dist => {
            // Calculate total items for this distributor
            const totalItems = distributorStocks
                .filter(ds => ds.distributorId === dist.id)
                .reduce((acc, ds) => acc + ds.quantity, 0);

            return (
                <div 
                    key={dist.id}
                    onClick={() => setSelectedDistributorId(dist.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedDistributorId === dist.id 
                        ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200' 
                        : 'bg-white border-slate-200 hover:border-violet-200'
                    }`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-800">{dist.name}</h3>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600 font-medium">{totalItems} units</span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-500">
                        <div className="flex items-center gap-2"><Phone size={14}/> {dist.phone}</div>
                        <div className="flex items-center gap-2"><MapPin size={14}/> {dist.location}</div>
                    </div>
                </div>
            )
          })}
          {filteredDistributors.length === 0 && (
             <div className="text-center p-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <p className="text-slate-500">No distributors found.</p>
             </div>
          )}
        </div>

        {/* Distributor Detail View */}
        {/* On Mobile: Hidden if NO distributor is selected. Full width if selected. */}
        <div className={`lg:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden ${selectedDistributorId ? 'block' : 'hidden lg:flex'}`}>
             {selectedDistributor ? (
                 <>
                    <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex flex-col gap-4">
                            {/* Mobile Header with Back Button */}
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setSelectedDistributorId(null)}
                                    className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-200 rounded-full"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-800 leading-none">{selectedDistributor.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin size={12}/> {selectedDistributor.location}</p>
                                </div>
                                
                                <button 
                                    onClick={handleExportPdf}
                                    disabled={isExporting}
                                    className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 shadow-sm transition-colors flex items-center gap-2"
                                    title="Export Stock Report PDF"
                                >
                                    {isExporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                                    <span className="hidden sm:inline text-sm font-medium">Export</span>
                                </button>
                                
                                <button 
                                    onClick={() => openEditModal(selectedDistributor)}
                                    className="p-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-600 shadow-sm transition-colors"
                                    title="Edit Details"
                                >
                                    <Pencil size={18} />
                                </button>

                                <button 
                                    onClick={() => setDistributorToDelete(selectedDistributor)}
                                    className="p-2 bg-white border border-red-200 rounded-lg hover:bg-red-50 text-red-600 shadow-sm transition-colors"
                                    title="Delete Distributor"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <Wallet size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase">My Investment</p>
                                        <p className="text-lg font-bold text-slate-900">₹{totalCostValueWithDistributor.toFixed(0)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                        <PackageOpen size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase">Selling Value</p>
                                        <p className="text-lg font-bold text-slate-900">₹{totalSellingValueWithDistributor.toFixed(0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Product Search within Distributor */}
                        <div className="mt-4 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search products in stock..." 
                                value={productSearchTerm}
                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 md:px-6 w-16">Image</th>
                                    <th className="px-4 py-3 md:px-6">Product</th>
                                    <th className="px-4 py-3 md:px-6 text-center">Qty</th>
                                    <th className="px-4 py-3 md:px-6 text-right">Cost</th>
                                    <th className="px-4 py-3 md:px-6 text-right">Sell Val</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {heldItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            {productSearchTerm ? "No products match your search." : "No products currently assigned."}
                                        </td>
                                    </tr>
                                ) : (
                                    heldItems.map(item => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 md:px-6">
                                                <img 
                                                    src={item.imageUrl} 
                                                    alt={item.name} 
                                                    className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                                                />
                                            </td>
                                            <td className="px-4 py-3 md:px-6 text-slate-900">
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                                            </td>
                                            <td className="px-4 py-3 md:px-6 text-center">
                                                <span className="font-bold text-violet-700 bg-violet-50 px-2 py-1 rounded">{item.heldQuantity}</span>
                                            </td>
                                            <td className="px-4 py-3 md:px-6 text-right text-slate-500">₹{(item.cost! * item.heldQuantity).toFixed(0)}</td>
                                            <td className="px-4 py-3 md:px-6 text-right font-medium">₹{(item.price! * item.heldQuantity).toFixed(0)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                 </>
             ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                    <Users size={48} className="mb-4 opacity-20" />
                    <p>Select a distributor to view their inventory</p>
                 </div>
             )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{editingId ? 'Edit Distributor' : 'Add Distributor'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input 
                            required placeholder="Distributor Name" 
                            value={name} onChange={e => setName(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input 
                            required placeholder="Phone Number" 
                            value={phone} onChange={e => setPhone(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                        <input 
                            required placeholder="Location / City" 
                            value={location} onChange={e => setLocation(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900"
                        />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-2 border rounded-lg hover:bg-slate-50 bg-white">Cancel</button>
                        <button type="submit" className="flex-1 p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                            {editingId ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {distributorToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border-t-4 border-red-500">
                <div className="flex items-center gap-3 mb-4 text-red-600">
                   <div className="p-2 bg-red-100 rounded-full">
                     <AlertTriangle size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900">Delete Distributor?</h3>
                </div>
                <p className="text-slate-600 mb-2">Are you sure you want to delete <span className="font-bold text-slate-900">"{distributorToDelete.name}"</span>?</p>
                <p className="text-sm text-slate-500 mb-6">This will delete their record and all associated stock tracking. This action cannot be undone.</p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => setDistributorToDelete(null)}
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

      {/* Hidden Report Container for PDF Generation - Paginated */}
      {selectedDistributor && (
        <div id="distributor-report-container" style={{ display: 'none' }}>
            {reportPages.map((pageItems, pageIndex) => (
                <div key={pageIndex} className="report-page" style={{ width: '800px', height: '1120px', padding: '40px', background: 'white', fontFamily: 'sans-serif', position: 'relative', borderBottom: '1px solid #eee' }}>
                    
                    {/* Header (Different for first page vs others) */}
                    <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-slate-800">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">JewelTrack</h1>
                            <p className="text-slate-500 text-sm">Stock Report {pageIndex > 0 ? '(Cont.)' : ''}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-lg text-slate-900">{selectedDistributor.name}</p>
                            <p className="text-slate-500">{new Date().toLocaleDateString()}</p>
                            {pageIndex === 0 && (
                                <>
                                    <p className="text-slate-500 text-sm">{selectedDistributor.location}</p>
                                    <p className="text-slate-500 text-sm">{selectedDistributor.phone}</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Summary (Only on First Page) */}
                    {pageIndex === 0 && (
                        <div className="flex gap-4 mb-8">
                            <div className="flex-1 bg-slate-100 p-4 rounded border border-slate-200">
                                <p className="text-xs uppercase font-bold text-slate-500 mb-1">Total Items</p>
                                <p className="text-xl font-bold text-slate-900">{heldItems.reduce((acc, item) => acc + item.heldQuantity, 0)} Units</p>
                            </div>
                            <div className="flex-1 bg-blue-50 p-4 rounded border border-blue-100">
                                <p className="text-xs uppercase font-bold text-blue-700 mb-1">Total Cost (Investment)</p>
                                <p className="text-xl font-bold text-blue-900">₹{totalCostValueWithDistributor.toLocaleString()}</p>
                            </div>
                            <div className="flex-1 bg-amber-50 p-4 rounded border border-amber-100">
                                <p className="text-xs uppercase font-bold text-amber-700 mb-1">Total Selling Value</p>
                                <p className="text-xl font-bold text-amber-900">₹{totalSellingValueWithDistributor.toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800 text-white">
                                <th className="p-3">Image</th>
                                <th className="p-3">SKU</th>
                                <th className="p-3">Product Name</th>
                                <th className="p-3 text-center">Qty</th>
                                <th className="p-3 text-right">Cost</th>
                                <th className="p-3 text-right">Price</th>
                                <th className="p-3 text-right">Total (Price)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageItems.map((item: any, idx: number) => (
                                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="p-3 border-b border-slate-200">
                                        <img src={item.imageUrl} alt="" className="w-10 h-10 object-cover rounded" crossOrigin="anonymous" />
                                    </td>
                                    <td className="p-3 border-b border-slate-200 font-mono text-slate-600">{item.sku}</td>
                                    <td className="p-3 border-b border-slate-200 font-medium text-slate-900">{item.name}</td>
                                    <td className="p-3 border-b border-slate-200 text-center font-bold">{item.heldQuantity}</td>
                                    <td className="p-3 border-b border-slate-200 text-right text-slate-500">₹{item.cost?.toLocaleString()}</td>
                                    <td className="p-3 border-b border-slate-200 text-right">₹{item.price?.toLocaleString()}</td>
                                    <td className="p-3 border-b border-slate-200 text-right font-bold">₹{(item.price! * item.heldQuantity).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Footer */}
                    <div className="absolute bottom-10 left-0 right-0 text-center text-xs text-slate-400 border-t border-slate-200 pt-4 mx-10">
                         JewelTrack Pro Report &bull; Page {pageIndex + 1} of {reportPages.length}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
