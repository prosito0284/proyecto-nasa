import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  EMPTY_ROVER_DIRECTIONS,
  mapKeyToRoverDirection,
  mergeRoverDirections,
  resolveDirectionsFromKeys,
  RoverControlsOverlay,
  type RoverDirectionKey,
} from '../RoverControlsOverlay';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function findElementsByTestId(
  node: React.ReactNode,
  out: Record<string, React.ReactElement> = {},
): Record<string, React.ReactElement> {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) findElementsByTestId(child, out);
    return out;
  }
  if (React.isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (typeof props['data-testid'] === 'string') {
      out[props['data-testid']] = node;
    }
    if (props.children !== undefined) {
      findElementsByTestId(props.children as React.ReactNode, out);
    }
  }
  return out;
}

describe('RoverControlsOverlay (R02 dual keyboard & tactile D-pad)', () => {
  it('mapea Flechas y WASD a direcciones del rover incluyendo pulsación simultánea', () => {
    expect(mapKeyToRoverDirection('ArrowUp')).toBe('forward');
    expect(mapKeyToRoverDirection('w')).toBe('forward');
    expect(mapKeyToRoverDirection('W')).toBe('forward');
    expect(mapKeyToRoverDirection('ArrowDown')).toBe('backward');
    expect(mapKeyToRoverDirection('s')).toBe('backward');
    expect(mapKeyToRoverDirection('S')).toBe('backward');
    expect(mapKeyToRoverDirection('ArrowLeft')).toBe('left');
    expect(mapKeyToRoverDirection('a')).toBe('left');
    expect(mapKeyToRoverDirection('A')).toBe('left');
    expect(mapKeyToRoverDirection('ArrowRight')).toBe('right');
    expect(mapKeyToRoverDirection('d')).toBe('right');
    expect(mapKeyToRoverDirection('D')).toBe('right');
    expect(mapKeyToRoverDirection('Space')).toBeNull();
    expect(mapKeyToRoverDirection('r')).toBeNull();

    // Avance + giro simultáneos con teclado
    expect(resolveDirectionsFromKeys(new Set(['ArrowUp', 'ArrowLeft']))).toEqual({
      forward: true,
      backward: false,
      left: true,
      right: false,
    });
    expect(resolveDirectionsFromKeys(new Set(['w', 'D']))).toEqual({
      forward: true,
      backward: false,
      left: false,
      right: true,
    });
    expect(
      mergeRoverDirections(
        { ...EMPTY_ROVER_DIRECTIONS, forward: true },
        { ...EMPTY_ROVER_DIRECTIONS, right: true },
      ),
    ).toEqual({
      forward: true,
      backward: false,
      left: false,
      right: true,
    });
  });

  it('renderiza 4 botones SVG en ES y EN sin emoji y sincroniza is-pressed con las teclas activas', () => {
    for (const lang of ['es', 'en'] as const) {
      const html = renderToStaticMarkup(
        React.createElement(RoverControlsOverlay, {
          lang,
          activeDirections: {
            forward: true,
            backward: false,
            left: true,
            right: false,
          },
          speedMps: 2.43,
          onDirectionChange: () => {},
        }),
      );

      expect(EMOJI_REGEX.test(html)).toBe(false);
      expect(html).toContain('data-testid="rover-controls-overlay"');
      expect(html).toContain('data-testid="rover-dpad-forward"');
      expect(html).toContain('data-testid="rover-dpad-backward"');
      expect(html).toContain('data-testid="rover-dpad-left"');
      expect(html).toContain('data-testid="rover-dpad-right"');
      expect(html).toContain('2.4 m/s');

      // Forward y Left activos (is-pressed + aria-pressed="true"), Backward y Right inactivos
      expect(html).toMatch(/data-testid="rover-dpad-forward"[^>]*class="[^"]*\bis-pressed\b/);
      expect(html).toMatch(/data-testid="rover-dpad-left"[^>]*class="[^"]*\bis-pressed\b/);
      expect(html).not.toMatch(/data-testid="rover-dpad-backward"[^>]*class="[^"]*\bis-pressed\b/);
      expect(html).not.toMatch(/data-testid="rover-dpad-right"[^>]*class="[^"]*\bis-pressed\b/);

      // Cada botón usa SVG geométrico limpio
      const svgMatches = html.match(/<svg\b/g) ?? [];
      expect(svgMatches).toHaveLength(4);
    }

    const disabledHtml = renderToStaticMarkup(
      React.createElement(RoverControlsOverlay, {
        lang: 'en',
        activeDirections: EMPTY_ROVER_DIRECTIONS,
        disabled: true,
        speedMps: 1.5,
        onDirectionChange: () => {},
      }),
    );
    expect(disabledHtml).toContain('ROVER OFF');
    expect(disabledHtml).toContain('is-disabled');
  });

  it('dispara onDirectionChange en pointerDown/Up/Cancel/Leave y teclado en los 4 botones', () => {
    const onDirectionChange = vi.fn<(dir: RoverDirectionKey, pressed: boolean) => void>();
    const tree = RoverControlsOverlay({
      lang: 'es',
      activeDirections: {
        forward: true,
        backward: false,
        left: false,
        right: false,
      },
      speedMps: 1.2,
      onDirectionChange,
    });
    const byId = findElementsByTestId(tree);

    const stopPropagation = vi.fn();
    const preventDefault = vi.fn();
    const mockPointerEvt = (extra: Record<string, unknown> = {}) => ({
      pointerType: 'touch',
      button: 0,
      stopPropagation,
      preventDefault,
      ...extra,
    });

    const fwdProps = byId['rover-dpad-forward'].props as Record<string, (e?: unknown) => void>;
    const leftProps = byId['rover-dpad-left'].props as Record<string, (e?: unknown) => void>;

    // Botón derecho del ratón no debe activar conducción
    leftProps.onPointerDown(mockPointerEvt({ pointerType: 'mouse', button: 2 }));
    expect(onDirectionChange).not.toHaveBeenCalled();

    // Pulsación primaria activa dirección y suelta en Up / Cancel / Leave
    leftProps.onPointerDown(mockPointerEvt());
    expect(onDirectionChange).toHaveBeenLastCalledWith('left', true);

    leftProps.onPointerUp(mockPointerEvt());
    expect(onDirectionChange).toHaveBeenLastCalledWith('left', false);

    leftProps.onPointerCancel(mockPointerEvt());
    expect(onDirectionChange).toHaveBeenLastCalledWith('left', false);

    // forward ya está pressed=true -> onPointerLeave y onBlur lo liberan
    fwdProps.onPointerLeave();
    expect(onDirectionChange).toHaveBeenLastCalledWith('forward', false);
    fwdProps.onBlur();
    expect(onDirectionChange).toHaveBeenLastCalledWith('forward', false);

    // Espacio / Enter en teclado sobre botón desactivado (backward pressed=false)
    const backProps = byId['rover-dpad-backward'].props as Record<string, (e?: unknown) => void>;
    backProps.onKeyDown({ key: ' ', stopPropagation, preventDefault });
    expect(onDirectionChange).toHaveBeenLastCalledWith('backward', true);
    backProps.onKeyUp({ key: ' ', stopPropagation, preventDefault });
    expect(onDirectionChange).toHaveBeenLastCalledWith('backward', false);
  });

  it('viewer3d.css cumple AGENTS.md: botones >= 44x44px, esquinas 2px, cero degradados ni sombras difusas', async () => {
    const fsModuleName = 'node:' + 'fs';
    const fsMod = (await import(/* @vite-ignore */ fsModuleName)) as {
      readFileSync: (file: URL, encoding: string) => string;
    };
    const cssUrl = new URL('../../../styles/viewer3d.css', import.meta.url);
    const viewer3dCss = fsMod.readFileSync(cssUrl, 'utf8');

    expect(viewer3dCss).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
    expect(viewer3dCss).not.toMatch(/box-shadow\s*:/i);

    expect(viewer3dCss).toContain('.rover-dpad-overlay');
    expect(viewer3dCss).toMatch(/\.rover-dpad-btn\s*\{[^}]*min-width:\s*44px;/s);
    expect(viewer3dCss).toMatch(/\.rover-dpad-btn\s*\{[^}]*min-height:\s*44px;/s);
    expect(viewer3dCss).toMatch(/\.rover-dpad-btn\s*\{[^}]*border-radius:\s*2px;/s);
  });
});
