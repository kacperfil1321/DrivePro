import React from 'react';
import type { Document } from '../types';

interface Props {
  documents: Document[];
  onAddDocument: () => void;
}

const StatusIcon: React.FC<{ status: Document['status'] }> = ({ status }) => {
  if (status === 'verified') return <span className="doc-status ok">✓ Zweryfikowany</span>;
  if (status === 'pending') return <span className="doc-status pending">⏳ Oczekuje na weryfikację</span>;
  return <span className="doc-status">Brak dokumentu</span>;
};

const DocIconColor: Record<Document['status'], string> = {
  verified: 'doc-icon-green',
  pending: 'doc-icon-orange',
  missing: 'doc-icon-gray',
};

const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const SectionDokumenty: React.FC<Props> = ({ documents, onAddDocument }) => {
  return (
    <section id="section-dokumenty">
      <div className="section-header">
        <h1>Moje Dokumenty</h1>
        <button className="btn-primary" id="uploadDocBtn" onClick={onAddDocument}>
          + Dodaj dokument
        </button>
      </div>

      <div className="docs-grid">
        {documents.map((doc) => (
          <div className="doc-card" key={doc.id}>
            <div className={`doc-icon ${DocIconColor[doc.status]}`}>
              <FileIcon />
            </div>
            <div className="doc-info">
              <span className="doc-name">{doc.name}</span>
              <StatusIcon status={doc.status} />
            </div>
          </div>
        ))}

        {/* Add placeholder */}
        <div className="doc-card doc-card-empty" onClick={onAddDocument}>
          <div className="doc-icon doc-icon-gray">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div className="doc-info">
            <span className="doc-name">Dodaj dokument</span>
            <span className="doc-status">Kliknij aby dodać</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionDokumenty;
