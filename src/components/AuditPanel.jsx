import { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  RefreshCw, 
  Trash2, 
  Shield, 
  FileText, 
  Download, 
  Eye, 
  LogOut, 
  LogIn, 
  X,
  Users,
  Activity
} from 'lucide-react';

export default function AuditPanel({ 
  logs = [], 
  loading = false, 
  onRefresh, 
  onClearLogs, 
  isMock = false 
}) {
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');

  // Obter usuários únicos presentes nos logs para o filtro dropdown
  const uniqueUsers = useMemo(() => {
    const map = new Map();
    logs.forEach(log => {
      if (log.userEmail) {
        map.set(log.userEmail, log.userName || log.userEmail.split('@')[0]);
      }
    });
    return Array.from(map.entries()).map(([email, name]) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  // Filtrar logs de acordo com pesquisa, usuário, ação e período
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logSearchText = `${log.userName} ${log.userEmail} ${log.action} ${log.details?.fileName || ''} ${log.details?.commissionBox || ''}`.toLowerCase();
      const matchesSearch = !search || logSearchText.includes(search.toLowerCase());
      
      const matchesUser = !userFilter || log.userEmail === userFilter;
      const matchesAction = !actionFilter || log.action === actionFilter;
      
      let matchesPeriod = true;
      if (periodFilter && periodFilter !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now();
        if (periodFilter === '24h') {
          matchesPeriod = now - logTime <= 24 * 3600 * 1000;
        } else if (periodFilter === '7d') {
          matchesPeriod = now - logTime <= 7 * 24 * 3600 * 1000;
        } else if (periodFilter === '30d') {
          matchesPeriod = now - logTime <= 30 * 24 * 3600 * 1000;
        }
      }
      
      return matchesSearch && matchesUser && matchesAction && matchesPeriod;
    });
  }, [logs, search, userFilter, actionFilter, periodFilter]);

  // Estatísticas calculadas sobre todos os logs carregados
  const stats = useMemo(() => {
    const total = logs.length;
    const uploads = logs.filter(l => l.action === 'CONTRACT_UPLOAD').length;
    const views = logs.filter(l => l.action === 'CONTRACT_VIEW_TOGGLE' && l.details?.status === 'viewed').length;
    const downloads = logs.filter(l => l.action === 'CONTRACT_DOWNLOAD').length;
    
    // Obter quantidade de e-mails únicos
    const activeUsers = new Set(logs.map(l => l.userEmail).filter(Boolean)).size;

    return {
      total,
      uploads,
      viewsAndDownloads: views + downloads,
      activeUsers
    };
  }, [logs]);

  const hasActiveFilters = search || userFilter || actionFilter || periodFilter !== 'all';

  const handleClearFilters = () => {
    setSearch('');
    setUserFilter('');
    setActionFilter('');
    setPeriodFilter('all');
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionConfig = (action) => {
    switch (action) {
      case 'LOGIN': 
        return { text: 'Login', className: 'badge-audit-login', icon: LogIn };
      case 'LOGOUT': 
        return { text: 'Logout', className: 'badge-audit-logout', icon: LogOut };
      case 'CONTRACT_UPLOAD': 
        return { text: 'Envio', className: 'badge-audit-upload', icon: FileText };
      case 'CONTRACT_DELETE': 
        return { text: 'Exclusão', className: 'badge-audit-delete', icon: Trash2 };
      case 'CONTRACT_DOWNLOAD': 
        return { text: 'Download', className: 'badge-audit-download', icon: Download };
      case 'CONTRACT_VIEW_TOGGLE': 
        return { text: 'Visualização', className: 'badge-audit-view', icon: Eye };
      default: 
        return { text: action, className: 'badge-audit-default', icon: Shield };
    }
  };

  const renderDetailMessage = (log) => {
    const { action, details } = log;
    switch (action) {
      case 'LOGIN':
        return 'Entrou no sistema.';
      case 'LOGOUT':
        return 'Saiu do sistema.';
      case 'CONTRACT_UPLOAD':
        return (
          <span>
            Fez upload do contrato <strong className="audit-highlight-file">{details.fileName}</strong> ({details.fileSize}) para o <strong className="audit-highlight-box">{details.commissionBox}</strong> no valor de <strong>{details.payment ? details.payment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</strong>.
          </span>
        );
      case 'CONTRACT_DELETE':
        return (
          <span>
            Excluiu permanentemente o contrato <strong className="audit-highlight-delete">{details.fileName}</strong> do servidor.
          </span>
        );
      case 'CONTRACT_DOWNLOAD':
        return (
          <span>
            Baixou o arquivo do contrato <strong className="audit-highlight-file">{details.fileName}</strong>.
          </span>
        );
      case 'CONTRACT_VIEW_TOGGLE': {
        const isViewed = details.status === 'viewed';
        return (
          <span>
            Marcou o contrato <strong className="audit-highlight-file">{details.fileName}</strong> como <strong className={isViewed ? 'audit-status-read' : 'audit-status-unread'}>{isViewed ? 'Visualizado' : 'Não Lido'}</strong>.
          </span>
        );
      }
      default:
        return `Executou uma ação no sistema: ${action}`;
    }
  };

  return (
    <main className="main-content">
      {/* Cabeçalho do Painel */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Painel de Auditoria</h1>
          <p>Rastreabilidade de ações, visualizações de contratos e logs do sistema.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={onRefresh} 
            disabled={loading} 
            title="Atualizar Logs"
            style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          
          {isMock && (
            <button 
              className="btn-clear-logs" 
              onClick={onClearLogs}
              title="Limpar logs locais"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Trash2 size={18} />
              <span>Limpar Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="audit-stats-grid">
        <div className="audit-stat-card">
          <div className="stat-card-icon stat-icon-total">
            <Activity size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Total de Eventos</span>
            <h2 className="stat-card-value">{stats.total}</h2>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="stat-card-icon stat-icon-upload">
            <FileText size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Contratos Enviados</span>
            <h2 className="stat-card-value">{stats.uploads}</h2>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="stat-card-icon stat-icon-action">
            <Eye size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Leituras & Downloads</span>
            <h2 className="stat-card-value">{stats.viewsAndDownloads}</h2>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="stat-card-icon stat-icon-user">
            <Users size={24} />
          </div>
          <div className="stat-card-content">
            <span className="stat-card-label">Usuários Ativos</span>
            <h2 className="stat-card-value">{stats.activeUsers}</h2>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-card">
        <div className="filters-grid">
          {/* Busca Textual */}
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por arquivo, usuário ou ação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro: Tipo de Ação */}
          <div className="filter-select-container">
            <select
              className="filter-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">Ação (Todas)</option>
              <option value="CONTRACT_UPLOAD">Upload de Contrato</option>
              <option value="CONTRACT_VIEW_TOGGLE">Alteração de Visualização</option>
              <option value="CONTRACT_DOWNLOAD">Download de Arquivo</option>
              <option value="CONTRACT_DELETE">Exclusão de Contrato</option>
              <option value="LOGIN">Sessão: Login</option>
              <option value="LOGOUT">Sessão: Logout</option>
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>

          {/* Filtro: Usuário */}
          <div className="filter-select-container">
            <select
              className="filter-select"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="">Usuário (Todos)</option>
              {uniqueUsers.map(u => (
                <option key={u.email} value={u.email}>{u.name} ({u.email})</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>

          {/* Filtro: Período */}
          <div className="filter-select-container">
            <select
              className="filter-select"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
            >
              <option value="all">Período (Tudo)</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>
        </div>

        {hasActiveFilters && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button className="btn-clear-filters" onClick={handleClearFilters}>
              <X size={16} />
              <span>Limpar Filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Eventos */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', gap: '12px', alignItems: 'center' }}>
          <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <span>Carregando logs de auditoria...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="empty-state">
          <Shield size={48} strokeWidth={1.5} />
          <h3>Nenhum log de auditoria encontrado</h3>
          <p>
            {hasActiveFilters 
              ? 'Tente alterar as opções de filtragem ou busca.' 
              : 'Nenhum log foi registrado no sistema ainda.'}
          </p>
          {hasActiveFilters && (
            <button className="btn-primary" style={{ width: 'auto', marginTop: '8px' }} onClick={handleClearFilters}>
              Limpar Filtros e Ver Todos
            </button>
          )}
        </div>
      ) : (
        <div className="audit-table-container">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Detalhes da Atividade</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const config = getActionConfig(log.action);
                const IconComponent = config.icon;
                
                return (
                  <tr key={log.id} className="audit-row">
                    <td className="audit-time-cell">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="audit-user-cell">
                      <div className="audit-user-info">
                        <span className="audit-user-name">{log.userName}</span>
                        <span className="audit-user-email">{log.userEmail}</span>
                      </div>
                    </td>
                    <td className="audit-action-cell">
                      <span className={`audit-badge ${config.className}`}>
                        <IconComponent size={12} style={{ marginRight: '4px' }} />
                        {config.text}
                      </span>
                    </td>
                    <td className="audit-details-cell">
                      {renderDetailMessage(log)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
