# Design System Specification: Sovereign Commerce

## 1. Brand Identity & Aesthetic Direction
**Theme Name**: Sovereign Commerce  
**Design Category**: Corporate / Modern FinTech  
**Target Device**: Desktop-first responsive (1440px desktop canvas, 8-column tablet, 4-column mobile)  
**Core Brand Personality**: Institutional Authority, Operational Integrity, Financial Precision, Modern Agility

The Sovereign Commerce design system establishes an uncompromised high-trust environment tailored for enterprise procurement, verified wholesale transactions, and seamless business-to-business commerce. It synthesizes the fiscal clarity of Tier-1 FinTech banking infrastructure with the utilitarian data density required by commercial trade platforms.

---

## 2. Color Palette & Tonal System

The color palette conveys rigorous institutional stability paired with crisp operational feedback:

### Primary Tonal Hierarchy (Obsidian Navy Continuum)
- **Obsidian Navy (`#0F172A`)**: Primary brand color. Applied to dominant typography, navigation bars, primary CTA buttons, and critical container boundaries.
- **Deep Royal (`#1E3A8A`)**: Interactive hover states, secondary accents, active selection chips, and data focus rings.
- **Bright Cobalt (`#1D4ED8`)**: Hyper-focused input outlines, active hyperlinks, and selected filter checkboxes.
- **Container Navy (`#131B2E`)**: Dark contrast panels and high-priority card headers.

### Affirmation & Truth (Verification Emerald)
- **Emerald Primary (`#10B981`)**: Strictly reserved for system truth, verified supplier marks, GST-cleared tags, completed payments, and positive growth indicators.
- **Deep Emerald (`#059669`)**: Hover state on affirmative action buttons.
- **Emerald Container (`#002113`)**: High-contrast dark badge backgrounds.
- **Emerald Tint (`rgba(16, 185, 129, 0.10)`)**: Soft pill backgrounds for verified status badges.

### Transactional Warning & Escrow (Transactional Amber)
- **Amber Primary (`#F59E0B`)**: Denotes transitional states: funds held in escrow, awaiting authorization, draft RFQs, e-way bill validations.
- **Amber Deep (`#D97706`)**: Hover states and high-contrast alert borders.
- **Amber Soft (`rgba(245, 158, 11, 0.10)`)**: Escrow milestone pending badges.

### Neutral Canvas & Structural Borders
- **Base Canvas (`#F8FAFC`)**: Clean, subtle off-white background preventing optical fatigue.
- **Card Surface (`#FFFFFF`)**: Pure white card surfaces to elevate critical data blocks.
- **Structural Border (`#E2E8F0`)**: Crisp 1px boundary for cards, tables, and dividers.
- **Active Border (`#CBD5E1`)**: Subtle emphasis border for input fields and table headers.

---

## 3. Typography Scale & Hierarchy

The dual-type system pairs **Plus Jakarta Sans** for structural wayfinding, brand markers, and numerical metrics with **Inter** for dense transactional tables, data forms, and multi-line body text.

| Token | Family | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display-lg` | Plus Jakarta Sans | 48px | 700 (Bold) | 56px | -0.03em | Hero headlines |
| `headline-xl` | Plus Jakarta Sans | 32px | 700 (Bold) | 40px | -0.02em | Page titles, Dashboard hero |
| `headline-lg` | Plus Jakarta Sans | 24px | 600 (Semi) | 32px | -0.015em | Section headers |
| `headline-md` | Plus Jakarta Sans | 20px | 600 (Semi) | 28px | -0.01em | Modal headers, Card titles |
| `numerical-metric` | Plus Jakarta Sans | 28px | 700 (Bold) | 36px | -0.02em | Currency figures, Escrow totals |
| `title-lg` | Plus Jakarta Sans | 18px | 600 (Semi) | 26px | -0.005em | Subheadings, Table summary |
| `body-lg` | Inter | 16px | 400 (Regular)| 24px | 0.00em | Long-form reading |
| `body-md` | Inter | 14px | 400 (Regular)| 20px | 0.00em | Standard table cells, Descriptions |
| `body-sm` | Inter | 12px | 400 (Regular)| 18px | +0.005em | Microcopy, Timestamps, Helper text |
| `label-lg` | Inter | 14px | 600 (Semi) | 20px | +0.01em | Button labels, Form headers |
| `label-md` | Inter | 12px | 600 (Semi) | 16px | +0.02em | Table headers (uppercase), HSN tags |
| `label-sm` | Inter | 11px | 600 (Semi) | 14px | +0.04em | Status pills, Verification badges |

---

## 4. Spacing, Grid & Layout Rules
- **Base Rhythm**: 4px / 8px incremental scale (`space-xs`: 4px, `space-sm`: 8px, `space-md`: 16px, `space-lg`: 24px, `space-xl`: 32px).
- **Desktop Grid**: 12 columns, 24px gutters (`1.5rem`), 32px outer margin (`2rem`). Max container width locked at `1440px`.
- **Corner Radii**:
  - `rounded-lg` (`16px` / `1rem`): Primary module cards, dashboard widgets, modal containers.
  - `rounded` (`8px` / `0.5rem`): Buttons, text inputs, dropdown triggers, search inputs.
  - `rounded-full` (`9999px`): Verification pills, transaction status chips, user avatars.

---

## 5. Elevation & Ambient Shadows
Heavy or dark drop shadows are strictly prohibited. Visual depth is established via layered surfaces paired with ambient micro-diffused shadows:
- **Level 0 (Canvas)**: `#F8FAFC` flat.
- **Level 1 (Card & Content Blocks)**: `#FFFFFF` surface with 1px border `#E2E8F0` and shadow `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Hover States, Active Cards)**: Lifted with `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)` and border `#CBD5E1`.
- **Level 3 (Modals, Overlays)**: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.03)`.

---

## 6. Core Component Guidelines

### Buttons
- **Primary CTA**: `#0F172A` background, pure white text, 8px radius, `px-5 py-2.5`, hover `#1E3A8A`.
- **Secondary CTA**: Pure white background, 1px border `#CBD5E1`, text `#0F172A`, hover `#F8FAFC`.
- **Affirmative / Release**: `#10B981` background, white text. Reserved for final escrow release or order authorization.
- **Destructive**: `#EF4444` background, white text. Reserved for order dispute or cancellation.

### Verification Badges
- Capsule pills (`rounded-full`), `px-3 py-1`, `label-sm`.
- **Verified Supplier**: Background `rgba(16, 185, 129, 0.10)`, text `#047857`, border `1px solid rgba(16, 185, 129, 0.25)` with a checkmark glyph.
- **Escrow Secured**: Background `rgba(245, 158, 11, 0.10)`, text `#B45309`, border `1px solid rgba(245, 158, 11, 0.25)` with a shield glyph.
