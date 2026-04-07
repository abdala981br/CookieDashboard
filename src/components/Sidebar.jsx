import React from 'react';
import { 
  Store, BarChart3, ShoppingBag, ClipboardList, Users, 
  Calculator, CalendarCheck, Network, Lightbulb, Sun, Moon, LogOut 
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, darkMode, setDarkMode, setAppMode, handleLogout }) {
  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-amber-950 dark:bg-[#1A0F0A] text-amber-50 flex flex-col shadow-xl z-20 transition-colors duration-300 hidden md:flex border-r border-amber-900/50 dark:border-[#3D2C20]">
        <div className="p-6 flex items-center gap-3">
          <Store size={32} className="text-[#C17F59]" />
          <h1 className="text-2xl font-black tracking-tight">Emural Dash</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-amber-800 dark:bg-[#3D2C20] text-white' : 'hover:bg-amber-900/50 text-amber-200/70'}`}>
            <BarChart3 size={20} /> Visão Geral
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'products' ? 'bg-amber-800 dark:bg-[#3D2C20] text-white' : 'hover:bg-amber-900/50 text-amber-200/70'}`}>
            <ShoppingBag size={20} /> Catálogo
          </button>
          <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'inventory' ? 'bg-amber-800 dark:bg-[#3D2C20] text-white' : 'hover:bg-amber-900/50 text-amber-200/70'}`}>
            <ClipboardList size={20} /> Estoque & Prod.
          </button>
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'customers' ? 'bg-amber-800 dark:bg-[#3D2C20] text-white' : 'hover:bg-amber-900/50 text-amber-200/70'}`}>
            <Users size={20} /> Clientes
          </button>
          <button onClick={() => setActiveTab('costs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'costs' ? 'bg-amber-800 dark:bg-[#3D2C20] text-white' : 'hover:bg-amber-900/50 text-amber-200/70'}`}>
            <Calculator size={20} /> Custos & Sync
          </button>
          <button onClick={() => setActiveTab('reservations')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'reservations' ? 'bg-amber-800 dark:bg-[#3D2C20] text-white' : 'hover:bg-amber-900/50 text-amber-200/70'}`}>
            <CalendarCheck size={20} /> Entregas
          </button>
          <button onClick={() => setActiveTab('store_settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'store_settings' ? 'bg-amber-800 dark:bg-[#3D2C20] text-white' : 'hover:bg-amber-900/50 text-amber-200/70'}`}>
            <Store size={20} /> Loja Online
          </button>
          <button onClick={() => setActiveTab('network')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'network' ? 'bg-amber-800 dark:bg-[#3D2C20] text-white' : 'hover:bg-amber-900/50 text-amber-200/70'}`}>
            <Network size={20} /> Rede
          </button>
          <button onClick={() => setActiveTab('suggestions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${activeTab === 'suggestions' ? 'bg-amber-800 dark:bg-[#3D2C20] text-white' : 'hover:bg-amber-900/50 text-amber-200/70'}`}>
            <Lightbulb size={20} /> Ideias
          </button>
        </nav>

        <div className="mt-auto px-4 pb-6 space-y-2">
          <button onClick={() => setAppMode('storefront')} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-800 hover:bg-amber-700 text-white shadow-sm font-bold">
            <Store size={18} /> <span className="text-sm">Ver Minha Loja</span>
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl hover:bg-amber-900/50 text-amber-200/70 font-bold">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />} <span className="text-sm">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl hover:bg-red-900/50 text-red-300 font-bold">
            <LogOut size={18} /> <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu (Copiado das linhas ~1409-1416) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#3D2C20] border-t border-amber-100 dark:border-[#4A3B32] flex justify-around p-3 z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-xl ${activeTab === 'dashboard' ? 'bg-amber-100 text-amber-800' : 'text-stone-500'}`}><BarChart3 size={24}/></button>
        <button onClick={() => setActiveTab('inventory')} className={`p-2 rounded-xl ${activeTab === 'inventory' ? 'bg-amber-100 text-amber-800' : 'text-stone-500'}`}><ClipboardList size={24}/></button>
        <button onClick={() => setActiveTab('reservations')} className={`p-2 rounded-xl ${activeTab === 'reservations' ? 'bg-amber-100 text-amber-800' : 'text-stone-500'}`}><CalendarCheck size={24}/></button>
        <button onClick={() => setActiveTab('store_settings')} className={`p-2 rounded-xl ${activeTab === 'store_settings' ? 'bg-amber-100 text-amber-800' : 'text-stone-500'}`}><Store size={24}/></button>
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl text-stone-500">{darkMode ? <Sun size={24} /> : <Moon size={24} />}</button>
      </div>
    </>
  );
}
