
import React from 'react';
import { LayoutDashboard, Package, Users, ScanLine, Menu, X, Gem, Boxes, ArrowLeftRight, ShoppingBag, Banknote } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  children: React.ReactNode;
}

const NavItem = ({ 
  view, 
  current, 
  icon: Icon, 
  label, 
  onClick 
}: { 
  view: ViewState; 
  current: ViewState; 
  icon: any; 
  label: string; 
  onClick: (v: ViewState) => void 
}) => (
  <button
    onClick={() => onClick(view)}
    className={`flex items-center w-full px-4 py-3 mb-1 text-sm font-medium transition-colors rounded-lg ${
      current === view
        ? 'bg-slate-800 text-amber-400 border-r-4 border-amber-400'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`}
  >
    <Icon size={20} className="mr-3" />
    {label}
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar for Desktop - Hidden when printing */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 no-print">
        {/* Clickable Logo Button */}
        <button 
            onClick={() => onChangeView('DASHBOARD')}
            className="flex items-center justify-center h-16 border-b border-slate-800 px-6 w-full hover:bg-slate-800 transition-colors"
            title="Go to Dashboard"
        >
            <Gem className="text-amber-500 mr-2" />
            <span className="text-xl font-bold text-slate-100 tracking-tight">JewelTrack</span>
        </button>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <NavItem view="DASHBOARD" current={currentView} icon={LayoutDashboard} label="Dashboard" onClick={onChangeView} />
          <NavItem view="INVENTORY" current={currentView} icon={Package} label="All Products" onClick={onChangeView} />
          <NavItem view="WAREHOUSE" current={currentView} icon={Boxes} label="Warehouse Stock" onClick={onChangeView} />
          <NavItem view="DISTRIBUTORS" current={currentView} icon={Users} label="Distributors" onClick={onChangeView} />
          <NavItem view="SCANNER" current={currentView} icon={ScanLine} label="Scan Transfer" onClick={onChangeView} />
          <div className="pt-4 pb-1">
             <div className="border-t border-slate-800 mx-2"></div>
          </div>
          <NavItem view="RETURNS" current={currentView} icon={ArrowLeftRight} label="Stock Returns" onClick={onChangeView} />
          <NavItem view="SALES" current={currentView} icon={ShoppingBag} label="Direct Sales" onClick={onChangeView} />
          <NavItem view="PAYOUTS" current={currentView} icon={Banknote} label="Commissions" onClick={onChangeView} />
        </nav>
        <div className="p-4 border-t border-slate-800">
           <p className="text-xs text-slate-500 text-center">Version 1.3.0</p>
        </div>
      </aside>

      {/* Mobile Header & Overlay - Hidden when printing */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden flex items-center justify-between h-16 bg-slate-900 border-b border-slate-800 px-4 text-white no-print">
          <button 
              onClick={() => onChangeView('DASHBOARD')}
              className="flex items-center active:opacity-80"
          >
             <Gem className="text-amber-500 mr-2" />
             <span className="text-lg font-bold text-slate-100">JewelTrack</span>
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-slate-900 z-50 border-b border-slate-800 shadow-lg no-print">
             <nav className="px-4 py-4 space-y-2">
              <NavItem view="DASHBOARD" current={currentView} icon={LayoutDashboard} label="Dashboard" onClick={(v) => { onChangeView(v); setIsMobileMenuOpen(false); }} />
              <NavItem view="INVENTORY" current={currentView} icon={Package} label="All Products" onClick={(v) => { onChangeView(v); setIsMobileMenuOpen(false); }} />
              <NavItem view="WAREHOUSE" current={currentView} icon={Boxes} label="Warehouse Stock" onClick={(v) => { onChangeView(v); setIsMobileMenuOpen(false); }} />
              <NavItem view="DISTRIBUTORS" current={currentView} icon={Users} label="Distributors" onClick={(v) => { onChangeView(v); setIsMobileMenuOpen(false); }} />
              <NavItem view="SCANNER" current={currentView} icon={ScanLine} label="Scan Transfer" onClick={(v) => { onChangeView(v); setIsMobileMenuOpen(false); }} />
              <NavItem view="RETURNS" current={currentView} icon={ArrowLeftRight} label="Stock Returns" onClick={(v) => { onChangeView(v); setIsMobileMenuOpen(false); }} />
              <NavItem view="SALES" current={currentView} icon={ShoppingBag} label="Direct Sales" onClick={(v) => { onChangeView(v); setIsMobileMenuOpen(false); }} />
              <NavItem view="PAYOUTS" current={currentView} icon={Banknote} label="Commissions" onClick={(v) => { onChangeView(v); setIsMobileMenuOpen(false); }} />
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};
