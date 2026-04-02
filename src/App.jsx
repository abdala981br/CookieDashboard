import React, { useState, useMemo, useEffect } from 'react';
// IMPORTAÇÕES DO FIREBASE
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, initializeFirestore } from 'firebase/firestore';

// IMPORTAÇÕES DOS ÍCONES
import { 
  Cookie, Users, Network, Lightbulb, FileSpreadsheet, Plus, RefreshCw,
  Link as LinkIcon, Trash2, Star, ThumbsUp, ArrowUpDown, CalendarCheck,
  CheckCircle, Clock, XCircle, Calculator, DollarSign, TrendingUp,
  Package, BarChart3, Activity, PieChart, ShoppingCart, Award, History,
  X, ChevronDown, ChevronRight, ShoppingBag, Tag, Layers, Calendar,
  AlertCircle, Moon, Sun, LogOut, Lock, Mail, Zap, Trophy, Target, 
  TrendingDown, Gift, Crosshair, Flame, UsersRound, LineChart, ClipboardList, AlertTriangle, Info, Edit, Store, Send, Eye, EyeOff, MessageSquarePlus, ShieldAlert
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBSih7dkMmGmYg2NUcM7a_ki-PQtKJ2504",
  authDomain: "cookiedash.firebaseapp.com",
  projectId: "cookiedash",
  storageBucket: "cookiedash.firebasestorage.app",
  messagingSenderId: "165689377990",
  appId: "1:165689377990:web:266b6edaed2a8aee48c3c7"
};

// --- LIGANDO O MOTOR DO FIREBASE ---
let app, auth, db;
const appId = 'cookie-dash-app';
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, { experimentalForceLongPolling: true });
} catch (e) { console.error("Erro ao iniciar Firebase:", e); }

const INITIAL_PRODUCTS = [
  { id: 'prod-1', name: 'Cookie Tradicional', price: 10.00, type: 'single', units: 1, isVisible: true }
];

const getTodayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const getMaxDateYMD = (daysAdvance) => {
  const d = new Date();
  d.setDate(d.getDate() + (Number(daysAdvance) || 14));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const NetworkNode = ({ customer, customers, isRoot = false }) => {
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
          <p className={`font-bold ${isRoot ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>{customer.name || 'Desconhecido'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {isRoot && <span className="text-amber-700 dark:text-amber-400 mr-1">Iniciador •</span>}
            {customer.purchases || 0} pedidos {hasChildren && `• ${children.length} indicações`}
          </p>
        </div>
        {hasChildren && (<div className="ml-2 text-amber-600 dark:text-amber-400">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>)}
      </div>
      {hasChildren && isExpanded && (<div className="relative border-l-2 border-amber-200 dark:border-gray-600 ml-[1.5rem] mt-2">{children.map(child => <NetworkNode key={child.id} customer={child} customers={customers} />)}</div>)}
    </div>
  );
};


export default function CookieDashboard() {
  const [appMode, setAppMode] = useState('loading'); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [showFooterDetails, setShowFooterDetails] = useState(false);
  
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // ESTADOS ADMIN
  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [onlineSuggestions, setOnlineSuggestions] = useState([]); 
  
  const [recipeConfig, setRecipeConfig] = useState({ yield: 12, salePrice: 10.00 });
  const [goals, setGoals] = useState({ daily: 150, weekly: 1000 }); 
  const [storeSettings, setStoreSettings] = useState({ 
    isStoreOpen: true, 
    closedMessage: 'Estamos assando novas fornadas! Voltamos logo.', 
    maxAdvanceDays: 14, 
    whatsappNumber: '' 
  });
  const [sheetUrl, setSheetUrl] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  const [newSuggestion, setNewSuggestion] = useState({ type: 'flavor', text: '' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', type: 'single', units: 2 });
  const [quickSale, setQuickSale] = useState({ customerName: '', referredByInput: '', productId: '', quantity: 1, revenue: 0, date: getTodayYMD(), observation: '' });
  const [quickSaleCart, setQuickSaleCart] = useState([]);
  const [newReservation, setNewReservation] = useState({ name: '', referredByInput: '', productId: '', quantity: 1, date: '', observation: '' });
  const [reservationCart, setReservationCart] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [productionBatches, setProductionBatches] = useState(1);
  const [customerSortBy, setCustomerSortBy] = useState('name-asc');
  const [reservationSortBy, setReservationSortBy] = useState('date-asc');
  const [suggestionMatchContext, setSuggestionMatchContext] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);

  // ESTADOS PÚBLICOS
  const [publicProducts, setPublicProducts] = useState([]);
  const [publicSettings, setPublicSettings] = useState({ isStoreOpen: false, closedMessage: 'Carregando Loja...', maxAdvanceDays: 14, whatsappNumber: '' });
  const [publicCommunity, setPublicCommunity] = useState({ topReferrers: [], pendingRewards: [] });
  const [storeCart, setStoreCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState({ name: '', referredBy: '', date: getTodayYMD(), deliveryType: 'unesp', period: 'Manhã', address: '', itemObs: '', acceptedPolicies: false });
  const [pubSugData, setPubSugData] = useState({ name: '', text: '', type: 'flavor' });

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.isAnonymous) setAppMode('storefront');
        else setAppMode('dashboard');
      } else {
        try { await signInAnonymously(auth); } 
        catch (e) { console.error(e); setAppMode('storefront'); }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuthenticate = async (e) => {
    e.preventDefault(); setAuthError(''); setResetMessage('');
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') setAuthError('Email ou senha incorretos.');
      else if (error.code === 'auth/email-already-in-use') setAuthError('Este email já está cadastrado.');
      else if (error.code === 'auth/weak-password') setAuthError('A senha deve ter pelo menos 6 caracteres.');
      else setAuthError('Erro na autenticação: ' + error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) { setAuthError('Digite o seu email acima para recuperar a senha.'); return; }
    try { await sendPasswordResetEmail(auth, email); setResetMessage('Email de recuperação enviado!'); setAuthError(''); } 
    catch (error) { setAuthError('Erro: ' + error.message); }
  };

  const handleLogout = () => signOut(auth);

  useEffect(() => {
    if (!db || !user || user.isAnonymous) return;
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
             if(data.storeSettings) setStoreSettings(data.storeSettings);
             if(data.lastSync) setLastSync(data.lastSync);
             if(data.sheetUrl !== undefined) setSheetUrl(data.sheetUrl);
         }
         setIsConfigLoaded(true);
      }, console.error),
      onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'online_orders'), snap => {
         setOnlineOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)));
      }, console.error),
      onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'online_suggestions'), snap => {
         setOnlineSuggestions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt)));
      }, console.error)
    ];
    return () => unsubs.forEach(fn => fn());
  }, [user]);

  const saveToDb = async (col, id, data) => { if (db && user && !user.isAnonymous) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id), data); };
  const deleteFromDb = async (col, id) => { if (db && user && !user.isAnonymous) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id)); };
  const saveConfig = async (data) => { if (db && user && !user.isAnonymous) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), data, { merge: true }); };

  const customersWithStats = useMemo(() => {
    return customers.map(customer => {
      const referralsCount = customers.filter(c => c.referredBy === customer.id).length;
      const referrer = customers.find(c => c.id === customer.referredBy);
      return { ...customer, referralsCount, referrerName: referrer ? (referrer.name || 'Desconhecido') : 'Ninguém (Direto)' };
    });
  }, [customers]);

  const topReferrers = useMemo(() => [...customersWithStats].sort((a, b) => b.referralsCount - a.referralsCount).slice(0, 3), [customersWithStats]);
  const pendingRewards = useMemo(() => customersWithStats.filter(c => c.referralsCount === 2 || (c.referralsCount >= 5 && c.referralsCount % 5 === 0)), [customersWithStats]);

  useEffect(() => { 
    if (db && user && !user.isAnonymous && isConfigLoaded) { 
      saveConfig({ recipeConfig, goals, sheetUrl, storeSettings }); 
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'store', 'info'), { 
          products, storeSettings,
          topReferrers: topReferrers.map(c => ({ name: c.name, count: c.referralsCount })).filter(c => c.count > 0),
          pendingRewards: pendingRewards.map(c => ({ name: c.name, count: c.referralsCount }))
      });
    }
  }, [recipeConfig, goals, sheetUrl, storeSettings, products, topReferrers, pendingRewards, user, isConfigLoaded]);

  useEffect(() => {
    if (db && user && (appMode === 'storefront' || appMode === 'dashboard')) {
      const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'store', 'info'), snap => {
         if (snap.exists()) {
            const d = snap.data();
            setPublicProducts((d.products || []).filter(p => p.isVisible !== false));
            setPublicSettings(d.storeSettings || { isStoreOpen: false, closedMessage: 'Carregando Loja...', maxAdvanceDays: 14, whatsappNumber: '' });
            setPublicCommunity({ topReferrers: d.topReferrers || [], pendingRewards: d.pendingRewards || [] });
         }
      });
      return () => unsub();
    }
  }, [user, appMode]);

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

  const sortedCustomersAlpha = useMemo(() => [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || '')), [customers]);

  const costMetrics = useMemo(() => {
    const totalRecipeCost = ingredients.reduce((acc, ing) => acc + ((Number(ing.bulkPrice) || 0) / (Number(ing.bulkQty) || 1)) * (Number(ing.recipeQty) || 0), 0);
    const costPerCookie = totalRecipeCost / (Number(recipeConfig.yield) || 1);
    const profit = (Number(recipeConfig.salePrice) || 0) - costPerCookie;
    const profitMargin = recipeConfig.salePrice > 0 ? (profit / recipeConfig.salePrice) * 100 : 0;
    return { totalRecipeCost, costPerCookie, profit, profitMargin };
  }, [ingredients, recipeConfig]);

  const inventoryCheck = useMemo(() => {
    const list = ingredients.map(ing => {
      const wasteFactor = ing.applyWaste ? 1.02 : 1; 
      const totalNeeded = ((Number(ing.recipeQty) || 0) * wasteFactor) * (Number(productionBatches) || 1);
      const currentStock = parseFloat(ing.currentStock) || 0;
      const missingAmount = Math.max(0, totalNeeded - currentStock);
      let packagesToBuy = 0; let costToBuy = 0; let exactMissingToBuy = 0; const safeBulkQty = Number(ing.bulkQty) || 1;
      if (missingAmount > 0 && safeBulkQty > 0) {
          const safeMissingAmount = Math.round(missingAmount * 1000) / 1000;
          packagesToBuy = Math.ceil(safeMissingAmount / safeBulkQty);
          costToBuy = packagesToBuy * (Number(ing.bulkPrice) || 0);
          exactMissingToBuy = packagesToBuy * safeBulkQty;
      }
      return { ...ing, totalNeeded, missingAmount, packagesToBuy, exactMissingToBuy, costToBuy, wasteFactor };
    });
    const totalMissingCost = list.reduce((sum, item) => sum + (Number(item.costToBuy) || 0), 0);
    const canProduce = list.every(item => item.missingAmount === 0);
    return { list, totalMissingCost, canProduce };
  }, [ingredients, productionBatches]);

  const missingCostForOneBatch = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const wasteFactor = ing.applyWaste ? 1.02 : 1; 
      const totalNeeded = ((Number(ing.recipeQty) || 0) * wasteFactor) * 1; 
      const currentStock = parseFloat(ing.currentStock) || 0;
      const missingAmount = Math.max(0, totalNeeded - currentStock);
      let costToBuy = 0; const safeBulkQty = Number(ing.bulkQty) || 1;
      if (missingAmount > 0 && safeBulkQty > 0) {
          const safeMissingAmount = Math.round(missingAmount * 1000) / 1000;
          costToBuy = Math.ceil(safeMissingAmount / safeBulkQty) * (Number(ing.bulkPrice) || 0);
      }
      return sum + costToBuy;
    }, 0);
  }, [ingredients]);

  const globalMetrics = useMemo(() => {
    const totalRevenue = sales.reduce((acc, curr) => acc + (Number(curr.revenue) || 0), 0);
    const totalCookiesSold = sales.reduce((acc, curr) => acc + (Number(curr.cookieUnits) || Number(curr.quantity) || 0), 0);
    const totalEstimatedCost = totalCookiesSold * costMetrics.costPerCookie;
    const totalEstimatedProfit = totalRevenue - totalEstimatedCost;
    const ticketMedio = sales.length > 0 ? (totalRevenue / sales.length) : 0;
    const margin = totalRevenue > 0 ? (totalEstimatedProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCookiesSold, totalEstimatedCost, totalEstimatedProfit, ticketMedio, margin };
  }, [sales, costMetrics]);

  const timeStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today); last7Days.setDate(last7Days.getDate() - 6);
    const previous7Days = new Date(last7Days); previous7Days.setDate(previous7Days.getDate() - 7);
    
    let revToday = 0, revYesterday = 0, rev7Days = 0, revPrev7Days = 0;

    sales.forEach(s => {
      if (!s.date) return;
      const d = new Date(s.date);
      if (isNaN(d.getTime())) return;
      const localD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const rev = Number(s.revenue) || 0;
      
      if (localD.getTime() === today.getTime()) revToday += rev;
      else if (localD.getTime() === yesterday.getTime()) revYesterday += rev;
      
      if (localD >= last7Days && localD <= today) rev7Days += rev;
      else if (localD >= previous7Days && localD < last7Days) revPrev7Days += s.revenue;
    });

    const todayGrowth = revYesterday === 0 ? (revToday > 0 ? 100 : 0) : ((revToday - revYesterday) / revYesterday) * 100;
    const weekGrowth = revPrev7Days === 0 ? (rev7Days > 0 ? 100 : 0) : ((rev7Days - revPrev7Days) / revPrev7Days) * 100;

    return { revToday, revYesterday, todayGrowth, rev7Days, revPrev7Days, weekGrowth };
  }, [sales]);

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
      
      const format = (dt) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth()+1).padStart(2, '0')}`;
      stats.push({ label: `${format(start)} a \n${format(end)}`, start, end, salesQty: 0, revenue: 0, estimatedProfit: 0 });
    }

    sales.forEach(sale => {
      if (!sale.date) return;
      const saleDate = new Date(sale.date);
      if (isNaN(saleDate.getTime())) return;
      
      const week = stats.find(w => saleDate >= w.start && saleDate <= w.end);
      if (week) {
        const qty = Number(sale.cookieUnits) || Number(sale.quantity) || 0;
        const rev = Number(sale.revenue) || 0;
        week.salesQty += qty; week.revenue += rev;
        week.estimatedProfit += (rev - (costMetrics.costPerCookie * qty));
      }
    });
    return stats;
  }, [sales, costMetrics]);

  const maxWeeklyRevenue = useMemo(() => Math.max(...weeklyStats.map(m => m.revenue), 10), [weeklyStats]);

  const productIntel = useMemo(() => {
    if (products.length === 0 || sales.length === 0) return null;
    const pStats = products.map(p => {
      const s = sales.filter(sale => sale.productId === p.id || sale.productName === p.name);
      const qty = s.reduce((a,b)=>a+(Number(b.cookieUnits)||Number(b.quantity)||0),0);
      const rev = s.reduce((a,b)=>a+(Number(b.revenue)||0),0);
      const profit = rev - (qty * costMetrics.costPerCookie);
      return { name: p.name, qty, profit };
    });
    const topSold = [...pStats].sort((a,b)=>b.qty - a.qty)[0];
    const topProfit = [...pStats].sort((a,b)=>b.profit - a.profit)[0];
    return { topSold, topProfit };
  }, [sales, products, costMetrics]);

  const customerIntel = useMemo(() => {
    const novos = customers.filter(c => (Number(c.purchases) || 0) === 1).length;
    const recorrentes = customers.filter(c => (Number(c.purchases) || 0) > 1).length;
    const total = novos + recorrentes;
    const recorrentesPercent = total > 0 ? (recorrentes / total) * 100 : 0;
    return { novos, recorrentes, recorrentesPercent };
  }, [customers]);

  const projection = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const revThisMonth = sales.filter(s => s.date && new Date(s.date).getMonth() === currentMonth).reduce((a,b)=>a+(Number(b.revenue)||0), 0);
    const daysPassed = Math.max(1, new Date().getDate());
    const daysInMonth = new Date(new Date().getFullYear(), currentMonth + 1, 0).getDate();
    return (revThisMonth / daysPassed) * daysInMonth;
  }, [sales]);

  const sortedReservations = useMemo(() => {
    let sorted = [...reservations];
    switch(reservationSortBy) {
      case 'date-asc': sorted.sort((a, b) => new Date(a.date || '9999-12-31').getTime() - new Date(b.date || '9999-12-31').getTime()); break;
      case 'date-desc': sorted.sort((a, b) => new Date(b.date || '1970-01-01').getTime() - new Date(a.date || '1970-01-01').getTime()); break;
      case 'name-asc': sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'product-asc': sorted.sort((a, b) => (a.productName || '').localeCompare(b.productName || '')); break;
      default: break;
    }
    return { pending: sorted.filter(r => r.status === 'pending'), past: sorted.filter(r => r.status !== 'pending') };
  }, [reservations, reservationSortBy]);

  const expectedMetrics = useMemo(() => {
    let revenue = 0; let cookies = 0;
    sortedReservations.pending.forEach(r => { revenue += Number(r.expectedRevenue) || 0; cookies += Number(r.cookieUnits) || Number(r.quantity) || 0; });
    const batchesNeeded = recipeConfig.yield > 0 ? Math.ceil(cookies / recipeConfig.yield) : 0;
    return { revenue, cookies, batchesNeeded };
  }, [sortedReservations.pending, recipeConfig.yield]);

  const handleUpdateStock = (id, val) => {
    const newStock = parseFloat(val) || 0;
    const item = ingredients.find(i => i.id === id);
    if(item && user) saveToDb('ingredients', id, { ...item, currentStock: newStock });
  };

  const handleToggleWaste = (id, currentVal) => {
    const item = ingredients.find(i => i.id === id);
    if(item && user) saveToDb('ingredients', id, { ...item, applyWaste: !currentVal });
  };

  const handleProduce = () => {
    ingredients.forEach(ing => {
      const itemCheck = inventoryCheck.list.find(i => i.id === ing.id);
      if(itemCheck) {
        let current = parseFloat(ing.currentStock) || 0;
        if (itemCheck.packagesToBuy > 0) current += itemCheck.exactMissingToBuy;
        const newStock = Math.max(0, current - itemCheck.totalNeeded);
        if(user) saveToDb('ingredients', ing.id, { ...ing, currentStock: newStock });
      }
    });
    setProductionBatches(1);
    alert("Produção registada com sucesso! O estoque foi deduzido.");
  };

  const sortedCustomersWithStats = useMemo(() => {
    let sorted = [...customersWithStats];
    switch(customerSortBy) {
      case 'name-asc': sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'name-desc': sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
      case 'referrals-desc': sorted.sort((a, b) => b.referralsCount - a.referralsCount); break;
      case 'purchases-desc': sorted.sort((a, b) => (Number(b.purchases)||0) - (Number(a.purchases)||0)); break;
      default: break;
    }
    return sorted;
  }, [customersWithStats, customerSortBy]);

  const rootCustomers = useMemo(() => customers.filter(c => !c.referredBy), [customers]);

  // ==========================================
  // HANDLERS DE FORMULÁRIO (VENDAS E RESERVAS)
  // ==========================================
  
  const handleAddToCartQuickSale = () => {
    if (!quickSale.quantity || !quickSale.revenue) return;
    const p = products.find(prod => prod.id === quickSale.productId);
    
    setQuickSaleCart([...quickSaleCart, {
      productId: p ? p.id : 'avulso', 
      productName: p ? p.name : 'Produto Avulso',
      quantity: Number(quickSale.quantity),
      cookieUnits: (p?.units || 1) * Number(quickSale.quantity),
      revenue: Number(quickSale.revenue),
      observation: quickSale.observation
    }]);
    setQuickSale(prev => ({ ...prev, quantity: 1, revenue: p ? p.price : recipeConfig.salePrice, observation: '' }));
  };

  const handleFinalizeQuickSale = (e) => {
    e.preventDefault();
    if (!quickSale.customerName || !user) return;

    let finalCart = [...quickSaleCart];
    if (quickSale.quantity > 0 && quickSale.revenue > 0) {
      const p = products.find(prod => prod.id === quickSale.productId);
      finalCart.push({
        productId: p ? p.id : 'avulso', 
        productName: p ? p.name : 'Produto Avulso',
        quantity: Number(quickSale.quantity), 
        cookieUnits: (p?.units || 1) * Number(quickSale.quantity), 
        revenue: Number(quickSale.revenue),
        observation: quickSale.observation
      });
    }
    if (finalCart.length === 0) return;

    const todayYMD = getTodayYMD();
    let saleDateIso = new Date().toISOString();
    if (quickSale.date && quickSale.date !== todayYMD) {
      const parsedDate = new Date(`${quickSale.date}T12:00:00`);
      if (!isNaN(parsedDate.getTime())) saleDateIso = parsedDate.toISOString();
    }

    let finalReferredBy = null;
    if (quickSale.referredByInput) {
       const found = customers.find(c => (c.name || '').toLowerCase() === quickSale.referredByInput.toLowerCase().trim());
       if (found) finalReferredBy = found.id;
    }

    finalCart.forEach(item => {
      const newSaleId = Math.random().toString(36).substr(2, 9);
      saveToDb('sales', newSaleId, {
        id: newSaleId, date: saleDateIso, quantity: item.quantity, cookieUnits: item.cookieUnits, 
        revenue: item.revenue, customerName: quickSale.customerName.trim(), productName: item.productName,
        observation: item.observation || ''
      });
    });

    const existingCustomer = customers.find(c => (c.name || '').toLowerCase() === quickSale.customerName.toLowerCase().trim());
    if (existingCustomer) saveToDb('customers', existingCustomer.id, { ...existingCustomer, purchases: (Number(existingCustomer.purchases) || 0) + 1 });
    else {
      const newCustId = Math.random().toString(36).substr(2, 9);
      saveToDb('customers', newCustId, { id: newCustId, name: quickSale.customerName.trim(), referredBy: finalReferredBy, purchases: 1 });
    }

    setQuickSaleCart([]);
    setQuickSale({ customerName: '', referredByInput: '', productId: products[0]?.id || '', quantity: 1, revenue: products[0]?.price || recipeConfig.salePrice, date: getTodayYMD(), observation: '' });
  };

  const handleAddToCartReservation = () => {
    if (!newReservation.quantity) return;
    const p = products.find(prod => prod.id === newReservation.productId);
    
    setReservationCart([...reservationCart, {
      productId: p ? p.id : 'avulso', 
      productName: p ? p.name : 'Produto Avulso', 
      quantity: Number(newReservation.quantity),
      cookieUnits: (p?.units || 1) * Number(newReservation.quantity), 
      expectedRevenue: (p ? p.price : recipeConfig.salePrice) * Number(newReservation.quantity),
      observation: newReservation.observation
    }]);
    setNewReservation(prev => ({ ...prev, quantity: 1, observation: '' }));
  };

  const handleFinalizeReservation = (e) => {
    e.preventDefault();
    if (!newReservation.name || !user) return;

    let finalCart = [...reservationCart];
    if (newReservation.quantity > 0) {
      const p = products.find(prod => prod.id === newReservation.productId);
      finalCart.push({
        productId: p ? p.id : 'avulso', 
        productName: p ? p.name : 'Produto Avulso', 
        quantity: Number(newReservation.quantity),
        cookieUnits: (p?.units || 1) * Number(newReservation.quantity), 
        expectedRevenue: (p ? p.price : recipeConfig.salePrice) * Number(newReservation.quantity),
        observation: newReservation.observation
      });
    }
    if (finalCart.length === 0) return;

    let finalReferredBy = null;
    if (newReservation.referredByInput) {
       const found = customers.find(c => (c.name || '').toLowerCase() === newReservation.referredByInput.toLowerCase().trim());
       if (found) finalReferredBy = found.id;
    }

    finalCart.forEach(item => {
      const newId = Math.random().toString(36).substr(2, 9);
      saveToDb('reservations', newId, { 
        id: newId, name: newReservation.name.trim(), referredBy: finalReferredBy,
        productId: item.productId, productName: item.productName,
        quantity: item.quantity, cookieUnits: item.cookieUnits, expectedRevenue: item.expectedRevenue,
        date: newReservation.date, status: 'pending', observation: item.observation || ''
      });
    });

    setReservationCart([]);
    setNewReservation({ name: '', referredByInput: '', productId: products[0]?.id || '', quantity: 1, date: '', observation: '' });
  };
  
  const handleUpdateReservationStatus = (id, status) => {
    const r = reservations.find(x => x.id === id);
    if (r && user) {
      saveToDb('reservations', id, { ...r, status });
      if (status === 'completed' && r.status !== 'completed') {
          const newSaleId = Math.random().toString(36).substr(2, 9);
          saveToDb('sales', newSaleId, { id: newSaleId, date: new Date().toISOString(), quantity: r.quantity, cookieUnits: r.cookieUnits, revenue: r.expectedRevenue, customerName: r.name, productName: r.productName, observation: r.observation || '' });
          const existingCustomer = customers.find(c => (c.name || '').toLowerCase() === (r.name || '').toLowerCase().trim());
          if (existingCustomer) saveToDb('customers', existingCustomer.id, { ...existingCustomer, purchases: (Number(existingCustomer.purchases) || 0) + 1 });
          else {
              const newCustId = Math.random().toString(36).substr(2, 9);
              saveToDb('customers', newCustId, { id: newCustId, name: (r.name || '').trim(), referredBy: r.referredBy || null, purchases: 1 });
          }
      }
    }
  };

  const handleApproveOnlineOrder = (order) => {
    order.cart.forEach(item => {
      const newId = Math.random().toString(36).substr(2, 9);
      let finalReferredBy = null;
      if (order.referredByInput) {
          const found = customers.find(c => (c.name || '').toLowerCase() === order.referredByInput.toLowerCase().trim());
          if (found) finalReferredBy = found.id;
      }
      saveToDb('reservations', newId, {
          id: newId, name: order.customerName.trim(), referredByInput: order.referredByInput || '', referredBy: finalReferredBy,
          productId: item.productId, productName: item.productName, quantity: item.qty, cookieUnits: item.units * item.qty,
          expectedRevenue: item.price * item.qty, date: order.deliveryDate, status: 'pending',
          observation: `[Loja - ${order.deliveryType === 'unesp' ? 'UNESP ' + order.period : 'Casa ' + order.address}] ${item.obs || ''}`
      });
    });
    deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'online_orders', order.id));
  };

  const handleRejectOnlineOrder = (orderId) => { deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'online_orders', orderId)); };

  const handleDeleteReservation = (id) => user && deleteFromDb('reservations', id);

  const handleSaveEditCustomer = (e) => {
    e.preventDefault(); if (!editingCustomer || !user) return;
    let finalReferredBy = editingCustomer.referredBy; 
    if (editingCustomer.referredByInput !== undefined) {
        if (editingCustomer.referredByInput === '') finalReferredBy = null;
        else {
            const found = customers.find(c => (c.name || '').toLowerCase() === editingCustomer.referredByInput.toLowerCase().trim());
            if (found) finalReferredBy = found.id;
        }
    }
    saveToDb('customers', editingCustomer.id, { ...editingCustomer, purchases: Number(editingCustomer.purchases) || 0, referredBy: finalReferredBy });
    setEditingCustomer(null);
  };

  const handleSaveEditReservation = (e) => {
    e.preventDefault(); if (!editingReservation || !user) return;
    let finalReferredBy = editingReservation.referredBy; 
    if (editingReservation.referredByInput !== undefined) {
        if (editingReservation.referredByInput === '') finalReferredBy = null;
        else {
            const found = customers.find(c => (c.name || '').toLowerCase() === editingReservation.referredByInput.toLowerCase().trim());
            if (found) finalReferredBy = found.id;
        }
    }
    saveToDb('reservations', editingReservation.id, { ...editingReservation, quantity: Number(editingReservation.quantity) || 1, expectedRevenue: Number(editingReservation.expectedRevenue) || 0, cookieUnits: Number(editingReservation.cookieUnits) || 1, referredBy: finalReferredBy });
    setEditingReservation(null);
  };

  const handleEditReservationChange = (field, value) => {
    let updated = { ...editingReservation, [field]: value };
    if (field === 'productId' || field === 'quantity') {
      const p = products.find(prod => prod.id === updated.productId);
      if (p) { updated.productName = p.name; updated.cookieUnits = (p.units || 1) * Number(updated.quantity || 1); updated.expectedRevenue = p.price * Number(updated.quantity || 1); }
    }
    setEditingReservation(updated);
  };

  const handleAddProduct = (e) => {
    e.preventDefault(); if (!newProduct.name || !newProduct.price || !user) return;
    const newId = Math.random().toString(36).substr(2, 9);
    saveToDb('products', newId, { id: newId, name: newProduct.name, price: Number(newProduct.price), type: newProduct.type, units: newProduct.type === 'combo' ? Number(newProduct.units) : 1, isVisible: true });
    setNewProduct({ name: '', price: '', type: 'single', units: 2 });
  };
  const handleDeleteProduct = (id) => { if(user) deleteFromDb('products', id); };
  
  const handleToggleProductVisibility = (id, currentVis) => {
    const p = products.find(x => x.id === id);
    if(p && user) saveToDb('products', id, { ...p, isVisible: currentVis === undefined ? false : !currentVis });
  };

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
          
          const existingItem = ingredients.find(old => (old.name||'').toLowerCase() === name.toLowerCase());
          const currentStock = existingItem ? (existingItem.currentStock || 0) : 0;
          const unitLower = (clean(row[unitIdx]) || 'un').toLowerCase();
          const defaultWaste = (unitLower === 'g' || unitLower === 'kg' || unitLower === 'ml' || unitLower === 'l');
          const applyWaste = existingItem && existingItem.applyWaste !== undefined ? existingItem.applyWaste : defaultWaste;

          parsedIngredients.push({ id: i.toString(), name: name, bulkQty: parseNumber(row[bulkQtyIdx]), unit: clean(row[unitIdx]) || 'un', bulkPrice: parseNumber(row[bulkPriceIdx]), recipeQty: rQty, currentStock, applyWaste });
        }
      }

      if (parsedIngredients.length > 0) {
         setIngredients(parsedIngredients);
         const syncTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
         setLastSync(syncTime);
         if (user) {
             ingredients.forEach(ing => deleteFromDb('ingredients', ing.id));
             parsedIngredients.forEach(ing => saveToDb('ingredients', ing.id, ing));
             saveConfig({ lastSync: syncTime, sheetUrl });
         }
      } else { alert("Nenhum ingrediente encontrado. Verifique a planilha."); }
    } catch (error) {
      console.error("Erro na leitura da planilha:", error);
      alert("Erro ao ler planilha. Garanta que ela foi publicada na web em formato CSV.");
    } finally { setIsSyncing(false); }
  };

  const handleAddSuggestion = (e) => {
    e.preventDefault(); if (!newSuggestion.text || !user) return;
    const normalizedInput = newSuggestion.text.toLowerCase().trim();
    const matches = suggestions.filter(s => s.type === newSuggestion.type && (s.text || '').toLowerCase().includes(normalizedInput));
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

  // Ações do Admin para Sugestões do Público
  const handleApprovePublicSuggestion = (pubSug, isMerge, targetId = null) => {
    if (isMerge && targetId) {
        const existing = suggestions.find(s => s.id === targetId);
        if (existing) saveToDb('suggestions', existing.id, { ...existing, votes: (existing.votes || 0) + 1 });
    } else {
        const newId = Math.random().toString(36).substr(2, 9);
        saveToDb('suggestions', newId, { id: newId, type: pubSug.type, text: pubSug.text, votes: 1, isFavorite: false });
    }
    deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'online_suggestions', pubSug.id));
  };
  const handleRejectPublicSuggestion = (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'online_suggestions', id));


  // ==========================================
  // HANDLERS DA LOJA ONLINE PÚBLICA
  // ==========================================
  
  const handleAddToCartPublic = (product) => {
    setStoreCart(prev => {
       const existing = prev.find(p => p.productId === product.id && p.obs === checkoutData.itemObs);
       if (existing) return prev.map(p => p === existing ? { ...p, qty: p.qty + 1 } : p);
       return [...prev, { productId: product.id, name: product.name, price: product.price, units: product.units || 1, qty: 1, obs: checkoutData.itemObs || '' }];
    });
    setCheckoutData(prev => ({...prev, itemObs: ''}));
  };

  const handleCheckoutPublic = async (e) => {
    e.preventDefault();
    if (!checkoutData.name || storeCart.length === 0 || !checkoutData.acceptedPolicies) return;

    const total = storeCart.reduce((a,b)=>a+b.price*b.qty, 0);
    const orderId = Math.random().toString(36).substr(2, 9);
    
    const orderPayload = {
       customerName: checkoutData.name,
       referredByInput: checkoutData.referredBy,
       deliveryDate: checkoutData.date,
       deliveryType: checkoutData.deliveryType,
       period: checkoutData.period,
       address: checkoutData.address,
       cart: storeCart,
       total: total,
       createdAt: new Date().toISOString()
    };
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'online_orders', orderId), orderPayload);
      
      let msg = `*NOVO PEDIDO - ABDOOKIES* 🍪\n\n`;
      msg += `*Cliente:* ${checkoutData.name}\n`;
      if (checkoutData.referredBy) msg += `*Indicado por:* ${checkoutData.referredBy}\n`;
      msg += `*Data:* ${new Date(checkoutData.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}\n`;
      if (checkoutData.deliveryType === 'unesp') msg += `*Local:* UNESP (${checkoutData.period})\n\n`;
      else msg += `*Local:* Entrega (${checkoutData.address})\n\n`;
      msg += `*Itens:*\n`;
      storeCart.forEach(item => {
         msg += `- ${item.qty}x ${item.name} (R$ ${(item.price * item.qty).toFixed(2)})\n`;
         if (item.obs) msg += `  _Obs: ${item.obs}_\n`;
      });
      msg += `\n*Total: R$ ${total.toFixed(2)}*`;
      
      const waNumber = publicSettings.whatsappNumber ? publicSettings.whatsappNumber.replace(/\D/g, '') : '';
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
      
      setStoreCart([]); setIsCartOpen(false);
      alert('Seu pedido foi enviado para a nossa cozinha e também abriu no seu WhatsApp! Envie a mensagem para confirmar.');
    } catch (err) { alert('Erro ao enviar pedido. Tente novamente mais tarde.'); }
  };

  const handleSendPublicSuggestion = async (e) => {
    e.preventDefault();
    if (!pubSugData.text) return;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'online_suggestions', id), { ...pubSugData, createdAt: new Date().toISOString() });
      alert('Ideia enviada com sucesso! Muito obrigado pela ajuda.');
      setPubSugData({ name: '', text: '', type: 'flavor' });
    } catch (err) { alert('Erro ao enviar sugestão.'); }
  };

  // ==========================================
  // RENDERIZAÇÃO: CARREGANDO
  // ==========================================
  if (appMode === 'loading') {
    return (
      <div className="min-h-screen bg-orange-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <Cookie className="text-amber-500 animate-spin mb-4" size={48} />
        <p className="text-amber-800 dark:text-amber-400 font-medium">A carregar o seu mundo doce...</p>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: LOJA ONLINE PÚBLICA (STOREFRONT)
  // ==========================================
  if (appMode === 'storefront') {
    return (
      <div className={`min-h-screen font-sans pb-24 transition-colors duration-300 ${darkMode ? 'dark bg-gray-950 text-gray-100' : 'bg-orange-50 text-gray-800'}`}>
         {/* CABEÇALHO */}
         <header className="bg-amber-900 dark:bg-black text-white p-4 sticky top-0 z-40 shadow-md transition-colors">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <Cookie size={28} className="text-amber-300" />
                 <h1 className="text-xl font-bold tracking-tight">Abdookies</h1>
               </div>
               <div className="flex items-center gap-3">
                 <button onClick={() => setDarkMode(!darkMode)} className="text-amber-200 hover:text-white transition-colors p-1">
                   {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                 </button>
                 <button onClick={() => setIsCartOpen(true)} className="relative flex items-center gap-2 bg-amber-800 dark:bg-amber-900 hover:bg-amber-700 px-4 py-2 rounded-full transition-colors font-bold text-sm">
                   <ShoppingCart size={18} /> <span className="hidden sm:inline">Carrinho</span>
                   {storeCart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-amber-900">{storeCart.reduce((a,b)=>a+b.qty,0)}</span>}
                 </button>
               </div>
            </div>
         </header>

         {/* CORPO DA LOJA */}
         <main className="max-w-5xl mx-auto p-4 mt-6 space-y-10">
            {!publicSettings.isStoreOpen ? (
               <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm text-center border-2 border-amber-200 dark:border-amber-900 mt-10 transition-colors">
                  <Store size={64} className="text-amber-300 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Loja Fechada no Momento</h2>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">{publicSettings.closedMessage}</p>
               </div>
            ) : (
               <>
                 {/* CATÁLOGO */}
                 <section>
                   <div className="text-center mb-8">
                      <h2 className="text-3xl font-black text-amber-900 dark:text-amber-500 mb-2">Peça seus Cookies! 🍪</h2>
                      <p className="text-amber-700 dark:text-amber-400/80 font-medium">Faça a sua reserva abaixo. Entregas exclusivas em Rio Claro/SP.</p>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {publicProducts.map(prod => (
                         <div key={prod.id} className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-800 overflow-hidden flex flex-col hover:shadow-md transition-all">
                            <div className="h-32 bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                               {prod.type === 'combo' ? <Layers size={48} className="text-amber-300 dark:text-amber-700/50" /> : <Cookie size={48} className="text-amber-300 dark:text-amber-700/50" />}
                            </div>
                            <div className="p-5 flex flex-col flex-1">
                               <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">{prod.name}</h3>
                               {prod.type === 'combo' && <p className="text-xs text-amber-600 dark:text-amber-500 font-medium mb-2">{prod.units} unidades</p>}
                               <p className="text-xl font-black text-green-600 dark:text-green-500 mb-4 mt-auto">R$ {(Number(prod.price)||0).toFixed(2)}</p>
                               
                               <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                                 <input type="text" className="w-full text-xs p-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none text-gray-800 dark:text-gray-200" placeholder="Observações (ex: sem granulado)" value={checkoutData.itemObs} onChange={e => setCheckoutData({...checkoutData, itemObs: e.target.value})} />
                                 <button onClick={() => handleAddToCartPublic(prod)} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl transition-colors flex justify-center items-center gap-2">
                                   <Plus size={16}/> Adicionar
                                 </button>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                 </section>

                 {/* COMUNIDADE E RANKING */}
                 <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    {/* Top Embaixadores */}
                    <div className="bg-amber-100 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-200 dark:border-amber-800/50">
                      <h3 className="font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2 mb-4"><Award size={20}/> Top Embaixadores</h3>
                      <p className="text-xs text-amber-800 dark:text-amber-500/80 mb-4">Quem mais indicou a Abdookies e ganhou cookies grátis!</p>
                      <div className="space-y-3">
                        {publicCommunity.topReferrers.length === 0 ? <p className="text-sm text-gray-500">O ranking está vazio.</p> : publicCommunity.topReferrers.map((c, i) => (
                           <div key={i} className="flex items-center gap-3 bg-white/60 dark:bg-gray-900/50 p-3 rounded-xl border border-amber-200/50 dark:border-gray-800">
                             <div className="bg-amber-400 dark:bg-amber-600 text-amber-950 dark:text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">{i+1}</div>
                             <span className="font-bold text-gray-800 dark:text-gray-200 flex-1">{c.name}</span>
                             <span className="text-xs font-bold text-amber-700 dark:text-amber-500">{c.count} ind.</span>
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Quadro de Recompensas */}
                    <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl border border-green-200 dark:border-green-900/50">
                      <h3 className="font-bold text-green-900 dark:text-green-400 flex items-center gap-2 mb-4"><Gift size={20}/> Resgates Liberados</h3>
                      <p className="text-xs text-green-800 dark:text-green-500/80 mb-4">Embaixadores que atingiram a meta e podem pedir o seu mimo hoje!</p>
                      <div className="space-y-3">
                        {publicCommunity.pendingRewards.length === 0 ? <p className="text-sm text-gray-500">Nenhum resgate pendente.</p> : publicCommunity.pendingRewards.map((c, i) => (
                           <div key={i} className="flex flex-col bg-white/60 dark:bg-gray-900/50 p-3 rounded-xl border border-green-200/50 dark:border-gray-800">
                             <span className="font-bold text-gray-800 dark:text-gray-200">{c.name}</span>
                             <span className="text-xs font-bold text-green-600 dark:text-green-500">➔ Ganhou: {c.count === 2 ? '1 Mini Cookie' : '1 Cookie Tradicional'}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                 </section>

                 {/* CAIXA DE SUGESTÕES PÚBLICA */}
                 <section className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors mt-8">
                   <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-2"><MessageSquarePlus className="text-amber-500"/> Deixe a sua ideia!</h3>
                   <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Quer um sabor novo? Tem uma sugestão? A sua opinião molda o nosso cardápio!</p>
                   <form onSubmit={handleSendPublicSuggestion} className="flex flex-col sm:flex-row gap-4 items-end">
                     <div className="w-full sm:w-48">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Seu Nome (Opcional)</label>
                        <input type="text" className="w-full p-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl outline-none text-sm text-gray-800 dark:text-gray-200" value={pubSugData.name} onChange={e => setPubSugData({...pubSugData, name: e.target.value})} placeholder="Como se chama?" />
                     </div>
                     <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Sua Ideia *</label>
                        <input required type="text" className="w-full p-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl outline-none text-sm text-gray-800 dark:text-gray-200" value={pubSugData.text} onChange={e => setPubSugData({...pubSugData, text: e.target.value})} placeholder="Ex: Cookie de Pistache!" />
                     </div>
                     <div className="w-full sm:w-40">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Categoria *</label>
                        <select className="w-full p-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl outline-none text-sm text-gray-800 dark:text-gray-200" value={pubSugData.type} onChange={e => setPubSugData({...pubSugData, type: e.target.value})}>
                          <option value="flavor">Novo Sabor</option>
                          <option value="product">Novo Produto</option>
                          <option value="improvement">Melhoria</option>
                        </select>
                     </div>
                     <button type="submit" className="w-full sm:w-auto bg-amber-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-amber-700 transition">Enviar</button>
                   </form>
                 </section>
               </>
            )}
         </main>

         {/* RODAPÉ E ADMIN LINK */}
         <div className="text-center mt-12 mb-8">
            <button onClick={() => { if(user && !user.isAnonymous) setAppMode('dashboard'); else setAppMode('admin_login'); }} className="text-xs font-bold text-amber-600 dark:text-gray-500 hover:text-amber-800 transition-colors bg-amber-100 dark:bg-transparent px-4 py-2 rounded-full">
              {user && !user.isAnonymous ? 'Voltar ao Abdookies Dash' : 'Acesso Restrito (Admin)'}
            </button>
         </div>

         {/* MODAL DO CARRINHO */}
         {isCartOpen && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-end">
               <div className="bg-white dark:bg-gray-950 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-300">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-amber-50 dark:bg-black">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><ShoppingCart size={20} className="text-amber-600 dark:text-amber-500"/> Seu Pedido</h3>
                    <button onClick={() => setIsCartOpen(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white p-2 bg-white dark:bg-gray-900 rounded-full"><X size={20} /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                     {storeCart.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 mt-10">Seu carrinho está vazio.</p>
                     ) : (
                        storeCart.map((item, i) => (
                           <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center transition-colors">
                              <div>
                                 <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{item.name}</p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">R$ {(item.price * item.qty).toFixed(2)}</p>
                                 {item.obs && <p className="text-[10px] text-amber-600 dark:text-amber-400 italic mt-0.5">Obs: {item.obs}</p>}
                              </div>
                              <div className="flex items-center gap-3">
                                 <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                   <button onClick={() => setStoreCart(prev => prev.map((p, idx) => idx === i ? {...p, qty: Math.max(1, p.qty - 1)} : p))} className="w-6 h-6 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">-</button>
                                   <span className="text-xs font-bold w-4 text-center dark:text-gray-200">{item.qty}</span>
                                   <button onClick={() => setStoreCart(prev => prev.map((p, idx) => idx === i ? {...p, qty: p.qty + 1} : p))} className="w-6 h-6 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">+</button>
                                 </div>
                                 <button onClick={() => setStoreCart(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                              </div>
                           </div>
                        ))
                     )}

                     {storeCart.length > 0 && (
                        <form id="checkout-form" onSubmit={handleCheckoutPublic} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900/50 mt-6 space-y-4">
                           <h4 className="font-bold text-amber-900 dark:text-amber-500 border-b border-amber-100 dark:border-gray-700 pb-2 mb-4">Dados da Entrega</h4>
                           
                           <div>
                             <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Seu Nome *</label>
                             <input required type="text" className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-amber-500 text-sm dark:text-gray-200" value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} placeholder="Como podemos te chamar?" />
                           </div>

                           <div>
                             <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Quem te indicou? (Opcional)</label>
                             <input type="text" className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-amber-500 text-sm dark:text-gray-200" value={checkoutData.referredBy} onChange={e => setCheckoutData({...checkoutData, referredBy: e.target.value})} placeholder="Nome de quem te falou de nós" />
                             <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Sua indicação pode gerar cookies grátis para o seu amigo!</p>
                           </div>

                           <div className="flex gap-3">
                             <div className="w-1/2">
                               <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Tipo de Entrega *</label>
                               <select required className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-amber-500 text-sm dark:text-gray-200" value={checkoutData.deliveryType} onChange={e => setCheckoutData({...checkoutData, deliveryType: e.target.value})}>
                                 <option value="unesp">Na UNESP</option>
                                 <option value="home">Em Casa</option>
                               </select>
                             </div>
                             <div className="w-1/2">
                               <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Data *</label>
                               <input required type="date" min={getTodayYMD()} max={getMaxDateYMD(publicSettings.maxAdvanceDays)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-amber-500 text-sm dark:text-gray-200 [&::-webkit-calendar-picker-indicator]:dark:invert" value={checkoutData.date} onChange={e => setCheckoutData({...checkoutData, date: e.target.value})} />
                             </div>
                           </div>

                           {checkoutData.deliveryType === 'unesp' && (
                             <div>
                               <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Período/Local (UNESP) *</label>
                               <select required className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-amber-500 text-sm dark:text-gray-200" value={checkoutData.period} onChange={e => setCheckoutData({...checkoutData, period: e.target.value})}>
                                 <option value="Manhã (Departamentos/Prédios)">Manhã</option>
                                 <option value="Tarde (Departamentos/Prédios)">Tarde</option>
                                 <option value="Noite (Departamentos/Prédios)">Noite</option>
                               </select>
                             </div>
                           )}

                           {checkoutData.deliveryType === 'home' && (
                             <div>
                               <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">Endereço Completo *</label>
                               <input required type="text" className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-amber-500 text-sm dark:text-gray-200" value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} placeholder="Rua, Número, Bairro" />
                             </div>
                           )}

                           {/* POLÍTICAS DE ENTREGA OBRIGATÓRIAS */}
                           <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800/50 flex flex-col gap-3 mt-4">
                             <div className="flex gap-2">
                               <ShieldAlert size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                               <div>
                                 <p className="text-xs font-bold text-red-900 dark:text-red-400">Políticas e Avisos Importantes</p>
                                 <ul className="text-[10px] text-red-800 dark:text-red-300 list-disc pl-4 mt-1 space-y-0.5">
                                   <li>Entregas <b>apenas</b> na UNESP, Bela Vista e Vila Alemã.</li>
                                   <li>Os pedidos são feitos <b>sob demanda</b> e sujeitos à disponibilidade do nosso stock diário.</li>
                                   <li>A confirmação final será feita sempre pelo nosso WhatsApp.</li>
                                 </ul>
                               </div>
                             </div>
                             <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-red-200/50 dark:border-red-800/50">
                               <input type="checkbox" required className="w-4 h-4 rounded border-gray-300 accent-amber-600 cursor-pointer" checked={checkoutData.acceptedPolicies} onChange={e => setCheckoutData({...checkoutData, acceptedPolicies: e.target.checked})} />
                               <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Li e concordo com os avisos acima.</span>
                             </label>
                           </div>
                        </form>
                     )}
                  </div>
                  
                  {storeCart.length > 0 && (
                     <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                        <div className="flex justify-between items-center mb-4">
                           <span className="font-bold text-gray-600 dark:text-gray-400">Total do Pedido:</span>
                           <span className="font-black text-2xl text-green-600 dark:text-green-500">R$ {storeCart.reduce((a,b)=>a+b.price*b.qty, 0).toFixed(2)}</span>
                        </div>
                        <button form="checkout-form" disabled={!checkoutData.acceptedPolicies} type="submit" className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 text-lg">
                           <Send size={20} /> Fechar Pedido via WhatsApp
                        </button>
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: LOGIN DO ADMIN
  // ==========================================
  if (appMode === 'admin_login') {
    return (
      <div className="min-h-screen bg-orange-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-amber-100 dark:border-gray-700 w-full max-w-md relative">
          <button onClick={() => setAppMode('storefront')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 p-2 rounded-full transition-colors"><X size={16}/></button>
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 dark:bg-amber-900/50 p-4 rounded-full text-amber-600 dark:text-amber-400"><Lock size={40} /></div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">Acesso Restrito</h1>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">Gestão interna Abdookies Dash.</p>
          
          {authError && (<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center">{authError}</div>)}
          {resetMessage && (<div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 text-sm font-medium text-center">{resetMessage}</div>)}
          
          <form onSubmit={handleAuthenticate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email do Admin</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="email" required className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 transition-colors" placeholder="admin@cookiedash.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
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
                  <button type="button" onClick={handleResetPassword} className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors">Esqueci a senha</button>
                </div>
              )}
            </div>
            <button type="submit" className="w-full bg-gray-900 hover:bg-black dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-colors mt-4 shadow-md">
              {authMode === 'login' ? 'Entrar no Painel' : 'Criar Conta Admin'}
            </button>
          </form>
          <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-700 pt-6">
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); setResetMessage(''); }} className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors">
              {authMode === 'login' ? 'Criar primeira conta' : 'Já tenho conta'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: DASHBOARD (ADMIN)
  // ==========================================
  return (
    <div className={`${darkMode ? 'dark' : ''} h-full relative`}>
      
      {/* DATALIST GLOBAL PARA BUSCA INTELIGENTE DE CLIENTES */}
      <datalist id="customers-list">
        {sortedCustomersAlpha.map(c => <option key={c.id} value={c.name} />)}
      </datalist>

      <div className="flex h-[100dvh] bg-orange-50/30 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-300 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 bg-amber-900 dark:bg-gray-950 text-amber-50 flex flex-col shadow-xl z-20 transition-colors duration-300 hidden md:flex">
          <div className="p-6 flex items-center gap-3"><Cookie size={32} className="text-amber-300" /><h1 className="text-2xl font-bold tracking-tight">Abdookies Dash</h1></div>
          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><BarChart3 size={20} /> Visão Geral</button>
            <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><ShoppingBag size={20} /> Catálogo</button>
            <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><ClipboardList size={20} /> Estoque & Produção</button>
            <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><Users size={20} /> Clientes</button>
            <button onClick={() => setActiveTab('costs')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'costs' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><Calculator size={20} /> Custos & Sync</button>
            <button onClick={() => setActiveTab('reservations')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'reservations' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><CalendarCheck size={20} /> Entregas</button>
            <button onClick={() => setActiveTab('store_settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'store_settings' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><Store size={20} /> Loja Online</button>
            <button onClick={() => setActiveTab('network')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'network' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><Network size={20} /> Rede</button>
            <button onClick={() => setActiveTab('suggestions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'suggestions' ? 'bg-amber-800 dark:bg-amber-700 text-white' : 'hover:bg-amber-800/50 dark:hover:bg-gray-800'}`}><Lightbulb size={20} /> Ideias</button>
          </nav>
          <div className="mt-auto px-4 pb-6 space-y-2">
            <button onClick={() => setAppMode('storefront')} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-colors bg-white/10 hover:bg-white/20 text-white border border-white/20 mb-4">
              <Store size={18} /> <span className="font-medium text-sm">Ver Minha Loja</span>
            </button>
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
           <button onClick={() => setActiveTab('store_settings')} className={`p-2 rounded-lg ${activeTab === 'store_settings' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' : 'text-gray-500'}`}><Store size={24}/></button>
           <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg text-gray-500">{darkMode ? <Sun size={24} /> : <Moon size={24} />}</button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 md:pb-32">
          
          {/* TAB: DASHBOARD PRO */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
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
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Visão Rápida (Total)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Faturamento</p>
                      <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg text-green-600 dark:text-green-400"><DollarSign size={16} /></div>
                    </div>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {(Number(globalMetrics.totalRevenue) || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Lucro Real</p>
                      <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400"><TrendingUp size={16} /></div>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">R$ {(Number(globalMetrics.totalEstimatedProfit) || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium" title="Quanto você gastaria no mercado agora para bater +1 receita">Custo Reposição (+1)</p>
                      <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-lg text-red-600 dark:text-red-400"><ShoppingCart size={16} /></div>
                    </div>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">R$ {(Number(missingCostForOneBatch) || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Itens Vendidos</p>
                      <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-lg text-amber-600 dark:text-amber-400"><Cookie size={16} /></div>
                    </div>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-500">{globalMetrics.totalCookiesSold} un.</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 col-span-2 md:col-span-1 bg-amber-50/50 dark:bg-gray-800/80 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Nº Clientes</p>
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg text-blue-600 dark:text-blue-400"><Users size={16} /></div>
                    </div>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{customers.length}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                   <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Desempenho (Curto Prazo)</h3>
                   <div className="grid grid-cols-2 gap-4 h-[calc(100%-2rem)]">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center relative overflow-hidden">
                       <div className="relative z-10">
                         <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Vendas Hoje</p>
                         <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-3">R$ {(Number(timeStats.revToday) || 0).toFixed(2)}</p>
                         <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${timeStats.todayGrowth >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                           {timeStats.todayGrowth >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                           {timeStats.todayGrowth > 0 ? '+' : ''}{(Number(timeStats.todayGrowth) || 0).toFixed(1)}% vs Ontem
                         </div>
                       </div>
                       <LineChart className="absolute -bottom-4 -right-4 text-gray-50 dark:text-gray-700/50 w-32 h-32" />
                     </div>
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center relative overflow-hidden">
                       <div className="relative z-10">
                         <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">Últimos 7 Dias</p>
                         <p className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-3">R$ {(Number(timeStats.rev7Days) || 0).toFixed(2)}</p>
                         <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${timeStats.weekGrowth >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                           {timeStats.weekGrowth >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                           {timeStats.weekGrowth > 0 ? '+' : ''}{(Number(timeStats.weekGrowth) || 0).toFixed(1)}% vs Sem. Passada
                         </div>
                       </div>
                       <Calendar className="absolute -bottom-4 -right-4 text-gray-50 dark:text-gray-700/50 w-32 h-32" />
                     </div>
                   </div>
                </div>

                <div>
                   <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Crescimento e Metas</h3>
                   <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 h-[calc(100%-2rem)] flex flex-col justify-center space-y-6">
                     <div>
                       <div className="flex justify-between items-end mb-2">
                         <div>
                           <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Target size={16} className="text-amber-500"/> Meta Diária</p>
                           <p className="text-xs text-gray-400 mt-0.5">R$ {(Number(timeStats.revToday) || 0).toFixed(2)} / R$ <input type="number" className="w-12 bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none text-center text-amber-600 dark:text-amber-400 font-bold" value={goals.daily} onChange={(e) => setGoals({...goals, daily: Number(e.target.value)})}/></p>
                         </div>
                         <span className="text-sm font-black text-amber-600 dark:text-amber-400">{Math.min(((Number(timeStats.revToday)||0) / Math.max(goals.daily, 1)) * 100, 100).toFixed(0)}%</span>
                       </div>
                       <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                         <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(((Number(timeStats.revToday)||0) / Math.max(goals.daily, 1)) * 100, 100)}%` }}></div>
                       </div>
                     </div>

                     <div>
                       <div className="flex justify-between items-end mb-2">
                         <div>
                           <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Target size={16} className="text-amber-500"/> Meta Semanal</p>
                           <p className="text-xs text-gray-400 mt-0.5">R$ {(Number(timeStats.rev7Days)||0).toFixed(2)} / R$ <input type="number" className="w-16 bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none text-center text-amber-600 dark:text-amber-400 font-bold" value={goals.weekly} onChange={(e) => setGoals({...goals, weekly: Number(e.target.value)})}/></p>
                         </div>
                         <span className="text-sm font-black text-amber-600 dark:text-amber-400">{Math.min(((Number(timeStats.rev7Days)||0) / Math.max(goals.weekly, 1)) * 100, 100).toFixed(0)}%</span>
                       </div>
                       <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                         <div className="bg-amber-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min(((Number(timeStats.rev7Days)||0) / Math.max(goals.weekly, 1)) * 100, 100)}%` }}></div>
                       </div>
                     </div>

                     <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Crosshair className="text-blue-500" size={20}/>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Projeção do Mês (se continuar assim)</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">R$ {(Number(projection)||0).toFixed(2)}</p>
                          </div>
                        </div>
                     </div>
                   </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Inteligência de Produto & Clientes</h3>
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
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">R$ {(Number(productIntel?.topProfit?.profit)||0).toFixed(2)} gerados em lucro</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-blue-100 dark:border-gray-700">
                    <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4"><UsersRound size={20}/></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Comportamento (Clientes)</p>
                    <div className="flex items-end gap-2 mt-1">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{(Number(customerIntel.recorrentesPercent)||0).toFixed(0)}%</p>
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
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Operação (Vendas & Entregas)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Formulário Rápido de Nova Venda (Carrinho + Observação + Busca Inteligente) */}
                  <div className="lg:col-span-1 bg-amber-600 dark:bg-amber-700 rounded-3xl shadow-sm p-6 text-white relative flex flex-col transition-colors">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500 dark:bg-amber-600 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
                    
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 relative z-10">
                      <ShoppingCart size={22} /> Nova Venda Rápida
                    </h3>
                    
                    <form onSubmit={handleFinalizeQuickSale} className="space-y-4 relative z-10 flex-1 flex flex-col">
                      <div>
                        <label className="block text-xs font-medium text-amber-100 mb-1">Nome do Cliente</label>
                        <input list="customers-list" required type="text" className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white placeholder-amber-200/50 transition" value={quickSale.customerName} onChange={e => setQuickSale({...quickSale, customerName: e.target.value})} placeholder="Escreva ou escolha..." />
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
                          <input 
                             list="customers-list" 
                             type="text" 
                             className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white placeholder-amber-200/50 transition" 
                             value={quickSale.referredByInput} 
                             onChange={e => setQuickSale({...quickSale, referredByInput: e.target.value})} 
                             placeholder="Busque..." 
                          />
                        </div>
                      </div>

                      <div className="bg-amber-700/30 dark:bg-amber-900/40 p-4 rounded-2xl border border-amber-500/30 dark:border-amber-600/30 mt-2">
                        <label className="block text-xs font-medium text-amber-100 mb-1">Selecionar Item</label>
                        <select className="w-full p-2.5 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white [&>optgroup]:text-gray-800 [&>option]:text-gray-800 transition mb-3 text-sm" value={quickSale.productId} onChange={e => setQuickSale({...quickSale, productId: e.target.value})}>
                          {products.length === 0 ? <option value="">Cadastre no Catálogo</option> : (
                            <>
                              <optgroup label="Produtos Individuais">{products.filter(p => p.type === 'single' || !p.type).map(p => <option key={p.id} value={p.id}>{p.name} - R$ {(Number(p.price)||0).toFixed(2)}</option>)}</optgroup>
                              {products.filter(p => p.type === 'combo').length > 0 && <optgroup label="Combos e Promoções">{products.filter(p => p.type === 'combo').map(p => <option key={p.id} value={p.id}>{p.name} ({p.units} un) - R$ {(Number(p.price)||0).toFixed(2)}</option>)}</optgroup>}
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
                        <div className="mb-3">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-amber-200/80 mb-1">Observações do Pedido</label>
                          <input type="text" className="w-full p-2 bg-white/10 border border-amber-400/50 dark:border-amber-500/50 rounded-xl outline-none focus:bg-white/20 text-white placeholder-amber-200/50 transition text-sm" value={quickSale.observation} onChange={e => setQuickSale({...quickSale, observation: e.target.value})} placeholder="Ex: Sem granulado..." />
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
                              <div className="flex flex-col">
                                <span>{item.quantity}x {item.productName}</span>
                                {item.observation && <span className="text-[10px] text-amber-200/70 italic">Obs: {item.observation}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span>R$ {(Number(item.revenue)||0).toFixed(2)}</span>
                                <button type="button" onClick={() => setQuickSaleCart(quickSaleCart.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-200"><Trash2 size={14}/></button>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 mt-1 font-bold text-white flex justify-between text-base">
                             <span>Total:</span>
                             <span>R$ {(quickSaleCart.reduce((a,b)=>a+(Number(b.revenue)||0), 0) + (quickSale.quantity > 0 && quickSale.revenue > 0 && !quickSaleCart.find(i=>i.productId===quickSale.productId && i.quantity===quickSale.quantity) ? Number(quickSale.revenue) : 0)).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      <button type="submit" className="w-full bg-white text-amber-700 hover:bg-amber-50 dark:text-gray-900 dark:hover:bg-gray-100 py-3.5 rounded-xl font-bold mt-auto transition shadow-sm text-lg">
                        Registrar Venda
                      </button>
                    </form>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    {/* PEDIDOS DO WHATSAPP (NOVO) */}
                    <div className="bg-green-50/50 dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-green-200 dark:border-green-700/50 overflow-hidden transition-colors">
                      <div className="p-4 border-b border-green-200 dark:border-green-700/50 bg-green-100/50 dark:bg-green-900/30 flex justify-between items-center">
                         <h3 className="font-bold text-green-900 dark:text-green-400 flex items-center gap-2"><ShoppingCart size={18}/> 🛒 Pedidos da Loja Online</h3>
                         <span className="text-xs font-bold bg-white dark:bg-gray-900 px-2 py-1 rounded-md text-green-700 dark:text-green-500">{onlineOrders.length} aguardando</span>
                      </div>
                      <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full text-left border-collapse">
                          <tbody>
                            {onlineOrders.length === 0 ? (
                              <tr><td colSpan="4" className="p-6 text-center text-sm text-gray-500">Nenhum pedido novo do site.</td></tr>
                            ) : onlineOrders.map((order) => (
                              <tr key={order.id} className="border-b border-green-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-750 transition-colors">
                                <td className="p-3">
                                  <div className="flex flex-col gap-0.5">
                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{order.customerName}</p>
                                    <p className="text-[10px] text-gray-500 font-medium">Criado em: {new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                                    {order.referredByInput && <p className="text-[10px] text-amber-600 font-bold">🌟 Indicação: {order.referredByInput}</p>}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-col gap-1">
                                    {order.cart.map((item, idx) => (
                                      <p key={idx} className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                        {item.qty}x {item.name}
                                        {item.obs && <span className="text-amber-500 italic block"> - Obs: {item.obs}</span>}
                                      </p>
                                    ))}
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1 bg-blue-50 dark:bg-blue-900/30 w-fit px-1 rounded">
                                      Entrega: {order.deliveryType === 'unesp' ? `UNESP (${order.period})` : `Casa (${order.address})`} - {new Date(order.deliveryDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                                    </p>
                                  </div>
                                </td>
                                <td className="p-3 text-right text-sm font-bold text-green-700 dark:text-green-500">R$ {(Number(order.total)||0).toFixed(2)}</td>
                                <td className="p-3 text-center flex flex-col sm:flex-row items-center justify-center gap-1 mt-2">
                                  <button onClick={() => handleApproveOnlineOrder(order)} className="text-white bg-green-500 hover:bg-green-600 px-2 py-1.5 text-xs font-bold rounded shadow-sm transition-colors w-full sm:w-auto">Aprovar</button>
                                  <button onClick={() => handleRejectOnlineOrder(order.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 p-1.5 rounded transition-colors w-full sm:w-auto" title="Descartar"><Trash2 size={16} className="mx-auto"/></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 p-6 flex flex-col transition-colors">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                          <Clock className="text-amber-600 dark:text-amber-500" size={20}/> Entregas Pendentes
                        </h3>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-lg">R$ {(Number(expectedMetrics.revenue)||0).toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-xs font-bold text-gray-500">Filtrar por:</span>
                         <select className="text-xs bg-gray-50 border border-gray-200 rounded p-1 outline-none font-bold text-gray-700 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 cursor-pointer" value={reservationSortBy} onChange={e => setReservationSortBy(e.target.value)}>
                           <option value="date-asc">Data ⬆</option>
                           <option value="date-desc">Data ⬇</option>
                           <option value="name-asc">Nome Cliente (A-Z)</option>
                           <option value="product-asc">Produto (A-Z)</option>
                         </select>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[300px]">
                        {sortedReservations.pending.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center mt-4">Nenhuma encomenda pendente para entregar.</p>
                        ) : (
                          sortedReservations.pending.map(res => (
                            <div key={res.id} className="flex flex-col p-3 bg-amber-50/50 dark:bg-gray-700/50 rounded-xl border border-amber-100/50 dark:border-gray-600 transition-colors">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{res.name}</p>
                                  <div className="flex items-center gap-1 group relative">
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{res.quantity}x {res.productName}</p>
                                    {res.observation && (
                                      <div className="relative flex items-center ml-1">
                                        <Info size={14} className="text-amber-500 cursor-help" title={res.observation} />
                                        <div className="absolute left-6 top-1/2 transform -translate-y-1/2 hidden group-hover:block bg-gray-800 dark:bg-gray-900 text-white text-xs p-2 rounded shadow-xl z-[100] whitespace-nowrap min-w-[120px] border border-gray-700">
                                          {res.observation}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-gray-800 px-2 py-1 rounded-lg border border-transparent dark:border-gray-600">
                                    {res.date ? new Date(res.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', timeZone: 'UTC'}) : 'A comb.'}
                                  </span>
                                </div>
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
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Histórico de Evolução</h3>
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
                        <History size={16} /> Ver Histórico Detalhado
                      </button>
                      <div className="flex items-center gap-4 text-xs font-medium mt-1 text-gray-600 dark:text-gray-300">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-300 dark:bg-amber-600"></div> Receita Total</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500 dark:bg-green-500"></div> Lucro Real</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full flex items-end justify-between gap-2 mt-auto pt-4 border-b border-gray-100 dark:border-gray-700 pb-0 relative h-[250px]">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10 pb-0">
                      <div className="border-t border-gray-400 dark:border-gray-300 w-full"></div>
                      <div className="border-t border-gray-400 dark:border-gray-300 w-full"></div>
                      <div className="border-t border-gray-400 dark:border-gray-300 w-full"></div>
                    </div>

                    {weeklyStats.map((data, index) => {
                      const revenueHeight = maxWeeklyRevenue > 0 ? (data.revenue / maxWeeklyRevenue) * 100 : 0;
                      const profitHeight = maxWeeklyRevenue > 0 && data.revenue > 0 ? (Math.max(data.estimatedProfit, 0) / maxWeeklyRevenue) * 100 : 0;
                      return (
                        <div key={index} className="flex flex-col items-center flex-1 group z-10 h-[200px] justify-end">
                          <div className="w-full relative h-[180px] flex items-end justify-center gap-1 sm:gap-2">
                            
                            <div className="w-3 sm:w-5 bg-amber-300 dark:bg-amber-600 rounded-t-sm group-hover:bg-amber-400 dark:group-hover:bg-amber-500 transition-all duration-300" style={{ height: `${revenueHeight}%`, minHeight: data.revenue > 0 ? '8px' : '0' }}></div>
                            
                            <div className="w-3 sm:w-5 bg-green-500 dark:bg-green-500/80 rounded-t-sm group-hover:bg-green-400 transition-all duration-300 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] dark:shadow-none" style={{ height: `${profitHeight}%`, minHeight: data.estimatedProfit > 0 ? '8px' : '0' }}></div>
                            
                            {data.revenue > 0 && (
                              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-white text-white dark:text-gray-900 text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 flex flex-col items-center shadow-lg">
                                <span className="font-bold">Rec: R$ {(Number(data.revenue)||0).toFixed(2)}</span>
                                <span className="text-green-300 dark:text-green-600 text-[10px]">Lucro: R$ {(Number(data.estimatedProfit)||0).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium text-center leading-tight max-w-[70px] whitespace-pre-line h-[20px]">{data.label}</span>
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
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
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
                      <p className="text-lg font-black text-amber-700 dark:text-amber-500">{productionBatches * (Number(recipeConfig.yield)||1)} cookies</p>
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
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Pacotes que precisa comprar para produzir {productionBatches} receita(s).</p>
                      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2">
                        {inventoryCheck.list.filter(i => i.missingAmount > 0).map(ing => (
                          <div key={ing.id} className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                             <div>
                               <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{ing.name}</p>
                               <p className="text-[10px] text-red-500 font-medium">Comprar: {ing.packagesToBuy} pct(s) ({ing.exactMissingToBuy}{ing.unit})</p>
                             </div>
                             <p className="text-sm font-bold text-gray-700 dark:text-gray-300">R$ {(Number(ing.costToBuy)||0).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <span className="font-bold text-gray-600 dark:text-gray-400 text-sm">Custo Ida ao Mercado:</span>
                        <span className="font-black text-red-600 dark:text-red-400 text-lg">R$ {(Number(inventoryCheck.totalMissingCost)||0).toFixed(2)}</span>
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
                          const isOk = ing.missingAmount === 0;
                          return (
                            <tr key={ing.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-4">
                                <div className="flex flex-col gap-1 items-start">
                                  <p className="font-bold text-gray-800 dark:text-gray-200">{ing.name}</p>
                                  <button 
                                    onClick={() => handleToggleWaste(ing.id, ing.applyWaste)}
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors border ${ing.applyWaste ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700/50' : 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'}`}
                                    title="Clique para ligar/desligar os 2% adicionais de desperdício na hora da compra"
                                  >
                                    {ing.applyWaste ? '+2% Quebra ON' : '+2% Quebra OFF'}
                                  </button>
                                </div>
                              </td>
                              <td className="p-4 text-center font-medium text-gray-600 dark:text-gray-300">
                                {(Number(ing.totalNeeded)||0).toFixed(1)} {ing.unit}
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
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"><XCircle size={12}/> Faltam {ing.packagesToBuy} pct ({ing.exactMissingToBuy}{ing.unit})</span>
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">R$ {(Number(ing.costToBuy)||0).toFixed(2)}</span>
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
          )}

          {/* TAB: CATÁLOGO DE PRODUTOS */}
          {activeTab === 'products' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
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
                        <div key={product.id} className={`bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border ${product.isVisible === false ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-amber-100 dark:border-amber-900/50'} flex justify-between items-center group transition-colors`}>
                          <div className="flex items-center gap-3">
                            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full text-orange-600 dark:text-orange-400"><Tag size={20} /></div>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-200">{product.name}</p>
                              <p className="text-sm font-medium text-green-600 dark:text-green-400">R$ {(Number(product.price)||0).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleToggleProductVisibility(product.id, product.isVisible)} className={`p-2 rounded-lg transition-colors ${product.isVisible === false ? 'text-gray-400 bg-gray-100 dark:bg-gray-700 hover:text-amber-500' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 hover:text-amber-800'}`} title={product.isVisible === false ? "Mostrar na Loja" : "Ocultar da Loja"}>
                              {product.isVisible === false ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Remover Definitivamente"><Trash2 size={18} /></button>
                          </div>
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
                        <div key={product.id} className={`bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border ${product.isVisible === false ? 'border-gray-200 dark:border-gray-700 opacity-60' : 'border-amber-100 dark:border-amber-900/50'} flex justify-between items-center group transition-colors`}>
                          <div className="flex items-center gap-3">
                            <div className="bg-amber-200 dark:bg-amber-900/50 p-3 rounded-full text-amber-700 dark:text-amber-400"><Layers size={20} /></div>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-200">{product.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">R$ {(Number(product.price)||0).toFixed(2)}</p>
                                <span className="text-[10px] bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-gray-700">{product.units} cookies</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleToggleProductVisibility(product.id, product.isVisible)} className={`p-2 rounded-lg transition-colors ${product.isVisible === false ? 'text-gray-400 bg-gray-100 dark:bg-gray-700 hover:text-amber-500' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 hover:text-amber-800'}`} title={product.isVisible === false ? "Mostrar na Loja" : "Ocultar da Loja"}>
                              {product.isVisible === false ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Remover"><Trash2 size={18} /></button>
                          </div>
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
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
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
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {(Number(costMetrics.totalRecipeCost)||0).toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><Calculator size={16}/><h3 className="font-medium text-xs">Custo Unitário (Massa)</h3></div>
                      <p className="text-xl font-bold text-gray-800 dark:text-gray-100">R$ {(Number(costMetrics.costPerCookie)||0).toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><DollarSign size={16} className="text-green-500"/><h3 className="font-medium text-xs text-green-700 dark:text-green-400">Lucro Médio Unitário</h3></div>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">R$ {(Number(costMetrics.profit)||0).toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 transition-colors">
                      <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400"><TrendingUp size={16} className="text-purple-500"/><h3 className="font-medium text-xs text-purple-700 dark:text-purple-400">Margem (Produto Base)</h3></div>
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{(Number(costMetrics.profitMargin)||0).toFixed(1)}%</p>
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
                          const ingCost = (Number(ing.bulkPrice||0) / Number(ing.bulkQty||1)) * Number(ing.recipeQty||0);
                          return (
                            <tr key={ing.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-orange-50/30 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{ing.name}</td><td className="p-4 text-gray-600 dark:text-gray-400">R$ {(Number(ing.bulkPrice)||0).toFixed(2)}</td><td className="p-4 text-gray-600 dark:text-gray-400">{ing.bulkQty} {ing.unit}</td><td className="p-4 text-gray-600 dark:text-gray-400">{ing.recipeQty} {ing.unit}</td><td className="p-4 text-right font-medium text-amber-700 dark:text-amber-400">R$ {ingCost.toFixed(2)}</td>
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

          {/* TAB: LOJA ONLINE (CONFIGURAÇÕES) */}
          {activeTab === 'store_settings' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Loja Online</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Configure como os seus clientes fazem pedidos pelo site.</p>
                </div>
                <button onClick={() => setAppMode('storefront')} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                  <Store size={18} /> Ver Minha Loja
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-amber-100 dark:border-gray-700 overflow-hidden transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-gray-900">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Store className="text-amber-600 dark:text-amber-500" size={20}/> Configurações Gerais
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  
                  {/* Toggle Aberta/Fechada */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">Status da Loja</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Permitir que clientes façam pedidos agora.</p>
                    </div>
                    <button 
                      onClick={() => setStoreSettings({...storeSettings, isStoreOpen: !storeSettings.isStoreOpen})}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${storeSettings.isStoreOpen ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${storeSettings.isStoreOpen ? 'translate-x-7' : 'translate-x-1'}`}/>
                    </button>
                  </div>

                  {/* Mensagem de Loja Fechada */}
                  {!storeSettings.isStoreOpen && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Mensagem de Loja Fechada</label>
                      <textarea 
                        className="w-full p-3 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800/50 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm text-gray-800 dark:text-gray-200"
                        rows="2"
                        value={storeSettings.closedMessage}
                        onChange={e => setStoreSettings({...storeSettings, closedMessage: e.target.value})}
                        placeholder="Ex: Voltamos amanhã!"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Seu WhatsApp (Receber Pedidos)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">+55</span>
                        <input 
                          type="text" 
                          className="w-full pl-11 pr-3 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm text-gray-800 dark:text-gray-200"
                          value={storeSettings.whatsappNumber}
                          onChange={e => setStoreSettings({...storeSettings, whatsappNumber: e.target.value.replace(/\D/g, '')})}
                          placeholder="Ex: 11999999999"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">Apenas números com DDD.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Antecedência Máxima (Dias)</label>
                      <input 
                        type="number" min="1" max="90"
                        className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm text-gray-800 dark:text-gray-200"
                        value={storeSettings.maxAdvanceDays}
                        onChange={e => setStoreSettings({...storeSettings, maxAdvanceDays: Number(e.target.value)})}
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Limite do calendário (ex: 14 para duas semanas).</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLIENTES */}
          {activeTab === 'customers' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
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
                          <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{customer.name || 'Sem nome'}</td>
                          <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">{customer.referrerName}</td>
                          <td className="p-4 text-center"><span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${customer.referralsCount > 0 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{customer.referralsCount}</span></td>
                          <td className="p-4 text-center font-medium text-amber-700 dark:text-amber-400">{customer.purchases || 0}</td>
                          <td className="p-4 text-center flex items-center justify-center gap-2">
                             <button onClick={() => setEditingCustomer({...customer, referredByInput: customer.referrerName === 'Ninguém (Direto)' ? '' : customer.referrerName})} className="p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Editar"><Edit size={18} /></button>
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

          {/* TAB: RESERVAS E ENTREGAS */}
          {activeTab === 'reservations' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Reservas e Encomendas</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Crie encomendas manualmente ou aprove pedidos da Loja Online. Ao marcá-las como "Concluídas", entram automaticamente nas Vendas!</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Carrinho de Reservas */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-amber-100 dark:border-gray-700 h-fit transition-colors flex flex-col">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Plus size={20} className="text-amber-600 dark:text-amber-500" /> Nova Encomenda</h3>
                  <form onSubmit={handleFinalizeReservation} className="space-y-4 flex flex-col flex-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Cliente</label>
                      <input list="customers-list" required type="text" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newReservation.name} onChange={e => setNewReservation({...newReservation, name: e.target.value})} placeholder="Escreva ou escolha..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quem indicou? (Opcional)</label>
                      <input list="customers-list" type="text" className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-colors" value={newReservation.referredByInput} onChange={e => setNewReservation({...newReservation, referredByInput: e.target.value})} placeholder="Busque..." />
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
                            <optgroup label="Produtos Individuais">{products.filter(p => p.type === 'single' || !p.type).map(p => <option key={p.id} value={p.id}>{p.name} - R$ {(Number(p.price)||0).toFixed(2)}</option>)}</optgroup>
                            {products.filter(p => p.type === 'combo').length > 0 && <optgroup label="Combos e Promoções">{products.filter(p => p.type === 'combo').map(p => <option key={p.id} value={p.id}>{p.name} ({p.units} un)</option>)}</optgroup>}
                          </>
                        )}
                      </select>
                      <div className="flex items-end gap-2 mb-2">
                         <div className="flex-1">
                           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantidade</label>
                           <input type="number" min="1" className="w-full p-2 bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-600 rounded-lg outline-none text-center text-gray-800 dark:text-gray-200" value={newReservation.quantity} onChange={e => setNewReservation({...newReservation, quantity: e.target.value})} />
                         </div>
                         <button type="button" onClick={handleAddToCartReservation} className="bg-amber-500 text-amber-950 px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-400 transition-colors">+ Adicionar</button>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 mt-2">Observações</label>
                        <input type="text" className="w-full p-2 bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-600 rounded-lg outline-none text-sm text-gray-800 dark:text-gray-200" value={newReservation.observation} onChange={e => setNewReservation({...newReservation, observation: e.target.value})} placeholder="Opcional..." />
                      </div>
                    </div>

                    {reservationCart.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl text-sm border border-gray-200 dark:border-gray-700">
                        <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">Itens na Encomenda:</p>
                        {reservationCart.map((item, i) => (
                          <div key={i} className="flex justify-between items-center text-gray-600 dark:text-gray-400 mb-1 pb-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <div className="flex flex-col">
                               <span>{item.quantity}x {item.productName}</span>
                               {item.observation && <span className="text-[10px] italic">Obs: {item.observation}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">R$ {(Number(item.expectedRevenue)||0).toFixed(2)}</span>
                              <button type="button" onClick={() => setReservationCart(reservationCart.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="submit" className="w-full bg-amber-600 dark:bg-amber-700 text-white py-3 rounded-xl hover:bg-amber-700 dark:hover:bg-amber-600 transition font-bold mt-auto shadow-sm">Guardar Encomenda Completa</button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {/* PEDIDOS DO WHATSAPP (LOJA ONLINE) */}
                  <div className="bg-green-50/50 dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-green-200 dark:border-green-700/50 overflow-hidden transition-colors">
                    <div className="p-4 border-b border-green-200 dark:border-green-700/50 bg-green-100/50 dark:bg-green-900/30 flex justify-between items-center">
                       <h3 className="font-bold text-green-900 dark:text-green-400 flex items-center gap-2"><ShoppingCart size={18}/> 🛒 Pedidos da Loja Online</h3>
                       <span className="text-xs font-bold bg-white dark:bg-gray-900 px-2 py-1 rounded-md text-green-700 dark:text-green-500">{onlineOrders.length} aguardando aprovação</span>
                    </div>
                    <div className="overflow-x-auto max-h-[300px]">
                      <table className="w-full text-left border-collapse">
                        <tbody>
                          {onlineOrders.length === 0 ? (
                            <tr><td colSpan="4" className="p-6 text-center text-sm text-gray-500">Nenhum pedido novo do site.</td></tr>
                          ) : onlineOrders.map((order) => (
                            <tr key={order.id} className="border-b border-green-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-750 transition-colors">
                              <td className="p-3">
                                <div className="flex flex-col gap-0.5">
                                  <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{order.customerName}</p>
                                  <p className="text-[10px] text-gray-500 font-medium">Data Pedido: {new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                                  {order.referredByInput && <p className="text-[10px] text-amber-600 font-bold">🌟 Indicação: {order.referredByInput}</p>}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col gap-1">
                                  {order.cart.map((item, idx) => (
                                    <p key={idx} className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                      {item.qty}x {item.name}
                                      {item.obs && <span className="text-amber-500 italic block"> - Obs: {item.obs}</span>}
                                    </p>
                                  ))}
                                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1 bg-blue-50 dark:bg-blue-900/30 w-fit px-1 rounded">
                                    Entrega: {order.deliveryType === 'unesp' ? `UNESP (${order.period})` : `Casa (${order.address})`} - {new Date(order.deliveryDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                                  </p>
                                </div>
                              </td>
                              <td className="p-3 text-right text-sm font-bold text-green-700 dark:text-green-500">R$ {(Number(order.total)||0).toFixed(2)}</td>
                              <td className="p-3 text-center flex flex-col sm:flex-row items-center justify-center gap-1 mt-2">
                                <button onClick={() => handleApproveOnlineOrder(order)} className="text-white bg-green-500 hover:bg-green-600 px-2 py-1.5 text-xs font-bold rounded shadow-sm transition-colors w-full sm:w-auto">Aprovar</button>
                                <button onClick={() => handleRejectOnlineOrder(order.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 p-1.5 rounded transition-colors w-full sm:w-auto" title="Descartar"><Trash2 size={16} className="mx-auto"/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SEÇÃO 1: PENDENTES (Aprovadas ou Manuais) */}
                  <div className="bg-amber-50/50 dark:bg-gray-800 rounded-2xl shadow-sm border-2 border-amber-200 dark:border-amber-700/50 overflow-hidden transition-colors">
                    <div className="p-4 border-b border-amber-200 dark:border-amber-700/50 bg-amber-100/50 dark:bg-amber-900/30 flex justify-between items-center">
                       <h3 className="font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2"><Clock size={18}/> Encomendas Pendentes</h3>
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-bold bg-white dark:bg-gray-900 px-2 py-1 rounded-md text-amber-700 dark:text-amber-500 hidden sm:block">Filtrar por:</span>
                         <select className="text-xs bg-transparent outline-none font-bold text-amber-900 dark:text-amber-200 cursor-pointer" value={reservationSortBy} onChange={e => setReservationSortBy(e.target.value)}>
                           <option value="date-asc">Data ⬆</option>
                           <option value="date-desc">Data ⬇</option>
                           <option value="name-asc">Nome Cliente (A-Z)</option>
                           <option value="product-asc">Produto (A-Z)</option>
                         </select>
                       </div>
                    </div>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs border-b border-amber-100 dark:border-gray-700">
                            <th className="p-3 font-semibold">Cliente & Pedido</th>
                            <th className="p-3 font-semibold text-center">Data</th>
                            <th className="p-3 font-semibold text-right">Valor</th>
                            <th className="p-3 font-semibold text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedReservations.pending.length === 0 ? (
                            <tr><td colSpan="4" className="p-6 text-center text-sm text-gray-500">Tudo limpo por aqui! Nenhuma encomenda na fila.</td></tr>
                          ) : sortedReservations.pending.map((res) => (
                            <tr key={res.id} className="border-b border-amber-50 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-750 transition-colors">
                              <td className="p-3">
                                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{res.name}</p>
                                
                                {/* A NOVA FORMA ELEGANTE DE MOSTRAR AS OBSERVAÇÕES */}
                                <div className="flex flex-col gap-1 mt-0.5">
                                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{res.quantity}x {res.productName}</p>
                                  {res.observation && (
                                    <span 
                                      className="inline-flex items-center gap-1 w-fit bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-md text-[10px] cursor-help font-bold border border-amber-200 dark:border-amber-700/50"
                                      title={res.observation}
                                    >
                                      <Info size={12} /> Obs. do Pedido
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center text-xs font-bold text-amber-700 dark:text-amber-500">{res.date ? new Date(res.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                              <td className="p-3 text-right text-sm font-bold text-gray-700 dark:text-gray-300">R$ {(Number(res.expectedRevenue)||0).toFixed(2)}</td>
                              <td className="p-3 text-center flex items-center justify-center gap-1 mt-2">
                                <button onClick={() => handleUpdateReservationStatus(res.id, 'completed')} className="text-green-600 dark:text-green-500 hover:bg-green-100 dark:hover:bg-gray-700 p-1.5 rounded transition-colors" title="Concluir (Envia Venda)"><CheckCircle size={18}/></button>
                                <button onClick={() => {
                                  const referrer = customers.find(c => c.id === res.referredBy);
                                  setEditingReservation({...res, referredByInput: referrer ? referrer.name : ''});
                                }} className="text-amber-600 hover:bg-amber-100 dark:hover:bg-gray-700 p-1.5 rounded transition-colors" title="Editar"><Edit size={16}/></button>
                                <button onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')} className="text-red-500 hover:bg-red-100 dark:hover:bg-gray-700 p-1.5 rounded transition-colors" title="Cancelar"><XCircle size={18}/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SEÇÃO 2: HISTÓRICO (Efetivadas/Canceladas) */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors opacity-80 hover:opacity-100">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                       <h3 className="font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2 text-sm"><History size={16}/> Histórico de Encomendas</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[250px]">
                      <table className="w-full text-left border-collapse">
                        <tbody>
                          {sortedReservations.past.length === 0 ? (
                            <tr><td className="p-4 text-center text-xs text-gray-400">Nenhum histórico.</td></tr>
                          ) : sortedReservations.past.map((res) => (
                            <tr key={res.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="p-3">
                                <p className="font-medium text-xs text-gray-700 dark:text-gray-300">{res.name} <span className="text-gray-400">({res.quantity}x {res.productName})</span></p>
                              </td>
                              <td className="p-3 text-center">
                                {res.status === 'completed' ? <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">Concluída</span> : <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">Cancelada</span>}
                              </td>
                              <td className="p-3 text-right">
                                <button onClick={() => {
                                  const referrer = customers.find(c => c.id === res.referredBy);
                                  setEditingReservation({...res, referredByInput: referrer ? referrer.name : ''});
                                }} className="text-gray-400 hover:text-amber-500 p-1 rounded" title="Editar Histórico"><Edit size={14}/></button>
                                <button onClick={() => handleDeleteReservation(res.id)} className="text-gray-400 hover:text-red-500 p-1 rounded" title="Excluir Definitivamente"><Trash2 size={14}/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB: REDE */}
          {activeTab === 'network' && (
            <div className="max-w-5xl mx-auto h-full flex flex-col animate-in fade-in duration-300">
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
                      <NetworkNode key={root.id} customer={root} customers={customers} isRoot={true} />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUGESTÕES */}
          {activeTab === 'suggestions' && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Ideias & Sugestões</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Anote feedbacks e processe sugestões enviadas pelos seus clientes no site.</p>
                </div>
              </div>

              {/* IDEIAS PENDENTES DA LOJA ONLINE */}
              {onlineSuggestions.length > 0 && (
                 <div className="bg-blue-50 dark:bg-gray-800 rounded-3xl shadow-sm border-2 border-blue-200 dark:border-blue-800/50 p-6 mb-8 transition-colors">
                    <h3 className="text-xl font-bold text-blue-900 dark:text-blue-400 flex items-center gap-2 mb-4">
                      <MessageSquarePlus size={22}/> Sugestões do Público ({onlineSuggestions.length})
                    </h3>
                    <div className="space-y-4">
                       {onlineSuggestions.map(pubSug => {
                          const match = suggestions.find(s => s.type === pubSug.type && ( (s.text||'').toLowerCase().includes((pubSug.text||'').toLowerCase()) || (pubSug.text||'').toLowerCase().includes((s.text||'').toLowerCase()) ));
                          return (
                             <div key={pubSug.id} className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-blue-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                <div>
                                   <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1 block">{(pubSug.name || 'Anónimo').trim()} enviou:</span>
                                   <p className="text-gray-800 dark:text-gray-200 font-medium">"{pubSug.text}"</p>
                                </div>
                                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                   {match ? (
                                      <div className="flex flex-col items-end w-full">
                                         <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-1">⚠️ Parecido com: "{match.text}"</p>
                                         <div className="flex gap-2 w-full md:w-auto">
                                            <button onClick={() => handleApprovePublicSuggestion(pubSug, false)} className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-lg transition-colors">Criar Nova Separada</button>
                                            <button onClick={() => handleApprovePublicSuggestion(pubSug, true, match.id)} className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg transition-colors flex items-center gap-1 justify-center"><ThumbsUp size={14}/> Votar na Existente (+1)</button>
                                            <button onClick={() => handleRejectPublicSuggestion(pubSug.id)} className="text-xs bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-500 py-2 px-3 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                         </div>
                                      </div>
                                   ) : (
                                      <div className="flex gap-2 w-full md:w-auto">
                                         <button onClick={() => handleApprovePublicSuggestion(pubSug, false)} className="flex-1 text-xs bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Aprovar como Nova</button>
                                         <button onClick={() => handleRejectPublicSuggestion(pubSug.id)} className="text-xs bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-500 py-2 px-3 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                      </div>
                                   )}
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>
              )}

              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-amber-100 dark:border-gray-700 mb-8 flex flex-col gap-4 transition-colors">
                <form onSubmit={handleAddSuggestion} className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descreva a ideia (Admin)...</label>
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

          {/* INDICADORES GLOBAIS NO RODAPÉ */}
          <div className="fixed bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center">
             {showFooterDetails && (
               <div className="mb-2 bg-gray-800 dark:bg-gray-900 border border-gray-700 shadow-2xl rounded-2xl p-5 text-sm text-gray-200 w-80 animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center gap-2 font-bold text-white mb-3 border-b border-gray-700 pb-2">
                   <Info size={16} className="text-amber-400" /> Resumo Financeiro
                 </div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Receita Total <span className="text-[10px] block">Todas as Vendas</span></span>
                    <span className="text-green-400 font-bold">R$ {(Number(globalMetrics.totalRevenue)||0).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Custo Histórico <span className="text-[10px] block">Ficha Técnica ({(Number(globalMetrics.totalCookiesSold)||0)} un.)</span></span>
                    <span className="text-red-400 font-bold">-R$ {(Number(globalMetrics.totalEstimatedCost)||0).toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between mt-2 pt-2 border-t border-gray-700 mb-3">
                    <span className="font-bold text-white">Lucro Real (Histórico)</span>
                    <span className="text-amber-400 font-black text-lg">R$ {(Number(globalMetrics.totalEstimatedProfit)||0).toFixed(2)}</span>
                 </div>
                 <div className="bg-gray-900 rounded-xl p-3 border border-gray-700">
                    <span className="text-gray-400 text-xs block mb-1">Custo para bater +1 receita hoje (Mercado):</span>
                    <span className="text-red-400 font-bold block text-right">R$ {(Number(missingCostForOneBatch)||0).toFixed(2)}</span>
                 </div>
               </div>
             )}

             <button 
               onMouseEnter={() => setShowFooterDetails(true)}
               onMouseLeave={() => setShowFooterDetails(false)}
               onClick={() => setShowFooterDetails(!showFooterDetails)}
               className="bg-gray-900 dark:bg-black/90 backdrop-blur-md border border-gray-700/50 shadow-[0_10px_40px_rgba(0,0,0,0.3)] hover:border-amber-500/50 rounded-2xl px-6 py-3 flex items-center justify-between gap-4 md:gap-8 text-white w-[90vw] max-w-lg md:w-auto whitespace-nowrap overflow-x-auto transition-all cursor-help"
             >
               <div className="flex flex-col items-center">
                 <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Faturamento</span>
                 <span className="font-black text-green-400">R$ {(Number(globalMetrics.totalRevenue)||0).toFixed(2)}</span>
               </div>
               <div className="h-6 w-px bg-gray-700/50"></div>
               <div className="flex flex-col items-center">
                 <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Custo Reposição</span>
                 <span className="font-black text-red-400">-R$ {(Number(missingCostForOneBatch)||0).toFixed(2)}</span>
               </div>
               <div className="h-6 w-px bg-gray-700/50"></div>
               <div className="flex flex-col items-center">
                 <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Lucro Líquido</span>
                 <span className="font-black text-amber-400 flex items-center gap-1">R$ {(Number(globalMetrics.totalEstimatedProfit)||0).toFixed(2)} <Info size={12} className="text-gray-500 hidden md:block" /></span>
               </div>
             </button>
          </div>

          {/* MODAL: EDITAR CLIENTE */}
          {editingCustomer && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-amber-50 dark:bg-gray-900">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Edit size={18} className="text-amber-600"/> Editar Cliente</h3>
                  <button onClick={() => setEditingCustomer(null)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveEditCustomer} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome</label>
                    <input type="text" required className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-800 dark:text-gray-200" value={editingCustomer.name} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Qtd. Compras</label>
                    <input type="number" min="0" required className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-800 dark:text-gray-200" value={editingCustomer.purchases} onChange={e => setEditingCustomer({...editingCustomer, purchases: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Quem indicou? (Opcional)</label>
                    <input list="customers-list" type="text" className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-800 dark:text-gray-200" value={editingCustomer.referredByInput !== undefined ? editingCustomer.referredByInput : ''} onChange={e => setEditingCustomer({...editingCustomer, referredByInput: e.target.value})} placeholder="Busque ou apague para remover..." />
                  </div>
                  <button type="submit" className="w-full bg-amber-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-amber-700">Salvar Alterações</button>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: EDITAR RESERVA/ENCOMENDA */}
          {editingReservation && (
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-amber-50 dark:bg-gray-900">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Edit size={18} className="text-amber-600"/> Editar Encomenda</h3>
                  <button onClick={() => setEditingReservation(null)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveEditReservation} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cliente</label>
                    <input type="text" required className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-800 dark:text-gray-200" value={editingReservation.name} onChange={e => handleEditReservationChange('name', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Quem indicou? (Opcional)</label>
                    <input list="customers-list" type="text" className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-800 dark:text-gray-200" value={editingReservation.referredByInput !== undefined ? editingReservation.referredByInput : ''} onChange={e => handleEditReservationChange('referredByInput', e.target.value)} placeholder="Busque ou apague para remover..." />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2/3">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Produto</label>
                      <select className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm text-gray-800 dark:text-gray-200" value={editingReservation.productId} onChange={e => handleEditReservationChange('productId', e.target.value)}>
                        <option value="avulso">Produto Avulso</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="w-1/3">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Qtd</label>
                      <input type="number" min="1" required className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-center text-gray-800 dark:text-gray-200" value={editingReservation.quantity} onChange={e => handleEditReservationChange('quantity', e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-1/2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Data Entrega</label>
                      <input type="date" className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-800 dark:text-gray-200 [&::-webkit-calendar-picker-indicator]:dark:invert" value={editingReservation.date} onChange={e => handleEditReservationChange('date', e.target.value)} />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                      <select className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm text-gray-800 dark:text-gray-200" value={editingReservation.status} onChange={e => handleEditReservationChange('status', e.target.value)}>
                        <option value="pending">⏳ Pendente</option>
                        <option value="completed">✅ Concluída</option>
                        <option value="cancelled">❌ Cancelada</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Observações</label>
                    <input type="text" className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-gray-800 dark:text-gray-200" value={editingReservation.observation || ''} onChange={e => handleEditReservationChange('observation', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Valor Cobrado (R$)</label>
                    <input type="number" step="0.5" required className="w-full p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg outline-none font-bold text-amber-700 dark:text-amber-400" value={editingReservation.expectedRevenue} onChange={e => handleEditReservationChange('expectedRevenue', e.target.value)} />
                  </div>
                  <button type="submit" className="w-full bg-amber-600 text-white font-bold py-3 rounded-xl mt-2 hover:bg-amber-700 shadow-sm">Salvar Alterações</button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
