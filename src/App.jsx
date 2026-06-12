import { useState, useEffect, useCallback } from 'react';
import { 
  isMockMode, 
  login, 
  logout, 
  onAuthStateChanged, 
  getContracts, 
  uploadContract, 
  deleteContract, 
  downloadContractFile,
  toggleContractViewed,
  logger,
  addAuditLog,
  getAuditLogs,
  clearMockAuditLogs
} from './firebase';

import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import AuditPanel from './components/AuditPanel';
import { RefreshCw, Play } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [viewedContractIds, setViewedContractIds] = useState([]);
  const [scale, setScale] = useState(() => {
    const saved = localStorage.getItem('contractus-scale');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [activeTab, setActiveTab] = useState('contracts');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--scale-factor', scale);
    localStorage.setItem('contractus-scale', scale);
  }, [scale]);

  // 1. Monitorar o estado de autenticação do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setViewedContractIds(currentUser.viewedContracts || []);
      } else {
        setViewedContractIds([]);
      }
      setAppReady(true);
    });

    return () => unsubscribe();
  }, []);

  // 2. Buscar contratos quando o usuário estiver logado
  const fetchContracts = useCallback(async () => {
    if (!user) return;
    await Promise.resolve();
    setLoadingContracts(true);
    try {
      const data = await getContracts(user);
      setContracts(data);
    } catch (err) {
      logger.error("Erro ao carregar contratos:", err);
      alert("Falha ao obter os contratos do banco de dados.");
    } finally {
      setLoadingContracts(false);
    }
  }, [user]);

  const fetchAuditLogs = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    await Promise.resolve();
    setLoadingAudit(true);
    try {
      const logsData = await getAuditLogs();
      setAuditLogs(logsData);
    } catch (err) {
      logger.error("Erro ao carregar logs de auditoria:", err);
    } finally {
      setLoadingAudit(false);
    }
  }, [user]);

  const handleClearAuditLogs = async () => {
    if (confirm("Tem certeza que deseja redefinir os logs de auditoria locais?")) {
      await clearMockAuditLogs();
      await fetchAuditLogs();
    }
  };

  useEffect(() => {
    let timer;
    if (user) {
      timer = setTimeout(() => {
        fetchContracts();
        if (user.role === 'admin' && activeTab === 'audit') {
          fetchAuditLogs();
        }
      }, 0);
    } else {
      timer = setTimeout(() => {
        setContracts([]);
        setAuditLogs([]);
        setActiveTab('contracts');
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, activeTab, fetchContracts, fetchAuditLogs]);

  // Buscar logs de auditoria quando alternar para a aba correspondente
  useEffect(() => {
    if (user && activeTab === 'audit' && user.role === 'admin') {
      const timer = setTimeout(() => {
        fetchAuditLogs();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, activeTab, fetchAuditLogs]);

  // 3. Ações do sistema
  const handleLogin = async (email, password) => {
    const loggedInUser = await login(email, password);
    await addAuditLog(loggedInUser, 'LOGIN', { method: 'email' });
    return loggedInUser;
  };

  const handleLogout = async () => {
    if (confirm("Tem certeza que deseja sair do portal?")) {
      try {
        await addAuditLog(user, 'LOGOUT', {});
        await logout();
      } catch (err) {
        logger.error("Erro ao deslogar:", err);
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
      const newContract = await uploadContract(file, metadataWithUser, onProgress);
      
      await addAuditLog(user, 'CONTRACT_UPLOAD', {
        contractId: newContract.id,
        fileName: newContract.fileName,
        fileSize: newContract.fileSize,
        payment: newContract.payment,
        commissionBox: newContract.commissionBox
      });

      // Recarregar lista após upload bem-sucedido
      await fetchContracts();
    } catch (err) {
      throw new Error(err.message || "Erro no envio do arquivo.", { cause: err });
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
        
        await addAuditLog(user, 'CONTRACT_DELETE', {
          contractId: contract.id,
          fileName: contract.fileName
        });

        // Atualizar lista após remoção
        setContracts(prev => prev.filter(c => c.id !== contract.id));
      } catch (err) {
        logger.error("Erro ao excluir contrato:", err);
        alert("Não foi possível excluir o contrato. Tente novamente.");
      }
    }
  };

  const handleDownload = async (contract) => {
    try {
      await downloadContractFile(contract);
      
      await addAuditLog(user, 'CONTRACT_DOWNLOAD', {
        contractId: contract.id,
        fileName: contract.fileName
      });

      if (!viewedContractIds.includes(contract.id)) {
        const updated = await toggleContractViewed(user, contract.id, false);
        setViewedContractIds(updated);
      }
    } catch (err) {
      logger.error("Erro no download:", err);
      alert("Erro ao tentar baixar o arquivo.");
    }
  };

  const handleToggleView = async (contract) => {
    if (!user) return;
    const isCurrentlyViewed = viewedContractIds.includes(contract.id);
    try {
      const updated = await toggleContractViewed(user, contract.id, isCurrentlyViewed);
      setViewedContractIds(updated);
      
      await addAuditLog(user, 'CONTRACT_VIEW_TOGGLE', {
        contractId: contract.id,
        fileName: contract.fileName,
        status: isCurrentlyViewed ? 'unviewed' : 'viewed'
      });
    } catch (err) {
      logger.error("Erro ao alternar status de visualização:", err);
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
        <Login onLogin={handleLogin} isMock={isMockMode} scale={scale} setScale={setScale} />
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

      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        scale={scale} 
        setScale={setScale} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      {activeTab === 'audit' && user.role === 'admin' ? (
        <AuditPanel 
          logs={auditLogs}
          loading={loadingAudit}
          onRefresh={fetchAuditLogs}
          onClearLogs={handleClearAuditLogs}
          isMock={isMockMode}
        />
      ) : (
        <Dashboard 
          user={user}
          contracts={contracts}
          viewedContractIds={viewedContractIds}
          onToggleView={handleToggleView}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onOpenUploadModal={() => setIsUploadOpen(true)}
          loading={loadingContracts}
          onRefresh={fetchContracts}
        />
      )}

      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
}
