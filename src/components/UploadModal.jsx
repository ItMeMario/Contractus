import { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { logger } from '../firebase';

// Lista estática dos 27 estados do Brasil (UFs)
const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

// Cache em memória para evitar requisições HTTP duplicadas ao IBGE
const citiesCache = {};

const fetchCitiesForState = async (uf) => {
  if (citiesCache[uf]) return citiesCache[uf];
  const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
  if (!response.ok) {
    throw new Error('Falha ao buscar cidades no IBGE');
  }
  const data = await response.json();
  const cityNames = data.map(item => item.nome);
  citiesCache[uf] = cityNames;
  return cityNames;
};

export default function UploadModal({ isOpen, onClose, onUpload, users = [] }) {
  const [file, setFile] = useState(null);
  
  // Estados para a Cidade onde foi feito (Origem)
  const [stateCreated, setStateCreated] = useState('');
  const [citiesCreated, setCitiesCreated] = useState([]);
  const [cityCreatedInput, setCityCreatedInput] = useState('');
  const [loadingCitiesCreated, setLoadingCitiesCreated] = useState(false);
  const [fetchFailedCreated, setFetchFailedCreated] = useState(false);

  // Estados para a Cidade do Fashion Day
  const [stateFashionDay, setStateFashionDay] = useState('');
  const [citiesFashionDay, setCitiesFashionDay] = useState([]);
  const [cityFashionDayInput, setCityFashionDayInput] = useState('');
  const [loadingCitiesFashionDay, setLoadingCitiesFashionDay] = useState(false);
  const [fetchFailedFashionDay, setFetchFailedFashionDay] = useState(false);

  const [payment, setPayment] = useState('');
  const [commissionBox, setCommissionBox] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Gerenciadores do Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      // Aceita .docx ou outros formatos, mas alerta no hint
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Por favor, selecione o arquivo do contrato.');
      return;
    }

    // Validar campos obrigatórios
    const isCityCreatedMissing = !cityCreatedInput.trim() || !stateCreated;
    const isCityFashionDayMissing = !cityFashionDayInput.trim() || !stateFashionDay;
    
    if (isCityCreatedMissing || isCityFashionDayMissing || !payment.trim() || !commissionBox.trim() || !assignedTo) {
      setErrorMessage('Preencha todas as informações obrigatórias e selecione um usuário.');
      return;
    }

    // Validação Cidade de Origem
    if (loadingCitiesCreated) {
      setErrorMessage('Aguarde o carregamento das cidades da UF onde foi feito.');
      return;
    }
    if (fetchFailedCreated) {
      setErrorMessage('Erro ao carregar cidades da UF onde foi feito. Clique em "Tentar novamente" no formulário.');
      return;
    }
    const normalizedInputCreated = cityCreatedInput.trim().toLowerCase();
    const matchedCreated = citiesCreated.find(c => c.toLowerCase() === normalizedInputCreated);
    if (!matchedCreated) {
      setErrorMessage('Por favor, selecione uma Cidade de Origem válida a partir da lista de sugestões.');
      return;
    }
    const finalCityCreated = `${matchedCreated} - ${stateCreated}`;

    // Validação Cidade do Fashion Day
    if (loadingCitiesFashionDay) {
      setErrorMessage('Aguarde o carregamento das cidades da UF do Fashion Day.');
      return;
    }
    if (fetchFailedFashionDay) {
      setErrorMessage('Erro ao carregar cidades da UF do Fashion Day. Clique em "Tentar novamente" no formulário.');
      return;
    }
    const normalizedInputFashion = cityFashionDayInput.trim().toLowerCase();
    const matchedFashion = citiesFashionDay.find(c => c.toLowerCase() === normalizedInputFashion);
    if (!matchedFashion) {
      setErrorMessage('Por favor, selecione uma Cidade do Fashion Day válida a partir da lista de sugestões.');
      return;
    }
    const finalCityFashionDay = `${matchedFashion} - ${stateFashionDay}`;

    setUploading(true);
    setStatus('uploading');
    setErrorMessage('');

    try {
      const metadata = {
        cityCreated: finalCityCreated,
        cityFashionDay: finalCityFashionDay,
        payment: parseFloat(payment) || 0,
        commissionBox: commissionBox.trim(),
        assignedTo: assignedTo
      };

      await onUpload(file, metadata, (progress) => {
        setUploadProgress(Math.round(progress));
      });

      setStatus('success');
    } catch (err) {
      logger.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Falha ao fazer upload. Verifique sua conexão.');
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    
    // Reset novos estados da Etapa 1
    setStateCreated('');
    setCitiesCreated([]);
    setCityCreatedInput('');
    setLoadingCitiesCreated(false);
    setFetchFailedCreated(false);
    setStateFashionDay('');
    setCitiesFashionDay([]);
    setCityFashionDayInput('');
    setLoadingCitiesFashionDay(false);
    setFetchFailedFashionDay(false);

    setPayment('');
    setCommissionBox('');
    setAssignedTo('');
    setUploading(false);
    setUploadProgress(0);
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };

  const handleStateCreatedChange = async (uf) => {
    setStateCreated(uf);
    setCityCreatedInput('');
    setFetchFailedCreated(false);
    if (!uf) {
      setCitiesCreated([]);
      return;
    }
    setLoadingCitiesCreated(true);
    try {
      const list = await fetchCitiesForState(uf);
      setCitiesCreated(list);
    } catch (err) {
      logger.error('Erro ao carregar cidades da UF:', uf, err);
      setFetchFailedCreated(true);
    } finally {
      setLoadingCitiesCreated(false);
    }
  };

  const handleStateFashionDayChange = async (uf) => {
    setStateFashionDay(uf);
    setCityFashionDayInput('');
    setFetchFailedFashionDay(false);
    if (!uf) {
      setCitiesFashionDay([]);
      return;
    }
    setLoadingCitiesFashionDay(true);
    try {
      const list = await fetchCitiesForState(uf);
      setCitiesFashionDay(list);
    } catch (err) {
      logger.error('Erro ao carregar cidades da UF:', uf, err);
      setFetchFailedFashionDay(true);
    } finally {
      setLoadingCitiesFashionDay(false);
    }
  };

  const handleAssignedToChange = (val) => {
    setAssignedTo(val);
    if (val === "") {
      setCommissionBox("");
    } else {
      const selectedUser = users.find(u => u.uid === val);
      if (selectedUser) {
        const userName = selectedUser.name || selectedUser.email.split('@')[0];
        setCommissionBox(`Caixa ${userName}`);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Adicionar Novo Contrato</h2>
          {!uploading && (
            <button className="btn-modal-close" onClick={resetForm} title="Fechar Janela">
              <X size={20} />
            </button>
          )}
        </div>

        {status === 'success' ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--success)' }}>
              <CheckCircle size={64} />
            </div>
            <h3 style={{ fontSize: '22px', marginBottom: '12px' }}>Contrato Enviado!</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              O contrato <strong>{file?.name}</strong> foi registrado e está disponível para download.
            </p>
            <button className="btn-primary" onClick={resetForm}>
              <ShieldCheck size={20} />
              <span>Concluir</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errorMessage && (
                <div className="alert-box alert-danger">
                  <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                  <div>{errorMessage}</div>
                </div>
              )}

              {/* Upload de Arquivo */}
              <div className="form-group">
                <label>Arquivo do Contrato (.docx, .pdf, etc)</label>
                
                {!file ? (
                  <div 
                    className={`dropzone-container ${isDragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{ display: 'none' }} 
                      onChange={handleFileChange}
                      accept=".docx,.pdf,.doc"
                    />
                    <UploadCloud size={40} className="dropzone-icon" />
                    <span className="dropzone-text">Arraste o arquivo aqui ou clique para buscar</span>
                    <span className="dropzone-hint">Formatos recomendados: Word (.docx) ou PDF</span>
                  </div>
                ) : (
                  <div className="selected-file-card">
                    <div className="selected-file-info">
                      <FileText size={28} className="selected-file-icon" />
                      <div className="selected-file-name" title={file.name}>
                        {file.name}
                      </div>
                    </div>
                    {!uploading && (
                      <button type="button" className="btn-remove-file" onClick={handleRemoveFile} title="Remover arquivo">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Informações de Metadados */}
              <div className="form-group">
                <label>Cidade onde foi feito</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '30%' }}>
                    <select
                      className="input-field"
                      style={{ paddingLeft: '12px', height: '52px', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                      value={stateCreated}
                      onChange={(e) => handleStateCreatedChange(e.target.value)}
                      disabled={uploading}
                      required
                    >
                      <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>UF</option>
                      {ESTADOS_BRASIL.map(est => (
                        <option key={est.sigla} value={est.sigla} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                          {est.sigla}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ width: '70%', position: 'relative' }}>
                    <input
                      id="cityCreated"
                      type="text"
                      list="cityCreatedList"
                      className="input-field"
                      style={{ paddingLeft: '16px' }}
                      placeholder={
                        loadingCitiesCreated 
                          ? "Carregando..." 
                          : fetchFailedCreated 
                            ? "Erro ao carregar lista de cidades" 
                            : !stateCreated 
                              ? "Selecione a UF..." 
                              : "Ex: São Paulo"
                      }
                      value={cityCreatedInput}
                      onChange={(e) => setCityCreatedInput(e.target.value)}
                      disabled={uploading || !stateCreated || loadingCitiesCreated || fetchFailedCreated}
                      required
                    />
                    <datalist id="cityCreatedList">
                      {citiesCreated.map((city, idx) => (
                        <option key={idx} value={city} />
                      ))}
                    </datalist>
                    {fetchFailedCreated && (
                      <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                        Falha ao carregar cidades. <button type="button" onClick={() => handleStateCreatedChange(stateCreated)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Tentar novamente</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Cidade onde será o Fashion Day</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '30%' }}>
                    <select
                      className="input-field"
                      style={{ paddingLeft: '12px', height: '52px', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                      value={stateFashionDay}
                      onChange={(e) => handleStateFashionDayChange(e.target.value)}
                      disabled={uploading}
                      required
                    >
                      <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>UF</option>
                      {ESTADOS_BRASIL.map(est => (
                        <option key={est.sigla} value={est.sigla} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                          {est.sigla}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ width: '70%', position: 'relative' }}>
                    <input
                      id="cityFashionDay"
                      type="text"
                      list="cityFashionDayList"
                      className="input-field"
                      style={{ paddingLeft: '16px' }}
                      placeholder={
                        loadingCitiesFashionDay 
                          ? "Carregando..." 
                          : fetchFailedFashionDay 
                            ? "Erro ao carregar lista de cidades" 
                            : !stateFashionDay 
                              ? "Selecione a UF..." 
                              : "Ex: Belo Horizonte"
                      }
                      value={cityFashionDayInput}
                      onChange={(e) => setCityFashionDayInput(e.target.value)}
                      disabled={uploading || !stateFashionDay || loadingCitiesFashionDay || fetchFailedFashionDay}
                      required
                    />
                    <datalist id="cityFashionDayList">
                      {citiesFashionDay.map((city, idx) => (
                        <option key={idx} value={city} />
                      ))}
                    </datalist>
                    {fetchFailedFashionDay && (
                      <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                        Falha ao carregar cidades. <button type="button" onClick={() => handleStateFashionDayChange(stateFashionDay)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Tentar novamente</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="payment">Valor do Pagamento (R$)</label>
                <input
                  id="payment"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  style={{ paddingLeft: '16px' }}
                  placeholder="Ex: 5000"
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  disabled={uploading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="assignedTo">Caixa do Pagamento (Acesso ao Contrato)</label>
                <select
                  id="assignedTo"
                  className="input-field"
                  style={{ paddingLeft: '12px', height: '52px', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                  value={assignedTo}
                  onChange={(e) => handleAssignedToChange(e.target.value)}
                  disabled={uploading}
                  required
                >
                  <option value="" style={{ color: 'var(--text-muted)' }}>Selecione o caixa do usuário...</option>
                  {users.map(u => {
                    const userName = u.name || u.email.split('@')[0];
                    return (
                      <option key={u.uid} value={u.uid} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                        Caixa {userName} ({u.email})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Progresso de Envio */}
              {status === 'uploading' && (
                <div className="upload-progress-container">
                  <div className="upload-progress-text">
                    <span>Enviando contrato...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="upload-progress-bar-bg">
                    <div 
                      className="upload-progress-bar-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!uploading && (
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn-primary" disabled={uploading}>
                <span>{uploading ? 'Enviando...' : 'Salvar Contrato'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
