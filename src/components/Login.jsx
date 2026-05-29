import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, FolderLock, ShieldAlert, KeyRound } from 'lucide-react';

export default function Login({ onLogin, isMock }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || 'Falha ao entrar. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <FolderLock size={44} strokeWidth={2.5} />
            <span>Contractus</span>
          </div>
          <p className="login-subtitle">Acesso seguro ao portal de contratos</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="alert-box alert-danger" role="alert">
              <ShieldAlert size={20} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={16} /> E-mail
            </label>
            <div className="input-container">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="Exemplo: joao@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={16} /> Senha
            </label>
            <div className="input-container">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="Digite sua senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            <KeyRound size={20} />
            <span>{loading ? 'Entrando...' : 'Entrar no Sistema'}</span>
          </button>
        </form>

        {isMock && (
          <div className="alert-box alert-info-box">
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Modo de Simulação Ativo:</strong>
              <div style={{ marginTop: '8px', fontSize: '13px' }}>
                🔑 <strong>Admin:</strong> admin@contractus.com / <code>admin123</code>
                <br />
                🔑 <strong>Consulta:</strong> user@contractus.com / <code>user123</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
