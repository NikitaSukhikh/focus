# Global Design Notes (26 Dec 2025)

## Frontend Stack
| Area | Details |
| --- | --- |
| Markup & Styling | HTML + hand-authored CSS (no framework); heavy use of gradients, shadows, backdrop-filter, transitions. Global token palette declared in `:root`. |
| JavaScript | Modern ES module bundle loaded from `/assets/...js` (bundled output). |
| UI Libraries | None detected (no Tailwind/Bootstrap/Material-UI/Chakra/GSAP/Framer Motion). |

## Typography & Icons
| Item | Details |
| --- | --- |
| Fonts | Google Fonts: Inter, Orbitron, Rajdhani, Share Tech Mono (and related families). |
| Usage | Orbitron for headings/logo; Inter/Rajdhani for body/secondary text; Share Tech Mono for monospace cases. |
| Icons | Google Material Icons via `fonts.googleapis.com`. |


## Global Design Tokens (CSS Variables)
Defined in `:root` and referenced with `var(--token)` across components.

| Token | Value | Intended Role / Notes |
| --- | --- | --- |
| `--primary-color` | `#4CAF50` | Primary brand green. |
| `--primary-dark` | `#3e8e41` | Darker green for gradients. |
| `--primary-light` | `#81C784` | Light green accents. |
| `--secondary-color` | `#757575` | Neutral secondary. |
| `--background-dark` | `#050510` | Deep background. |
| `--background-light` | `#0a0a20` | Lighter panel background. |
| `--text-color` | `#f5f5f5` | Default text. |
| `--accent-color` | `#FFC107` | Accent (amber). |
| `--error-color` / `--error` | `#f44336` | Error (note duplicated token names). |
| `--success-color` / `--success` | `#4CAF50` | Success. |
| `--warning-color` / `--warning` | `#ff9800` | Warning. |
| `--info-color` / `--info` | `#2196F3` / `#2196f3` | Info (case variation present). |
| `--border-radius` | `12px` | Global rounding. |
| `--shadow` | `rgba(76, 175, 80, 0.3)` | Green-tinted shadow. |
| `--glow` | `rgba(76, 175, 80, 0.6)` | Green glow for text/box-shadows. |



## Motion Approach
| Aspect | Details |
| --- | --- |
| Keyframes | Glow loops for stem names and scan-line effects (waveform). |
| Transitions | Hover-based lift/scale, glow shadows, color changes (commonly 0.2–0.3s ease). |
| Libraries | No dedicated animation libraries detected; motion is CSS-driven. |
