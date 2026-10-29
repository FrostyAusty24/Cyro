---
name: Cyro
description: A readable midnight dashboard with blue glass cards and outlined icon tiles.
colors:
  bg: "#070b11"
  sidebar: "#0a1018"
  panel: "#0d141e"
  panel-hover: "#142131"
  input: "#090f17"
  border: "#263342"
  control-border: "#536780"
  control-hover: "#7c96b5"
  text: "#eef4fc"
  muted: "#b9c3d1"
  subtle: "#9aa9bc"
  accent: "#0771e3"
  accent-text: "#82bcff"
  accent-hover: "#0866ce"
  accent-ink: "#ffffff"
  accent-soft: "#102944"
  focus: "#9bcaff"
  green: "#82dab0"
  red: "#ffabab"
  yellow: "#ecd08d"
typography:
  family: '"Bahnschrift", "Segoe UI Variable", "Segoe UI", Arial, sans-serif'
  body: "15px / 1.6"
  field: "14px / 1.6"
  field-mobile: "16px / 1.6"
  heading: "30px / 1.25, weight 650"
  panel-heading: "17px / 1.4, weight 550"
  feature-label: "14px / 1.55, weight 500, tracking .11em"
  metric: "30px / 1.2, tabular numbers"
rounded:
  field: "10px"
  navigation: "10px"
  control: "10px"
  icon-tile: "11px"
  panel: "16px"
  public-feature: "17px"
spacing:
  control-gap: "12px"
  small: "16px"
  section: "20px"
  panel-body: "24px"
  page-inline: "32px"
---

# Cyro design system

## Direction

The October 29, 2026 reference introduces near-black rounded cards, softly lit edges, outlined icon tiles and spaced feature labels. Cyro keeps its existing dashboard layout, requested Bahnschrift typeface and Lucide icon set. The owner's exact primary colour is **#0771e3**. These choices replace the earlier cyan/lavender palette and the earlier prohibition on subtle glass/glow.

The main visual surfaces are owned by `public/styles.css`; `public/home.css` adds the public feature cards and `public/creator.css` applies the same language to creator connections and legal pages. `public/auth-error.css` is the standalone sign-in error surface. No UI framework, remote font or JavaScript animation dependency is required.

## Colour and readability

- Primary buttons and counting progress use exact brand blue `#0771e3`, with white button text.
- Links, small feature labels and icon strokes use the lighter companion `#82bcff` so they stay readable against near-black panels. Keyboard focus uses `#9bcaff`.
- Main and supporting text remain neutral white, grey and blue-grey. Blue does not replace all text.
- Mint, amber and rose remain semantic success, warning and error colours. The overview's Server modules keep their original icon palette: green moderation, purple welcome/status roles and music, gold invites, and slate confessions/tickets/time clock/applications. Their headings stay neutral white. Other decorative feature tiles use blue.
- Form controls have a stronger boundary than decorative cards. Native and searchable dropdown menus stay opaque and dark.
- User-configured Discord embed colours and welcome-card previews are content, not theme tokens; the dashboard theme must not overwrite them.

## Cards and icons

Panels use a faint upper edge, a very shallow blue-black gradient and a soft shadow. Normal form panels remain nearly opaque. Glass blur is limited to the top bar and floating save bar; it is removed on small screens.

Feature icons sit in 40-44px tiles with a thin blue outline, a translucent blue fill and restrained outer glow. Dashboard toolkit rows are separated into compact cards. Public feature titles use spaced uppercase labels in the supplied reference's style; form headings and navigation remain normal readable text.

A faint stationary perspective grid appears only beneath the public feature cards. It is non-interactive, does not cover text, and is removed on mobile and in forced-colour mode. No moving or parallax background is used.

## Controls and behaviour

Preserve the sidebar, per-server navigation, form grouping, saved selections, searchable pickers, modal behaviour and existing mobile breakpoints. Hover changes are limited to colour, border and shadow; pressed controls move at most one pixel. Forms retain visible error and focus states. Disabled controls remain visibly disabled.

Button fills must not spill onto secondary or destructive actions. Destructive actions retain rose tones and labels. Page content, command descriptions, permission checks and localization are independent of the theme.

## Responsive and accessibility checks

Check overview, a dense settings form, searchable pickers, public homepage, creator connections and legal pages. Verify text wrapping at 390px and 1440px, no page overflow, keyboard focus, dark native menus, disabled controls and translated labels. Keep interactive touch targets around 44px. Body text must not shrink to emulate the reference image.

`prefers-reduced-motion` disables animations and transitions. `forced-colors` restores system colours and removes decorative shadows, transparency and grid effects. Do not replace these fallbacks with image-only controls.

Bahnschrift is requested from fonts already installed on the viewer's device. Cyro does not bundle or download proprietary Microsoft font files; the fallback stack remains available on other systems.
