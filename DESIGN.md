---
name: Cyro
description: A readable, quiet Discord administration dashboard with Cyro's icy blue identity.
colors:
  bg: "#0c1118"
  sidebar: "#111822"
  panel: "#161e29"
  panel-hover: "#202b39"
  input: "#101720"
  border: "#303b4a"
  text: "#edf2f8"
  muted: "#bdc8d5"
  subtle: "#a1b0c2"
  accent: "#8bdafa"
  accent-soft: "#203747"
  green: "#7ee0b2"
  red: "#ff9f9f"
  yellow: "#efcf85"
  accent-hover: "#a0e4ff"
  accent-ink: "#06202c"
  selected-text: "#b9ecff"
  nav-selected: "#253747"
  module-slate-bg: "#283244"
  module-slate: "#c0cadd"
  module-lavender-bg: "#302a49"
  module-lavender: "#c6b7f7"
  module-mint-bg: "#19382f"
  module-gold-bg: "#3a3224"
  counting-tint: "#1a2231"
  counting-track: "#343b59"
  counting-lavender: "#b8adf3"
  secondary-bg: "transparent"
  secondary-text: "#d4e5ef"
  danger-bg: "#572a34"
  danger-hover: "#723848"
  danger-text: "#ffd4d4"
typography:
  headline:
    fontFamily: '"Segoe UI Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  section:
    fontFamily: '"Segoe UI Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "17px"
    fontWeight: 620
    lineHeight: 1.35
    letterSpacing: "-0.3px"
  panel-title:
    fontFamily: '"Segoe UI Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.3px"
  body:
    fontFamily: '"Segoe UI Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  field:
    fontFamily: '"Segoe UI Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '"Segoe UI Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.55
  control:
    fontFamily: '"Segoe UI Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  metric:
    fontFamily: '"Segoe UI Variable", "Segoe UI", Arial, sans-serif'
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.025em"
rounded:
  tag: "5px"
  field: "7px"
  control: "8px"
  panel: "12px"
spacing:
  compact: "8px"
  control-gap: "12px"
  small: "16px"
  section: "20px"
  panel-body: "24px"
  group: "24px"
  page-inline: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary-bg}"
    textColor: "{colors.secondary-text}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.panel-hover}"
    textColor: "{colors.text}"
  button-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-text}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  button-danger-hover:
    backgroundColor: "{colors.danger-hover}"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.text}"
    typography: "{typography.field}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  navigation:
    textColor: "{colors.muted}"
    rounded: "{rounded.field}"
    padding: "9px 12px"
  navigation-selected:
    backgroundColor: "{colors.nav-selected}"
    textColor: "{colors.selected-text}"
  tag:
    rounded: "{rounded.tag}"
    padding: "4px 7px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
  metric:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "17px 19px"
---

# Design System: Cyro

## Overview

**Direction: a familiar place to manage your community.**

Cyro's approved icy blue logo anchors a dark administration interface. Solid navy layers separate navigation, working surfaces, and fields; cyan identifies actions and selection. The layout stays familiar while larger labels, plain language and predictable spacing make repeated configuration work easier to read. This is a refinement of the existing dashboard, not a replacement layout.

This record describes the finished dashboard in `public/styles.css` and its components in `public/app.js`. The existing logo remains the identity source. Typography is the incumbent system UI stack; no separate display typeface or newly approved visual comp is implied.

**Key Characteristics:**
- Icy cyan actions against dark navy surfaces.
- Mint, lavender, and gold feature icons with a restrained lavender tint in counting.
- Flat panels, visible borders, and legible secondary text without glass, glow or decorative gradients.
- Grouped server navigation with persistent selection.
- Familiar form controls, searchable server/channel/role pickers, and explicit state feedback.
- Responsive layouts that keep administration usable on small screens.

## Colors

The palette extends the approved logo's icy blue character through cyan primary controls and layered navy neutrals. The user-approved earlier dashboard reference also supplies mint, lavender, and gold feature accents; retain this variety instead of flattening every icon to cyan. Frontmatter values are normative; names below explain their use.

### Primary

- **Ice cyan** (`accent`): primary buttons, links, checked toggles, active navigation markers, and the start of counting progress.
- **Pale ice** (`accent-hover`): primary hover and general keyboard focus.
- **Deep ice ink** (`accent-ink`): text on cyan fills and the checked toggle thumb.
- **Cyan wash** (`accent-soft`): selected tabs. **Selected navy** (`nav-selected`), pale ice text and cyan icons identify the current page.

### Feature accents

