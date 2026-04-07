import React from 'react';
import { 
  Clock, Gift, DollarSign, TrendingUp, ShoppingCart, Coffee, Users, 
  LineChart, Calendar, Target, Crosshair, Trophy, Flame, UsersRound, 
  Activity, History, Info, Send, Trash2, TrendingDown, ShoppingBag
} from 'lucide-react';

export default function DashboardView({ 
  // Dados processados (do hook useBusinessData)
  globalMetrics, timeStats, pendingRewards, projection, productIntel, customerIntel, 
  // Estados e variáveis globais
  lastSync, goals, setGoals, products, quickSale, setQuickSale, quickSaleCart, setQuickSaleCart,
  onlineOrders, sortedReservations, expectedMetrics, reservationSortBy, setReservationSortBy,
  // Funções de ação
  handleFinalizeQuickSale, handleAddToCartQuickSale, handleApproveOnlineOrder, 
  handleRejectOnlineOrder, setShowSalesHistory, maxWeeklyRevenue, weeklyStats
}) {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-4">
        <div>
          <h2 className="text-3xl font-black text-amber-950 dark:text-[#F3E8D6]">Visão Geral <span className="text-amber-600 dark:text-[#C17F59]">PRO</span></h2>
          <p className="text-stone-600 dark:text-[#E2D4C1] mt-1 font-medium">O cérebro do seu negócio. Acompanhe metas, lucro e tome decisões.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && <span className="text-xs text-stone-500 dark:text-stone-400 font-bold flex items-center gap-1"><Clock size={12}/> {lastSync}</span>}
        </div>
      </div>

      {/* RECOMPENSAS PENDENTES */}
      {pendingRewards.length > 0 && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 dark:from-[#3D2C20] dark:to-[#2C1E16] border border-amber-900/50 dark:border-[#4A3B32] p-5 rounded-3xl shadow-md text-white dark:text-[#F3E8D6] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 dark:bg-black/20 p-3 rounded-2xl"><Gift size={28} className="dark:text-[#C17F59]"/></div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Recompensas de Indicação!</h3>
              <p className="text-sm text-amber-100 dark:text-[#E2D4C1]">Clientes atingiram os marcos do programa de fidelidade.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {pendingRewards.map(c => (
              <span key={c.id} className="bg-white dark:bg-[#1A0F0A] text-amber-900 dark:text-[#C17F59] border border-transparent dark:border-[#4A3B32] px-3 py-1.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                {c.name} <span className="text-xs font-medium text-stone-500 dark:text-stone-400">({c.referralsCount} ind.)</span> ➔ 
                {c.referralsCount === 2 ? ' 1 Brinde Peq.' : ' 1 Brinde Trad.'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MÉTRICAS TOTAIS */}
      <div>
        <h3 className="text-sm font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Visão Rápida (Total)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-[#3D2C20] p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-[#4A3B32] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-stone-500 dark:text-[#E2D4C1] font-bold">Faturamento</p>
              <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg text-green-600 dark:text-green-400"><DollarSign size={16} /></div>
            </div>
            <p className="text-xl font-black text-amber-950 dark:text-[#F3E8D6]">R$ {(Number(globalMetrics.totalRevenue) || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-[#3D2C20] p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-[#4A3B32] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-stone-500 dark:text-[#E2D4C1] font-bold">Lucro Real</p>
              <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg text-green-600 dark:text-green-400"><TrendingUp size={16} /></div>
            </div>
            <p className="text-xl font-black text-green-600 dark:text-green-400">R$ {(Number(globalMetrics.totalEstimatedProfit) || 0).toFixed(2)}</p>
          </div>
          {/* ... Repetir a estrutura para Custo Reposição, Itens Vendidos e Nº Clientes ... */}
        </div>
      </div>

      {/* GRÁFICOS E METAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DESEMPENHO CURTO PRAZO */}
        <div>
          <h3 className="text-sm font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Desempenho (Curto Prazo)</h3>
          <div className="grid grid-cols-2 gap-4 h-[calc(100%-2rem)]">
            <div className="bg-white dark:bg-[#3D2C20] p-6 rounded-3xl border border-amber-100 dark:border-[#4A3B32] flex flex-col justify-center relative overflow-hidden">
               <div className="relative z-10">
                 <p className="text-sm text-stone-500 dark:text-[#E2D4C1] font-bold mb-2">Vendas Hoje</p>
                 <p className="text-3xl font-black text-amber-950 dark:text-[#F3E8D6] mb-3">R$ {(Number(timeStats.revToday) || 0).toFixed(2)}</p>
                 <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${timeStats.todayGrowth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                   {timeStats.todayGrowth >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                   {(Number(timeStats.todayGrowth) || 0).toFixed(1)}% vs Ontem
                 </div>
               </div>
               <LineChart className="absolute -bottom-4 -right-4 text-amber-50 dark:text-black/10 w-32 h-32" />
            </div>
            {/* Repetir para Últimos 7 Dias */}
          </div>
        </div>

        {/* METAS */}
        <div>
          <h3 className="text-sm font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Crescimento e Metas</h3>
          <div className="bg-white dark:bg-[#3D2C20] p-6 rounded-3xl border border-amber-100 dark:border-[#4A3B32] space-y-6">
             {/* Meta Diária */}
             <div>
               <div className="flex justify-between items-end mb-2">
                 <p className="text-sm font-bold flex items-center gap-2 text-amber-950 dark:text-[#F3E8D6]"><Target size={16}/> Meta Diária</p>
                 <input type="number" className="w-16 bg-transparent border-b border-amber-200 outline-none text-right font-black" value={goals.daily} onChange={(e) => setGoals({...goals, daily: Number(e.target.value)})}/>
               </div>
               <div className="w-full bg-amber-50 rounded-full h-3">
                 <div className="bg-amber-800 h-3 rounded-full transition-all" style={{ width: `${Math.min(((timeStats.revToday||0)/goals.daily)*100, 100)}%` }}></div>
               </div>
             </div>
             {/* ... Repetir para Meta Semanal e Projeção ... */}
          </div>
        </div>
      </div>

      {/* OPERAÇÃO (VENDAS E ENTREGAS) */}
      <div>
        <h3 className="text-sm font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Operação (Vendas & Entregas)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* FORMULÁRIO VENDA RÁPIDA */}
          <div className="lg:col-span-1 bg-amber-800 dark:bg-[#2C1E16] rounded-3xl p-6 text-white">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><ShoppingCart size={22} /> Nova Venda Rápida</h3>
            <form onSubmit={handleFinalizeQuickSale} className="space-y-4">
               {/* Inputs de nome, data, indicação, produto, etc. que você já tem no código */}
               {/* ... Código do formulário ... */}
            </form>
          </div>

          {/* TABELA DE PEDIDOS E ENTREGAS PENDENTES */}
          <div className="lg:col-span-2 space-y-6">
             {/* Cole aqui os blocos de Pedidos da Loja Online e Entregas Pendentes */}
          </div>
        </div>
      </div>

      {/* HISTÓRICO DE EVOLUÇÃO (GRÁFICO) */}
      <div>
        <h3 className="text-sm font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">Histórico de Evolução</h3>
        <div className="bg-white dark:bg-[#3D2C20] p-6 rounded-3xl border border-amber-100 dark:border-[#4A3B32] flex flex-col">
           {/* ... Código do gráfico de barras (weeklyStats.map) ... */}
        </div>
      </div>

    </div>
  );
}
