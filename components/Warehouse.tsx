
import React, { useState } from 'react';
import { Product } from '../types';
import { PackageSearch, AlertTriangle, Search } from 'lucide-react';

interface WarehouseProps {
  products: Product[];
}

export const Warehouse: React.FC<WarehouseProps> = ({ products }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only items that have stock and match search
  const inStockProducts = products
    .filter(p => p.stock > 0)
    .filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a,b) => b.stock - a.stock);

  const totalItems = inStockProducts.reduce((sum, p) => sum + p.stock, 0);
  const totalValue = inStockProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Warehouse Stock</h2>
          <p className="text-slate-500">Current stock remaining on hand.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-right w-full md:w-auto">
             <p className="text-xs text-slate-500 font-medium uppercase">Total Value On Hand</p>
             <p className="text-xl font-bold text-emerald-600">₹{totalValue.toLocaleString()}</p>
        </div>
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-slate-700">Product</th>
                <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-slate-700">SKU</th>
                <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-slate-700 text-center">Qty</th>
                <th className="hidden md:table-cell px-6 py-4 font-semibold text-slate-700 text-right">Unit Price</th>
                <th className="px-4 py-3 md:px-6 md:py-4 font-semibold text-slate-700 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inStockProducts.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 flex flex-col items-center">
                        <AlertTriangle className="mb-2 text-amber-500" size={32} />
                        <span className="text-lg font-medium text-slate-700">No stock found</span>
                        <span className="text-sm text-slate-400">Try adjusting your search or add more stock.</span>
                    </td>
                </tr>
              ) : inStockProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="flex items-center gap-3">
                      <img src={product.imageUrl} alt={product.name} className="w-8 h-8 md:w-10 md:h-10 rounded-md object-cover bg-slate-200 border border-slate-200" />
                      <div className="font-medium text-slate-900 line-clamp-1">{product.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 md:px-6 md:py-4 font-mono text-slate-600">{product.sku}</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm font-bold bg-violet-100 text-violet-800 border border-violet-200">
                        {product.stock}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 text-right text-slate-600">₹{product.price.toLocaleString()}</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-right font-medium text-slate-900">₹{(product.price * product.stock).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            {inStockProducts.length > 0 && (
                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">
                    <tr>
                        <td colSpan={2} className="px-4 py-3 md:px-6 md:py-4 text-right">TOTALS</td>
                        <td className="px-4 py-3 md:px-6 md:py-4 text-center">{totalItems}</td>
                        <td className="hidden md:table-cell"></td>
                        <td className="px-4 py-3 md:px-6 md:py-4 text-right">₹{totalValue.toLocaleString()}</td>
                    </tr>
                </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
