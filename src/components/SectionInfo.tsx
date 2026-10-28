import React from 'react';

const INFO_TILES = [
  {
    key: 'regulamin',
    color: 'info-tile-blue',
    emoji: '📋',
    title: 'Regulamin kursu',
    body: 'Zapoznaj się z regulaminem szkoły jazdy oraz warunkami uczestnictwa w kursie kategorii B.',
  },
  {
    key: 'odwolania',
    color: 'info-tile-indigo',
    emoji: '⚠️',
    title: 'Odwoływanie jazd',
    body: 'Jazdę możesz odwołać najpóźniej 24 godziny przed planowanym terminem bez ponoszenia kosztów.',
  },
  {
    key: 'egzamin',
    color: 'info-tile-cyan',
    emoji: '🎓',
    title: 'Wymogi egzaminacyjne',
    body: 'Aby przystąpić do egzaminu państwowego potrzebujesz min. 30h jazdy i pozytywnego egzaminu wewnętrznego.',
  },
  {
    key: 'platnosci',
    color: 'info-tile-teal',
    emoji: '💳',
    title: 'Płatności',
    body: 'Wszystkie płatności realizowane są z góry. Możliwa jest płatność ratalna – zapytaj w sekretariacie.',
  },
];

const SectionInfo: React.FC = () => {
  return (
    <section id="section-info">
      <div className="section-header">
        <h1>Ważne Informacje</h1>
      </div>

      <div className="info-cards-grid">
        {INFO_TILES.map((tile) => (
          <div className={`card info-tile ${tile.color}`} key={tile.key}>
            <div className="info-tile-icon">{tile.emoji}</div>
            <h3>{tile.title}</h3>
            <p>{tile.body}</p>
            <button className="btn-outline-small">Czytaj więcej</button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SectionInfo;
