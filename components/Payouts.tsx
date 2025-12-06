
import React, { useState } from 'react';
import { Distributor, SaleRecord, PayoutRecord } from '../types';
import { Banknote, CheckCircle, ChevronRight, History, PlusCircle, MinusCircle, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, Trash2, X } from 'lucide-react';

interface PayoutsProps {
  distributors: Distributor[];
  sales: SaleRecord[];
  payouts: PayoutRecord[];
  onRecordPayout: (distributorId: string, amount: number, note: string, type: 'PAYMENT' | 'ADJUSTMENT_ADD' | 'ADJUSTMENT_DEDUCT') => void;
  onDeletePayout: (id: string) => void;
}

export const Payouts: React.FC<PayoutsProps> = ({ distributors, sales, payouts, onRecordPayout, onDeletePayout }) => {
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(null);
  
  // Payment Modal State
  const [amountToPay, setAmountToPay] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);

  // Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustType, setAdjustType] = useState<'ADD' | 'DEDUCT'>('ADD');

  // Calculate Balances
  const distributorBalances = distributors.map(d => {
      const mySales = sales.filter(s => s.soldByDistributorId === d.id);
      const totalCommission = mySales.reduce((acc, s) => acc + (s.commissionAmount || 0), 0);
      
      const myRecords = payouts.filter(p => p.distributorId === d.id);
      
      // Calculate Total Paid (Type = PAYMENT)
      const totalPaid = myRecords
        .filter(p => p.type === 'PAYMENT' || !p.type) // Handle legacy records without type
        .reduce((acc, p) => acc + p.amount, 0);

      // Calculate Adjustments
      const totalAdded = myRecords
        .filter(p => p.type === 'ADJUSTMENT_ADD')
        .reduce((acc, p) => acc + p.amount, 0);

      const totalDeducted = myRecords
        .filter(p => p.type === 'ADJUSTMENT_DEDUCT')
        .reduce((acc, p) => acc + p.amount, 0);
      
      // Balance Formula: (Commission + Added Adjustments) - (Paid + Deducted Adjustments)
      const balanceDue = (totalCommission + totalAdded) - (totalPaid + totalDeducted);
      
      return {
          ...d,
          totalCommission,
          totalPaid,
          totalAdded,
          totalDeducted,
          balanceDue,
          salesCount: mySales.length
      };
  }).sort((a,b) => b.balanceDue - a.balanceDue);

  const selectedDistributor = distributorBalances.find(d => d.id === selectedDistributorId);
  const selectedSales = selectedDistributorId ? sales.filter(s => s.soldByDistributorId === selectedDistributorId) : [];
  const selectedPayouts = selectedDistributorId ? payouts.filter(p => p.distributorId === selectedDistributorId) : [];

  const handlePay = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedDistributorId) {
          onRecordPayout(selectedDistributorId, parseFloat(amountToPay), paymentNote, 'PAYMENT');
          setShowPayModal(false);
          setAmountToPay('');
          setPaymentNote('');
      }
  };

  const handleAdjust = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedDistributorId) {
          const type = adjustType === 'ADD' ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_DEDUCT';
          onRecordPayout(selectedDistributorId, parseFloat(adjustAmount), adjustNote, type);
          setShowAdjustModal(false);
          setAdjustAmount('');
          setAdjustNote('');
      }
  };

  const openPayModal = () => {
      if (selectedDistributor) {
          setAmountToPay(selectedDistributor.balanceDue.toString());
          setShowPayModal(true);
      }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
         <h2 className="text-2xl font-bold text-slate-800">Commissions & Payouts</h2>
         <p className="text-slate-500">Track distributor earnings, record payments, and manage adjustments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
         {/* List */}
         <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">Distributors</div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {distributorBalances.map(d => (
                    <div 
                        key={d.id}
                        onClick={() => setSelectedDistributorId(d.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                            selectedDistributorId === d.id ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200' : 'bg-white border-slate-100 hover:border-violet-100'
                        }`}
                    >
                        <div>
                            <div className="font-bold text-slate-800">{d.name}</div>
                            <div className="text-xs text-slate-500">{d.salesCount} sales generated</div>
                        </div>
                        <div className="text-right">
                             <div className={`font-bold ${d.balanceDue > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                ₹{d.balanceDue.toFixed(2)}
                             </div>
                             <div className="text-[10px] text-slate-400 uppercase">Due</div>
                        </div>
                    </div>
                ))}
            </div>
         </div>

         {/* Detail */}
         <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             {selectedDistributor ? (
                 <>
                    <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedDistributor.name}</h3>
                                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                    <span className="text-slate-500">Sales Comm: <span className="font-semibold text-slate-800">₹{selectedDistributor.totalCommission.toFixed(2)}</span></span>
                                    {selectedDistributor.totalAdded > 0 && <span className="text-emerald-600">Bonus: +₹{selectedDistributor.totalAdded.toFixed(2)}</span>}
                                    {selectedDistributor.totalDeducted > 0 && <span className="text-red-600">Deductions: -₹{selectedDistributor.totalDeducted.toFixed(2)}</span>}
                                    <span className="text-slate-500">Paid: <span className="font-semibold text-emerald-600">₹{selectedDistributor.totalPaid.toFixed(2)}</span></span>
                                </div>
                            </div>
                            <div className="text-right mt-4 md:mt-0">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Current Balance Due</p>
                                <p className="text-3xl font-bold text-violet-700">₹{selectedDistributor.balanceDue.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-2">
                             <button 
                                onClick={openPayModal}
                                disabled={selectedDistributor.balanceDue <= 0}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${
                                    selectedDistributor.balanceDue > 0 
                                    ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <Banknote size={16} /> Record Payment
                            </button>
                            <button 
                                onClick={() => setShowAdjustModal(true)}
                                className="px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                <SlidersHorizontal size={16} /> Adjust Balance
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-0">
                        <div className="p-4">
                            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><History size={16}/> History</h4>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Type</th>
                                        <th className="px-4 py-2">Details</th>
                                        <th className="px-4 py-2 text-right">Amount</th>
                                        <th className="px-4 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[...selectedSales, ...selectedPayouts].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item: any) => {
                                        const isSale = !!item.productId;
                                        // Determine transaction type visuals
                                        let typeLabel = "COMMISSION";
                                        let typeColor = "bg-amber-50 text-amber-700";
                                        let sign = "+";
                                        
                                        if (!isSale) {
                                            if (item.type === 'ADJUSTMENT_ADD') {
                                                typeLabel = "BONUS / ADD";
                                                typeColor = "bg-blue-50 text-blue-700";
                                                sign = "+";
                                            } else if (item.type === 'ADJUSTMENT_DEDUCT') {
                                                typeLabel = "DEDUCTION";
                                                typeColor = "bg-red-50 text-red-700";
                                                sign = "-";
                                            } else {
                                                typeLabel = "PAYMENT";
                                                typeColor = "bg-emerald-50 text-emerald-700";
                                                sign = "-";
                                            }
                                        }

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`px-2 py-1 rounded-[4px] text-[10px] font-bold tracking-wide ${typeColor}`}>
                                                        {typeLabel}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-slate-700">
                                                    {isSale ? `Sold: ${item.productName} (x${item.quantity})` : (item.note || '-')}
                                                </td>
                                                <td className={`px-4 py-2 text-right font-bold ${sign === '+' ? 'text-slate-800' : 'text-emerald-600'}`}>
                                                    {sign}₹{isSale ? item.commissionAmount : item.amount}
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    {!isSale && (
                                                        <button 
                                                            onClick={() => {
                                                                if(window.confirm("Are you sure you want to delete this record?")) {
                                                                    onDeletePayout(item.id);
                                                                }
                                                            }}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                            title="Delete Transaction"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                 </>
             ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Banknote size={48} className="mb-4 opacity-20" />
                    <p>Select a distributor to manage payouts</p>
                 </div>
             )}
         </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPayModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-800">Record Payout</h3>
                      <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">You are paying <b>{selectedDistributor?.name}</b>.</p>
                  
                  <form onSubmit={handlePay} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                          <input 
                            type="number" required
                            value={amountToPay} onChange={e => setAmountToPay(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold bg-white text-slate-900"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Note (Optional)</label>
                          <input 
                            type="text" placeholder="e.g. Cash, Bank Transfer"
                            value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                          />
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 p-2 border rounded-lg hover:bg-slate-50 bg-white">Cancel</button>
                          <button type="submit" className="flex-1 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold">Confirm Payment</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {showAdjustModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                       <h3 className="text-xl font-bold text-slate-800">Manual Adjustment</h3>
                       <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Adjust balance for <b>{selectedDistributor?.name}</b>.</p>
                  
                  <form onSubmit={handleAdjust} className="space-y-4">
                      {/* Toggle Type */}
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setAdjustType('ADD')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${adjustType === 'ADD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                             <PlusCircle size={16} /> Add Bonus
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdjustType('DEDUCT')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-all ${adjustType === 'DEDUCT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                             <MinusCircle size={16} /> Deduct
                          </button>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                          <input 
                            type="number" required min="0" step="0.01"
                            value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold bg-white text-slate-900"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Note</label>
                          <input 
                            type="text" required placeholder={adjustType === 'ADD' ? "e.g. Sales Target Bonus" : "e.g. Damaged Goods Penalty"}
                            value={adjustNote} onChange={e => setAdjustNote(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900"
                          />
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 p-2 border rounded-lg hover:bg-slate-50 bg-white">Cancel</button>
                          <button type="submit" className={`flex-1 p-2 text-white rounded-lg font-bold ${adjustType === 'ADD' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                             {adjustType === 'ADD' ? 'Add to Balance' : 'Deduct Balance'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
