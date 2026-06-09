import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, FolderLock, ShieldAlert, KeyRound } from 'lucide-react';

export default function Login({ onLogin, isMock }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0) {
      setError(`Muitas tentativas de login. Aguarde ${lockoutTimeLeft}s.`);
      return;
    }
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onLogin(email, password);
      setAttempts(0);
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockoutTimeLeft(30);
        setError('Muitas tentativas incorretas. O login foi bloqueado por 30 segundos.');
      } else {
        setError(err.message || 'Falha ao entrar. Tente novamente.');
      }
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

          <button type="submit" className="btn-primary" disabled={loading || lockoutTimeLeft > 0}>
            {lockoutTimeLeft > 0 ? <ShieldAlert size={20} /> : <KeyRound size={20} />}
            <span>
              {lockoutTimeLeft > 0 
                ? `Acesso Bloqueado (${lockoutTimeLeft}s)` 
                : loading 
                  ? 'Entrando...' 
                  : 'Entrar no Sistema'
              }
            </span>
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
                🔑 <strong>Fulano:</strong> fulano@contractus.com / <code>fulano123</code>
                <br />
                🔑 <strong>Deltrano:</strong> deltrano@contractus.com / <code>deltrano123</code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
