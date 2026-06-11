import React, { useState, useMemo } from 'react';
import { Search, Download, Trash2, Plus, FileText, ChevronDown, RefreshCw, X, Eye, EyeOff } from 'lucide-react';

export default function Dashboard({ 
  user, 
  contracts, 
  viewedContractIds = [],
  onToggleView,
  onDownload, 
  onDelete, 
  onOpenUploadModal, 
  loading, 
  onRefresh 
}) {
  const [search, setSearch] = useState('');
  const [filterCityCreated, setFilterCityCreated] = useState('');
  const [filterCityFashion, setFilterCityFashion] = useState('');
  const [filterCommissionBox, setFilterCommissionBox] = useState('');
  const [filterViewStatus, setFilterViewStatus] = useState('');

  // Obter listas únicas para os seletores de filtros
  const uniqueCitiesCreated = useMemo(() => {
    const list = contracts.map(c => c.cityCreated).filter(Boolean);
    return [...new Set(list)].sort();
  }, [contracts]);

  const uniqueCitiesFashion = useMemo(() => {
    const list = contracts.map(c => c.cityFashionDay).filter(Boolean);
    return [...new Set(list)].sort();
  }, [contracts]);

  const uniqueCommissionBoxes = useMemo(() => {
    const list = contracts.map(c => c.commissionBox).filter(Boolean);
    return [...new Set(list)].sort();
  }, [contracts]);

  // Filtrar contratos de acordo com busca, seletores e status de visualização
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      const matchesSearch = 
        contract.fileName.toLowerCase().includes(search.toLowerCase()) ||
        contract.cityCreated.toLowerCase().includes(search.toLowerCase()) ||
        contract.cityFashionDay.toLowerCase().includes(search.toLowerCase()) ||
        contract.commissionBox.toLowerCase().includes(search.toLowerCase());

      const matchesCityCreated = !filterCityCreated || contract.cityCreated === filterCityCreated;
      const matchesCityFashion = !filterCityFashion || contract.cityFashionDay === filterCityFashion;
      const matchesCommission = !filterCommissionBox || contract.commissionBox === filterCommissionBox;

      const isViewed = viewedContractIds.includes(contract.id);
      const matchesViewStatus = 
        !filterViewStatus || 
        (filterViewStatus === 'viewed' && isViewed) || 
        (filterViewStatus === 'unviewed' && !isViewed);

      return matchesSearch && matchesCityCreated && matchesCityFashion && matchesCommission && matchesViewStatus;
    });
  }, [contracts, search, filterCityCreated, filterCityFashion, filterCommissionBox, filterViewStatus, viewedContractIds]);

  const hasActiveFilters = search || filterCityCreated || filterCityFashion || filterCommissionBox || filterViewStatus;

  const handleClearFilters = () => {
    setSearch('');
    setFilterCityCreated('');
    setFilterCityFashion('');
    setFilterCommissionBox('');
    setFilterViewStatus('');
  };

  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <main className="main-content">
      {/* Cabeçalho do Painel */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Central de Contratos</h1>
          <p>Consulte, filtre e faça download dos contratos com segurança.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={onRefresh} 
            disabled={loading} 
            title="Atualizar lista"
            style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          
          {user.role === 'admin' && (
            <button className="btn-upload-trigger" onClick={onOpenUploadModal}>
              <Plus size={20} strokeWidth={2.5} />
              <span>Adicionar Contrato</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="filters-card">
        <div className="filters-grid">
          {/* Busca Global */}
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome, cidade ou caixa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro: Status de Visualização */}
          <div className="filter-select-container">
            <select
              className="filter-select"
              value={filterViewStatus}
              onChange={(e) => setFilterViewStatus(e.target.value)}
            >
              <option value="">Status (Todos)</option>
              <option value="unviewed">Não Visualizados</option>
              <option value="viewed">Visualizados</option>
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>

          {/* Filtro: Cidade Feito */}
          <div className="filter-select-container">
            <select
              className="filter-select"
              value={filterCityCreated}
              onChange={(e) => setFilterCityCreated(e.target.value)}
            >
              <option value="">Cidade de Origem (Todas)</option>
              {uniqueCitiesCreated.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>

          {/* Filtro: Cidade Fashion Day */}
          <div className="filter-select-container">
            <select
              className="filter-select"
              value={filterCityFashion}
              onChange={(e) => setFilterCityFashion(e.target.value)}
            >
              <option value="">Cidade Fashion Day (Todas)</option>
              {uniqueCitiesFashion.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>

          {/* Filtro: Caixa */}
          <div className="filter-select-container">
            <select
              className="filter-select"
              value={filterCommissionBox}
              onChange={(e) => setFilterCommissionBox(e.target.value)}
            >
              <option value="">Caixa Pagamento (Todos)</option>
              {uniqueCommissionBoxes.map(box => (
                <option key={box} value={box}>{box}</option>
              ))}
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

      {/* Conteúdo: Listagem de Contratos */}
      {loading && contracts.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', gap: '12px', alignItems: 'center' }}>
          <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--primary)' }} />
          <span>Carregando contratos...</span>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} strokeWidth={1.5} />
          <h3>Nenhum contrato encontrado</h3>
          <p>
            {hasActiveFilters 
              ? 'Tente mudar os filtros de busca para encontrar o que procura.' 
              : 'Nenhum contrato foi enviado para o sistema ainda.'}
          </p>
          {hasActiveFilters && (
            <button className="btn-primary" style={{ width: 'auto', marginTop: '8px' }} onClick={handleClearFilters}>
              Limpar Filtros e Ver Todos
            </button>
          )}
        </div>
      ) : (
        <div className="contracts-grid">
          {filteredContracts.map(contract => (
            <div key={contract.id} className="contract-card">
              {/* Header do Card */}
              <div className="contract-card-header">
                <div className="contract-file-icon">
                  <FileText size={24} />
                </div>
                <div className="contract-file-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="contract-size">{contract.fileSize}</span>
                    <span className={`view-status-badge ${viewedContractIds.includes(contract.id) ? 'status-read' : 'status-unread'}`}>
                      {viewedContractIds.includes(contract.id) ? 'Visualizado' : 'Não Lido'}
                    </span>
                  </div>
                  <h3 className="contract-name" title={contract.fileName}>
                    {contract.fileName}
                  </h3>
                </div>
              </div>

              {/* Grid de Metadados */}
              <div className="contract-metadata-grid">
                <div className="metadata-item">
                  <span className="metadata-label">Feito em</span>
                  <span className="metadata-value" title={contract.cityCreated}>
                    {contract.cityCreated}
                  </span>
                </div>

                <div className="metadata-item">
                  <span className="metadata-label">Fashion Day</span>
                  <span className="metadata-value" title={contract.cityFashionDay}>
                    {contract.cityFashionDay}
                  </span>
                </div>

                <div className="metadata-item">
                  <span className="metadata-label">Valor total</span>
                  <span className="metadata-value payment-highlight">
                    {formatCurrency(contract.payment)}
                  </span>
                </div>

                <div className="metadata-item">
                  <span className="metadata-label">Caixa da comissão</span>
                  <span className="metadata-value box-highlight" title={contract.commissionBox}>
                    {contract.commissionBox}
                  </span>
                </div>
              </div>

              {/* Rodapé e Ações do Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="contract-card-actions">
                  <button 
                    className="btn-download" 
                    onClick={() => onDownload(contract)}
                    title="Fazer download do arquivo"
                  >
                    <Download size={18} />
                    <span>Baixar Contrato</span>
                  </button>

                  <button
                    className={`btn-toggle-view ${viewedContractIds.includes(contract.id) ? 'is-viewed' : ''}`}
                    onClick={() => onToggleView(contract)}
                    title={viewedContractIds.includes(contract.id) ? "Marcar como não visualizado" : "Marcar como visualizado"}
                  >
                    {viewedContractIds.includes(contract.id) ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>

                  {user.role === 'admin' && (
                    <button 
                      className="btn-delete-contract" 
                      onClick={() => onDelete(contract)}
                      title="Excluir contrato"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Enviado em: {formatDate(contract.uploadedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
