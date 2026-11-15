/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * C13 — Lista de Tripulación con Globos de Cómic de Papel (`CrewRoster.tsx`)
 * - Modo completo (`compact` omitido o `false`): retrato, nombre, rol y frase actual (`crew[i].line`) en globo de papel.
 * - Modo compacto (`compact = true`): tira compacta con retrato y nombre.
 */

import React from 'react';
import { getCrewMemberName } from '../../data/crew';
import { CrewMood, CrewStatus, Language } from '../../types/mission';
import { CrewPortrait } from './CrewPortrait';

export interface CrewRosterProps {
  lang: Language;
  crew: CrewStatus[];
  compact?: boolean;
  className?: string;
}

function getMoodLabel(mood: CrewMood, lang: Language): string {
  switch (mood) {
    case 'great':
      return lang === 'es' ? 'ÓPTIMO' : 'GREAT';
    case 'ok':
      return lang === 'es' ? 'ESTABLE' : 'NOMINAL';
    case 'worried':
      return lang === 'es' ? 'ATENCIÓN' : 'WATCH';
    case 'critical':
      return lang === 'es' ? 'CRÍTICO' : 'CRITICAL';
  }
}

export const CrewRoster: React.FC<CrewRosterProps> = ({
  lang,
  crew,
  compact = false,
  className,
}) => {
  if (!crew || crew.length === 0) return null;

  if (compact) {
    return (
      <div
        className={`crew-roster-compact ${className ?? ''}`.trim()}
        role="group"
        aria-label={lang === 'es' ? 'Estado de la tripulación' : 'Crew status'}
      >
        {crew.map((item) => {
          const memberName = getCrewMemberName(item.member, lang);
          return (
            <div
              key={item.member.id}
              className={`crew-compact-chip crew-chip-${item.mood}`}
              title={`${memberName} (${item.member.role[lang]}): "${item.line[lang]}"`}
            >
              <CrewPortrait
                memberId={item.member.id}
                mood={item.mood}
                size={34}
                title={`${memberName} — ${getMoodLabel(item.mood, lang)}`}
              />
              <span className="crew-compact-name">{memberName}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section
      className={`crew-roster ${className ?? ''}`.trim()}
      aria-label={lang === 'es' ? 'Bitácora de voces de la tripulación' : 'Crew voice log'}
    >
      <div className="crew-roster-grid">
        {crew.map((item) => {
          const memberName = getCrewMemberName(item.member, lang);
          return (
            <article
              key={item.member.id}
              className={`crew-card crew-card-${item.mood}`}
            >
              <div className="crew-card-header">
                <CrewPortrait
                  memberId={item.member.id}
                  mood={item.mood}
                  size={48}
                  title={`${memberName} — ${item.member.role[lang]}`}
                />
                <div className="crew-card-identity">
                  <div className="crew-name-row">
                    <strong className="crew-member-name">{memberName}</strong>
                    <span className={`crew-mood-tag crew-mood-tag-${item.mood}`}>
                      {getMoodLabel(item.mood, lang)}
                    </span>
                  </div>
                  <span className="crew-member-role">{item.member.role[lang]}</span>
                </div>
              </div>

              <blockquote className="crew-speech-bubble">
                <p>"{item.line[lang]}"</p>
              </blockquote>
            </article>
          );
        })}
      </div>
    </section>
  );
};
