import { Component, computed, input } from '@angular/core';
import type { PlateFrame } from '../../../data/chart-geo';
import type { DrawSymbol, PlateDrawing } from '../../../data/chart-drawing';

@Component({
  selector: 'app-chart-canvas',
  imports: [],
  template: `
    <svg class="plate-svg" [attr.viewBox]="viewBox()" role="img" aria-label="Chart plan view">
      <defs>
        <filter id="chart-map-tone" color-interpolation-filters="sRGB">
          <feColorMatrix type="saturate" values="0.25" />
        </filter>
      </defs>

      <rect x="0" y="0" [attr.width]="frame().width" [attr.height]="frame().height" fill="#f4f1e8" />

      @if (frame().hasTiles) {
        <g filter="url(#chart-map-tone)" opacity="0.7">
          @for (t of frame().tiles; track t.url) {
            <image
              [attr.href]="t.url"
              [attr.x]="t.x"
              [attr.y]="t.y"
              [attr.width]="t.size"
              [attr.height]="t.size"
              preserveAspectRatio="none"
            />
          }
        </g>
        <rect x="0" y="0" [attr.width]="frame().width" [attr.height]="frame().height" fill="#f4f1e8" opacity="0.22" />
      }

      @for (p of drawing().paths; track $index) {
        <path class="halo" [attr.d]="p.d" />
      }
      @for (p of drawing().paths; track $index) {
        <path
          class="ln"
          [class.track]="p.style === 'track'"
          [class.missed]="p.style === 'missed'"
          [class.thin]="p.style === 'thin'"
          [class.dash]="p.style === 'dash'"
          [class.taxi]="p.style === 'taxi'"
          [attr.d]="p.d"
        />
      }

      @for (g of drawing().polys; track $index) {
        <polygon [attr.points]="g.points" [attr.fill]="g.fill" [attr.stroke]="g.stroke" stroke-width="0.8" />
      }

      @for (s of drawing().symbols; track $index) {
        @switch (s.kind) {
          @case ('faf') {
            <path class="sym" fill="none" [attr.d]="cross(s)" />
          }
          @case ('mahf') {
            <polygon class="sym" fill="#1a1a1a" [attr.points]="tri(s)" />
          }
          @case ('wpt') {
            <polygon class="sym" fill="#f4f1e8" [attr.points]="diamond(s)" />
          }
          @default {
            <polygon class="sym" fill="#f4f1e8" [attr.points]="tri(s)" />
          }
        }
      }

      @for (l of drawing().labels; track $index) {
        <text
          class="lbl"
          [attr.x]="l.x"
          [attr.y]="l.y"
          [attr.text-anchor]="l.anchor"
          [attr.font-weight]="l.weight"
          [attr.transform]="l.transform"
          >{{ l.text }}</text
        >
      }

      <line class="ink" x1="22" y1="52" x2="22" y2="28" />
      <polygon points="22,20 17.5,30 26.5,30" fill="#1a1a1a" />
      <text class="lbl" x="22" y="64" text-anchor="middle" font-weight="700">N</text>

      @if (msaFt(); as msa) {
        <circle
          [attr.cx]="frame().width - 36"
          cy="44"
          r="26"
          fill="#f4f1e8"
          fill-opacity="0.92"
          stroke="#1a1a1a"
          stroke-width="1"
        />
        <text class="lbl" [attr.x]="frame().width - 36" y="46" text-anchor="middle" font-weight="700">{{ msa }}</text>
        <text class="lbl" [attr.x]="frame().width - 36" y="57" text-anchor="middle">MSA</text>
      }

      <line class="ink" [attr.x1]="scale().x0" [attr.y1]="scale().y" [attr.x2]="scale().x1" [attr.y2]="scale().y" />
      <path class="ink" [attr.d]="scale().ticks" />
      <text class="lbl" [attr.x]="scale().x0" [attr.y]="scale().y - 6" text-anchor="middle">0</text>
      <text class="lbl" [attr.x]="scale().x1 + 4" [attr.y]="scale().y + 3">{{ scale().label }}</text>

      @if (frame().hasTiles) {
        <text
          class="lbl attrib"
          [attr.x]="frame().width - 4"
          [attr.y]="frame().height - 4"
          text-anchor="end"
          >© OpenStreetMap contributors</text
        >
      }
    </svg>
  `,
  styles: `
    .plate-svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .halo {
      fill: none;
      stroke: #f4f1e8;
      stroke-width: 5;
      stroke-linejoin: round;
      opacity: 0.75;
    }
    .ln {
      fill: none;
      stroke: #1a1a1a;
      stroke-linejoin: round;
    }
    .ln.track {
      stroke-width: 2;
    }
    .ln.missed {
      stroke-width: 1.6;
      stroke-dasharray: 6 4;
    }
    .ln.thin {
      stroke-width: 1.2;
    }
    .ln.dash {
      stroke-width: 1.2;
      stroke-dasharray: 4 3;
    }
    .ln.taxi {
      stroke: #7a7a6a;
      stroke-width: 2.8;
    }
    .sym {
      stroke: #1a1a1a;
      stroke-width: 1.6;
    }
    .ink {
      stroke: #1a1a1a;
      stroke-width: 1.4;
      fill: none;
    }
    .lbl {
      font-family: var(--font-data), monospace;
      font-size: 9px;
      fill: #1a1a1a;
      paint-order: stroke;
      stroke: #f4f1e8;
      stroke-width: 2.6px;
      stroke-linejoin: round;
    }
    .attrib {
      font-size: 7px;
    }
  `,
})
export class ChartCanvas {
  frame = input.required<PlateFrame>();
  drawing = input.required<PlateDrawing>();
  msaFt = input<number | null>(null);
  /** Unidad de la barra de escala: millas nauticas o metros. */
  scaleUnit = input<'NM' | 'M'>('NM');

  viewBox = computed(() => `0 0 ${this.frame().width} ${this.frame().height}`);

  /** Barra de escala: el primer paso "redondo" que mide al menos 45 px. */
  scale = computed(() => {
    const f = this.frame();
    const meters = this.scaleUnit() === 'M';
    const steps = meters ? [100, 200, 500, 1000, 2000, 5000] : [0.5, 1, 2, 5, 10, 20, 50];
    const px = (v: number) => (meters ? (v / 1852) * f.pxPerNm : v * f.pxPerNm);
    const chosen = steps.find((v) => px(v) >= 45) ?? steps[steps.length - 1];
    const len = px(chosen);
    const x0 = 16;
    const y = f.height - 16;
    const x1 = x0 + len;
    const xm = x0 + len / 2;
    return {
      x0,
      x1,
      y,
      label: `${chosen} ${meters ? 'M' : 'NM'}`,
      ticks: `M${x0},${y - 3} V${y + 3} M${xm},${y - 3} V${y + 3} M${x1},${y - 3} V${y + 3}`,
    };
  });

  tri(s: DrawSymbol): string {
    return `${s.x},${s.y - 6} ${s.x - 5.2},${s.y + 4} ${s.x + 5.2},${s.y + 4}`;
  }

  diamond(s: DrawSymbol): string {
    return `${s.x},${s.y - 5.5} ${s.x + 4.5},${s.y} ${s.x},${s.y + 5.5} ${s.x - 4.5},${s.y}`;
  }

  cross(s: DrawSymbol): string {
    const d = 5;
    return `M${s.x - d},${s.y - d} L${s.x + d},${s.y + d} M${s.x + d},${s.y - d} L${s.x - d},${s.y + d}`;
  }
}