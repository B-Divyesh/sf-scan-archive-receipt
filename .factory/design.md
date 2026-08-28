# Scan Archive Receipt — visual thesis

## Direction: the checksum workbench

The interface borrows the pixel/demoscene language of early home-computer archive utilities, but uses it as an information system rather than nostalgia. A dark navy workbench, phosphor-mint status pixels, amber accession marks, stepped corners, dotted registration rails, and monospace numerals make each scan feel like a physical item being logged. The visual metaphor is a conservation bench: the content is the artifact, and the UI is the careful pencil record around it.

This direction fits the product because preservation work is procedural and exact. Pixel marks communicate sequence, completeness, and machine-verifiable checksums without making family photographs look like disposable social media posts.

## Palette

The product is intentionally single-mode: a dark inspection-room treatment keeps image previews legible and makes prolonged batch work calm. The background is always explicitly painted.

- `ink-950 #071412`: near-black green, background
- `ink-900 #0D201C`: work surface
- `ink-800 #153129`: raised surface
- `paper #F2F4DF`: primary text (14.0:1 on background)
- `paper-muted #B8C7AF`: secondary text (8.7:1 on background)
- `mint #71F6B5`: primary action/status (14.4:1 on background); dark ink text on mint
- `amber #FFC857`: sequence/warning (12.3:1 on background)
- `coral #FF786B`: errors and destructive accents (7.0:1 on background)
- `sky #70CFFF`: information/offline state (10.2:1 on background)
- outlines use `#47685C`, never color alone; every state also has a label or icon.

## Type

- Display and interface: `Courier New`, Courier, monospace. Its fixed cells evoke catalog cards and make checksums/order values align. Bold, slightly tracked uppercase is reserved for labels and the single h1.
- Reading copy: system UI (`Inter`-like platform sans stack) for clear 16–18 px prose without a network font request.
- Scale: 14 / 16 / 18 / 24 / clamp(32–54) px. Body is 16 px minimum. Numeric columns use tabular figures.

## Spacing and shape

- 4 px base; primary rhythm 8, 12, 16, 24, 32, 48, 64 px.
- Maximum work area 1180 px; copy measure 68 characters.
- Corners are clipped/stepped using `clip-path`, not rounded cards. One-pixel borders and offset shadows create physical layers.
- Controls are at least 44 px high; desktop batch rows become vertically stacked editing blocks at 720 px.

## Interaction grammar

- Mint means “advance or complete”; amber means “sequence needs attention”; coral means “stop/review.” Labels and icons repeat the meaning.
- Imported files enter a numbered reel strip. Editing a row updates its receipt status in place. Batch defaults apply forward without overwriting explicit item values.
- The primary journey stays linear: Start batch → Import originals → Describe → Verify → Export receipt.
- The tool never alters originals. Image bytes are read only to preview and hash; previews are ephemeral object URLs and are not persisted.

## Motion

- 180 ms opacity/transform transitions for panels that enter from their source; checksum progress fills left-to-right over 240 ms.
- No looping animation. A brief stepped cursor/pixel accent may move only during active hashing.
- Under `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and state changes are instant.

## Asset plan and provenance

- Hero: original AI-generated pixel-art conservation workbench, used only as a conceptual illustration (not a claim about scan enhancement). Generated 2026-08-28 with the `factory-image` Azure AI Foundry deployment via `/opt/fleet/lib/gen-image.sh`; original product asset under the repository MIT license. Reviewed for anatomy, seams, text artifacts, unintended symbols, brands, and palette fit; no defects found. Shipped as 480/960/1440 px WebP (12/44/84 KB) with a 960 px JPEG fallback (64 KB).
- Hand-authored SVG app icons: a scan frame around a catalog card with a checksum tick. Original to this product, 2026-08-28, MIT.
- No third-party imagery, icon library, font, script, or CDN.

### Hero prompt sheet

Use case: stylized-concept. Asset type: wide landing-page hero illustration. Subject: a family-archive conservation desk seen in slightly elevated three-quarter view, with a strip of unlabeled photographic slides, a careful catalog card, cotton gloves, and a tiny checksum grid on a dark inspection mat. World/materials: late-1980s demoscene pixel-art interpreted with modern editorial restraint, crisp low-resolution clusters, 1-bit dithering, screenprint texture, no glossy 3D. Light: focused warm desk-lamp pool with cool dark surroundings. Lens/composition: wide 3:2, subject weighted right with calm negative space at left, no people. Palette words: near-black green, paper cream, phosphor mint, archive amber, a small coral accent. Avoid: text, letters, numerals, watermarks, logos, brands, real people, faces, photo-realism, gradients, neon cyberpunk, scanner device UI, illegible pseudo-writing, magical restoration effects.
