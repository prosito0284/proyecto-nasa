/**
 * LÍDER — Tabla del aula: resultados del Reto del día guardados en este dispositivo.
 */
import React from 'react';
import { Language } from '../../types/mission';
import { ClassBoardEntry } from '../../hooks/useClassBoard';

export interface ClassBoardProps {
  lang: Language;
  entries: ClassBoardEntry[];
  onClear?: () => void;
}

export const ClassBoard: React.FC<ClassBoardProps> = ({ lang, entries, onClear }) => {
  const es = lang === 'es';
  return (
    <section className="class-board" aria-label={es ? 'Tabla del aula' : 'Classroom board'}>
      <div className="class-board-head">
        <h3>{es ? 'Tabla del aula · reto de hoy' : 'Classroom board · today’s challenge'}</h3>
        {onClear && entries.length > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (window.confirm(es ? '¿Borrar toda la tabla?' : 'Clear the whole board?'))
                onClear();
            }}
          >
            {es ? 'Borrar tabla' : 'Clear board'}
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="class-board-empty">
          {es
            ? 'Aún no hay resultados. Juega el reto, escribe tu nombre al terminar y aparecerás aquí. La tabla se guarda solo en este dispositivo.'
            : 'No results yet. Play the challenge, enter your name when you finish and you will show up here. The board is saved on this device only.'}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{es ? 'Comandante' : 'Commander'}</th>
              <th>{es ? 'Base' : 'Outpost'}</th>
              <th>{es ? 'Rango' : 'Rank'}</th>
              <th>{es ? 'Parches' : 'Patches'}</th>
              <th>{es ? 'Puntos' : 'Score'}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id}>
                <td>{i + 1}</td>
                <td>{e.name}</td>
                <td>
                  {e.siteId === 'moon-shackleton' ? (es ? 'Luna' : 'Moon') : es ? 'Marte' : 'Mars'}
                </td>
                <td>
                  {e.rankTitle[lang]}
                  {!e.won && (
                    <span className="class-board-aborted"> · {es ? 'abortada' : 'aborted'}</span>
                  )}
                </td>
                <td>{e.badges}</td>
                <td className="class-board-score">{e.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
