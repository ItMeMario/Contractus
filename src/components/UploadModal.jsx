import { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { logger } from '../firebase';

export default function UploadModal({ isOpen, onClose, onUpload, users = [] }) {
  const [file, setFile] = useState(null);
  const [cityCreated, setCityCreated] = useState('');
  const [cityFashionDay, setCityFashionDay] = useState('');
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
    if (!cityCreated.trim() || !cityFashionDay.trim() || !payment.trim() || !commissionBox.trim() || !assignedTo) {
      setErrorMessage('Preencha todas as informações obrigatórias e selecione um usuário.');
      return;
    }

    setUploading(true);
    setStatus('uploading');
    setErrorMessage('');

    try {
      const metadata = {
        cityCreated: cityCreated.trim(),
        cityFashionDay: cityFashionDay.trim(),
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
    setCityCreated('');
    setCityFashionDay('');
    setPayment('');
    setCommissionBox('');
    setAssignedTo('');
    setUploading(false);
    setUploadProgress(0);
    setStatus('idle');
    setErrorMessage('');
    onClose();
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
                <label htmlFor="cityCreated">Cidade onde foi feito</label>
                <input
                  id="cityCreated"
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '16px' }}
                  placeholder="Ex: São Paulo - SP"
                  value={cityCreated}
                  onChange={(e) => setCityCreated(e.target.value)}
                  disabled={uploading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cityFashionDay">Cidade onde será o Fashion Day</label>
                <input
                  id="cityFashionDay"
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '16px' }}
                  placeholder="Ex: Belo Horizonte - MG"
                  value={cityFashionDay}
                  onChange={(e) => setCityFashionDay(e.target.value)}
                  disabled={uploading}
                  required
                />
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
