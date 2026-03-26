import React, { useState, useMemo, useEffect } from 'react';
// IMPORTAÇÕES DO FIREBASE
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// IMPORTAÇÕES DOS ÍCONES
import { 
  Cookie, Users, Network, Lightbulb, FileSpreadsheet, Plus, RefreshCw,
  Link as LinkIcon, Trash2, Star, ThumbsUp, ArrowUpDown, CalendarCheck,
  CheckCircle, Clock, XCircle, Calculator, DollarSign, TrendingUp,
  Package, BarChart3, Activity, PieChart, ShoppingCart, Award, History,
  X, ChevronDown, ChevronRight, ShoppingBag, Tag, Layers, Calendar,
  AlertCircle, Moon, Sun, LogOut, Lock, Mail, Zap, Trophy, Target, 
  TrendingDown, Gift, Crosshair, Flame, UsersRound, LineChart, ClipboardList, AlertTriangle
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

// Helper para obter a data de hoje no formato YYYY-MM-DD
const getTodayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function CookieDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  
  // ==========================================
  // ESTADOS DE AUTENTICAÇÃO E LOGIN
  // ==========================================
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // ==========================================
  // ESTADOS COM FIREBASE (BANCO DE DADOS REAL)
  // ==========================================
  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  
  const [recipeConfig, setRecipeConfig] = useState({ yield: 12, salePrice: 10.00 });
  const [goals, setGoals] = useState({ daily: 150, weekly: 1000 }); 
  const [sheetUrl, setSheetUrl] = useState('');
  const [lastSync, setLastSync] = useState(null);

  // Estados de interface (Formulários)
  const [batchDate, setBatchDate] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', referredBy: '', purchases: 1 });
  const [newSuggestion, setNewSuggestion] = useState({ type: 'flavor', text: '' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', type: 'single', units: 2 });
  
  // Carrinhos de Múltiplos Itens (Vendas e Reservas)
  const [quickSale, setQuickSale] = useState({ customerName: '', referredBy: '', productId: '', quantity: 1, revenue: 0, date: getTodayYMD() });
  const [quickSaleCart, setQuickSaleCart] = useState([]);
  
  const [newReservation, setNewReservation] = useState({ name: '', referredBy: '', productId: '', quantity: 1, date: '' });
  const [reservationCart, setReservationCart] = useState([]);

  const [productionBatches, setProductionBatches] = useState(1);

  const [customerSortBy, setCustomerSortBy] = useState('name-asc');
  const [suggestionMatchContext, setSuggestionMatchContext] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);

  // --- 1. MONITORIZAR AUTENTICAÇÃO ---
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthenticate = async (e) => {
    e.preventDefault();
    setAuthError(''); setResetMessage('');
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') setAuthError('Email ou senha incorretos.');
      else if (error.code === 'auth/email-already-in-use') setAuthError('Este email já está cadastrado. Tente fazer Login.');
      else if (error.code === 'auth/weak-password') setAuthError('A senha deve ter pelo menos 6 caracteres.');
      else setAuthError('Erro na autenticação: ' + error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) { setAuthError('Digite o seu email acima para recuperar a senha.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage('Email de recuperação enviado! Verifique o Spam.'); setAuthError('');
    } catch (error) { setAuthError('Erro: ' + error.message); }
  };

  const handleLogout = () => signOut(auth);

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
             if(data.goals) setGoals(data.goals);
             if(data.lastSync) setLastSync(data.lastSync);
             if(data.sheetUrl) setSheetUrl(data.sheetUrl);
         }
      }, console.error)
    ];
    return () => unsubs.forEach(fn => fn());
  }, [user]);

  const saveToDb = async (col, id, data) => { if (db && user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id), data); };
  const deleteFromDb = async (col, id) => { if (db && user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id)); };
  const saveConfig = async (data) => { if (db && user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), data, { merge: true }); };

  useEffect(() => { if (db && user) saveConfig({ recipeConfig, goals }); }, [recipeConfig, goals, user]);
  useEffect(() => { if (db && user) saveConfig({ sheetUrl }); }, [sheetUrl, user]);

  useEffect(() => {
    if (!quickSale.productId && products.length > 0) {
      setQuickSale(prev => ({ ...prev, productId: products[0].id, revenue: products[0].price }));
    } else {
      const p = products.find(p => p.id === quickSale.productId);
      setQuickSale(prev => ({ ...prev, revenue: prev.quantity * (p ? p.price : recipeConfig.salePrice) }));
    }
  }, [quickSale.quantity, quickSale.productId, products, recipeConfig.salePrice]);

  useEffect(() => {
    if (!newReservation.productId && products.length > 0) setNewReservation(prev => ({ ...prev, productId: products[0].id }));
  }, [products]);

  // --- CÁLCULOS DA FICHA TÉCNICA E CUSTOS ---
  const costMetrics = useMemo(() => {
    const totalRecipeCost = ingredients.reduce((acc, ing) => acc + ((ing.bulkPrice / ing.bulkQty) * ing.recipeQty), 0);
    const costPerCookie = totalRecipeCost / (recipeConfig.yield || 1);
    const profit = recipeConfig.salePrice - costPerCookie;
    const profitMargin = recipeConfig.salePrice > 0 ? (profit / recipeConfig.salePrice) * 100 : 0;
    return { totalRecipeCost, costPerCookie, profit, profitMargin };
  }, [ingredients, recipeConfig]);

  // --- 🧠 MÓDULO INTELIGÊNCIA DE NEGÓCIO (BI) ---
  
  // 1. Métricas Globais (Visão Rápida)
  const globalMetrics = useMemo(() => {
    const totalRevenue = sales.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalCookiesSold = sales.reduce((acc, curr) => acc + (curr.cookieUnits || curr.quantity), 0);
    const totalEstimatedCost = totalCookiesSold * costMetrics.costPerCookie;
    const totalEstimatedProfit = totalRevenue - totalEstimatedCost;
    const ticketMedio = sales.length > 0 ? (totalRevenue / sales.length) : 0;
    const margin = totalRevenue > 0 ? (totalEstimatedProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCookiesSold, totalEstimatedCost, totalEstimatedProfit, ticketMedio, margin };
  }, [sales, costMetrics]);

  // 2. Desempenho no Tempo (Hoje vs Ontem, Semana vs Semana Passada)
  const timeStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today); last7Days.setDate(last7Days.getDate() - 6);
    const previous7Days = new Date(last7Days); previous7Days.setDate(previous7Days.getDate() - 7);
    
    let revToday = 0, revYesterday = 0, rev7Days = 0, revPrev7Days = 0;

    sales.forEach(s => {
      const d = new Date(s.date);
      if (d >= today) revToday += s.revenue;
      else if (d >= yesterday && d < today) revYesterday += s.revenue;
      
      if (d >= last7Days) rev7Days += s.revenue;
      else if (d >= previous7Days && d < last7Days) revPrev7Days += s.revenue;
    });

    const todayGrowth = revYesterday === 0 ? (revToday > 0 ? 100 : 0) : ((revToday - revYesterday) / revYesterday) * 100;
    const weekGrowth = revPrev7Days === 0 ? (rev7Days > 0 ? 100 : 0) : ((rev7Days - revPrev7Days) / revPrev7Days) * 100;

    return { revToday, revYesterday, todayGrowth, rev7Days, revPrev7Days, weekGrowth };
  }, [sales]);

  // 3. Inteligência de Produto & Cliente
  const productIntel = useMemo(() => {
    if (products.length === 0 || sales.length === 0) return null;
    const pStats = products.map(p => {
      const s = sales.filter(sale => sale.productId === p.id || sale.productName === p.name);
      const qty = s.reduce((a,b)=>a+(b.cookieUnits||b.quantity),0);
      const rev = s.reduce((a,b)=>a+b.revenue,0);
      const profit = rev - (qty * costMetrics.costPerCookie);
      return { name: p.name, qty, profit };
    });
    const topSold = [...pStats].sort((a,b)=>b.qty - a.qty)[0];
    const topProfit = [...pStats].sort((a,b)=>b.profit - a.profit)[0];
    return { topSold, topProfit };
  }, [sales, products, costMetrics]);

  const customerIntel = useMemo(() => {
    const novos = customers.filter(c => c.purchases === 1).length;
    const recorrentes = customers.filter(c => c.purchases > 1).length;
    const total = novos + recorrentes;
    const recorrentesPercent = total > 0 ? (recorrentes / total) * 100 : 0;
    return { novos, recorrentes, recorrentesPercent };
  }, [customers]);

  // 4. Projeção Mensal
  const projection = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const revThisMonth = sales.filter(s => new Date(s.date).getMonth() === currentMonth).reduce((a,b)=>a+b.revenue, 0);
    const daysPassed = Math.max(1, new Date().getDate());
    const daysInMonth = new Date(new Date().getFullYear(), currentMonth + 1, 0).getDate();
    return (revThisMonth / daysPassed) * daysInMonth;
  }, [sales]);

  // --- CÁLCULOS DE PREVISÃO E RESERVAS ---
  const pendingReservationsList = useMemo(() => {
    return reservations.filter(r => r.status === 'pending').sort((a, b) => {
      if (!a.date) return 1; if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
  }, [reservations]);

  const expectedMetrics = useMemo(() => {
    let revenue = 0; let cookies = 0;
    pendingReservationsList.forEach(r => { revenue += r.expectedRevenue || 0; cookies += r.cookieUnits || r.quantity || 0; });
    const batchesNeeded = recipeConfig.yield > 0 ? Math.ceil(cookies / recipeConfig.yield) : 0;
    return { revenue, cookies, batchesNeeded };
  }, [pendingReservationsList, recipeConfig.yield]);

  // --- CÁLCULOS DE ESTOQUE E PRODUÇÃO ---
  const inventoryCheck = useMemo(() => {
    const list = ingredients.map(ing => {
      const isPowder = ing.unit.toLowerCase() === 'g' || ing.unit.toLowerCase() === 'kg' || ing.unit.toLowerCase() === 'ml' || ing.unit.toLowerCase() === 'l';
      const wasteFactor = isPowder ? 1.02 : 1; 
      const totalNeeded = (ing.recipeQty * wasteFactor) * productionBatches;
      const currentStock = parseFloat(ing.currentStock) || 0;
      const missing = Math.max(0, totalNeeded - currentStock);
      const costToBuy = missing > 0 ? (missing / ing.bulkQty) * ing.bulkPrice : 0;
      return { ...ing, totalNeeded, missing, costToBuy, isPowder, wasteFactor };
    });
    const totalMissingCost = list.reduce((sum, item) => sum + item.costToBuy, 0);
    const canProduce = list.every(item => item.missing === 0);
    return { list, totalMissingCost, canProduce };
  }, [ingredients, productionBatches]);

  const handleUpdateStock = (id, val) => {
    const newStock = parseFloat(val) || 0;
    const item = ingredients.find(i => i.id === id);
    if(item && user) saveToDb('ingredients', id, { ...item, currentStock: newStock });
  };

  const handleProduce = () => {
    ingredients.forEach(ing => {
      const itemCheck = inventoryCheck.list.find(i => i.id === ing.id);
      if(itemCheck) {
        const newStock = Math.max(0, (ing.currentStock || 0) - itemCheck.totalNeeded);
        if(user) saveToDb('ingredients', ing.id, { ...ing, currentStock: newStock });
      }
    });
    setProductionBatches(1);
  };

  // --- CÁLCULOS DE CLIENTES ---
  const customersWithStats = useMemo(() => {
    return customers.map(customer => {
      const referralsCount = customers.filter(c => c.referredBy === customer.id).length;
      const referrer = customers.find(c => c.id === customer.referredBy);
      return { ...customer, referralsCount, referrerName: referrer ? referrer.name : 'Ninguém (Direto)' };
    });
  }, [customers]);

  // SISTEMA DE RECOMPENSAS: Alerta quando chega a 2 indicações ou múltiplos de 5
  const pendingRewards = useMemo(() => {
    return customersWithStats.filter(c => c.referralsCount === 2 || (c.referralsCount >= 5 && c.referralsCount % 5 === 0));
  }, [customersWithStats]);

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

  const topReferrers = useMemo(() => [...customersWithStats].sort((a, b) => b.referralsCount - a.referralsCount).slice(0, 5), [customersWithStats]);

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
      stats.push({ label: `${format(start)} a \n${format(end)}`, start, end, salesQty: 0, revenue: 0, estimatedProfit: 0 });
    }

    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      const week = stats.find(w => saleDate >= w.start && saleDate <= w.end);
      if (week) {
        week.salesQty += (sale.cookieUnits || sale.quantity);
        week.revenue += sale.revenue;
        week.estimatedProfit += (sale.revenue - (costMetrics.costPerCookie * (sale.cookieUnits || sale.quantity)));
      }
    });
    return stats;
  }, [sales, costMetrics]);


  // ==========================================
  // HANDLERS (AÇÕES)
  // ==========================================
  
  const handleAddToCartQuickSale = () => {
    const p = products.find(prod => prod.id === quickSale.productId);
    if (!p) return;
    setQuickSaleCart([...quickSaleCart, {
      productId: p.id, productName: p.name,
      quantity: Number(quickSale.quantity),
      cookieUnits: (p.units || 1) * Number(quickSale.quantity),
      revenue: Number(quickSale.revenue)
    }]);
    setQuickSale(prev => ({ ...prev, quantity: 1, revenue: p.price }));
  };

  const handleFinalizeQuickSale = (e) => {
    e.preventDefault();
    if (!quickSale.customerName || !user) return;

    let finalCart = [...quickSaleCart];
    if (quickSale.quantity > 0 && quickSale.revenue > 0) {
      const p = products.find(prod => prod.id === quickSale.productId);
      if (p) finalCart.push({
        productId: p.id, productName: p.name,
        quantity: Number(quickSale.quantity), cookieUnits: (p.units || 1) * Number(quickSale.quantity), revenue: Number(quickSale.revenue)
      });
    }
    if (finalCart.length === 0) return;

    const todayYMD = getTodayYMD();
    let saleDateIso = new Date().toISOString();
    if (quickSale.date && quickSale.date !== todayYMD) {
      saleDateIso = new Date(`${quickSale.date}T12:00:00`).toISOString();
    }

    finalCart.forEach(item => {
      const newSaleId = Math.random().toString(36).substr(2, 9);
      saveToDb('sales', newSaleId, {
        id: newSaleId, date: saleDateIso, quantity: item.quantity, cookieUnits: item.cookieUnits, 
        revenue: item.revenue, customerName: quickSale.customerName.trim(), productName: item.productName
      });
    });

    const existingCustomer = customers.find(c => c.name.toLowerCase() === quickSale.customerName.toLowerCase().trim());
    if (existingCustomer) saveToDb('customers', existingCustomer.id, { ...existingCustomer, purchases: existingCustomer.purchases + 1 });
    else {
      const newCustId = Math.random().toString(36).substr(2, 9);
      saveToDb('customers', newCustId, { id: newCustId, name: quickSale.customerName.trim(), referredBy: quickSale.referredBy || null, purchases: 1 });
    }

    setQuickSaleCart([]);
    setQuickSale({ customerName: '', referredBy: '', productId: products[0]?.id || '', quantity: 1, revenue: products[0]?.price || recipeConfig.salePrice, date: getTodayYMD() });
  };

  const handleAddToCartReservation = () => {
    const p = products.find(prod => prod.id === newReservation.productId);
    if (!p) return;
    setReservationCart([...reservationCart, {
      productId: p.id, productName: p.name, quantity: Number(newReservation.quantity),
      cookieUnits: (p.units || 1) * Number(newReservation.quantity), expectedRevenue: p.price * Number(newReservation.quantity)
    }]);
    setNewReservation(prev => ({ ...prev, quantity: 1 }));
  };

  const handleFinalizeReservation = (e) => {
    e.preventDefault();
    if (!newReservation.name || !user) return;

    let finalCart = [...reservationCart];
    if (newReservation.quantity > 0) {
      const p = products.find(prod => prod.id === newReservation.productId);
      if (p) finalCart.push({
        productId: p.id, productName: p.name, quantity: Number(newReservation.quantity),
        cookieUnits: (p.units || 1) * Number(newReservation.quantity), expectedRevenue: p.price * Number(newReservation.quantity)
      });
    }
    if (finalCart.length === 0) return;

    finalCart.forEach(item => {
      const newId = Math.random().toString(36).substr(2, 9);
      saveToDb('reservations', newId, { 
        id: newId, name: newReservation.name, referredBy: newReservation.referredBy || null,
        productId: item.productId, productName: item.productName,
        quantity: item.quantity, cookieUnits: item.cookieUnits, expectedRevenue: item.expectedRevenue,
        date: newReservation.date, status: 'pending' 
      });
    });

    setReservationCart([]);
    setNewReservation({ name: '', referredBy: '', productId: products[0]?.id || '', quantity: 1, date: '' });
  };
  
  const handleUpdateReservationStatus = (id, status) => {
    const r = reservations.find(x => x.id === id);
    if (r && user) {
      saveToDb('reservations', id, { ...r, status });
      if (status === 'completed' && r.status !== 'completed') {
          const newSaleId = Math.random().toString(36).substr(2, 9);
          saveToDb('sales', newSaleId, { id: newSaleId, date: new Date().toISOString(), quantity: r.quantity, cookieUnits: r.cookieUnits, revenue: r.expectedRevenue, customerName: r.name, productName: r.productName });
          const existingCustomer = customers.find(c => c.name.toLowerCase() === r.name.toLowerCase().trim());
          if (existingCustomer) saveToDb('customers', existingCustomer.id, { ...existingCustomer, purchases: existingCustomer.purchases + 1 });
          else {
              const newCustId = Math.random().toString(36).substr(2, 9);
              saveToDb('customers', newCustId, { id: newCustId, name: r.name.trim(), referredBy: r.referredBy || null, purchases: 1 });
          }
      }
    }
  };

  const handleDeleteReservation = (id) => user && deleteFromDb('reservations', id);
  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !user) return;
    const newId = Math.random().toString(36).substr(2, 9);
    saveToDb('products', newId, { id: newId, name: newProduct.name, price: Number(newProduct.price), type: newProduct.type, units: newProduct.type === 'combo' ? Number(newProduct.units) : 1 });
    setNewProduct({ name: '', price: '', type: 'single', units: 2 });
  };
  const handleDeleteProduct = (id) => { if(user) deleteFromDb('products', id); };

  const handleSyncSheet = async () => {
    if (!sheetUrl) { alert("Por favor, cole o link da sua planilha."); return; }
    setIsSyncing(true);
    try {
      let fetchUrl = sheetUrl;
      if (fetchUrl.includes('pubhtml')) { fetchUrl = fetchUrl.replace('pubhtml', 'pub') + (fetchUrl.includes('?') ? '&output=csv' : '?output=csv'); } 
      else if (!fetchUrl.includes('output=csv')) { fetchUrl += (fetchUrl.includes('?') ? '&output=csv' : '?output=csv'); }

      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Não foi possível aceder à planilha. Verifique o link.");
      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
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
            if (cleaned.includes(',') && cleaned.includes('.')) { cleaned = cleaned.replace(/\./g, '').replace(',', '.'); } 
            else if (cleaned.includes(',')) { cleaned = cleaned.replace(',', '.'); }
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          };

          const name = clean(row[nameIdx]);
          if (!name) continue;
          let rQty = parseNumber(row[recipeQtyIdx]);
          if (rQty === 0) {
            for (let j = 3; j < row.length; j++) {
              if (j !== bulkPriceIdx && j !== bulkQtyIdx) { let val = parseNumber(row[j]); if (val > 0) { rQty = val; break; } }
            }
          }
          
          const existingItem = ingredients.find(old => old.name.toLowerCase() === name.toLowerCase());
          const currentStock = existingItem ? (existingItem.currentStock || 0) : 0;

          parsedIngredients.push({ id: i.toString(), name: name, bulkQty: parseNumber(row[bulkQtyIdx]), unit: clean(row[unitIdx]) || 'un', bulkPrice: parseNumber(row[bulkPriceIdx]), recipeQty: rQty, currentStock });
        }
      }

      if (parsedIngredients.length > 0) {
         setIngredients(parsedIngredients);
         const syncTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
         setLastSync(syncTime);
         if (user) {
             ingredients.forEach(ing => deleteFromDb('ingredients', ing.id));
             parsedIngredients.forEach(ing => saveToDb('ingredients', ing.id, ing));
             saveConfig({ lastSync: syncTime });
         }
      } else { alert("Nenhum ingrediente encontrado. Verifique a planilha."); }
    } catch (error) {
      console.error("Erro na leitura da planilha:", error);
      alert("Erro ao ler planilha. Garanta que ela foi publicada na web em formato CSV.");
    } finally { setIsSyncing(false); }
  };

  const handleDeleteCustomer = (id) => {
    if (!user) return;
    deleteFromDb('customers', id);
    customers.forEach(c => { if (c.referredBy === id) saveToDb('customers', c.id, { ...c, referredBy: null }); });
  };

  const handleAddSuggestion = (e) => {
    e.preventDefault();
    if (!newSuggestion.text || !user) return;
    const normalizedInput = newSuggestion.text.toLowerCase().trim();
    const matches = suggestions.filter(s => s.type === newSuggestion.type && (s.text.toLowerCase().includes(normalizedInput) || normalizedInput.includes(s.text.toLowerCase())));
    if (matches.length > 0 && !suggestionMatchContext) { setSuggestionMatchContext({ pendingSuggestion: newSuggestion, match: matches[0] }); return; }
    proceedAddSuggestion();
  };

  const proceedAddSuggestion = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const idea = suggestionMatchContext ? suggestionMatchContext.pendingSuggestion : newSuggestion;
    saveToDb('suggestions', newId, { id: newId, ...idea, votes: 1, isFavorite: false });
    setNewSuggestion({ type: 'flavor', text: '' }); setSuggestionMatchContext(null);
  };
  const acceptSuggestionMatch = () => { handleUpvoteSuggestion(suggestionMatchContext.match.id); setNewSuggestion({ type: 'flavor', text: '' }); setSuggestionMatchContext(null); };
  const handleDeleteSuggestion = (id) => user && deleteFromDb('suggestions', id);
  const handleToggleFavorite = (id) => { const s = suggestions.find(x => x.id === id); if(s && user) saveToDb('suggestions', id, { ...s, isFavorite: !s.isFavorite }); };
  const handleUpvoteSuggestion = (id) => { const s = suggestions.find(x => x.id === id); if(s && user) saveToDb('suggestions', id, { ...s, votes: (s.votes || 0) + 1 }); };

  const NetworkNode = ({ customer, isRoot = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const children = customers.filter(c => c.referredBy === customer.id);
    const hasChildren = children.length > 0;
    return (
      <div className={`relative ${!isRoot ? 'ml-8 mt-4' : 'mb-8'}`}>
        {!isRoot && ( <><div className="absolute -left-6 top-6 w-6 border-t-2 border-amber-200 dark:border-gray-600"></div><div className="absolute -left-6 -top-4 h-10 border-l-2 border-amber-200 dark:border-gray-600"></div></> )}
        <div onClick={() => hasChildren && setIsExpanded(!isExpanded)} className={`flex items-center gap-3 p-3 rounded-xl shadow-sm w-fit z-10 relative transition-colors ${isRoot ? 'bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/50' : 'bg-white dark:bg-gray-800 border border-amber-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'} ${hasChildren ? 'cursor-pointer' : ''}`}>
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
          {hasChildren && (<div className="ml-2 text-amber-600 dark:text-amber-400">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>)}
        </div>
        {hasChildren && isExpanded && (<div className="relative border-l-2 border-amber-200 dark:border-gray-600 ml-[1.5rem] mt-2">{children.map(child => <NetworkNode key={child.id} customer={child} />)}</div>)}
      </div>
    );
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-orange-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <Cookie className="text-amber-500 animate-spin mb-4" size={48} />
        <p className="text-amber-800 dark:text-amber-400 font-medium">A carregar os seus cookies docinhos...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-orange-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-amber-100 dark:border-gray-700 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 dark:bg-amber-900/50 p-4 rounded-full text-amber-600 dark:text-amber-400"><Cookie size={40} /></div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">Bem-vindo ao CookieDash</h1>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">{authMode === 'login' ? 'Entre na sua conta para aceder ao painel.' : 'Crie a sua conta de administrador.'}</p>
          {authError && (<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center">{authError}</div>)}
          {resetMessage && (<div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm font-medium text-center">{resetMessage}</div>)}
          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="email" required className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-colors" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="password" required className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-colors" placeholder="Mínimo de 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {authMode === 'login' && (
                <div className="text-right mt-2">
                  <button type="button" onClick={handleResetPassword} className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 font-medium transition-colors">Esqueci a minha senha</button>
                </div>
              )}
            </div>
            <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors mt-4 shadow-md">
              {authMode === 'login' ? 'Entrar no Dashboard' : 'Criar Conta e Entrar'}
            </button>
          </form>
          <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-700 pt-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {authMode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); setResetMessage(''); }} className="ml-2 font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors">
                {authMode === 'login' ? 'Registe-se aqui' : 'Faça Login'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rootCustomers = customers.filter(c => !c.referredBy);
  const maxWeeklyRevenue = Math.max(...weeklyStats.map(m => m.revenue), 10); 
  
  return (
    <div className={`${darkMode ? 'dark' : ''} h-full relative`}>
      <div className="flex h-[100dvh] bg-orange-50/30 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 bg-amber-900 dark:bg-gray-950 text-amber-50 flex flex-col shadow-xl z-20 transition-colors duration-300 hidden md:flex">
          <div className="p-6 flex items-center gap-3"><Cookie size={32} className="text-amber-300" /><h1 className="text-2xl font-bold tracking-tight">CookieDash</h1></div>
          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><BarChart3 size={20} /> Visão Geral (BI)</button>
            <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><ShoppingBag size={20} /> Catálogo</button>
            <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><ClipboardList size={20} /> Estoque & Produção</button>
            <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><Users size={20} /> Clientes</button>
            <button onClick={() => setActiveTab('costs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'costs' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><Calculator size={20} /> Custos & Sync</button>
            <button onClick={() => setActiveTab('reservations')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'reservations' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><CalendarCheck size={20} /> Entregas</button>
            <button onClick={() => setActiveTab('network')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'network' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><Network size={20} /> Rede</button>
            <button onClick={() => setActiveTab('suggestions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'suggestions' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><Lightbulb size={20} /> Ideias</button>
          </nav>
          <div className="mt-auto px-4 pb-6 space-y-2">
            <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors hover:bg-amber-800/50 dark:hover:bg-gray-800 text-amber-200 dark:text-gray-400 hover:text-white border border-amber-800 dark:border-gray-800">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />} <span className="font-medium text-sm">{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors bg-red-900/40 hover:bg-red-800/60 text-red-200 hover:text-white border border-red-800/50">
              <LogOut size={18} /> <span className="font-medium text-sm">Sair da Conta</span>
            </button>
          </div>
        </aside>

        {/* Mobile Menu */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around p-3 z-50">
           <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg ${activeTab === 'dashboard' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : 'text-gray-500'}`}><BarChart3 size={24}/></button>
           <button onClick={() => setActiveTab('inventory')} className={`p-2 rounded-lg ${activeTab === 'inventory' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : 'text-gray-500'}`}><ClipboardList size={24}/></button>
           <button onClick={() => setActiveTab('reservations')} className={`p-2 rounded-lg ${activeTab === 'reservations' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : 'text-gray-500'}`}><CalendarCheck size={24}/></button>
           <button onClick={() => setActiveTab('costs')} className={`p-2 rounded-lg ${activeTab === 'costs' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : 'text-gray-500'}`}><Calculator size={24}/></button>
           <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg text-gray-500">{darkMode ? <Sun size={24} /> : <Moon size={24} />}</button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-32">
          
          {/* TAB: DASHBOARD PRO */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Visão Geral <span className="text-amber-600 dark:text-amber-500 font-black">PRO</span></h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">O cérebro do seu negócio. Acompanhe metas, lucro e tome decisões.</p>
                </div>
                <div className="flex items-center gap-3">
                  {lastSync && <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1"><Clock size={12}/> {lastSync}</span>}
                </div>
              </div>

              {pendingRewards.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 rounded-3xl shadow-lg text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl"><Gift size={28} /></div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">Recompensas de Indicação!</h3>
                      <p className="text-sm text-amber-50">Clientes atingiram os marcos do programa de fidelidade.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {pendingRewards.map(c => (
                      <span key={c.id} className="bg-white dark:bg-gray-900 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                        {c.name} <span className="text-xs font-normal text-gray-500">({c.referralsCount} ind.)</span> ➔ 
                        {c.referralsCount === 2 ? ' 1 Cookie Peq.' : ' 1 Cookie Trad.'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">1. Visão Rápida (Total)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Faturamento</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {globalMetrics.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Lucro Estimado</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">R$ {globalMetrics.totalEstimatedProfit.toFixed(2)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Itens Vendidos</p>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-500">{globalMetrics.totalCookiesSold} un.</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Nº Clientes</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{customers.length}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 col-span-2 md:col-span-1 bg-amber-50/50 dark:bg-gray-800/80">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Ticket Médio</p>
                    <p className="text-xl font-bold text-amber-900 dark:text-amber-300">R$ {globalMetrics.ticketMedio.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                   <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">2. Desempenho (Curto Prazo)</h3>
                   <div className="grid grid-cols-2 gap-4 h-[calc(100%-2rem)]">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center relative overflow-hidden">
                       <div className="relative z-10">
                         <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Vendas Hoje</p>
                         <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-3">R$ {timeStats.revToday.toFixed(2)}</p>
                         <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${timeStats.todayGrowth >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                           {timeStats.todayGrowth >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                           {timeStats.todayGrowth > 0 ? '+' : ''}{timeStats.todayGrowth.toFixed(1)}% vs Ontem
                         </div>
                       </div>
                       <LineChart className="absolute -bottom-4 -right-4 text-gray-50 dark:text-gray-700/50 w-32 h-32" />
                     </div>
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center relative overflow-hidden">
                       <div className="relative z-10">
                         <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Últimos 7 Dias</p>
                         <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-3">R$ {timeStats.rev7Days.toFixed(2)}</p>
                         <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${timeStats.weekGrowth >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                           {timeStats.weekGrowth >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                           {timeStats.weekGrowth > 0 ? '+' : ''}{timeStats.weekGrowth.toFixed(1)}% vs Sem. Passada
                         </div>
                       </div>
                       <Calendar className="absolute -bottom-4 -right-4 text-gray-50 dark:text-gray-700/50 w-32 h-32" />
                     </div>
                   </div>
                </div>

                <div>
                   <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">3. Crescimento e Metas</h3>
                   <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 h-[calc(100%-2rem)] flex flex-col justify-center space-y-6">
                     <div>
                       <div className="flex justify-between items-end mb-2">
                         <div>
                           <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Target size={16} className="text-amber-500"/> Meta Diária</p>
                           <p className="text-xs text-gray-400 mt-0.5">R$ {timeStats.revToday.toFixed(2)} / R$ <input type="number" className="w-12 bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none text-center text-amber-600 dark:text-amber-400 font-bold" value={goals.daily} onChange={(e) => setGoals({...goals, daily: Number(e.target.value)})}/></p>
                         </div>
                         <span className="text-sm font-black text-amber-600 dark:text-amber-400">{Math.min((timeStats.revToday / goals.daily) * 100, 100).toFixed(0)}%</span>
                       </div>
                       <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                         <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min((timeStats.revToday / goals.daily) * 100, 100)}%` }}></div>
                       </div>
                     </div>

                     <div>
                       <div className="flex justify-between items-end mb-2">
                         <div>
                           <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Target size={16} className="text-amber-500"/> Meta Semanal</p>
                           <p className="text-xs text-gray-400 mt-0.5">R$ {timeStats.rev7Days.toFixed(2)} / R$ <input type="number" className="w-16 bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none text-center text-amber-600 dark:text-amber-400 font-bold" value={goals.weekly} onChange={(e) => setGoals({...goals, weekly: Number(e.target.value)})}/></p>
                         </div>
                         <span className="text-sm font-black text-amber-600 dark:text-amber-400">{Math.min((timeStats.rev7Days / goals.weekly) * 100, 100).toFixed(0)}%</span>
                       </div>
                       <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                         <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min((timeStats.rev7Days / goals.weekly) * 100, 100)}%` }}></div>
                       </div>
                     </div>

                     <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Crosshair className="text-blue-500" size={20}/>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Projeção do Mês (se continuar assim)</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">R$ {projection.toFixed(2)}</p>
                          </div>
                        </div>
                     </div>
                   </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">4. Inteligência de Produto & Clientes</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700">
                    <div className="bg-amber-100 dark:bg-amber-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4"><Trophy size={20}/></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Produto Mais Vendido</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{productIntel?.topSold?.name || 'Nenhum dado'}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">{productIntel?.topSold?.qty || 0} unidades vendidas</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-green-100 dark:border-gray-700">
                    <div className="bg-green-100 dark:bg-green-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4"><Flame size={20}/></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Produto Mais Lucrativo</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{productIntel?.topProfit?.name || 'Nenhum dado'}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">R$ {productIntel?.topProfit?.profit?.toFixed(2) || 0} gerados em lucro</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-blue-100 dark:border-gray-700">
                    <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4"><UsersRound size={20}/></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Comportamento (Clientes)</p>
                    <div className="flex items-end gap-2 mt-1">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{customerIntel.recorrentesPercent.toFixed(0)}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">são clientes fiéis (recorrentes).</p>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-gray-400 mt-2">
                       <span>{customerIntel.novos} Novos</span>
                       <span>{customerIntel.recorrentes} Fiéis</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">5. Operação (Vendas & Entregas)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  <div className="lg:col-span-1 bg-amber-600 dark:bg-amber-700 rounded-3xl shadow-sm p-6 text-white relative flex flex-col transition-colors">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500 dark:bg-amber-600 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
                    
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                      <ShoppingCart size={22} /> Nova Venda Rápida
                    </h3>
                    
                    <form onSubmit={handleFinalizeQuickSale} className="space-y-4 relative z-10 flex-1 flex flex-col">
                      <div>
                        <label className="block text-xs font-medium text-amber-100 mb-1">Nome do Cliente</label>
                        <input required type="text" className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white placeholder-amber-200/50 transition" value={quickSale.customerName} onChange={e => setQuickSale({...quickSale, customerName: e.target.value})} placeholder="Ex: Maria" />
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-1/2">
                          <label className="block text-xs font-medium text-amber-100 mb-1">Data da Venda</label>
                          <input 
                            type="date" 
                            required 
                            className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white transition [&::-webkit-calendar-picker-indicator]:invert" 
                            value={quickSale.date} 
                            onChange={e => setQuickSale({...quickSale, date: e.target.value})} 
                          />
                        </div>
                        <div className="w-1/2">
                          <label className="block text-xs font-medium text-amber-100 mb-1">Quem indicou? (Opcional)</label>
                          <select className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white [&>option]:text-gray-800 transition" value={quickSale.referredBy} onChange={e => setQuickSale({...quickSale, referredBy: e.target.value})}>
                            <option value="">Ninguém</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="bg-amber-700/30 dark:bg-amber-900/40 p-4 rounded-2xl border border-amber-500/30 dark:border-amber-600/30 mt-2">
                        <label className="block text-xs font-medium text-amber-100 mb-1">Selecionar Item</label>
                        <select className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white [&>optgroup]:text-gray-800 [&>option]:text-gray-800 transition mb-3" value={quickSale.productId} onChange={e => setQuickSale({...quickSale, productId: e.target.value})}>
                          {products.length === 0 ? <option value="">Cadastre no Catálogo</option> : (
                            <>
                              <optgroup label="Produtos Individuais">{products.filter(p => p.type === 'single' || !p.type).map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}</optgroup>
                              {products.filter(p => p.type === 'combo').length > 0 && <optgroup label="Combos e Promoções">{products.filter(p => p.type === 'combo').map(p => <option key={p.id} value={p.id}>{p.name} ({p.units} un) - R$ {p.price.toFixed(2)}</option>)}</optgroup>}
                            </>
                          )}
                        </select>
                        <div className="flex gap-3 mb-3">
                          <div className="w-1/2">
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-amber-200/80 mb-1">Quantidade</label>
                            <input type="number" min="1" className="w-full p-2 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white transition text-center" value={quickSale.quantity} onChange={e => setQuickSale({...quickSale, quantity: Number(e.target.value)})} />
                          </div>
                          <div className="w-1/2">
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-amber-200/80 mb-1">Total (R$)</label>
                            <input type="number" step="0.5" className="w-full p-2 bg-white border border-transparent rounded-xl outline-none text-gray-800 font-bold text-center" value={quickSale.revenue} onChange={e => setQuickSale({...quickSale, revenue: Number(e.target.value)})} />
                          </div>
                        </div>
                        <button type="button" onClick={handleAddToCartQuickSale} className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 py-2 rounded-xl font-bold transition shadow-sm text-sm">
                          + Adicionar ao Pedido
                        </button>
                      </div>

                      {quickSaleCart.length > 0 && (
                        <div className="bg-white/10 p-3 rounded-xl text-sm border border-amber-400/30">
                          <p className="font-bold text-amber-200 mb-2">Itens no Pedido:</p>
                          {quickSaleCart.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-amber-50 mb-1 pb-1 border-b border-amber-400/20 last:border-0">
                              <span>{item.quantity}x {item.productName}</span>
                              <div className="flex items-center gap-2">
                                <span>R$ {item.revenue.toFixed(2)}</span>
                                <button type="button" onClick={() => setQuickSaleCart(quickSaleCart.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-200"><Trash2 size={14}/></button>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 mt-1 font-bold text-white flex justify-between text-base">
                             <span>Total:</span>
                             <span>R$ {(quickSaleCart.reduce((a,b)=>a+b.revenue, 0) + (quickSale.quantity > 0 && quickSale.revenue > 0 && !quickSaleCart.find(i=>i.productId===quickSale.productId && i.quantity===quickSale.quantity) ? quickSale.revenue : 0)).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <button type="submit" className="w-full bg-white text-amber-700 hover:bg-amber-50 dark:text-gray-900 dark:hover:bg-gray-100 py-3.5 rounded-xl font-bold mt-auto transition shadow-sm text-lg">
                        Registrar Venda
                      </button>
                    </form>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 p-6 flex flex-col transition-colors">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                        <Clock className="text-amber-600 dark:text-amber-500" size={20}/> Entregas Pendentes (Receita: R$ {expectedMetrics.revenue.toFixed(2)})
                      </h3>
                      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {pendingReservationsList.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center mt-4">Nenhuma encomenda pendente para entregar.</p>
                        ) : (
                          pendingReservationsList.slice(0, 4).map(res => (
                            <div key={res.id} className="flex justify-between items-center p-3 bg-amber-50/50 dark:bg-gray-700/50 rounded-xl border border-amber-100/50 dark:border-gray-600 transition-colors">
                              <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate max-w-[150px]">{res.name}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{res.quantity}x {res.productName}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-gray-800 px-2 py-1 rounded-lg border border-transparent dark:border-gray-600">
                                  {res.date ? new Date(res.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : 'A comb.'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Total a Produzir:</p>
                        <p className="text-lg font-black text-amber-700 dark:text-amber-500">{expectedMetrics.cookies} unidades</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">6. Histórico de Evolução</h3>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 flex flex-col transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Activity className="text-amber-600 dark:text-amber-500" size={20}/> Histórico de Receita e Lucro
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Desempenho por semana (Últimas 6 semanas).</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => setShowSalesHistory(true)} className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-gray-700 hover:bg-amber-100 dark:hover:bg-gray-600 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-lg transition-colors font-medium border border-amber-200 dark:border-gray-600">
                        <History size={16} /> Ver Histórico
                      </button>
                      <div className="flex items-center gap-4 text-xs font-medium mt-1 text-gray-600 dark:text-gray-300">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-600"></div> Receita</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500 dark:bg-green-500"></div> Lucro</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex items-end justify-between gap-2 mt-auto pt-4 border-b border-gray-100 dark:border-gray-700 pb-2 relative min-h-[200px]">
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
                            <div className="absolute bottom-0 w-full bg-amber-100 dark:bg-amber-800/50 rounded-t-md group-hover:bg-amber-200 dark:group-hover:bg-amber-700/60 transition-all duration-300" style={{ height: `${revenueHeight}%` }}></div>
                            <div className="absolute bottom-0 w-full bg-green-400 dark:bg-green-500/80 rounded-t-sm group-hover:bg-green-500 dark:group-hover:bg-green-400 transition-all duration-300 shadow-[0_-2px_4px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_4px_rgba(0,0,0,0.3)]" style={{ height: `${profitHeight}%`, maxWidth: '60%' }}></div>
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

            </div>
          )}

          {/* TAB: ESTOQUE E PRODUÇÃO */}
          {activeTab === 'inventory' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gestão de Estoque e Produção</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Simule produções, atualize o seu estoque de insumos e saiba exatamente o que precisa de comprar.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Simulador e Lista de Compras */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-amber-50 dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-amber-200 dark:border-gray-700 transition-colors">
                    <h3 className="text-lg font-bold text-amber-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Cookie className="text-amber-600 dark:text-amber-500" size={20}/> Simulador de Produção
                    </h3>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantas receitas base vai bater?</label>
                    <div className="flex items-center gap-3 mb-4">
                      <button onClick={() => setProductionBatches(Math.max(1, productionBatches - 1))} className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-gray-600 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-gray-700 transition">-</button>
                      <input type="number" min="1" className="w-full h-10 text-center font-bold text-lg bg-white dark:bg-gray-900 border border-amber-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 outline-none" value={productionBatches} onChange={e => setProductionBatches(Math.max(1, Number(e.target.value)))} />
                      <button onClick={() => setProductionBatches(productionBatches + 1)} className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-gray-600 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-gray-700 transition">+</button>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-900/50 p-3 rounded-xl border border-amber-100 dark:border-gray-700 mb-6">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Rendimento Previsto:</p>
                      <p className="text-lg font-black text-amber-700 dark:text-amber-500">{productionBatches * recipeConfig.yield} cookies</p>
                    </div>

                    {!inventoryCheck.canProduce && (
                       <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-start gap-2">
                         <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0"/>
                         <div>
                           <p className="text-xs font-bold text-red-800 dark:text-red-400">Faltam ingredientes!</p>
                           <p className="text-[10px] text-red-600 dark:text-red-300 mt-0.5">Se registrar a produção, assumiremos que comprou o que falta e usou na hora.</p>
                         </div>
                       </div>
                    )}

                    <button onClick={handleProduce} className="w-full bg-amber-600 dark:bg-amber-700 text-white font-bold py-3 rounded-xl hover:bg-amber-700 dark:hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-2">
                      <CheckCircle size={18}/> Registrar Produção
                    </button>
                  </div>

                  {inventoryCheck.totalMissingCost > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-red-100 dark:border-gray-700 transition-colors">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <ShoppingCart className="text-red-500" size={20}/> Lista de Compras
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Itens em falta para produzir {productionBatches} receita(s).</p>
                      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2">
                        {inventoryCheck.list.filter(i => i.missing > 0).map(ing => (
                          <div key={ing.id} className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                             <div>
                               <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{ing.name}</p>
                               <p className="text-[10px] text-red-500 font-medium">Faltam: {ing.missing.toFixed(1)} {ing.unit}</p>
                             </div>
                             <p className="text-sm font-bold text-gray-700 dark:text-gray-300">R$ {ing.costToBuy.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <span className="font-bold text-gray-600 dark:text-gray-400 text-sm">Custo Estimado:</span>
                        <span className="font-black text-red-600 dark:text-red-400 text-lg">R$ {inventoryCheck.totalMissingCost.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Estoque Atual */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 overflow-hidden transition-colors flex flex-col">
                  <div className="p-6 border-b border-amber-100 dark:border-gray-700 bg-amber-50/30 dark:bg-gray-900 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Package className="text-amber-600 dark:text-amber-500" size={20} /> Controle de Estoque</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">A sua lista de insumos. Edite as quantidades sempre que comprar material.</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 text-sm">
                          <th className="p-4 font-semibold">Insumo</th>
                          <th className="p-4 font-semibold text-center">Necessário p/ {productionBatches}x</th>
                          <th className="p-4 font-semibold text-center">Em Estoque Atual</th>
                          <th className="p-4 font-semibold text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryCheck.list.map(ing => {
                          const isOk = ing.missing === 0;
                          return (
                            <tr key={ing.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-4">
                                <p className="font-bold text-gray-800 dark:text-gray-200">{ing.name}</p>
                                {ing.isPowder && <p className="text-[10px] text-amber-600 dark:text-amber-400">+2% margem de quebra aplicada</p>}
                              </td>
                              <td className="p-4 text-center font-medium text-gray-600 dark:text-gray-300">
                                {ing.totalNeeded.toFixed(1)} {ing.unit}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <input 
                                    type="number" min="0" step="any"
                                    className={`w-24 p-2 text-center text-sm font-bold border rounded-lg outline-none transition-colors ${!isOk ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 focus:ring-2 focus:ring-red-500' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-amber-500'}`}
                                    value={ing.currentStock || ''} 
                                    onChange={e => handleUpdateStock(ing.id, e.target.value)} 
                                    placeholder="0"
                                  />
                                  <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-left">{ing.unit}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                {isOk ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"><CheckCircle size={12}/> Suficiente</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"><XCircle size={12}/> Faltam {ing.missing.toFixed(1)}{ing.unit}</span>
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
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 h-fit transition-colors">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Plus size={20} className="text-amber-600 dark:text-amber-500" /> Adicionar Item</h3>
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
                    <button type="submit" className="w-full bg-amber-600 dark:bg-amber-700 text-white py-2 rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 transition font-medium mt-2">Salvar {newProduct.type === 'combo' ? 'Combo' : 'Produto'}</button>
                  </form>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div>
                    <h4 className="text-md font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><Tag size={18}/> Produtos Individuais</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.filter(p => p.type === 'single' || !p.type).length === 0 ? (
                        <p className="col-span-2 text-sm text-gray-400 dark:text-gray-500 p-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center">Nenhum produto individual.</p>
                      ) : products.filter(p => p.type === 'single' || !p.type).map(product => (
                        <div key={product.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full text-orange-600 dark:text-orange-400"><Tag size={20} /></div>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-200">{product.name}</p>
                              <p className="text-sm font-medium text-green-600 dark:text-green-400">R$ {product.price.toFixed(2)}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Remover"><Trash2 size={18} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><Layers size={18} className="text-amber-600 dark:text-amber-500"/> Combos & Promoções</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products.filter(p => p.type === 'combo').length === 0 ? (
                        <p className="col-span-2 text-sm text-gray-400 dark:text-gray-500 p-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center">Nenhum combo cadastrado.</p>
                      ) : products.filter(p => p.type === 'combo').map(product => (
                        <div key={product.id} className="bg-amber-50 dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-700/50 flex justify-between items-center group transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="bg-amber-200 dark:bg-amber-900/50 p-3 rounded-full text-amber-700 dark:text-amber-400"><Layers size={20} /></div>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-200">{product.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">R$ {product.price.toFixed(2)}</p>
                                <span className="text-[10px] bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-gray-700">{product.units} cookies</span>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-amber-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Remover"><Trash2 size={18} /></button>
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
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Custos & Ficha Técnica</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Conecte sua planilha para gerar os custos em tempo real.</p>
                </div>
              </div>
              <div className="bg-amber-900 dark:bg-gray-800 p-8 rounded-3xl shadow-sm relative overflow-hidden text-white flex flex-col justify-center mb-8 border border-transparent dark:border-gray-700 transition-colors">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-700 dark:bg-gray-700 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2 text-white"><FileSpreadsheet className="text-amber-300 dark:text-amber-400" /> Vínculo com Planilha Excel/Sheets</h3>
                    <p className="text-amber-100 dark:text-gray-300 text-sm leading-relaxed mb-4">Atenção: A Ficha Técnica atual baseia-se num único custo base (Receita Padrão) para simplificar a operação. Cole o link da sua planilha para atualizar o custo da massa.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Link da sua planilha..." className="w-full pl-12 pr-4 py-3 rounded-xl border-none focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
                      </div>
                      <button onClick={handleSyncSheet} disabled={isSyncing} className="bg-amber-500 dark:bg-amber-600 hover:bg-amber-400 dark:hover:bg-amber-500 text-amber-950 dark:text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 whitespace-nowrap">
                        <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} /> {isSyncing ? "Lendo..." : "Sincronizar"}
                      </button>
                    </div>
                    {lastSync && <p className="text-xs text-amber-200 dark:text-gray-400 mt-3 flex items-center gap-1 font-medium"><CheckCircle size={12}/> Última leitura: {lastSync}</p>}
                  </div>
                </div>
              </div>

              {ingredients.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                  <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><Package size={16}/><h3 className="font-medium text-xs">Custo da Receita Base</h3></div>
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {costMetrics.totalRecipeCost.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><Calculator size={16}/><h3 className="font-medium text-xs">Custo Unitário (Massa)</h3></div>
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {costMetrics.costPerCookie.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><DollarSign size={16} className="text-green-500"/><h3 className="font-medium text-xs text-green-700 dark:text-green-400">Lucro Médio Unitário</h3></div>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">R$ {costMetrics.profit.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><TrendingUp size={16} className="text-purple-500"/><h3 className="font-medium text-xs text-purple-700 dark:text-purple-400">Margem (Produto Base)</h3></div>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{costMetrics.profitMargin.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-gray-800 p-5 rounded-2xl border border-amber-200 dark:border-gray-700 transition-colors">
                    <h3 className="font-bold text-amber-900 dark:text-gray-200 mb-3 text-sm">Simulador de Custos</h3>
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
              )}

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 overflow-hidden transition-colors">
                <div className="p-6 border-b border-amber-100 dark:border-gray-700 bg-amber-50/30 dark:bg-gray-900 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><FileSpreadsheet className="text-amber-600 dark:text-amber-500" size={20} /> Insumos da Planilha Vinculada</h3>
                </div>
                {ingredients.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center bg-white dark:bg-gray-800">
                     <FileSpreadsheet className="text-amber-200 dark:text-gray-600 mb-3" size={48} />
                     <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Aguardando Sincronização...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white dark:bg-gray-800">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 text-sm">
                          <th className="p-4 font-semibold">Matéria Prima</th><th className="p-4 font-semibold">Preço na Planilha</th><th className="p-4 font-semibold">Qtde Pacote</th><th className="p-4 font-semibold">Uso na Receita</th><th className="p-4 font-semibold text-right text-amber-700 dark:text-amber-400">Custo na Receita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((ing) => {
                          const ingCost = (ing.bulkPrice / ing.bulkQty) * ing.recipeQty;
                          return (
                            <tr key={ing.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{ing.name}</td><td className="p-4 text-gray-600 dark:text-gray-400">R$ {ing.bulkPrice.toFixed(2)}</td><td className="p-4 text-gray-600 dark:text-gray-400">{ing.bulkQty} {ing.unit}</td><td className="p-4 text-gray-600 dark:text-gray-400">{ing.recipeQty} {ing.unit}</td><td className="p-4 text-right font-medium text-amber-700 dark:text-amber-400">R$ {ingCost.toFixed(2)}</td>
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
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gerir Clientes</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">A sua base é alimentada pelas "Novas Vendas" na Visão Geral.</p>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-amber-200 dark:border-gray-700 shadow-sm w-full sm:w-auto transition-colors">
                  <ArrowUpDown size={18} className="text-amber-600 dark:text-amber-500" />
                  <select className="bg-transparent font-medium text-gray-700 dark:text-gray-200 outline-none w-full cursor-pointer" value={customerSortBy} onChange={(e) => setCustomerSortBy(e.target.value)}>
                    <option value="name-asc">Ordem: A - Z</option><option value="name-desc">Ordem: Z - A</option><option value="referrals-desc">Maior nº de Indicações</option><option value="purchases-desc">Maior nº de Pedidos</option>
                  </select>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-amber-50 dark:bg-gray-900 text-amber-900 dark:text-amber-400 border-b border-amber-100 dark:border-gray-700">
                        <th className="p-4 font-semibold">Nome</th><th className="p-4 font-semibold">Indicado por</th><th className="p-4 font-semibold text-center">Indicações Feitas</th><th className="p-4 font-semibold text-center">Nº de Pedidos</th><th className="p-4 font-semibold text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCustomersWithStats.length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum cliente na base. Registe vendas na aba Visão Geral!</td></tr>
                      ) : sortedCustomersWithStats.map((customer) => (
                        <tr key={customer.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{customer.name}</td>
                          <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">{customer.referrerName}</td>
                          <td className="p-4 text-center"><span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${customer.referralsCount > 0 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{customer.referralsCount}</span></td>
                          <td className="p-4 text-center font-medium text-amber-700 dark:text-amber-400">{customer.purchases}</td>
                          <td className="p-4 text-center"><button onClick={() => handleDeleteCustomer(customer.id)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors inline-flex" title="Remover cliente"><Trash2 size={18} /></button></td>
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
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Reservas e Encomendas</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Crie encomendas. Ao marcá-las como "Concluídas", o sistema vai enviá-las <b>automaticamente para a sua aba de Vendas</b> e atualizar o cliente!</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Carrinho de Reservas */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 h-fit transition-colors flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Plus size={20} className="text-amber-600 dark:text-amber-500" /> Nova Encomenda</h3>
                  <form onSubmit={handleFinalizeReservation} className="space-y-4 flex flex-col flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Cliente</label>
                      <input required type="text" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newReservation.name} onChange={e => setNewReservation({...newReservation, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quem indicou? (Opcional)</label>
                      <select className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newReservation.referredBy} onChange={e => setNewReservation({...newReservation, referredBy: e.target.value})}>
                        <option value="">Ninguém</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Entrega (Opcional)</label>
                      <input type="date" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newReservation.date} onChange={e => setNewReservation({...newReservation, date: e.target.value})} />
                    </div>

                    <div className="bg-amber-50 dark:bg-gray-900 p-4 rounded-xl border border-amber-200 dark:border-gray-700 mt-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Adicionar Item</label>
                      <select className="w-full p-2 bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 transition-colors mb-2 text-sm" value={newReservation.productId} onChange={e => setNewReservation({...newReservation, productId: e.target.value})}>
                        {products.length === 0 ? <option value="">Cadastre no Catálogo</option> : (
                          <>
                            <optgroup label="Produtos">{products.filter(p => p.type === 'single' || !p.type).map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}</optgroup>
                            {products.filter(p => p.type === 'combo').length > 0 && <optgroup label="Combos">{products.filter(p => p.type === 'combo').map(p => <option key={p.id} value={p.id}>{p.name} ({p.units} un)</option>)}</optgroup>}
                          </>
                        )}
                      </select>
                      <div className="flex items-end gap-2 mb-2">
                         <div className="flex-1">
                           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantidade</label>
                           <input type="number" min="1" className="w-full p-2 bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-600 rounded-lg outline-none text-center" value={newReservation.quantity} onChange={e => setNewReservation({...newReservation, quantity: e.target.value})} />
                         </div>
                         <button type="button" onClick={handleAddToCartReservation} className="bg-amber-500 text-amber-950 px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-400 transition-colors">+ Adicionar</button>
                      </div>
                    </div>

                    {reservationCart.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700">
                        <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">Itens na Encomenda:</p>
                        {reservationCart.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-gray-600 dark:text-gray-400 mb-1 pb-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <span>{item.quantity}x {item.productName}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">R$ {item.expectedRevenue.toFixed(2)}</span>
                              <button type="button" onClick={() => setReservationCart(reservationCart.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="submit" className="w-full bg-amber-600 dark:bg-amber-700 text-white py-3 rounded-xl hover:bg-amber-700 dark:hover:bg-amber-600 transition font-bold mt-auto shadow-sm">Guardar Encomenda Completa</button>
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
                              {reservation.status === 'completed' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"><CheckCircle size={12}/> Concluída</span>}
                              {reservation.status === 'cancelled' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"><XCircle size={12}/> Cancelado</span>}
                            </td>
                            <td className="p-4 text-center flex items-center justify-center gap-2">
                              {reservation.status === 'pending' && (
                                <>
                                  <button onClick={() => handleUpdateReservationStatus(reservation.id, 'completed')} className="text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-gray-700 p-1 rounded transition-colors" title="Marcar como Concluída (Envia para Vendas)"><CheckCircle size={18}/></button>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registo completo de todas as vendas efetuadas.</p>
                  </div>
                  <button onClick={() => setShowSalesHistory(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-xl transition-colors"><X size={24} /></button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30 dark:bg-gray-900/30 transition-colors">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-amber-50 dark:bg-gray-900 text-amber-900 dark:text-amber-400 border-b border-amber-100 dark:border-gray-700">
                          <th className="p-4 font-semibold">Data / Hora</th><th className="p-4 font-semibold">Cliente</th><th className="p-4 font-semibold text-center">Quantidade</th><th className="p-4 font-semibold text-right">Receita (R$)</th><th className="p-4 font-semibold text-right">Lucro Est. (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhuma venda registada ainda.</td></tr>
                        ) : [...sales].sort((a,b) => new Date(b.date) - new Date(a.date)).map(sale => {
                          const estProfit = sale.revenue - ((sale.cookieUnits || sale.quantity) * costMetrics.costPerCookie);
                          return (
                            <tr key={sale.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{new Date(sale.date).toLocaleDateString('pt-BR')} <br/><span className="text-xs text-gray-400 dark:text-gray-500">{new Date(sale.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span></td>
                              <td className="p-4"><p className="font-medium text-gray-800 dark:text-gray-200">{sale.customerName || 'Cliente Balcão'}</p><p className="text-xs text-amber-600 dark:text-amber-400 font-medium">{sale.productName || 'Produto Avulso'}</p></td>
                              <td className="p-4 text-center"><span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-2 py-1 rounded-lg text-xs font-bold">{sale.quantity} un.</span>{sale.cookieUnits > sale.quantity && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">({sale.cookieUnits} cookies)</p>}</td>
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

          {/* INDICADORES GLOBAIS NO RODAPÉ */}
          <div className="fixed bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-black/90 backdrop-blur-md border border-gray-700/50 shadow-[0_10px_40px_rgba(0,0,0,0.3)] rounded-2xl px-6 py-3 flex items-center justify-between gap-4 md:gap-8 z-40 text-white w-[90%] md:w-auto whitespace-nowrap overflow-x-auto">
             <div className="flex flex-col items-center">
               <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Faturamento</span>
               <span className="font-black text-green-400">R$ {globalMetrics.totalRevenue.toFixed(2)}</span>
             </div>
             <div className="h-6 w-px bg-gray-700/50"></div>
             <div className="flex flex-col items-center">
               <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Custo Prod.</span>
               <span className="font-black text-red-400">-R$ {globalMetrics.totalEstimatedCost.toFixed(2)}</span>
             </div>
             <div className="h-6 w-px bg-gray-700/50"></div>
             <div className="flex flex-col items-center">
               <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Lucro Líquido</span>
               <span className="font-black text-amber-400">R$ {globalMetrics.totalEstimatedProfit.toFixed(2)}</span>
             </div>
          </div>

        </main>
      </div>
    </div>
  );
}
