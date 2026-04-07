import React, { useState, useEffect } from 'react';
// 1. Imports de Bibliotecas e Configuração
import { auth, db } from './firebase'; // O arquivo que criamos no Bloco 1
import { onAuthStateChanged, signOut } from 'firebase/auth';

// 2. Imports de Hooks (A lógica que tiramos do arquivo)
import { useBusinessData } from './hooks/useBusinessData';
import { useFirebaseData } from './hooks/useFirebaseData'; // Sugestão de criar este para buscar os dados

// 3. Imports de Componentes e Telas
import { Sidebar } from './components/Sidebar';
import DashboardView from './views/DashboardView';
import InventoryView from './views/InventoryView';
import LoginView from './views/LoginView'; // Caso queira separar o login também
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  // --- ESTADOS DE NAVEGAÇÃO E AUTENTICAÇÃO ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // --- BUSCA DE DADOS (Firebase) ---
  // Aqui você mantém os estados brutos ou usa um hook personalizado
  const { 
    sales, customers, ingredients, products, 
    recipeConfig, onlineOrders, goals, setGoals 
  } = useFirebaseData(); 

  // --- LÓGICA DE NEGÓCIO (O "Cérebro" que criamos) ---
  const businessData = useBusinessData(
    sales, customers, ingredients, products, recipeConfig
  );

  // --- FUNÇÕES DE AÇÃO (Handlers) ---
  const handleLogout = () => signOut(auth);

  const dashboardActions = {
    handleFinalizeQuickSale: async (e) => { /* sua lógica aqui */ },
    handleApproveOnlineOrder: async (order) => { /* sua lógica aqui */ },
    // ... agrupe as outras funções aqui
  };

  // --- CONTROLE DE ACESSO ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginView />;

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <div className={`${darkMode ? 'dark' : ''} flex h-screen bg-[#FFF8F0] dark:bg-[#1A0F0A]`}>
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        handleLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 transition-colors duration-300">
        
        {/* Renderização Condicional das Telas */}
        
        {activeTab === 'dashboard' && (
          <DashboardView 
            {...businessData}        // Passa métricas, lucros, etc.
            {...dashboardActions}     // Passa as funções de clique
            goals={goals}            // Passa estados específicos
            setGoals={setGoals}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView 
            inventoryCheck={businessData.inventoryCheck}
            recipeConfig={recipeConfig}
            // ... outras props de estoque
          />
        )}

        {/* Adicione as outras abas seguindo o mesmo padrão */}

      </main>
    </div>
  );
}
