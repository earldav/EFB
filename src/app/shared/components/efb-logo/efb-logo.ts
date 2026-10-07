import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-efb-logo',
  imports: [],
  template: `
    <div class="logo" role="img" aria-label="EFB, Electronic Flight Bag">
      <div class="mark" [style.gap.px]="gapPx()">
        <svg
          [style.width.px]="size()"
          [style.height.px]="size()"
          viewBox="0 0 52 52"
          aria-hidden="true"
        >
          <path d="M6 30 L46 10 L30 28 L34 44 L27 34 L17 40 L20 27 Z" fill="var(--efb-amber)" />
        </svg>
        <span class="wordmark" [style.fontSize.px]="wordmarkSize()">EFB</span>
      </div>

      @if (tagline()) {
        <span class="tagline" [style.fontSize.px]="taglineSize()">{{ tagline() }}</span>
      }
    </div>
  `,
  styles: `
    .logo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.625rem;
    }
    .mark {
      display: flex;
      align-items: center;
    }
    svg {
      flex-shrink: 0;
      display: block;
    }
    .wordmark {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-weight: 800;
      letter-spacing: 0.06em;
      line-height: 1;
      color: var(--efb-text);
    }
    .tagline {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      letter-spacing: 0.3em;
      padding-left: 0.3em;
      color: var(--efb-text-dim);
    }
  `,
})
export class EfbLogo {
  /** Tamaño del avión en píxeles. */
  size = input<number>(46);
  /** Tamaño de la palabra EFB en píxeles. */
  wordmarkSize = input<number>(42);
  tagline = input<string>('');

  gapPx = computed(() => Math.round(this.size() * 0.3));
  taglineSize = computed(() => Math.max(11, Math.round(this.wordmarkSize() * 0.3)));
}