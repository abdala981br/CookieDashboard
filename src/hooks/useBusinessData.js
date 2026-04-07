import { useMemo } from 'react';

export function useBusinessData(sales, customers, ingredients, products, recipeConfig, productionBatches) {
  
  // BLOCO 1: MÉTRICAS DE CLIENTES E REDE
  const customersWithStats = useMemo(() => {
    return customers.map(customer => {
      const referralsCount = customers.filter(c => c.referredBy === customer.id).length;
      const referrer = customers.find(c => c.id === customer.referredBy);
      return { 
        ...customer, 
        referralsCount, 
        referrerName: referrer ? (referrer.name || 'Desconhecido') : 'Ninguém (Direto)' 
      };
    });
  }, [customers]);

  const pendingRewards = useMemo(() => 
    customersWithStats.filter(c => c.referralsCount === 2 || (c.referralsCount >= 5 && c.referralsCount % 5 === 0)), 
    [customersWithStats]
  );

  // BLOCO 2: CUSTOS E FICHA TÉCNICA
  const costMetrics = useMemo(() => {
    const totalRecipeCost = ingredients.reduce((acc, ing) => 
      acc + ((Number(ing.bulkPrice) || 0) / (Number(ing.bulkQty) || 1)) * (Number(ing.recipeQty) || 0), 0);
    const costPerCookie = totalRecipeCost / (Number(recipeConfig.yield) || 1);
    const profit = (Number(recipeConfig.salePrice) || 0) - costPerCookie;
    const profitMargin = recipeConfig.salePrice > 0 ? (profit / recipeConfig.salePrice) * 100 : 0;
    return { totalRecipeCost, costPerCookie, profit, profitMargin };
  }, [ingredients, recipeConfig]);

  // BLOCO 3: ESTOQUE E SIMULADOR
  const inventoryCheck = useMemo(() => {
    const list = ingredients.map(ing => {
      const wasteFactor = ing.applyWaste ? 1.02 : 1; 
      const totalNeeded = ((Number(ing.recipeQty) || 0) * wasteFactor) * (Number(productionBatches) || 1);
      const currentStock = parseFloat(ing.currentStock) || 0;
      const missingAmount = Math.max(0, totalNeeded - currentStock);
      let packagesToBuy = 0; let costToBuy = 0; let exactMissingToBuy = 0; 
      const safeBulkQty = Number(ing.bulkQty) || 1;
      
      if (missingAmount > 0 && safeBulkQty > 0) {
          const safeMissingAmount = Math.round(missingAmount * 1000) / 1000;
          packagesToBuy = Math.ceil(safeMissingAmount / safeBulkQty);
          costToBuy = packagesToBuy * (Number(ing.bulkPrice) || 0);
          exactMissingToBuy = packagesToBuy * safeBulkQty;
      }
      return { ...ing, totalNeeded, missingAmount, packagesToBuy, exactMissingToBuy, costToBuy };
    });
    const totalMissingCost = list.reduce((sum, item) => sum + (Number(item.costToBuy) || 0), 0);
    const canProduce = list.every(item => item.missingAmount === 0);
    return { list, totalMissingCost, canProduce };
  }, [ingredients, productionBatches]);

  // BLOCO 4: MÉTRICAS FINANCEIRAS GLOBAIS
  const globalMetrics = useMemo(() => {
    const totalRevenue = sales.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0);
    const totalCookiesSold = sales.reduce((acc, curr) => acc + (Number(curr.cookieUnits) || Number(curr.quantity) || 0), 0);
    const totalEstimatedCost = totalCookiesSold * costMetrics.costPerCookie;
    const totalEstimatedProfit = totalRevenue - totalEstimatedCost;
    const ticketMedio = sales.length > 0 ? (totalRevenue / sales.length) : 0;
    const margin = totalRevenue > 0 ? (totalEstimatedProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCookiesSold, totalEstimatedCost, totalEstimatedProfit, ticketMedio, margin };
  }, [sales, costMetrics]);

  // RETORNO DE TUDO PARA O APP
  return {
    customersWithStats,
    pendingRewards,
    costMetrics,
    inventoryCheck,
    globalMetrics
  };
}
