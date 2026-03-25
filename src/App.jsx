import React, { useState, useMemo, useEffect } from 'react';
// IMPORTAÇÕES DO FIREBASE (Faltava isso!)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// IMPORTAÇÕES DOS ÍCONES
import { 
  Cookie, Users, Network, Lightbulb, FileSpreadsheet, Plus, RefreshCw,
  Link as LinkIcon, Trash2, Star, ThumbsUp, ArrowUpDown, CalendarCheck,
  CheckCircle, Clock, XCircle, Calculator, DollarSign, TrendingUp,
  Package, BarChart3, Activity, PieChart, ShoppingCart, Award, History,
  X, ChevronDown, ChevronRight, ShoppingBag, Tag, Layers, Calendar,
  AlertCircle, Moon, Sun
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBSih7dkMmGmYg2NUcM7a_ki-PQtKJ2504",
  authDomain: "cookiedash.firebaseapp.com",
  projectId: "cookiedash",
  storageBucket: "cookiedash.firebasestorage.app",
  messagingSenderId: "165689377990",
  appId: "1:165689377990:web:266b6edaed2a8aee48c3c7",
  measurementId: "G-PFR7GKRLZ2"
};

// --- LIGANDO O MOTOR DO FIREBASE ---
let app, auth, db;
const appId = 'cookie-dash-app';
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) { console.error("Erro ao iniciar Firebase:", e); }

const INITIAL_PRODUCTS = [
  { id: 'prod-1', name: 'Cookie Tradicional', price: 10.00, type: 'single', units: 1 }
];