- Moderation icons use mint (`green`) on `module-mint-bg`.
- Welcome and roles icons use `module-lavender` on `module-lavender-bg`.
- Invite icons use gold (`yellow`) on `module-gold-bg`.
- Other feature icons use `module-slate` on `module-slate-bg`.
- The counting showcase has a solid lavender navy surface (`counting-tint`). Its progress track is `counting-track`; its fill moves from ice cyan to `counting-lavender` to show progress toward the record.
- These accents identify features, not enabled or disabled states. Keep the accompanying labels and existing status badges; do not recolor primary buttons or general links to match each module.

### Neutral

- **Night navy** (`bg`): document and workspace background.
- **Sidebar navy** (`sidebar`): persistent server navigation.
- **Panel navy** (`panel`): cards and primary working containers.
- **Raised navy** (`panel-hover`): interactive row and secondary-control hover.
- **Field navy** (`input`): editable control surfaces.
- **Slate boundary** (`border`): panel edges, dividers, and secondary-control strokes.
- **Ice white**, **secondary slate**, and **hint slate** (`text`, `muted`, `subtle`): the three principal text roles.
- `secondary-bg` and `secondary-text` provide the resting secondary-button treatment.

### Semantic states

- `green`: successful saves, enabled state, and connection status.
- `red`: field errors and failed save feedback.
- `yellow`: warnings, review requirements, and ranking emphasis.
- `danger-bg`, `danger-hover`, and `danger-text`: destructive action buttons.

**The State Color Rule.** Keep cyan for primary interaction and selection markers; preserve green, red, and amber for the implemented status meanings. Feature icons may use the defined mint and gold accents, but state labels and badges must remain explicit.

## Typography

**UI Font:** Segoe UI Variable, Segoe UI, Arial, sans-serif.
**Identifier Font:** Consolas, monospace, for code and technical identifiers.

**Character:** A compact system UI hierarchy uses weight and scale to support scanning. Tabular numerals align metrics, counts, and table values.

### Hierarchy

- **Headline:** `headline` identifies the current dashboard page; it becomes 27px at the mobile breakpoint.
- **Section:** `section` is the default secondary heading.
- **Panel title:** `panel-title` is the denser container heading.
- **Body:** `body` is the base reading style.
- **Field:** `field` is the shared editable-control text.
- **Label:** `label` supports form labels; contextual text uses the same compact size with its own weight and color.
- **Control:** `control` labels primary and secondary actions.
- **Metric:** `metric` emphasizes numeric summaries; it becomes 28px on mobile.
- Form hints and most supporting metadata use 13px. Settings explanations and context-card copy use 14px; page summaries and ordinary body text use 15px. Editable controls become 16px on mobile. Table headings use sentence case, not tracked capitals.

The login headline and counting showcase have surface-specific larger sizes. They are not a general display scale for new dashboard surfaces.

**The Numeric Alignment Rule.** Use tabular numerals for comparable values and retain explanatory labels beside statistics.

## Layout

The desktop shell has a fixed-width sidebar and a flexible workspace. The default sidebar is 248px; it becomes 218px at 1150px and below, or 260px from 1650px. Main content is centered with a 1500px maximum width and default padding of 28px 32px 44px.

The overview uses a wider working column and narrower supporting column. Settings use a flexible form with a 300px context column, reducing to 275px on smaller desktops. Repeated panel gaps are 20–24px; panel bodies and form sections use 24px padding. Field rows use two columns where space permits.

At 950px and below, primary dashboard and settings columns collapse. Metrics use two columns, with count-aware layouts for two or three metrics. At 720px and below, the sidebar becomes a 272px drawer, main content uses 24px 16px 32px padding, field rows stack, and streamer statistics become labeled record grids. At the same breakpoint, creator cards put identity above account actions.

The top bar keeps server context and account actions visible when space permits. Longer breadcrumb context and connection status yield space at narrower widths. Navigation can scroll within the viewport. Short desktop viewports use denser navigation spacing.

## Elevation & Depth

Resting panels use tonal layering and thin borders. They do not use card shadows. Shadows are reserved for the transient toast and confirmation dialog; overlays dim the inactive background.

### Shadow Vocabulary

- **Toast:** `0 12px 40px #0005`, for a temporary save or error message.
- **Dialog:** `0 24px 80px #0009`, for the blocking confirmation surface.
- **Dialog backdrop:** `#040b12cc`; the mobile drawer overlay uses `#0009`.

**The Flat Surface Rule.** Keep ordinary panels flat; use the implemented overlays and shadows for transient feedback and blocking interactions.

## Shapes

