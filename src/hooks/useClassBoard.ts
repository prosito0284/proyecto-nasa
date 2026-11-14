/**
 * LÍDER — Modo aula: tabla de resultados del Reto del día guardada en este dispositivo.
 * Pensado para un salón con una sola computadora o tablet que los niños se turnan.
 * No envía nada a ningún servidor.
 */
import { useCallback, useState } from 'react';
import { OutpostSiteId } from '../types/mission';

const BOARD_KEY = 'jamt-class-board-v1';
const MAX_ENTRIES = 60;

export interface ClassBoardEntry {
  id: string;
  name: string;
  siteId: OutpostSiteId;
  seed: number;
  score: number;
  rankTitle: { es: string; en: string };
  won: boolean;
  badges: number;
}

function readBoard(): ClassBoardEntry[] {
  try {
    const raw = window.localStorage.getItem(BOARD_KEY);
    const parsed = raw ? (JSON.parse(raw) as ClassBoardEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBoard(entries: ClassBoardEntry[]): void {
  try {
    window.localStorage.setItem(BOARD_KEY, JSON.stringify(entries));
  } catch {
    // Sin almacenamiento: la tabla vive solo mientras la pestaña esté abierta.
  }
}

export function useClassBoard() {
  const [entries, setEntries] = useState<ClassBoardEntry[]>(readBoard);

  const addEntry = useCallback((entry: Omit<ClassBoardEntry, 'id'>) => {
    setEntries((prev) => {
      const next = [{ ...entry, id: `${Date.now()}-${prev.length}` }, ...prev].slice(
        0,
        MAX_ENTRIES,
      );
      writeBoard(next);
      return next;
    });
  }, []);

  const clearBoard = useCallback(() => {
    writeBoard([]);
    setEntries([]);
  }, []);

  /** Resultados de un reto concreto, de mayor a menor puntaje. */
  const entriesForSeed = useCallback(
    (seed: number) => entries.filter((e) => e.seed === seed).sort((a, b) => b.score - a.score),
    [entries],
  );

  return { entries, addEntry, clearBoard, entriesForSeed };
}