export default function CookieDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  
  // ==========================================
  // ESTADOS COM FIREBASE (BANCO DE DADOS REAL)
  // ==========================================
  const [user, setUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  
  const [recipeConfig, setRecipeConfig] = useState({ yield: 12, salePrice: 10.00 });
  const [sheetUrl, setSheetUrl] = useState('');
  const [lastSync, setLastSync] = useState(null);

  // Estados de interface (Formulários)
  const [batchDate, setBatchDate] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', referredBy: '', purchases: 1 });
  const [newSuggestion, setNewSuggestion] = useState({ type: 'flavor', text: '' });
  const [newReservation, setNewReservation] = useState({ name: '', productId: '', quantity: 1, date: '' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', type: 'single', units: 2 });
  const [quickSale, setQuickSale] = useState({ customerName: '', referredBy: '', productId: INITIAL_PRODUCTS[0]?.id || '', quantity: 1, revenue: 10.00 });
  
  const [customerSortBy, setCustomerSortBy] = useState('name-asc');
  const [suggestionMatchContext, setSuggestionMatchContext] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);

  // --- 1. AUTENTICAÇÃO ANÔNIMA PARA O FIREBASE ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch(e) { console.error("Erro no Auth:", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- 2. LER DADOS EM TEMPO REAL ---
  useEffect(() => {
    if (!db || !user) return;
    const uid = user.uid;
    const baseArgs = ['artifacts', appId, 'users', uid];

    const unsubs = [
      onSnapshot(collection(db, ...baseArgs, 'customers'), snap => setCustomers(snap.docs.map(d => d.data())), console.error),
      onSnapshot(collection(db, ...baseArgs, 'sales'), snap => setSales(snap.docs.map(d => d.data())), console.error),
      onSnapshot(collection(db, ...baseArgs, 'products'), snap => {
        if(snap.empty) setProducts(INITIAL_PRODUCTS);
        else setProducts(snap.docs.map(d => d.data()));
      }, console.error),
      onSnapshot(collection(db, ...baseArgs, 'reservations'), snap => setReservations(snap.docs.map(d => d.data())), console.error),
      onSnapshot(collection(db, ...baseArgs, 'ingredients'), snap => setIngredients(snap.docs.map(d => d.data())), console.error),
      onSnapshot(collection(db, ...baseArgs, 'suggestions'), snap => setSuggestions(snap.docs.map(d => d.data())), console.error),
      onSnapshot(doc(db, ...baseArgs, 'settings', 'config'), snap => {
         if (snap.exists()) {
             const data = snap.data();
             if(data.recipeConfig) setRecipeConfig(data.recipeConfig);
             if(data.lastSync) setLastSync(data.lastSync);
             if(data.sheetUrl) setSheetUrl(data.sheetUrl);
         }
      }, console.error)
    ];
    return () => unsubs.forEach(fn => fn());
  }, [user]);

  // --- 3. FUNÇÕES PARA SALVAR NO BANCO ---
  const saveToDb = async (col, id, data) => { if (db && user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id), data); };
  const deleteFromDb = async (col, id) => { if (db && user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id)); };
  const saveConfig = async (data) => { if (db && user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), data, { merge: true }); };

  // Salvando configurações simples ao alterar
  useEffect(() => { if (db && user) saveConfig({ recipeConfig }); }, [recipeConfig]);
  useEffect(() => { if (db && user) saveConfig({ sheetUrl }); }, [sheetUrl]);

  // Efeito para auto-calcular o valor da venda rápida baseado no preço atual
  useEffect(() => {
    const selectedProduct = products.find(p => p.id === quickSale.productId);
    const priceToUse = selectedProduct ? selectedProduct.price : recipeConfig.salePrice;
    setQuickSale(prev => ({ ...prev, revenue: prev.quantity * priceToUse }));
  }, [quickSale.quantity, quickSale.productId, products, recipeConfig.salePrice]);

  // --- CÁLCULOS DA FICHA TÉCNICA E CUSTOS ---
  const costMetrics = useMemo(() => {
    const totalRecipeCost = ingredients.reduce((acc, ing) => {
      return acc + ((ing.bulkPrice / ing.bulkQty) * ing.recipeQty);
    }, 0);
    
    const costPerCookie = totalRecipeCost / (recipeConfig.yield || 1);
    const profit = recipeConfig.salePrice - costPerCookie;
    const profitMargin = recipeConfig.salePrice > 0 ? (profit / recipeConfig.salePrice) * 100 : 0;

    return { totalRecipeCost, costPerCookie, profit, profitMargin };
  }, [ingredients, recipeConfig]);

  // --- CÁLCULOS DE DASHBOARD E VENDAS ---
  const weeklyStats = useMemo(() => {
    const stats = [];
    const today = new Date();
    
    const currentDay = today.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() + diffToMonday);
    currentMonday.setHours(0,0,0,0);

    for(let i=5; i>=0; i--) {
      const start = new Date(currentMonday);
      start.setDate(currentMonday.getDate() - (i * 7));
      
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);

      const format = (dt) => `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth()+1).toString().padStart(2, '0')}`;
      const label = `${format(start)} a \n${format(end)}`;
      
      stats.push({ label, start, end, salesQty: 0, revenue: 0, estimatedProfit: 0 });
    }

    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      const week = stats.find(w => saleDate >= w.start && saleDate <= w.end);
      if (week) {
        week.salesQty += (sale.cookieUnits || sale.quantity);
        week.revenue += sale.revenue;
        const cost = costMetrics.costPerCookie * (sale.cookieUnits || sale.quantity);
        week.estimatedProfit += (sale.revenue - cost);
      }
    });

    return stats;
  }, [sales, costMetrics]);

  const globalMetrics = useMemo(() => {
    const totalRevenue = sales.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalCookiesSold = sales.reduce((acc, curr) => acc + (curr.cookieUnits || curr.quantity), 0);
    const totalEstimatedProfit = totalRevenue - (totalCookiesSold * costMetrics.costPerCookie);
    
    return { totalRevenue, totalCookiesSold, totalEstimatedProfit };
  }, [sales, costMetrics]);

  // --- CÁLCULOS DE PREVISÃO E RESERVAS ---
  const pendingReservationsList = useMemo(() => {
    return reservations.filter(r => r.status === 'pending').sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
  }, [reservations]);

  const expectedMetrics = useMemo(() => {
    let revenue = 0;
    let cookies = 0;
    pendingReservationsList.forEach(r => {
      revenue += r.expectedRevenue || 0;
      cookies += r.cookieUnits || r.quantity || 0;
    });
    // Calcula as fornadas necessarias baseado no rendimento atual da receita
    const batchesNeeded = recipeConfig.yield > 0 ? Math.ceil(cookies / recipeConfig.yield) : 0;
    return { revenue, cookies, batchesNeeded };
  }, [pendingReservationsList, recipeConfig.yield]);

  // --- CÁLCULOS DE CLIENTES ---
  const customersWithStats = useMemo(() => {
    return customers.map(customer => {
      const referralsCount = customers.filter(c => c.referredBy === customer.id).length;
      const referrer = customers.find(c => c.id === customer.referredBy);
      return {
        ...customer,
        referralsCount,
        referrerName: referrer ? referrer.name : 'Ninguém (Direto)'
      };
    });
  }, [customers]);

  const sortedCustomersWithStats = useMemo(() => {
    let sorted = [...customersWithStats];
    switch(customerSortBy) {
      case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'referrals-desc': sorted.sort((a, b) => b.referralsCount - a.referralsCount); break;
      case 'purchases-desc': sorted.sort((a, b) => b.purchases - a.purchases); break;
      default: break;
    }
    return sorted;
  }, [customersWithStats, customerSortBy]);

  const topReferrers = useMemo(() => {
    return [...customersWithStats].sort((a, b) => b.referralsCount - a.referralsCount).slice(0, 3);
  }, [customersWithStats]);


  // --- HANDLERS ---
  const handleQuickSale = (e) => {
    e.preventDefault();
    if (!quickSale.customerName) return;

    const selectedProduct = products.find(p => p.id === quickSale.productId);
    const productName = selectedProduct ? selectedProduct.name : 'Avulso';
    const cookieUnits = selectedProduct ? (selectedProduct.units || 1) * Number(quickSale.quantity) : Number(quickSale.quantity);

    // 1. Registra a Venda
    const newSaleObj = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      quantity: Number(quickSale.quantity), 
      cookieUnits: cookieUnits, 
      revenue: Number(quickSale.revenue),
      customerName: quickSale.customerName.trim(),
      productName: productName
    };
    setSales([...sales, newSaleObj]);

    // 2. Atualiza ou Cria o Cliente
    const existingCustomer = customers.find(c => c.name.toLowerCase() === quickSale.customerName.toLowerCase().trim());
    
    if (existingCustomer) {
      setCustomers(customers.map(c => 
        c.id === existingCustomer.id ? { ...c, purchases: c.purchases + 1 } : c
      ));
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      setCustomers([...customers, { 
        id: newId, 
        name: quickSale.customerName.trim(), 
        referredBy: quickSale.referredBy || null, 
        purchases: 1 
      }]);
    }

    // Limpa formulário
    setQuickSale({ customerName: '', referredBy: '', productId: products[0]?.id || '', quantity: 1, revenue: products[0]?.price || recipeConfig.salePrice });
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    const newId = Math.random().toString(36).substr(2, 9);
    setProducts([...products, { 
      id: newId, 
      name: newProduct.name, 
      price: Number(newProduct.price),
      type: newProduct.type,
      units: newProduct.type === 'combo' ? Number(newProduct.units) : 1
    }]);
    setNewProduct({ name: '', price: '', type: 'single', units: 2 });
    
    if (products.length === 0) {
      setQuickSale(prev => ({ ...prev, productId: newId }));
    }
  };

  const handleDeleteProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  // ==========================================
  // LÓGICA DE SINCRONIZAÇÃO COM A PLANILHA REAL
  // ==========================================
  const handleSyncSheet = async () => {
    if (!sheetUrl) {
      alert("Por favor, cole o link da sua planilha.");
      return;
    }
    setIsSyncing(true);

    try {
      let fetchUrl = sheetUrl;
      if (fetchUrl.includes('pubhtml')) {
        fetchUrl = fetchUrl.replace('pubhtml', 'pub') + (fetchUrl.includes('?') ? '&output=csv' : '?output=csv');
      } else if (!fetchUrl.includes('output=csv')) {
        fetchUrl += (fetchUrl.includes('?') ? '&output=csv' : '?output=csv');
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Não foi possível acessar a planilha. Verifique o link.");
      
      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      
      // Leitura inteligente do Cabeçalho (identifica a ordem das colunas automaticamente)
      const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.toLowerCase().trim());
      
      let nameIdx = 0, bulkQtyIdx = 1, unitIdx = 2, bulkPriceIdx = 3, recipeQtyIdx = 4;
      
      headers.forEach((h, idx) => {
        if (h.includes('nome') || h.includes('ingrediente') || h.includes('matéria')) nameIdx = idx;
        else if (h.includes('uso') || h.includes('receita') || h.includes('usada')) recipeQtyIdx = idx;
        else if (h.includes('preço') || h.includes('valor') || h.includes('custo') || h.includes('pacote')) bulkPriceIdx = idx;
        else if (h.includes('unidade') || h.includes('medida') || h === 'un' || h === 'g' || h === 'ml') unitIdx = idx;
        else if (h.includes('qtd') || h.includes('quant') || h.includes('peso')) bulkQtyIdx = idx;
      });

      const parsedIngredients = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        if (row.length > Math.max(nameIdx, bulkPriceIdx)) {
          const clean = (str) => str ? str.replace(/(^"|"$)/g, '').trim() : '';
          const parseNumber = (str) => {
            let cleaned = clean(str).replace(/[R$\s]/g, '');
            if (cleaned.includes(',') && cleaned.includes('.')) {
               cleaned = cleaned.replace(/\./g, '').replace(',', '.');
            } else if (cleaned.includes(',')) {
               cleaned = cleaned.replace(',', '.');
            }
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          };

          const name = clean(row[nameIdx]);
          if (!name) continue;

          let rQty = parseNumber(row[recipeQtyIdx]);
          
          // Fallback: se a coluna "Uso na Receita" estiver vazia, ele vasculha o resto da linha procurando o número
          if (rQty === 0) {
            for (let j = 3; j < row.length; j++) {
              if (j !== bulkPriceIdx && j !== bulkQtyIdx) {
                let val = parseNumber(row[j]);
                if (val > 0) {
                  rQty = val;
                  break;
                }
              }
            }
          }

          parsedIngredients.push({
            id: i.toString(),
            name: name,
            bulkQty: parseNumber(row[bulkQtyIdx]),
            unit: clean(row[unitIdx]) || 'un',
            bulkPrice: parseNumber(row[bulkPriceIdx]),
            recipeQty: rQty
          });
        }
      }

      if (parsedIngredients.length > 0) {
         // 1. Atualiza a tela imediatamente (garante que funciona mesmo sem banco de dados)
         setIngredients(parsedIngredients);
         const syncTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
         setLastSync(syncTime);

         // 2. Tenta salvar no banco de dados apenas se as funções existirem
         try {
           if (typeof saveToDb === 'function') {
               ingredients.forEach(ing => deleteFromDb('ingredients', ing.id));
               parsedIngredients.forEach(ing => saveToDb('ingredients', ing.id, ing));
               saveConfig({ lastSync: syncTime });
           }
         } catch(e) { console.log("Aviso: Dados atualizados apenas na tela, banco de dados não configurado.", e); }
         
      } else {
         alert("A planilha foi lida, mas nenhum ingrediente foi encontrado. Tem certeza que copiou a aba certa e tem cabeçalho?");
      }
        
    } catch (error) {
      console.error("Erro na leitura da planilha:", error);
      alert("Erro ao ler planilha. Garanta que ela foi publicada na web corretamente.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== id).map(c => c.referredBy === id ? { ...c, referredBy: null } : c));
  };

  // Sugestões
  const handleAddSuggestion = (e) => {
    e.preventDefault();
    if (!newSuggestion.text) return;
    const normalizedInput = newSuggestion.text.toLowerCase().trim();
    const matches = suggestions.filter(s => s.type === newSuggestion.type && (s.text.toLowerCase().includes(normalizedInput) || normalizedInput.includes(s.text.toLowerCase())));

    if (matches.length > 0 && !suggestionMatchContext) {
      setSuggestionMatchContext({ pendingSuggestion: newSuggestion, match: matches[0] });
      return;
    }
    proceedAddSuggestion();
  };

  const proceedAddSuggestion = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const idea = suggestionMatchContext ? suggestionMatchContext.pendingSuggestion : newSuggestion;
    setSuggestions([...suggestions, { id: newId, ...idea, votes: 1, isFavorite: false }]);
    setNewSuggestion({ type: 'flavor', text: '' });
    setSuggestionMatchContext(null);
  };

  const acceptSuggestionMatch = () => {
    handleUpvoteSuggestion(suggestionMatchContext.match.id);
    setNewSuggestion({ type: 'flavor', text: '' });
    setSuggestionMatchContext(null);
  };

  const handleDeleteSuggestion = (id) => setSuggestions(suggestions.filter(s => s.id !== id));
  const handleToggleFavorite = (id) => setSuggestions(suggestions.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
  const handleUpvoteSuggestion = (id) => setSuggestions(suggestions.map(s => s.id === id ? { ...s, votes: (s.votes || 0) + 1 } : s));

  // Reservas
  const handleAddReservation = (e) => {
    e.preventDefault();
    if (!newReservation.name || !newReservation.productId) return;
    
    const selectedProduct = products.find(p => p.id === newReservation.productId);
    if (!selectedProduct) return;

    const newId = Math.random().toString(36).substr(2, 9);
    const cookieUnits = (selectedProduct.units || 1) * Number(newReservation.quantity);
    const expectedRevenue = selectedProduct.price * Number(newReservation.quantity);

    setReservations([...reservations, { 
      id: newId, 
      name: newReservation.name,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: Number(newReservation.quantity),
      cookieUnits: cookieUnits,
      expectedRevenue: expectedRevenue,
      date: newReservation.date, 
      status: 'pending' 
    }]);
    setNewReservation({ name: '', productId: '', quantity: 1, date: '' });
  };
  const handleUpdateReservationStatus = (id, status) => setReservations(reservations.map(r => r.id === id ? { ...r, status } : r));
  const handleDeleteReservation = (id) => setReservations(reservations.filter(r => r.id !== id));

  // --- COMPONENTES AUXILIARES ---
  const NetworkNode = ({ customer, isRoot = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const children = customers.filter(c => c.referredBy === customer.id);
    const hasChildren = children.length > 0;

    return (
      <div className={`relative ${!isRoot ? 'ml-8 mt-4' : 'mb-8'}`}>
        {!isRoot && (
          <>
            <div className="absolute -left-6 top-6 w-6 border-t-2 border-amber-200 dark:border-gray-600"></div>
            <div className="absolute -left-6 -top-4 h-10 border-l-2 border-amber-200 dark:border-gray-600"></div>
          </>
        )}
        
        <div 
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          className={`flex items-center gap-3 p-3 rounded-xl shadow-sm w-fit z-10 relative transition-colors ${
            isRoot ? 'bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/50' : 'bg-white dark:bg-gray-800 border border-amber-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          } ${hasChildren ? 'cursor-pointer' : ''}`}
        >
          <div className={`p-2 rounded-full ${isRoot ? 'bg-amber-600 text-white' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'}`}>
            {isRoot ? <Network size={20} /> : <Cookie size={20} />}
          </div>
          <div>
            <p className={`font-bold ${isRoot ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>{customer.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {isRoot && <span className="text-amber-700 dark:text-amber-400 mr-1">Iniciador •</span>}
              {customer.purchases} pedidos {hasChildren && `• ${children.length} indicações`}
            </p>
          </div>
          {hasChildren && (
            <div className="ml-2 text-amber-600 dark:text-amber-400">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="relative border-l-2 border-amber-200 dark:border-gray-600 ml-[1.5rem] mt-2">
            {children.map(child => <NetworkNode key={child.id} customer={child} />)}
          </div>
        )}
      </div>
    );
  };

  const rootCustomers = customers.filter(c => !c.referredBy);
  const maxWeeklyRevenue = Math.max(...weeklyStats.map(m => m.revenue), 10); 
  const singleProducts = products.filter(p => p.type === 'single' || !p.type);
  const comboProducts = products.filter(p => p.type === 'combo');

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="flex h-screen bg-orange-50/30 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200">
        
        {/* Sidebar */}
        <aside className="w-64 bg-amber-900 dark:bg-gray-950 text-amber-50 flex flex-col shadow-xl z-20 transition-colors duration-200">
          <div className="p-6 flex items-center gap-3">
            <Cookie size={32} className="text-amber-300" />
            <h1 className="text-2xl font-bold tracking-tight">CookieDash</h1>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 mt-4">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}>
              <BarChart3 size={20} /> Visão Geral
            </button>
            <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}>
              <ShoppingBag size={20} /> Catálogo de Produtos
            </button>
            <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}>
              <Users size={20} /> Clientes
            </button>
            <button onClick={() => setActiveTab('costs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'costs' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}>
              <Calculator size={20} /> Custos & Sync
            </button>
            <button onClick={() => setActiveTab('reservations')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'reservations' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}>
              <CalendarCheck size={20} /> Reservas
            </button>
            <button onClick={() => setActiveTab('network')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'network' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}>
              <Network size={20} /> Rede de Indicações
            </button>
            <button onClick={() => setActiveTab('suggestions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'suggestions' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}>
              <Lightbulb size={20} /> Ideias & Sugestões
            </button>
          </nav>

          {/* Botão de Tema */}
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="mt-auto mb-6 mx-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors hover:bg-amber-800/50 dark:hover:bg-gray-800 text-amber-200 dark:text-gray-400 hover:text-white border border-amber-800 dark:border-gray-800"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span className="font-medium text-sm">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {/* TAB: DASHBOARD & VENDAS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Visão Geral</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Sua central de faturamento e entrada rápida de vendas.</p>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl border border-amber-100 dark:border-gray-700 shadow-sm transition-colors">
                  {lastSync && <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1 pl-2"><Clock size={12}/> {lastSync}</span>}
                  <button onClick={handleSyncSheet} disabled={isSyncing} className="bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/50 text-amber-800 dark:text-amber-400 text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70">
                    <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Lendo..." : "Sincronizar Planilha"}
                  </button>
                </div>
              </div>
              
              {/* Cards de Métricas Globais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 relative overflow-hidden transition-colors">
                  <div className="relative z-10">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Faturamento Total</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">R$ {globalMetrics.totalRevenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="absolute -bottom-2 -right-2 text-green-50/50 dark:text-gray-700 w-20 h-20" />
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 relative overflow-hidden transition-colors">
                  <div className="relative z-10">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Lucro Estimado</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">R$ {globalMetrics.totalEstimatedProfit.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="absolute -bottom-2 -right-2 text-green-50 dark:text-gray-700 w-20 h-20" />
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 relative overflow-hidden transition-colors">
                  <div className="relative z-10">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Cookies Vendidos</p>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-500">{globalMetrics.totalCookiesSold} un.</p>
                  </div>
                  <Cookie className="absolute -bottom-2 -right-2 text-amber-50 dark:text-gray-700 w-20 h-20" />
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 relative overflow-hidden transition-colors">
                  <div className="relative z-10">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Base de Clientes</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{customers.length}</p>
                  </div>
                  <Users className="absolute -bottom-2 -right-2 text-blue-50 dark:text-gray-700 w-20 h-20" />
                </div>
              </div>

              {/* SEÇÃO DE PREVISÕES E AGENDA (REFEITA PARA O NOVO DESIGN) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-amber-50 dark:bg-gray-800/80 rounded-3xl shadow-sm border-2 border-amber-300 dark:border-amber-700/50 p-6 flex flex-col justify-between relative overflow-hidden transition-colors">
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-2 text-amber-900 dark:text-amber-400"><Calendar className="text-amber-600 dark:text-amber-500"/> Planejamento & Previsões</h3>
                    <p className="text-amber-800/80 dark:text-gray-400 text-sm mb-6">Acompanhe as encomendas pendentes e planeje sua próxima produção de fornadas.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-amber-100 dark:border-gray-700 shadow-sm transition-colors">
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">Faturamento Previsto</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">R$ {expectedMetrics.revenue.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-amber-100 dark:border-gray-700 shadow-sm transition-colors">
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">Cookies a Produzir</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{expectedMetrics.cookies} <span className="text-sm font-normal text-gray-500">un.</span></p>
                    </div>
                    <div className={`p-4 rounded-2xl border transition-colors shadow-sm flex flex-col justify-center ${expectedMetrics.batchesNeeded > 0 ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700' : 'bg-white dark:bg-gray-900 border-amber-100 dark:border-gray-700'}`}>
                      <div className="flex justify-between items-start mb-1">
                         <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">Previsão de Fornadas</p>
                         {expectedMetrics.batchesNeeded > 0 && <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" title="Bater novas fornadas necessárias"/>}
                      </div>
                      <div className="flex items-center gap-2 justify-between mt-1">
                        <p className={`text-2xl font-bold ${expectedMetrics.batchesNeeded > 0 ? 'text-amber-800 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>{expectedMetrics.batchesNeeded}</p>
                        <div className="flex flex-col items-end">
                          <label className="text-[9px] text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wider">Data Estipulada</label>
                          <input type="date" value={batchDate} onChange={(e) => setBatchDate(e.target.value)} className="text-xs bg-white/60 dark:bg-gray-800 border border-amber-200 dark:border-gray-600 rounded px-1.5 py-1 outline-none text-gray-700 dark:text-gray-300 focus:border-amber-500 dark:focus:border-amber-500 cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 p-6 flex flex-col transition-colors">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <Clock className="text-amber-600 dark:text-amber-500" size={20}/> Próximas Entregas
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {pendingReservationsList.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center mt-4">Nenhuma encomenda pendente.</p>
                    ) : (
                      pendingReservationsList.slice(0, 5).map(res => (
                        <div key={res.id} className="flex justify-between items-center p-3 bg-amber-50/50 dark:bg-gray-700/50 rounded-xl border border-amber-100/50 dark:border-gray-600 transition-colors">
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate max-w-[120px]" title={res.name}>{res.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{res.quantity}x {res.productName}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-gray-800 px-2 py-1 rounded-lg whitespace-nowrap border border-transparent dark:border-gray-600">
                              {res.date ? new Date(res.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : 'A comb.'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Formulário Rápido de Nova Venda */}
                <div className="lg:col-span-1 bg-amber-600 dark:bg-amber-700 rounded-3xl shadow-sm p-6 text-white relative overflow-hidden flex flex-col transition-colors">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500 dark:bg-amber-600 rounded-full blur-3xl -mr-10 -mt-10 opacity-50"></div>
                  
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                    <ShoppingCart size={22} /> Nova Venda Rápida
                  </h3>
                  
                  <form onSubmit={handleQuickSale} className="space-y-4 relative z-10 flex-1 flex flex-col">
                    <div>
                      <label className="block text-xs font-medium text-amber-100 mb-1">Nome do Cliente</label>
                      <input required type="text" className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white placeholder-amber-200/50 transition" value={quickSale.customerName} onChange={e => setQuickSale({...quickSale, customerName: e.target.value})} placeholder="Ex: Maria" />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-100 mb-1">Produto ou Combo</label>
                      <select required className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white [&>optgroup]:text-gray-800 [&>option]:text-gray-800 transition" value={quickSale.productId} onChange={e => setQuickSale({...quickSale, productId: e.target.value})}>
                        {products.length === 0 ? <option value="">Cadastre no Catálogo</option> : (
                          <>
                            <optgroup label="Produtos Individuais">
                              {products.filter(p => p.type === 'single' || !p.type).map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}
                            </optgroup>
                            {products.filter(p => p.type === 'combo').length > 0 && (
                              <optgroup label="Combos e Promoções">
                                {products.filter(p => p.type === 'combo').map(p => <option key={p.id} value={p.id}>{p.name} ({p.units} un) - R$ {p.price.toFixed(2)}</option>)}
                              </optgroup>
                            )}
                          </>
                        )}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-amber-100 mb-1">Quem indicou? (Opcional)</label>
                      <select className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white [&>option]:text-gray-800 transition" value={quickSale.referredBy} onChange={e => setQuickSale({...quickSale, referredBy: e.target.value})}>
                        <option value="">Ninguém</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-1/2">
                        <label className="block text-xs font-medium text-amber-100 mb-1">Qtd. Selecionada</label>
                        <input type="number" min="1" required className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white transition text-center" value={quickSale.quantity} onChange={e => setQuickSale({...quickSale, quantity: Number(e.target.value)})} />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-xs font-medium text-amber-100 mb-1">Total (R$)</label>
                        <input type="number" step="0.5" required className="w-full p-2.5 bg-white border border-transparent rounded-xl outline-none text-gray-800 font-bold text-center" value={quickSale.revenue} onChange={e => setQuickSale({...quickSale, revenue: Number(e.target.value)})} />
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-white text-amber-700 hover:bg-amber-50 dark:text-gray-900 dark:hover:bg-gray-100 py-3 rounded-xl font-bold mt-auto transition shadow-sm">
                      Registrar Venda
                    </button>
                  </form>
                </div>

                {/* Gráfico Interativo de Faturamento */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 flex flex-col transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Activity className="text-amber-600 dark:text-amber-500" size={20}/> Histórico de Receita e Lucro
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Desempenho por semana (Últimas 6 semanas).</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button 
                        onClick={() => setShowSalesHistory(true)}
                        className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-gray-700 hover:bg-amber-100 dark:hover:bg-gray-600 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg transition-colors font-medium border border-amber-200 dark:border-gray-600"
                      >
                        <History size={16} /> Ver Histórico Detalhado
                      </button>
                      <div className="flex items-center gap-4 text-xs font-medium mt-1 text-gray-600 dark:text-gray-300">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-600"></div> Receita Bruta</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500 dark:bg-green-500"></div> Lucro Estimado</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex items-end justify-between gap-2 mt-auto pt-4 border-b border-gray-100 dark:border-gray-700 pb-2 relative min-h-[200px]">
                    {/* Linhas de grade horizontais */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10">
                      <div className="border-t border-gray-400 dark:border-gray-300 w-full"></div>
                      <div className="border-t border-gray-400 dark:border-gray-300 w-full"></div>
                      <div className="border-t border-gray-400 dark:border-gray-300 w-full"></div>
                    </div>

                    {weeklyStats.map((data, index) => {
                      const revenueHeight = (data.revenue / maxWeeklyRevenue) * 100;
                      const profitHeight = data.revenue > 0 ? (Math.max(data.estimatedProfit, 0) / maxWeeklyRevenue) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex flex-col items-center flex-1 group z-10 h-full justify-end">
                          <div className="w-full max-w-[48px] relative h-full flex items-end justify-center">
                            {/* Barra de Receita (Fundo) */}
                            <div 
                              className="absolute bottom-0 w-full bg-amber-100 dark:bg-amber-800/50 rounded-t-md group-hover:bg-amber-200 dark:group-hover:bg-amber-700/60 transition-all duration-300" 
                              style={{ height: `${revenueHeight}%` }}
                            ></div>
                            {/* Barra de Lucro (Frente) */}
                            <div 
                              className="absolute bottom-0 w-full bg-green-400 dark:bg-green-500/80 rounded-t-sm group-hover:bg-green-500 dark:group-hover:bg-green-400 transition-all duration-300 shadow-[0_-2px_4px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_4px_rgba(0,0,0,0.3)]" 
                              style={{ height: `${profitHeight}%`, maxWidth: '60%' }}
                            ></div>
                            
                            {/* Tooltip Hover */}
                            {data.revenue > 0 && (
                              <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-white text-white dark:text-gray-900 text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 flex flex-col items-center shadow-lg">
                                <span className="font-bold">R$ {data.revenue.toFixed(2)}</span>
                                <span className="text-green-300 dark:text-green-600 text-[10px]">Lucro: R$ {data.estimatedProfit.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium text-center leading-tight max-w-[70px] whitespace-pre-line">{data.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Top Promotores Rápido */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                 <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                   <Award className="text-amber-600 dark:text-amber-500" size={20}/> Top Clientes Promotores
                 </h3>
                 {topReferrers.length > 0 && topReferrers[0].referralsCount > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {topReferrers.filter(c => c.referralsCount > 0).map((customer, i) => (
                       <div key={customer.id} className="flex items-center gap-4 bg-orange-50/50 dark:bg-gray-700/50 p-4 rounded-xl border border-orange-100 dark:border-gray-600 transition-colors">
                         <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400 flex items-center justify-center font-bold text-sm">#{i+1}</div>
                         <div>
                           <p className="font-bold text-gray-800 dark:text-gray-200">{customer.name}</p>
                           <p className="text-xs text-amber-700 dark:text-gray-400">{customer.referralsCount} amigos indicados</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum cliente indicou amigos ainda. Registre indicações nas Novas Vendas!</p>
                 )}
              </div>
            </div>
          )}

          {/* TAB: CATÁLOGO DE PRODUTOS */}
          {activeTab === 'products' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Catálogo de Produtos</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Cadastre itens individuais e promoções (combos) para facilitar a venda.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Add Product */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 h-fit transition-colors">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Plus size={20} className="text-amber-600 dark:text-amber-500" /> Adicionar Item
                  </h3>
                  
                  {/* Dica de Preço Baseada na Ficha Técnica */}
                  {costMetrics.costPerCookie > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50">
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1 mb-1"><Lightbulb size={14}/> Sugestão de Precificação</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400/80">Custo desse item: <strong>R$ {(costMetrics.costPerCookie * (newProduct.type === 'combo' ? (Number(newProduct.units) || 1) : 1)).toFixed(2)}</strong></p>
                      <p className="text-xs text-amber-700 dark:text-amber-400/80">Sugestão (100% lucro): <strong>R$ {(costMetrics.costPerCookie * (newProduct.type === 'combo' ? (Number(newProduct.units) || 1) : 1) * 2).toFixed(2)}</strong></p>
                    </div>
                  )}

                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Item</label>
                      <select className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value})}>
                        <option value="single">Produto Individual (1 unid.)</option>
                        <option value="combo">Combo / Promoção</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do {newProduct.type === 'combo' ? 'Combo' : 'Produto'}</label>
                      <input required type="text" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder={newProduct.type === 'combo' ? "Ex: Combo 2 Unidades" : "Ex: Cookie Red Velvet"} />
                    </div>

                    {newProduct.type === 'combo' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantos cookies vêm nesse combo?</label>
                        <input required type="number" min="2" className="w-full p-2 bg-amber-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newProduct.units} onChange={e => setNewProduct({...newProduct, units: e.target.value})} />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Garante o custo correto da Ficha Técnica na venda.</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço de Venda (R$)</label>
                      <input required type="number" step="0.10" min="0" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} placeholder="Ex: 18.00" />
                    </div>
                    <button type="submit" className="w-full bg-amber-600 dark:bg-amber-700 text-white py-2 rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 transition font-medium mt-2">
                      Salvar {newProduct.type === 'combo' ? 'Combo' : 'Produto'}
                    </button>
                  </form>
                </div>

                {/* Lista de Produtos Dividida */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* Produtos Individuais */}
                  <div>
                    <h4 className="text-md font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><Tag size={18}/> Produtos Individuais</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.filter(p => p.type === 'single' || !p.type).length === 0 ? (
                        <p className="col-span-2 text-sm text-gray-400 dark:text-gray-500 p-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center">Nenhum produto individual.</p>
                      ) : products.filter(p => p.type === 'single' || !p.type).map(product => (
                        <div key={product.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full text-orange-600 dark:text-orange-400">
                              <Tag size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-200">{product.name}</p>
                              <p className="text-sm font-medium text-green-600 dark:text-green-400">R$ {product.price.toFixed(2)}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Remover">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Combos e Promoções */}
                  <div>
                    <h4 className="text-md font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><Layers size={18} className="text-amber-600 dark:text-amber-500"/> Combos & Promoções</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.filter(p => p.type === 'combo').length === 0 ? (
                        <p className="col-span-2 text-sm text-gray-400 dark:text-gray-500 p-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center">Nenhum combo cadastrado.</p>
                      ) : products.filter(p => p.type === 'combo').map(product => (
                        <div key={product.id} className="bg-amber-50 dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-700/50 flex justify-between items-center group transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-amber-200 dark:bg-amber-900/50 p-3 rounded-full text-amber-700 dark:text-amber-400">
                              <Layers size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-200">{product.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">R$ {product.price.toFixed(2)}</p>
                                <span className="text-[10px] bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-gray-700">{product.units} cookies</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-amber-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Remover">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB: CUSTOS E SYNC */}
          {activeTab === 'costs' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Custos, Ficha e Planilha</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Conecte sua planilha para gerar os custos em tempo real.</p>
                </div>
              </div>

              {/* PAINEL DE SINCRONIZAÇÃO */}
              <div className="bg-amber-900 dark:bg-gray-800 p-8 rounded-3xl shadow-sm relative overflow-hidden text-white flex flex-col justify-center mb-8 border border-transparent dark:border-gray-700 transition-colors">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-700 dark:bg-gray-700 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-white">
                      <FileSpreadsheet className="text-amber-300 dark:text-amber-400" /> Vínculo com Planilha Excel/Sheets
                    </h3>
                    <p className="text-amber-100 dark:text-gray-300 text-sm leading-relaxed mb-4">
                      Seus lucros do painel principal dependem da Ficha Técnica. Cole o link da sua planilha aqui e sincronize para manter os custos da matéria-prima atualizados.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Link da sua planilha..." className="w-full pl-12 pr-4 py-3 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
                      </div>
                      <button onClick={handleSyncSheet} disabled={isSyncing} className="bg-amber-500 dark:bg-amber-600 hover:bg-amber-400 dark:hover:bg-amber-500 text-amber-950 dark:text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 whitespace-nowrap">
                        <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? "Lendo..." : "Sincronizar"}
                      </button>
                    </div>
                    {lastSync && <p className="text-xs text-amber-200 dark:text-gray-400 mt-3 flex items-center gap-1 font-medium"><CheckCircle size={12}/> Última leitura: {lastSync}</p>}
                  </div>
                </div>
              </div>

              {ingredients.length > 0 && (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    {/* Cards de Métricas Ficam em uma coluna ou grade */}
                    <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                        <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><Package size={16}/><h3 className="font-medium text-xs">Custo por Receita</h3></div>
                        <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {costMetrics.totalRecipeCost.toFixed(2)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                        <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><Calculator size={16}/><h3 className="font-medium text-xs">Custo Unitário</h3></div>
                        <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {costMetrics.costPerCookie.toFixed(2)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                        <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><DollarSign size={16} className="text-green-500"/><h3 className="font-medium text-xs text-green-700 dark:text-green-400">Lucro por Unidade</h3></div>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">R$ {costMetrics.profit.toFixed(2)}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                        <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><TrendingUp size={16} className="text-purple-500"/><h3 className="font-medium text-xs text-purple-700 dark:text-purple-400">Margem</h3></div>
                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{costMetrics.profitMargin.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Controles Dinâmicos */}
                    <div className="bg-amber-50 dark:bg-gray-800 p-5 rounded-2xl border border-amber-200 dark:border-gray-700 transition-colors">
                      <h3 className="font-bold text-amber-900 dark:text-gray-200 mb-3 text-sm">Simulador Base</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium text-amber-800 dark:text-gray-400">Rendimento (un):</label>
                          <input type="number" className="w-16 p-1 text-center text-sm border border-amber-200 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none" value={recipeConfig.yield} onChange={(e) => setRecipeConfig({...recipeConfig, yield: Number(e.target.value) || 1})} />
                        </div>
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium text-amber-800 dark:text-gray-400">Venda Base(R$):</label>
                          <input type="number" step="0.5" className="w-20 p-1 text-center text-sm border border-amber-200 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none" value={recipeConfig.salePrice} onChange={(e) => setRecipeConfig({...recipeConfig, salePrice: Number(e.target.value) || 0})} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 mb-8 transition-colors">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <PieChart className="text-amber-600 dark:text-amber-500" size={20} /> Composição de Preço Base (1 Unidade)
                    </h3>
                    <div className="flex items-center h-10 rounded-full overflow-hidden w-full bg-gray-100 dark:bg-gray-900 mt-2 border border-gray-200 dark:border-gray-700">
                      <div className="h-full bg-orange-400 dark:bg-orange-500 flex items-center justify-center text-white text-xs font-bold transition-all" style={{ width: `${Math.max((costMetrics.costPerCookie / recipeConfig.salePrice) * 100, 0)}%` }}>
                        {(costMetrics.costPerCookie / recipeConfig.salePrice * 100) > 10 && 'Custo'}
                      </div>
                      <div className="h-full bg-green-500 dark:bg-green-600 flex items-center justify-center text-white text-xs font-bold transition-all" style={{ width: `${Math.max((costMetrics.profit / recipeConfig.salePrice) * 100, 0)}%` }}>
                        {(costMetrics.profit / recipeConfig.salePrice * 100) > 10 && 'Lucro Líquido'}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mt-3 px-2">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><div className="w-3 h-3 rounded-full bg-orange-400 dark:bg-orange-500"></div>Custo: R$ {costMetrics.costPerCookie.toFixed(2)}</div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><div className="w-3 h-3 rounded-full bg-green-500 dark:bg-green-600"></div>Lucro: R$ {costMetrics.profit.toFixed(2)}</div>
                    </div>
                  </div>
                </>
              )}

              {/* Tabela de Ingredientes (Ficha Técnica) */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 overflow-hidden transition-colors">
                <div className="p-6 border-b border-amber-100 dark:border-gray-700 bg-amber-50/30 dark:bg-gray-900 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <FileSpreadsheet className="text-amber-600 dark:text-amber-500" size={20} /> Insumos da Planilha Vinculada
                  </h3>
                </div>
                
                {ingredients.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center bg-white dark:bg-gray-800">
                     <FileSpreadsheet className="text-amber-200 dark:text-gray-600 mb-3" size={48} />
                     <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Aguardando Sincronização...</p>
                     <p className="text-gray-400 dark:text-gray-500 text-sm max-w-sm mt-2">Insira o link da sua planilha no painel acima para calcular automaticamente seus custos e margem de lucro.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white dark:bg-gray-800">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 text-sm">
                          <th className="p-4 font-semibold">Matéria Prima</th>
                          <th className="p-4 font-semibold">Preço na Planilha</th>
                          <th className="p-4 font-semibold">Qtde Pacote</th>
                          <th className="p-4 font-semibold">Uso na Receita</th>
                          <th className="p-4 font-semibold text-right text-amber-700 dark:text-amber-400">Custo na Receita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((ing) => {
                          const ingCost = (ing.bulkPrice / ing.bulkQty) * ing.recipeQty;
                          return (
                            <tr key={ing.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{ing.name}</td>
                              <td className="p-4 text-gray-600 dark:text-gray-400">R$ {ing.bulkPrice.toFixed(2)}</td>
                              <td className="p-4 text-gray-600 dark:text-gray-400">{ing.bulkQty} {ing.unit}</td>
                              <td className="p-4 text-gray-600 dark:text-gray-400">{ing.recipeQty} {ing.unit}</td>
                              <td className="p-4 text-right font-medium text-amber-700 dark:text-amber-400">R$ {ingCost.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CLIENTES */}
          {activeTab === 'customers' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gerenciar Clientes</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Sua base é alimentada pelas "Novas Vendas" na Visão Geral.</p>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-amber-200 dark:border-gray-700 shadow-sm w-full sm:w-auto transition-colors">
                  <ArrowUpDown size={18} className="text-amber-600 dark:text-amber-500" />
                  <select className="bg-transparent font-medium text-gray-700 dark:text-gray-200 outline-none w-full cursor-pointer" value={customerSortBy} onChange={(e) => setCustomerSortBy(e.target.value)}>
                    <option value="name-asc">Ordem: A - Z</option>
                    <option value="name-desc">Ordem: Z - A</option>
                    <option value="referrals-desc">Maior nº de Indicações</option>
                    <option value="purchases-desc">Maior nº de Pedidos</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-amber-50 dark:bg-gray-900 text-amber-900 dark:text-amber-400 border-b border-amber-100 dark:border-gray-700">
                        <th className="p-4 font-semibold">Nome</th>
                        <th className="p-4 font-semibold">Indicado por</th>
                        <th className="p-4 font-semibold text-center">Indicações Feitas</th>
                        <th className="p-4 font-semibold text-center">Nº de Pedidos</th>
                        <th className="p-4 font-semibold text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCustomersWithStats.length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum cliente na base. Registre vendas na aba Visão Geral!</td></tr>
                      ) : sortedCustomersWithStats.map((customer) => (
                        <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{customer.name}</td>
                          <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">{customer.referrerName}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${customer.referralsCount > 0 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                              {customer.referralsCount}
                            </span>
                          </td>
                          <td className="p-4 text-center font-medium text-amber-700 dark:text-amber-400">{customer.purchases}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleDeleteCustomer(customer.id)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors inline-flex" title="Remover cliente"><Trash2 size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RESERVAS */}
          {activeTab === 'reservations' && (
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-8">Reservas e Interessados</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 h-fit transition-colors">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Plus size={20} className="text-amber-600 dark:text-amber-500" /> Nova Reserva</h3>
                  <form onSubmit={handleAddReservation} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Cliente</label>
                      <input required type="text" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newReservation.name} onChange={e => setNewReservation({...newReservation, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produto Desejado</label>
                      <select required className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none [&>optgroup]:text-gray-500 transition-colors" value={newReservation.productId} onChange={e => setNewReservation({...newReservation, productId: e.target.value})}>
                        <option value="">Selecione no catálogo...</option>
                        {products.filter(p => p.type === 'single' || !p.type).length > 0 && (
                          <optgroup label="Produtos Individuais">
                            {products.filter(p => p.type === 'single' || !p.type).map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}
                          </optgroup>
                        )}
                        {products.filter(p => p.type === 'combo').length > 0 && (
                          <optgroup label="Combos e Promoções">
                            {products.filter(p => p.type === 'combo').map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}
                          </optgroup>
                        )}
                      </select>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantidade</label>
                        <input type="number" min="1" required className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newReservation.quantity} onChange={e => setNewReservation({...newReservation, quantity: e.target.value})} />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data (Opcional)</label>
                        <input type="date" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newReservation.date} onChange={e => setNewReservation({...newReservation, date: e.target.value})} />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-amber-600 dark:bg-amber-700 text-white py-2 rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 transition font-medium mt-2">Adicionar Reserva</button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 overflow-hidden transition-colors">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-amber-50 dark:bg-gray-900 text-amber-900 dark:text-amber-400 border-b border-amber-100 dark:border-gray-700">
                          <th className="p-4 font-semibold">Cliente</th>
                          <th className="p-4 font-semibold">Pedido</th>
                          <th className="p-4 font-semibold">Data</th>
                          <th className="p-4 font-semibold text-center">Status</th>
                          <th className="p-4 font-semibold text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhuma reserva registada.</td></tr>
                        ) : reservations.map((reservation) => (
                          <tr key={reservation.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{reservation.name}</td>
                            <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">{reservation.quantity}x {reservation.productName || reservation.product}</td>
                            <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">{reservation.date ? new Date(reservation.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'A combinar'}</td>
                            <td className="p-4 text-center">
                              {reservation.status === 'pending' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"><Clock size={12}/> Pendente</span>}
                              {reservation.status === 'completed' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"><CheckCircle size={12}/> Concluído</span>}
                              {reservation.status === 'cancelled' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"><XCircle size={12}/> Cancelado</span>}
                            </td>
                            <td className="p-4 text-center flex items-center justify-center gap-2">
                              {reservation.status === 'pending' && (
                                <>
                                  <button onClick={() => handleUpdateReservationStatus(reservation.id, 'completed')} className="text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-gray-700 p-1 rounded transition-colors" title="Marcar como Concluído"><CheckCircle size={18}/></button>
                                  <button onClick={() => handleUpdateReservationStatus(reservation.id, 'cancelled')} className="text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 p-1 rounded transition-colors" title="Cancelar"><XCircle size={18}/></button>
                                </>
                              )}
                              <button onClick={() => handleDeleteReservation(reservation.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 p-1 rounded transition-colors" title="Excluir"><Trash2 size={18}/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REDE */}
          {activeTab === 'network' && (
            <div className="max-w-5xl mx-auto h-full flex flex-col">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Rede de Indicações</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Veja a árvore de conexões: descubra quem iniciou a corrente e clique para expandir.</p>
              </div>
              <div className="flex-1 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 overflow-auto transition-colors">
                <div className="min-w-max pb-10">
                  {rootCustomers.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center mt-10">Nenhum cliente cadastrado ainda.</p>
                  ) : (
                    rootCustomers.map(root => (
                      <NetworkNode key={root.id} customer={root} isRoot={true} />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUGESTÕES */}
          {activeTab === 'suggestions' && (
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Ideias & Sugestões</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Anote feedbacks, novos sabores e produtos para o futuro.</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-amber-100 dark:border-gray-700 mb-8 flex flex-col gap-4 transition-colors">
                <form onSubmit={handleAddSuggestion} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descreva a ideia...</label>
                    <input required type="text" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newSuggestion.text} onChange={e => setNewSuggestion({...newSuggestion, text: e.target.value})} placeholder="Ex: Cookie sabor Limão Siciliano" />
                  </div>
                  <div className="w-full md:w-48">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                    <select className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newSuggestion.type} onChange={e => setNewSuggestion({...newSuggestion, type: e.target.value})}>
                      <option value="flavor">🍪 Novo Sabor</option>
                      <option value="product">📦 Novo Produto</option>
                      <option value="improvement">⚙️ Melhoria</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full md:w-auto bg-amber-600 dark:bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 transition font-medium flex items-center justify-center gap-2 h-[42px]"><Plus size={18} /> Adicionar</button>
                </form>
                {suggestionMatchContext && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 transition-colors">
                    <p className="text-amber-800 dark:text-amber-300 text-sm"><strong>Ideia similar encontrada:</strong> "{suggestionMatchContext.match.text}".<br/>Deseja apenas adicionar um voto nela?</p>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={proceedAddSuggestion} className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-700 hover:bg-amber-100 dark:hover:bg-gray-700 rounded-lg transition">Criar Nova</button>
                      <button onClick={acceptSuggestionMatch} className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition flex items-center justify-center gap-2"><ThumbsUp size={16} /> Votar na Existente</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['flavor', 'product', 'improvement'].map((catType) => (
                  <div key={catType} className={`rounded-2xl p-4 border transition-colors ${catType === 'flavor' ? 'bg-orange-50/50 dark:bg-gray-800/50 border-orange-100 dark:border-gray-700' : catType === 'product' ? 'bg-amber-50/50 dark:bg-gray-800/50 border-amber-100 dark:border-gray-700' : 'bg-stone-50/50 dark:bg-gray-800/50 border-stone-200 dark:border-gray-700'}`}>
                    <h3 className={`font-bold mb-4 flex items-center gap-2 ${catType === 'flavor' ? 'text-orange-800 dark:text-orange-400' : catType === 'product' ? 'text-amber-800 dark:text-amber-400' : 'text-stone-800 dark:text-gray-300'}`}>
                      {catType === 'flavor' ? <Cookie size={20}/> : catType === 'product' ? <Package size={20}/> : <Lightbulb size={20}/>} 
                      {catType === 'flavor' ? 'Sabores' : catType === 'product' ? 'Produtos' : 'Melhorias'}
                    </h3>
                    <div className="space-y-3">
                      {suggestions.filter(s => s.type === catType).sort((a,b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) || (b.votes || 0) - (a.votes || 0)).map(s => (
                        <div key={s.id} className={`bg-white dark:bg-gray-900 p-3 rounded-lg shadow-sm border ${s.isFavorite ? 'border-amber-400 dark:border-amber-500 ring-1 ring-amber-400 dark:ring-amber-500' : 'border-gray-100 dark:border-gray-700'} flex flex-col gap-2 transition-all`}>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-gray-700 dark:text-gray-200 text-sm flex-1">{s.text}</span>
                            <button onClick={() => handleToggleFavorite(s.id)} className={`${s.isFavorite ? 'text-amber-400 dark:text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-300 dark:hover:text-amber-500'} transition-colors`}><Star size={18} fill={s.isFavorite ? 'currentColor' : 'none'} /></button>
                          </div>
                          <div className="flex justify-between items-center mt-1 border-t border-gray-50 dark:border-gray-800 pt-2">
                            <button onClick={() => handleUpvoteSuggestion(s.id)} className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 bg-gray-50 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors border border-gray-100 dark:border-gray-700 hover:border-amber-200 dark:hover:border-gray-600"><ThumbsUp size={14} /> {s.votes || 0}</button>
                            <button onClick={() => handleDeleteSuggestion(s.id)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-gray-800"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODAL DE HISTÓRICO DE VENDAS */}
          {showSalesHistory && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-8">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 transition-colors">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <History className="text-amber-600 dark:text-amber-500" /> Histórico Detalhado
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registro completo de todas as vendas efetuadas.</p>
                  </div>
                  <button 
                    onClick={() => setShowSalesHistory(false)} 
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 dark:bg-gray-900/30 transition-colors">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-amber-50 dark:bg-gray-900 text-amber-900 dark:text-amber-400 border-b border-amber-100 dark:border-gray-700">
                          <th className="p-4 font-semibold">Data / Hora</th>
                          <th className="p-4 font-semibold">Cliente</th>
                          <th className="p-4 font-semibold text-center">Quantidade</th>
                          <th className="p-4 font-semibold text-right">Receita (R$)</th>
                          <th className="p-4 font-semibold text-right">Lucro Est. (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhuma venda registrada ainda.</td></tr>
                        ) : [...sales].sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => {
                          const estProfit = sale.revenue - ((sale.cookieUnits || sale.quantity) * costMetrics.costPerCookie);
                          return (
                            <tr key={sale.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                {new Date(sale.date).toLocaleDateString('pt-BR')} <br/>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(sale.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                              </td>
                              <td className="p-4">
                                <p className="font-medium text-gray-800 dark:text-gray-200">{sale.customerName || 'Cliente Balcão'}</p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">{sale.productName || 'Produto Avulso'}</p>
                              </td>
                              <td className="p-4 text-center">
                                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-2 py-1 rounded-lg text-xs font-bold">{sale.quantity} un.</span>
                                {sale.cookieUnits > sale.quantity && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">({sale.cookieUnits} cookies)</p>}
                              </td>
                              <td className="p-4 text-right font-medium text-gray-800 dark:text-gray-200">R$ {sale.revenue.toFixed(2)}</td>
                              <td className="p-4 text-right font-bold text-green-600 dark:text-green-400">R$ {estProfit.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
