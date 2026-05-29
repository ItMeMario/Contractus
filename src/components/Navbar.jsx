import React from 'react';
import { FolderLock, LogOut } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  if (!user) return null;

  return (
    <nav className="navbar">
      <a href="#" className="nav-brand" onClick={(e) => e.preventDefault()}>
        <FolderLock size={32} strokeWidth={2.5} />
        <span>Contractus</span>
      </a>
      
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
