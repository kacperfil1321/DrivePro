import React, { useState } from 'react';
import type { Student, Document } from '../types';

interface Props {
  student: Student;
  documents: Document[];
}

const SectionDane: React.FC<Props> = ({ student, documents: _docs }) => {
  const [peselVisible, setPeselVisible] = useState(false);

  return (
    <section id="section-dane">
      <div className="section-header">
        <h1>Dane osobowe</h1>
        <span className="section-badge">Kursant</span>
      </div>

      <div className="dane-grid">
        {/* Profile card */}
        <div className="card profile-card">
          <div className="profile-avatar-big">
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div>
            <h2 className="profile-name">{student.firstName} {student.lastName}</h2>
            <p className="profile-meta">Kursant · Kategoria {student.category}</p>
            <div className="profile-tags">
              <span className="tag tag-blue">Aktywny kurs</span>
              <span className="tag tag-green">Opłacony</span>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="card info-card">
          <h3 className="card-title">Informacje kontaktowe</h3>
          <div className="info-rows">
            <div className="info-row">
              <span className="info-key">E-mail</span>
              <span className="info-val">{student.email}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Telefon</span>
              <span className="info-val">{student.phone}</span>
            </div>
            <div className="info-row">
              <span className="info-key">PESEL</span>
              <span className="info-val">
                {peselVisible ? student.pesel : '•'.repeat(11)}
                <button className="reveal-btn" onClick={() => setPeselVisible((v) => !v)}>
                  {peselVisible ? 'Ukryj' : 'Pokaż'}
                </button>
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Data ur.</span>
              <span className="info-val">{student.birthDate}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Szkoła</span>
              <span className="info-val">{student.schoolName}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="card stats-card">
          <h3 className="card-title">Statystyki kursu</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-val">{student.hoursCompleted}</span>
              <span className="stat-label">Jazdy odbyto</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">{student.hoursTotal - student.hoursCompleted}</span>
              <span className="stat-label">Pozostało</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">0</span>
              <span className="stat-label">Egzaminy</span>
            </div>
            <div className="stat-item">
              <span className="stat-val">2</span>
              <span className="stat-label">Nadchodzące</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionDane;
