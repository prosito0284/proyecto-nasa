/**
 * LÍDER — Tripulación de la base: cuatro personas con nombre, cada una a cargo de un sistema.
 * Convierte las barras de recursos en personas que opinan sobre las decisiones del comandante.
 * Los retratos (Bloque C) usan los mismos ids: commander, engineer, botanist, medic.
 */
import { CrewMember, CrewMood, CrewStatus, Language, LocalizedText } from '../types/mission';

const t = (es: string, en: string): LocalizedText => ({ es, en });

export const CREW_MEMBERS: CrewMember[] = [
  {
    id: 'commander',
    name: 'Cmdr. Vega',
    localizedName: t('Cmdr. Vega', 'Cmdr. Vega'),
    role: t('Comandante de misión', 'Mission commander'),
    watches: 'crewHealth',
  },
  {
    id: 'engineer',
    name: 'Ing. Sato',
    localizedName: t('Ing. Sato', 'Eng. Sato'),
    role: t('Ingeniería y energía', 'Power engineer'),
    watches: 'power',
  },
  {
    id: 'botanist',
    name: 'Dra. Okafor',
    localizedName: t('Dra. Okafor', 'Dr. Okafor'),
    role: t('Botánica e invernadero', 'Botanist & greenhouse'),
    watches: 'food',
  },
  {
    id: 'medic',
    name: 'Dr. Ríos',
    localizedName: t('Dr. Ríos', 'Dr. Ríos'),
    role: t('Medicina y radiación', 'Flight surgeon & radiation'),
    watches: 'shielding',
  },
];

export function getCrewMemberName(member: CrewMember, lang: Language): string {
  if (member.localizedName) return member.localizedName[lang];
  const canonical = CREW_MEMBERS.find((c) => c.id === member.id);
  if (canonical?.localizedName) return canonical.localizedName[lang];
  return member.name;
}

export interface CrewVitalWatcher {
  status: CrewStatus;
  roleLabel?: LocalizedText;
}

const VITAL_SECONDARY_WATCHER: Partial<
  Record<CrewMember['watches'], { memberId: string; roleLabel: LocalizedText }>
> = {
  lifeSupport: {
    memberId: 'commander',
    roleLabel: t('Supervisión ECLSS', 'ECLSS oversight'),
  },
};

/**
 * Busca qué tripulante supervisa una fila del checklist de vitales.
 * Mantiene `CREW_MEMBERS` en 4 tripulantes (contrato del motor) y asigna
 * `lifeSupport` (O₂/H₂O) a la comandante como supervisión ECLSS.
 */
export function findCrewWatcherForVital(
  crew: CrewStatus[] | undefined,
  vitalId: CrewMember['watches'],
): CrewVitalWatcher | undefined {
  if (!crew || crew.length === 0) return undefined;
  const direct = crew.find((c) => c.member.watches === vitalId);
  if (direct) return { status: direct };

  const secondary = VITAL_SECONDARY_WATCHER[vitalId];
  if (!secondary) return undefined;
  const status = crew.find((c) => c.member.id === secondary.memberId);
  if (!status) return undefined;
  return { status, roleLabel: secondary.roleLabel };
}

/** Qué dice cada tripulante según cómo está el sistema que vigila. */
export const CREW_LINES: Record<string, Record<CrewMood, LocalizedText>> = {
  commander: {
    great: t(
      'La tripulación está fuerte y de buen ánimo. Buen trabajo.',
      'The crew is strong and in good spirits. Good work.',
    ),
    ok: t(
      'Estamos bien, pero el equipo empieza a notar el cansancio.',
      'We are fine, but the team is starting to feel tired.',
    ),
    worried: t(
      'La tripulación está agotada. Necesitamos cuidarnos ya.',
      'The crew is worn out. We need to look after ourselves now.',
    ),
    critical: t(
      'Si la salud baja más tendremos que abortar la misión.',
      'If health drops any further we will have to abort.',
    ),
  },
  engineer: {
    great: t(
      'Baterías llenas. Podemos permitirnos un trabajo grande hoy.',
      'Batteries are full. We can afford a big job today.',
    ),
    ok: t(
      'Hay energía, pero no para todo. Elige qué encender.',
      'We have power, but not for everything. Choose what to run.',
    ),
    worried: t('Queda poca batería. Hoy toca ahorrar.', 'Battery is low. Today we save power.'),
    critical: t(
      'Casi sin energía. Si llega a cero se apaga todo.',
      'Almost out of power. At zero, everything shuts down.',
    ),
  },
  botanist: {
    great: t(
      'El invernadero va de maravilla. Hay verdura fresca.',
      'The greenhouse is thriving. Fresh greens for all.',
    ),
    ok: t(
      'Tenemos comida, pero las plantas necesitan luz y calor.',
      'We have food, but the plants need light and heat.',
    ),
    worried: t(
      'La despensa baja rápido. Las plantas necesitan energía.',
      'The pantry is running down. The plants need power.',
    ),
    critical: t(
      'Casi no queda comida. Con hambre nadie trabaja bien.',
      'Almost no food left. Nobody works well hungry.',
    ),
  },
  medic: {
    great: t(
      'Blindaje sólido. Las dosis de radiación están bajas.',
      'Shielding is solid. Radiation doses are low.',
    ),
    ok: t(
      'El blindaje aguanta un día normal, no una tormenta fuerte.',
      'Shielding handles a normal day, not a strong storm.',
    ),
    worried: t(
      'El blindaje está débil. Una tormenta solar nos haría daño.',
      'Shielding is weak. A solar storm would hurt us.',
    ),
    critical: t(
      'Estamos casi sin blindaje. Cada hora suma radiación.',
      'We are almost unshielded. Every hour adds radiation.',
    ),
  },
};

/** Frases que tienen prioridad cuando el clima de hoy afecta directamente a esa persona. */
export const CREW_WEATHER_LINES = {
  medicStorm: t(
    'Hay tormenta solar y el blindaje no alcanza. Sube el escudo hoy.',
    'There is a solar storm and shielding is not enough. Raise the shield today.',
  ),
  engineerDim: t(
    'Los paneles reciben poca luz hoy. No gastes de más.',
    'The panels are getting little light today. Do not overspend.',
  ),
};

/** Frases para el informe del día: reacción al cambio del sistema que vigila. */
export const CREW_REACTIONS: Record<string, { drop: LocalizedText; rise: LocalizedText }> = {
  commander: {
    drop: t(
      'Hoy fue duro para la tripulación. Mañana hay que compensar.',
      'Today was hard on the crew. Tomorrow we make up for it.',
    ),
    rise: t(
      'El equipo se recuperó. Así da gusto trabajar.',
      'The team bounced back. That is how we like it.',
    ),
  },
  engineer: {
    drop: t(
      'Esa decisión nos costó batería. Vigila la reserva.',
      'That decision cost us battery. Watch the reserve.',
    ),
    rise: t('Recuperamos energía. Buena jugada.', 'We got power back. Good call.'),
  },
  botanist: {
    drop: t(
      'Las plantas lo notaron. Habrá menos cosecha.',
      'The plants felt that. The harvest will be smaller.',
    ),
    rise: t('La cosecha subió. Hoy se come bien.', 'The harvest is up. We eat well today.'),
  },
  medic: {
    drop: t(
      'Perdimos blindaje. Estamos más expuestos a la radiación.',
      'We lost shielding. We are more exposed to radiation.',
    ),
    rise: t(
      'Blindaje reforzado. Dormiremos más tranquilos.',
      'Shielding reinforced. We will sleep easier.',
    ),
  },
};
