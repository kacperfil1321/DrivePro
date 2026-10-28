import React from 'react';

const SectionSzkola: React.FC = () => {
  return (
    <section id="section-szkola">
      <div className="section-header">
        <h1>Moja Szkoła Jazdy</h1>
      </div>
      <div className="empty-section">
        <div className="empty-icon">🏫</div>
        <h2 className="empty-title">Sekcja w przygotowaniu</h2>
        <p className="empty-desc">Zawartość tej sekcji jest aktualnie w trakcie budowy.<br />Wkrótce pojawią się tutaj szczegółowe informacje o Twojej szkole jazdy.</p>
      </div>
    </section>
  );
};

export default SectionSzkola;
