/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * Sintetizador de efectos de sonido con Web Audio API (Cero archivos externos ni descargas).
 */

class MissionSoundController {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  playTone(freq: number, durationMs: number, type: OscillatorType = 'sine', volume = 0.08) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Ignore audio autoplay restrictions
    }
  }

  playClick() {
    this.playTone(580, 70, 'triangle', 0.06);
  }

  playAlert() {
    this.playTone(440, 140, 'sawtooth', 0.07);
    setTimeout(() => this.playTone(660, 180, 'sawtooth', 0.07), 150);
  }

  playSuccess() {
    this.playTone(523.25, 110, 'sine', 0.08);
    setTimeout(() => this.playTone(659.25, 140, 'sine', 0.08), 120);
    setTimeout(() => this.playTone(783.99, 220, 'sine', 0.08), 250);
  }
}

export const missionAudio = new MissionSoundController();
