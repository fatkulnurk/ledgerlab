# Design rules (anti-slop)

The dashboard must look like a product, not a template. These rules are
enforced; the `ui-unslop` sub-agent reviews against them.

## Colour — 70 / 20 / 10

- **70%** neutral base: `zinc` backgrounds, white surfaces, zinc-900 text.
- **20%** supporting: borders, muted text, hover states.
- **10%** accent: **one** accent colour (`indigo-600`) for primary actions and
  focus. Semantic colours only for state: `emerald` (positive/balanced),
  `amber` (warning), `red` (negative/error).
- Do **not** give each card its own tint. Let whitespace separate things.

## Icons

- Icons are for **actions and navigation only**, from **one** library
  (`lucide-react`), rendered inline.
- **Never** put an icon in a coloured rounded square/circle.
- If removing an icon loses no information, remove it.

## Typography

- Sans-serif only (`Inter`, system UI). **No decorative serif headlines.**
- Establish hierarchy with size/weight/colour, not with boxes.
- Money and quantities use `tabular-nums` and are **right-aligned**.

## Surfaces

- Solid backgrounds. **No glassmorphism / `backdrop-filter`.**
- **No gradients** on text, buttons, or cards. **No coloured/glowing shadows.**
- Shadows are subtle, neutral, and indicate elevation only (`shadow-xs`).
- **No cards nested in cards.** If you need grouping, use a heading and spacing.
- Never combine `border-left` with `border-radius` on a container.

## Motion

- No entrance animations on content. Transitions only for state feedback
  (hover, focus, loading), 150–300 ms.
- Never animate content in a way that breaks when it is already in the viewport.

## Empty, loading, error states

- Every async surface has all three, designed — not a spinner in the corner.
- Errors are human sentences, not stack traces.

## Do not ship

- Emojis as visual assets.
- A floating chat bubble.
- More than one accent hue competing for attention.
- Placeholder "Lorem ipsum" or fake statistics.

## Checklist before you claim G2 done

- [ ] Squint test: the page is not one blob of similar colour.
- [ ] Exactly one accent colour in use.
- [ ] No icon-in-rounded-square anywhere.
- [ ] No gradient, no glass, no coloured shadow.
- [ ] No card-in-card.
- [ ] Money columns are tabular and right-aligned.
- [ ] Keyboard focus is visible on every interactive element.
- [ ] Loading / empty / error states exist on every data surface.
