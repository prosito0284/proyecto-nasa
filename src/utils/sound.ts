/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * Sintetizador de efectos de sonido con Web Audio API (Cero archivos externos ni descargas).
 * Incluye tonos Quindar reales estilo NASA Apollo/Artemis, alertas de clima espacial DONKI
 * y confirmación táctil para niños de 7 a 12 años.
 */

class MissionSoundController {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined' || this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.playClick();
    }
    return this.muted;
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
    this.playTone(620, 65, 'triangle', 0.055);
  }

  playSliderTick() {
    this.playTone(840, 35, 'sine', 0.035);
  }

  /**
   * Tono Quindar clásico de la NASA (2525 Hz intro / 2475 Hz outro) usado en Apollo y Artemis
   */
  playCommPing(isIntro = true) {
    this.playTone(isIntro ? 2525 : 2475, 180, 'sine', 0.06);
  }

  playTurnAdvance() {
    this.playTone(440, 90, 'triangle', 0.06);
    setTimeout(() => this.playTone(554.37, 120, 'triangle', 0.06), 85);
  }

  playStormWarning() {
    this.playTone(520, 140, 'sawtooth', 0.065);
    setTimeout(() => this.playTone(390, 180, 'sawtooth', 0.065), 150);
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
