import React, { useState, useEffect } from 'react';
import { 
  isMockMode, 
  login, 
  logout, 
  onAuthStateChanged, 
  getContracts, 
  uploadContract, 
  deleteContract, 
  downloadContractFile 
} from './firebase';

import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import { RefreshCw, Play } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // 1. Monitorar o estado de autenticação do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAppReady(true);
    });

    return () => unsubscribe();
  }, []);

  // 2. Buscar contratos quando o usuário estiver logado
  const fetchContracts = async () => {
    if (!user) return;
    setLoadingContracts(true);
    try {
      const data = await getContracts(user);
      setContracts(data);
    } catch (err) {
      console.error("Erro ao carregar contratos:", err);
      alert("Falha ao obter os contratos do banco de dados.");
    } finally {
      setLoadingContracts(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchContracts();
    } else {
      setContracts([]);
    }
  }, [user]);

  // 3. Ações do sistema
  const handleLogin = async (email, password) => {
    return await login(email, password);
  };

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair do portal?")) {
      try {
        await logout();
      } catch (err) {
        console.error("Erro ao deslogar:", err);
      }
    }
  };

  const handleUpload = async (file, metadata, onProgress) => {
    try {
      // Adicionar UID do usuário que está enviando
      const metadataWithUser = {
        ...metadata,
        uploadedBy: user.uid
      };
      await uploadContract(file, metadataWithUser, onProgress);
      // Recarregar lista após upload bem-sucedido
      await fetchContracts();
    } catch (err) {
      throw new Error(err.message || "Erro no envio do arquivo.");
    }
  };

  const handleDelete = async (contract) => {
    const confirmation = confirm(
      `ATENÇÃO: Tem certeza que deseja apagar o contrato "${contract.fileName}"?\n` +
      `Esta ação é permanente e removerá o arquivo do servidor.`
    );
    
    if (confirmation) {
      try {
        await deleteContract(contract, user);
        // Atualizar lista após remoção
        setContracts(prev => prev.filter(c => c.id !== contract.id));
      } catch (err) {
        console.error("Erro ao excluir contrato:", err);
        alert("Não foi possível excluir o contrato. Tente novamente.");
      }
    }
  };

  const handleDownload = (contract) => {
    try {
      downloadContractFile(contract);
    } catch (err) {
      console.error("Erro no download:", err);
      alert("Erro ao tentar baixar o arquivo.");
    }
  };

  // Carregamento inicial do app (evita tela em branco piscando)
  if (!appReady) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)',
        color: '#f8fafc',
        gap: '16px'
      }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <span style={{ fontFamily: 'var(--font-title)', fontWeight: 500 }}>Inicializando Contractus...</span>
      </div>
    );
  }

  // Se não estiver logado, exibe tela de Login
  if (!user) {
    return (
      <div className="app-container">
        {isMockMode && (
          <div className="demo-banner">
            <Play size={16} fill="currentColor" />
            <span>MODO DE SIMULAÇÃO LOCAL (DADOS OFFLINE)</span>
          </div>
        )}
        <Login onLogin={handleLogin} isMock={isMockMode} />
      </div>
    );
  }

  // Usuário logado: Painel principal
  return (
    <div className="app-container">
      {/* Banner informando modo local */}
      {isMockMode && (
        <div className="demo-banner">
          <Play size={16} fill="currentColor" />
          <span>RODANDO EM MODO DE SIMULAÇÃO LOCAL - OS DADOS SERÃO PERDIDOS AO REINICIAR O NAVEGADOR</span>
        </div>
      )}

      <Navbar user={user} onLogout={handleLogout} />

      <Dashboard 
        user={user}
        contracts={contracts}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onOpenUploadModal={() => setIsUploadOpen(true)}
        loading={loadingContracts}
        onRefresh={fetchContracts}
      />

      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
}