Panels share the `panel` radius. Fields and navigation use `field`; buttons and the guild selector use `control`; compact tags use `tag`. The logo and user avatar are circular. Repeated one-pixel borders separate rows and define containers without additional decoration.

The stream editor footer is a flat continuation of its panel: a top divider, transparent background, and no independent corner radius. The general settings save bar remains a distinct softly rounded surface.

## Components

### Buttons

Cyan primary actions pair with quieter, outlined secondary actions and muted red destructive actions. Their tokenized padding and typography are shared; the default minimum height is 42px. Small variants use 36px minimum height.

Hover changes the fill. Pressing an enabled button shifts it down 1px. Disabled buttons use 0.55 opacity and a not-allowed cursor. General keyboard focus uses a two-pixel pale ice outline with four-pixel offset.

### Chips

Tags are compact, noninteractive status labels with a thin border. The base treatment is blue; green, muted, and amber variants express state. Preserve the text label so meaning is not carried by color alone.

### Cards / Containers

Panels use the shared solid navy fill, border, and corner radius. Headers divide from their contents with a rule, and body padding follows the documented spacing. Creator cards group one identity with separate platform account rows. Interactive rows adopt the shared panel-hover fill. Reserve shadows for transient popovers, toast feedback and dialogs; ordinary cards do not use blur or shadows.

### Inputs / Fields

Native inputs, selects, and textareas use the field surface, a slate stroke, and the field radius. Default controls have 43px minimum height. Hover strengthens the stroke; keyboard focus uses a two-pixel cyan outline with three-pixel offset. Textareas can resize vertically.

Labels remain outside the control, hints sit below, and errors use the semantic error color. Disabled fields use reduced opacity and a not-allowed cursor. Server, channel and role selectors expose search by name or ID while retaining a native backing select; their popover escapes clipping containers and supports keyboard selection. Multiple-role selections remain selected while filtering.

### Navigation

The grouped sidebar combines line icons and text. The selected link uses a solid navy highlight, pale ice text and a cyan icon; `aria-current="page"` carries its meaning. Default links use muted text and a subtle hover surface. Mobile links have a 44px minimum height. Getting started sits directly below Overview so setup guidance and commands remain easy to find.

On mobile, the drawer opens with focus on the current page or server selector. Focus remains inside the drawer, Escape closes it, the underlying workspace is inert, and closing restores focus to the menu button. The closed drawer is hidden from interaction.

### Toggles and tabs

Toggles use a pill track and circular thumb, cyan for checked state, and a visible keyboard outline. Tabs group compact buttons within a navy frame; the selected state uses cyan wash and pale ice text.

### Save feedback and editor footers

Settings keep their save bar sticky near the viewport bottom, with explicit unsaved, success, and error text. Stream and creator editors instead keep a flat footer within the editor panel; on mobile its actions wrap below the status. Toasts announce outcomes through a live status region.

### Staff activity

The staff leaderboard supports member name/ID search, activity filters and explicit sorting. Period totals stay visible above the table. Rank follows the chosen sort before filters; missing response averages appear last and display as a dash. Current assigned workload is labeled separately from period activity. The table becomes labeled staff records on mobile, and explanatory copy defines the metrics without suggesting that activity counts measure staff quality.

### Reference patterns

The refinement uses the field grouping, restrained controls and filterable table patterns documented by [shadcn/ui Field](https://ui.shadcn.com/docs/components/base/field) and [Data Table](https://ui.shadcn.com/docs/components/base/data-table). These are design references only; Cyro remains vanilla JavaScript with its existing controls and no added React or component-library dependency.

### Motion

Navigation state transitions take 150ms, button states take 180ms, and fields, toggles, and the drawer use 200ms. Reduced-motion preference removes transitions and animation. The loading indicator is functional feedback, not a general motion treatment.

## Do's and Don'ts

### Do:

- **Do** keep the approved Cyro logo unmodified and match its icy blue identity.
- **Do** use the shared navy surfaces, borders, cyan controls, and defined feature accents.
- **Do** keep labels, hints, and numeric context visible.
- **Do** preserve keyboard focus, native controls, drawer containment, and reduced-motion behavior.
- **Do** use a flat footer inside stream and creator editor panels.

### Don't:

- **Don't** turn each module into a separate brand theme. Keep primary actions cyan while preserving the approved mint, lavender, and gold feature icons and subtle lavender counting and navigation surfaces.
- **Don't** use status color as the only description of a state.
- **Don't** apply toast or dialog shadows to ordinary panels.
- **Don't** turn surface-specific large text or unused decorative selectors into a new dashboard type system.
