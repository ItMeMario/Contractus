import { FolderLock, LogOut } from 'lucide-react';
import AccessibilityControls from './AccessibilityControls';

export default function Navbar({ user, onLogout, scale, setScale, activeTab, onTabChange }) {
  if (!user) return null;

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); if (user.role === 'admin') onTabChange('contracts'); }}>
          <FolderLock size={32} strokeWidth={2.5} />
          <span>Contractus</span>
        </a>

        {user.role === 'admin' && (
          <div className="nav-navigation" role="tablist">
            <button 
              className={`nav-nav-btn ${activeTab === 'contracts' ? 'active' : ''}`}
              onClick={() => onTabChange('contracts')}
              role="tab"
              aria-selected={activeTab === 'contracts'}
            >
              Contratos
            </button>
            <button 
              className={`nav-nav-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => onTabChange('audit')}
              role="tab"
              aria-selected={activeTab === 'audit'}
            >
              Auditoria
            </button>
          </div>
        )}
      </div>

      <AccessibilityControls scale={scale} setScale={setScale} />
      
      <div className="nav-user">
        <div className="user-info">
          <span className="user-name">{user.name}</span>
          <span className={`user-role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`}>
            {user.role === 'admin' ? 'Administrador' : 'Acesso Consulta'}
          </span>
        </div>
        
        <button className="btn-logout" onClick={onLogout} title="Sair do sistema">
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
}
