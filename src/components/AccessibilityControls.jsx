import React from 'react';
import { Accessibility } from 'lucide-react';

export default function AccessibilityControls({ scale, setScale }) {
  const options = [
    { label: 'Normal', value: 1.0, title: 'Tamanho original (100%)' },
    { label: 'Grande', value: 1.2, title: 'Tamanho ampliado (120%)' },
    { label: 'Muito Grande', value: 1.4, title: 'Tamanho extra ampliado (140%)' }
  ];

  return (
    <div className="accessibility-controls" aria-label="Controle de acessibilidade e tamanho da tela">
      <span className="control-label">
        <Accessibility size={16} aria-hidden="true" />
        <span>Tamanho:</span>
      </span>
      <div className="control-buttons">
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`btn-scale ${scale === opt.value ? 'active' : ''}`}
            onClick={() => setScale(opt.value)}
            title={opt.title}
            aria-pressed={scale === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
