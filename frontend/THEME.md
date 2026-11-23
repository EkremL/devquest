# DevQuest theme

`src/theme.css` is the shared source of truth for colors, gradients, radii, and interaction timing. `src/styles.css` applies them to the existing M0 shell. No page logic or progress feature is added by this theme.

## Palette and semantics

| Token | Color | Use |
| --- | --- | --- |
| `--color-background` | `#0B1020` | Main canvas |
| `--color-electric-blue` | `#3B82F6` | Brand gradient and graphical accents |
| `--color-aqua-teal` | `#2DD4BF` | Focus, selection, interactive accents |
| `--color-soft-purple` | `#A78BFA` | Secondary accents and planned features |
| `--color-mint` | `#A7F3D0` | Positive status |

Use `foreground`, `muted`, and `subtle` for readable text on navy surfaces. Use `on-accent` (dark navy), not white, on the full brand gradient. Electric blue is an accent rather than a small body-text color. Warning colors remain distinct from success; statuses also retain text and icons.

Tailwind automatically exposes the `@theme` colors, for example `bg-background`, `bg-surface`, `text-foreground`, `text-muted`, and `border-border`. Plain CSS can use `var(--color-surface)` and the same semantic names.

## Gradients

- `--gradient-brand`: electric blue → aqua teal → soft purple, for buttons and brand artwork.
- `--gradient-hero`: translucent brand colors over a navy surface, keeping copy readable.
- `--gradient-card`: restrained tint for selected dashboard cards.
- `--gradient-selection`: selected navigation background.
- `--gradient-progress`: reserved alias to the brand gradient for future indicators. It does not display invented progress or implement M1.

Typography uses rem-based sizes, 16px body copy, and at least 14px primary controls. Smaller 12–13px text is reserved for supporting metadata. Keep native browser scaling, visible focus outlines, and textual status labels.

Interactions use shared duration/easing tokens. Hover highlights are subtle; only the active loading icon rotates. Reduced-motion preferences disable transitions, animations, and button movement. Do not add perpetual gradient animation.

The standalone SVG favicon and HTML browser theme-color repeat the brand palette because those assets are outside the application's CSS cascade; keep them aligned when changing the theme.
