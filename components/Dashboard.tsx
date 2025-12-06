
import React, { useEffect, useState } from 'react';
import { Product, Distributor, DistributorStock } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { analyzeStockTrends } from '../services/geminiService';
import { Sparkles, TrendingUp, Wallet } from 'lucide-react';

interface DashboardProps {
  products: Product[];
  distributors: Distributor[];
  distributorStocks: DistributorStock[];
}

export const Dashboard: React.FC<DashboardProps> = ({ products, distributors, distributorStocks }) => {
  const [aiInsight, setAiInsight] = useState<string>("Analyzing your business data...");

  // Calculate Metrics (Quantity Based)
  const totalProducts = products.length; // Unique Types
  
  // 1. Sales Value (Projected Revenue)
  const warehouseSalesValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const distributedSalesValue = distributorStocks.reduce((acc, ds) => {
    const product = products.find(p => p.id === ds.productId);
    return acc + (product ? product.price * ds.quantity : 0);
  }, 0);
  const totalSalesValue = warehouseSalesValue + distributedSalesValue;

  // 2. Cost Value (Actual Investment)
  const warehouseCostValue = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
  const distributedCostValue = distributorStocks.reduce((acc, ds) => {
    const product = products.find(p => p.id === ds.productId);
    return acc + (product ? product.cost * ds.quantity : 0);
  }, 0);
  const totalCostValue = warehouseCostValue + distributedCostValue;

  // Potential Profit
  const potentialProfit = totalSalesValue - totalCostValue;

  const stockInWarehouse = products.reduce((acc, p) => acc + p.stock, 0);
  const stockWithDistributors = distributorStocks.reduce((acc, ds) => acc + ds.quantity, 0);
  
  // Chart Data: Status
  const statusData = [
    { name: 'In Warehouse', value: stockInWarehouse },
    { name: 'With Distributors', value: stockWithDistributors },
  ];
  const COLORS = ['#8b5cf6', '#f59e0b']; // Violet-500, Amber-500

  // Chart Data: Top Distributors by Item Count
  const distributorData = distributors.map(d => ({
    name: d.name,
    items: distributorStocks
        .filter(ds => ds.distributorId === d.id)
        .reduce((sum, ds) => sum + ds.quantity, 0)
  })).sort((a,b) => b.items - a.items).slice(0, 5);

  useEffect(() => {
    if (products.length > 0) {
        analyzeStockTrends(products, distributors).then(setAiInsight);
    } else {
        setAiInsight("Add products and distributors to get AI insights.");
    }
  }, [products.length, distributors.length]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>

      {/* AI Insight Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg relative overflow-hidden border border-slate-700">
        <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm text-amber-400">
                <Sparkles />
            </div>
            <div>
                <h3 className="font-bold text-lg mb-1 text-amber-50">AI Business Insight</h3>
                <p className="text-slate-300 leading-relaxed">{aiInsight}</p>
            </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-violet-600/20 rounded-full blur-2xl"></div>
      </div>

      {/* Financial Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 font-medium uppercase">Total Investment</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">₹{totalCostValue.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">Based on Purchase Cost</p>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Wallet size={20} />
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-slate-500 font-medium uppercase">Total Sales Value</p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-600 mt-2">₹{totalSalesValue.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">Based on Selling Price</p>
                </div>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <TrendingUp size={20} />
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500 font-medium uppercase">Potential Profit</p>
            <p className="text-2xl md:text-3xl font-bold text-violet-600 mt-2">₹{potentialProfit.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">If all stock is sold</p>
        </div>
      </div>

      {/* Simplified Inventory Overview */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex justify-between items-center">
         <div>
            <p className="text-sm text-slate-500 font-bold uppercase">Total Inventory Units</p>
            <p className="text-2xl font-bold text-slate-800">{stockInWarehouse + stockWithDistributors}</p>
         </div>
         <div className="text-right">
             <p className="text-sm text-slate-500">Warehouse: <span className="font-bold text-slate-900">{stockInWarehouse}</span></p>
             <p className="text-sm text-slate-500">Distributed: <span className="font-bold text-slate-900">{stockWithDistributors}</span></p>
         </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stock Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Unit Distribution</h3>
            <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Distributor Performance Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Top Distributors (Units Held)</h3>
             <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributorData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="items" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>
    </div>
  );
};
