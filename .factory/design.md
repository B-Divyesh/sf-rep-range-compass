# Rep Range Compass — visual thesis

## Direction

**Luminous glass data landscape.** The interface feels like a compact training instrument seen at the edge of a dark gym: smoked glass planes, cool mineral light, and one warm signal reserved for the next decision. It is intentionally a single dark treatment. A pale theme would break the low-glare, between-sets use case and turn the glass layers into decoration rather than hierarchy.

This is a decision card, not a workout catalogue. The current cue is the brightest and largest object; configuration and history recede into translucent layers. The generated landscape visualizes progression as a sequence of attainable plateaus, rather than using stock fitness photography or a generic gradient hero.

## Color tokens

| Token | Value | Role |
| --- | --- | --- |
| `--ink-950` | `#07100f` | page background |
| `--ink-900` | `#0b1716` | deep surface |
| `--glass` | `rgba(22, 45, 42, .72)` | primary glass surface |
| `--glass-strong` | `#18312e` | opaque fallback/input surface |
| `--line` | `#365b55` | controls and dividers |
| `--text` | `#f4f8f3` | primary text (17.7:1 on background) |
| `--muted` | `#b7c8c2` | secondary text (10.4:1 on background) |
| `--phosphor` | `#9cf4d5` | active/focus cue |
| `--phosphor-ink` | `#052019` | text on phosphor |
| `--signal` | `#ffc66f` | next-decision highlight |
| `--success` | `#9cf4d5` | earned increase, always paired with words/icon |
| `--warning` | `#ffd28a` | repeat/caution, always paired with words/icon |
| `--danger` | `#ffaaa2` | errors/destructive actions |

The palette comes from oxidized steel, rubber plates, mint display phosphor, and the amber readiness lamps on training equipment. Contrast is designed against both `--ink-950` and opaque control surfaces. Color never carries state alone.

## Typography

- Display and UI: `Inter`, `Avenir Next`, `Segoe UI`, system sans-serif. No network font dependency; strong weights and slightly tight tracking make the current numbers instrument-like without becoming sci-fi.
- Numeric/data accent: `ui-monospace`, `SFMono-Regular`, `Cascadia Code`, monospace. Tabular figures are used for weights, reps, and dates.
- Scale: 0.75rem label, 0.875rem meta, 1rem body, 1.25rem section, clamp(2rem, 8vw, 4.5rem) decision figure.
- Body copy is at least 16px, with 1.5 line height and a maximum readable measure of 68 characters.

## Spacing and shape

- 4px base rhythm; primary steps: 4, 8, 12, 16, 24, 32, 48, 64px.
- Dense input clusters use 12–16px; independent sections use 32–48px.
- Corner vocabulary: 12px controls, 20px cards, 999px status pills. Glass surfaces use a subtle top-edge highlight, not borders on every side.
- All controls are at least 44px tall, with 8px between adjacent targets.

## Interaction grammar

- The active set is presented as a compass bearing: **SET 2 OF 3**, the target rep range, then the log controls directly beneath it.
- Submitting a set causes the cue panel to cross-fade and rise by 6px, communicating forward progress. An earned increase changes both wording and the warm signal notch.
- Settings and data tools use native disclosure controls so keyboard and assistive-technology behavior remains predictable.
- Destructive history clearing requires an explicit confirmation. Import validates the entire file and reports row-level errors before replacing nothing.
- Mobile drops the large landscape crop and secondary explanatory copy before it compresses the decision controls.

## Motion policy

- 180–240ms ease-out transitions for opacity and transform only.
- No ambient looping animation. A single soft bloom accompanies a newly earned increase.
- Under `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed; state changes become immediate opacity changes.

## Original asset plan and provenance

### `assets/src/progression-landscape.png`

- Purpose: atmospheric, explanatory masthead art showing a progression pathway rather than decorative gym imagery.
- Model/tool: Azure OpenAI image deployment `factory-image`, invoked with `/opt/fleet/lib/gen-image.sh`.
- Creation date: 2026-08-28.
- License/provenance: original AI-generated artwork commissioned for this product; no supplied reference image and no depicted person or brand.
- Production derivatives: responsive WebP files at 640px and 1280px wide, each kept below 300 KB. Source is retained with a JSON prompt sidecar.

Prompt sheet:

> Use case: stylized-concept. Asset type: wide PWA masthead illustration. Primary request: an abstract rep progression landscape made from three ascending translucent glass platforms, each platform carrying a tiny sequence of engraved circular marks that suggests completed sets without readable text. Scene/backdrop: deep near-black mineral-green void with faint topographic contour lines and open negative space. Subject: three low glass plateaus ascending from lower left to upper right, with the final plateau catching a small amber beacon. Style/medium: premium editorial 3D still life, physically plausible frosted glass and brushed dark metal, crisp but quiet. Composition/framing: wide 3:2 landscape, low oblique camera, platforms occupy the lower two-thirds, no central object blocking crop flexibility. Lighting/mood: cool mint edge light, restrained amber destination light, calm focus between sets. Color palette: ink green, oxidized teal, pale phosphor mint, one amber signal. Materials/textures: smoked glass, lightly scratched rubber, dark anodized metal. Constraints: abstract objects only, no people, no gym machines, no dumbbells, no UI screenshot, no text, no logos, no watermark. Avoid: purple/blue generic tech gradient, neon cyberpunk city, excessive glow, illegible symbols, clutter, brand marks, anatomy.

Review criteria: no text artifacts, logos, pseudo-brands, people/anatomy, or misleading product UI; coherent three-step ascent; enough dark negative space for responsive crops; palette matches the interface.

## Hand-authored assets

- Compass mark and app icons are original geometric SVG/PNG derivatives built from a north notch, plate ring, and three rep ticks. They use the product tokens and contain no third-party marks.
- All interface icons are inline, hand-authored SVG with accessible text labels on their controls.

