import React from 'react';
import { 
  Coffee, AlertTriangle, CheckCircle, ShoppingCart, Package, XCircle 
} from 'lucide-react';

export default function InventoryView({ 
  // Dados vindos do hook useBusinessData
  inventoryCheck, 
  // Estados e Configurações
  productionBatches, setProductionBatches, recipeConfig,
  // Funções de Ação (Handlers)
  handleProduce, handleToggleWaste, handleUpdateStock 
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-black text-amber-950 dark:text-[#F3E8D6]">Estoque e Produção</h2>
          <p className="text-stone-600 dark:text-[#E2D4C1] mt-2 font-medium">Simule produções, atualize o estoque e gere a lista de compras.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {/* CARD: SIMULADOR */}
          <div className="bg-white dark:bg-[#3D2C20] p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-[#4A3B32] transition-colors">
            <h3 className="text-lg font-bold text-amber-950 dark:text-[#F3E8D6] mb-4 flex items-center gap-2">
              <Coffee className="text-amber-800 dark:text-[#C17F59]" size={20}/> Simulador
            </h3>
            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Quantas receitas vai bater?</label>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setProductionBatches(Math.max(1, productionBatches - 1))} className="bg-amber-50 dark:bg-[#2C1E16] border border-amber-200 dark:border-[#4A3B32] w-10 h-10 rounded-xl flex items-center justify-center font-bold text-amber-950 dark:text-[#F3E8D6] hover:bg-amber-100 transition">-</button>
              <input type="number" min="1" className="w-full h-10 text-center font-black text-lg bg-amber-50 dark:bg-[#2C1E16] border border-amber-200 dark:border-[#4A3B32] rounded-xl text-amber-950 dark:text-[#F3E8D6] outline-none" value={productionBatches} onChange={e => setProductionBatches(Math.max(1, Number(e.target.value)))} />
              <button onClick={() => setProductionBatches(productionBatches + 1)} className="bg-amber-50 dark:bg-[#2C1E16] border border-amber-200 dark:border-[#4A3B32] w-10 h-10 rounded-xl flex items-center justify-center font-bold text-amber-950 dark:text-[#F3E8D6] hover:bg-amber-100 transition">+</button>
            </div>
            
            <div className="bg-amber-50/50 dark:bg-[#2C1E16] p-3 rounded-xl border border-amber-100 dark:border-[#4A3B32] mb-6">
              <p className="text-xs font-bold text-stone-500 dark:text-[#E2D4C1]">Rendimento Previsto:</p>
              <p className="text-lg font-black text-amber-800 dark:text-[#C17F59]">{productionBatches * (Number(recipeConfig.yield)||1)} cookies</p>
            </div>

            {!inventoryCheck.canProduce && (
               <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-2">
                 <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0"/>
                 <div>
                   <p className="text-xs font-black text-red-800 dark:text-red-400">Faltam ingredientes!</p>
                   <p className="text-[10px] font-bold text-red-600 dark:text-red-300 mt-0.5">Se registrar a produção, assumiremos que comprou o que falta.</p>
                 </div>
               </div>
            )}

            <button onClick={handleProduce} className="w-full bg-amber-800 dark:bg-[#C17F59] text-white dark:text-[#2C1E16] font-bold py-3 rounded-xl hover:bg-amber-900 dark:hover:bg-[#A66A4B] transition-colors shadow-sm flex items-center justify-center gap-2">
              <CheckCircle size={18}/> Registrar Produção
            </button>
          </div>

          {/* CARD: LISTA DE COMPRAS */}
          {inventoryCheck.totalMissingCost > 0 && (
            <div className="bg-white dark:bg-[#3D2C20] p-6 rounded-3xl shadow-sm border border-red-100 dark:border-[#4A3B32] transition-colors">
              <h3 className="text-lg font-bold text-amber-950 dark:text-[#F3E8D6] mb-4 flex items-center gap-2">
                <ShoppingCart className="text-red-500" size={20}/> Lista de Compras
              </h3>
              <p className="text-xs font-bold text-stone-500 dark:text-stone-400 mb-4">Pacotes a comprar para {productionBatches} receita(s).</p>
              <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2">
                {inventoryCheck.list.filter(i => i.missingAmount > 0).map(ing => (
                  <div key={ing.id} className="flex justify-between items-center pb-2 border-b border-amber-50 dark:border-[#4A3B32] last:border-0 last:pb-0">
                      <div>
                        <p className="font-black text-sm text-amber-950 dark:text-[#F3E8D6]">{ing.name}</p>
                        <p className="text-[10px] font-bold text-red-500">Comprar: {ing.packagesToBuy} pct(s) ({ing.exactMissingToBuy}{ing.unit})</p>
                      </div>
                      <p className="text-sm font-black text-amber-900 dark:text-[#E2D4C1]">R$ {(Number(ing.costToBuy)||0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-amber-100 dark:border-[#4A3B32] flex justify-between items-center">
                <span className="font-bold text-stone-600 dark:text-[#E2D4C1] text-sm">Custo Mercado:</span>
                <span className="font-black text-red-600 dark:text-red-400 text-lg">R$ {(Number(inventoryCheck.totalMissingCost)||0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* COLUNA: TABELA DE ESTOQUE */}
        <div className="lg:col-span-2 bg-white dark:bg-[#3D2C20] rounded-3xl shadow-sm border border-amber-100 dark:border-[#4A3B32] overflow-hidden transition-colors flex flex-col">
          <div className="p-6 border-b border-amber-100 dark:border-[#4A3B32] bg-amber-50/30 dark:bg-[#2C1E16] flex justify-between items-center">
            <div>
              <h3 className="font-bold text-amber-950 dark:text-[#F3E8D6] flex items-center gap-2"><Package className="text-amber-800 dark:text-[#C17F59]" size={20} /> Controle de Estoque</h3>
              <p className="text-xs text-stone-500 dark:text-[#E2D4C1] mt-1 font-medium">A sua lista de insumos. Edite as quantidades sempre que comprar material.</p>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-amber-50 dark:bg-[#2C1E16] text-amber-900 dark:text-[#C17F59] border-b border-amber-100 dark:border-[#4A3B32] text-sm">
                  <th className="p-4 font-black">Insumo</th>
                  <th className="p-4 font-black text-center">Necessário p/ {productionBatches}x</th>
                  <th className="p-4 font-black text-center">Em Estoque Atual</th>
                  <th className="p-4 font-black text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventoryCheck.list.map(ing => {
                  const isOk = ing.missingAmount === 0;
                  return (
                    <tr key={ing.id} className="border-b border-amber-50 dark:border-[#4A3B32] hover:bg-amber-50/30 dark:hover:bg-[#2C1E16] transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <p className="font-black text-amber-950 dark:text-[#F3E8D6]">{ing.name}</p>
                          <button 
                            onClick={() => handleToggleWaste(ing.id, ing.applyWaste)}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors border ${ing.applyWaste ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-[#3D2C20] dark:text-[#C17F59] dark:border-[#4A3B32]' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-[#1A0F0A] dark:text-stone-500 dark:border-[#3D2C20]'}`}
                          >
                            {ing.applyWaste ? '+2% Quebra ON' : '+2% Quebra OFF'}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-stone-600 dark:text-[#E2D4C1]">
                        {(Number(ing.totalNeeded)||0).toFixed(1)} {ing.unit}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input 
                            type="number" min="0" step="any"
                            className={`w-24 p-2 text-center text-sm font-black border rounded-lg outline-none transition-colors ${!isOk ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 focus:ring-2 focus:ring-red-500' : 'bg-amber-50 dark:bg-[#2C1E16] border-amber-200 dark:border-[#4A3B32] text-amber-950 dark:text-[#F3E8D6] focus:ring-2 focus:ring-amber-500 dark:focus:ring-[#C17F59]'}`}
                            value={ing.currentStock || ''} 
                            onChange={e => handleUpdateStock(ing.id, e.target.value)} 
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 w-6 text-left">{ing.unit}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {isOk ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"><CheckCircle size={12}/> Suficiente</span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"><XCircle size={12}/> Faltam {ing.packagesToBuy} pct</span>
                            <span className="text-xs font-black text-red-600 dark:text-red-400">R$ {(Number(ing.costToBuy)||0).toFixed(2)}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
