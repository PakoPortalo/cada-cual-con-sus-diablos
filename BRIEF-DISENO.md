# 👿 Cada cual con sus diablos ("Everyone has their own devils") — Design Brief

Self-contained document to design around this project. It captures the concept,
the visual identity, the tone of voice and everything built so far (voting web +
admin panel). Live site: **https://diablos.es** · safe demo that doesn't affect
the real vote: **https://diablos.es/ejemplo**

> Note: the product UI is in **Spanish**. Keep Spanish for any in-product copy.

---

## 1. The project (concept)

A **closed, finite art piece**. **100 devil faces** hand-drawn on sticky notes
(Posca markers: red fill + black details, head only, 7.5×7.5 cm post-it format).
The process links **traditional painting → technology → collective participation**:

1. **Digitization**: photograph and vectorize the 100 post-its (2-layer SVG: red
   shape + black detail).
2. **Voting** ("Buscando diablos" / *Searching for devils*, a Tinder/match-style
   game): friends vote YES/NO on one devil at a time from their phone.
3. **Production**: the ranking drives a **3×3 print/screenprint** of the 9 most
   voted, plus t-shirts and stickers.
4. **Communication**: manifesto video + web.

- **Author**: Pako Portalo, aka **Mololo**. 2026.
- **Aesthetic**: **Cukipunky** (cute + punk) = tender and rowdy at once. Sweet and
  cheeky. Handmade, imperfect, full of character.
- **Core idea**: "everyone has their own devils, the ones they try to escape and
  keep coming back to. Which ones are yours?"

---

## 2. Visual identity

### Palette (actual CSS variables)
```css
--rojo:    #cb3747;  /* Posca red: devil shape, accents, the word "diablos" in the logo */
--negro:   #1a1a1a;  /* ink: text/borders on light backgrounds */
--crema:   #f4ead2;  /* cream: text/paper on dark backgrounds */
--amarillo:#f4d03f;  /* brand yellow (badges, accents) */
```
Frequently used colors outside variables:
- **Primary dark background**: `#1f1e1e` (voting, admin panel, full screens — a
  slightly warm near-black, NOT pure black).
- **Post-it yellow**: `#feff9c` (the "paper" each devil lives on).
- Dark panel cards: `#161616`.

Golden rule of color in interaction: **red does NOT mean "bad"**. In voting, YES
and NO don't use red as a traffic light; the devils are red because of the
artwork itself.

### Typography
- **Fanzine / headlines** (the dominant voice): `"Helvetica Neue", Arial,
  sans-serif`, **very bold** (800–900), **UPPERCASE**, often **italic** with
  negative `letter-spacing` on big titles. Solid blocks, thick borders, square or
  barely-rounded corners.
- **Editorial accent** (occasional, e.g. the "mololo" signature): `Georgia,
  "Times New Roman", serif`, italic, with tracking. Adds a "gallery wall label"
  touch.
- Responsive title sizes via `clamp()` (e.g. `clamp(1.9rem, 8vw, 2.9rem)`).

### Logo
**Hand-drawn** wordmark (same stroke as the devils), "cada cual con sus diablos"
in rounded lowercase. Two versions:
- **3 lines** (cada cual / con sus / diablos) — for square spaces (intro, mobile
  navbar).
- **1 horizontal line** — for desktop navbar.
In both: letters in **cream** on transparent, and the word **"diablos" in red**.
Used on dark backgrounds. Generated from the original black art (black→cream, last
word re-tinted red).

### Surface style
- Thick borders (2–3px) in cream or black, **square or very subtle corners**
  (`border-radius` 0–4px). No soft material-style rounding.
- Post-it = yellow square `#feff9c` with a soft shadow (`0 8px 18px
  rgba(0,0,0,.45)`) and a faint top strip suggesting the "glued" area.

---

## 3. Tone of voice (copy)

**Rowdy / cukipunky**, direct, funny with a cheeky edge, yet affectionate. Real
in-product examples (Spanish):
- Intro: *"Cada persona tiene sus propios diablos, de los que trata de escapar y a
  los que acaba volviendo una y otra vez. ¿Cuáles son los tuyos?"*
- *"Bienvenido a Buscando Diablos, donde harás match con tus diablos más
  profundos. Intenta terminar de votarlos todos… o puede que pierdas para
  siempre al diablo de tu vida."*
- Mechanic: *"Si conectas con el diablo, di que SÍ. Si el diablo no te dice nada,
  pulsa NO."*
- Ending: *"¡Has votado todos los diablos! Gracias por dedicarle este ratito,
  [name]."*
- Share text (Open Graph): *"Cada cual tiene sus propios diablos, algunos
  compartidos y otros no. Vota los diablos para formar parte de esta obra
  artística, by Pako Portalo, aka Mololo."*

Brand keywords: **diablos**, **match**, **Buscando Diablos**, **cukipunky**,
YES/NO in caps (SÍ/NO).

---

## 4. Motion system (the project's signature)

1. **"Boil" (a stroke that simmers)** — the signature move. Gives the logo and the
   red words a hand-drawn, frame-by-frame-cartoon life. Technique: SVG
   `feTurbulence` filter (fractalNoise, `baseFrequency: 0.018`, `numOctaves: 2`) +
   `feDisplacementMap`. Three filters with different seeds are defined and CSS
   **cycles between them at ~6 fps** (`animation: 0.45s steps(1) infinite`) so it
   looks frame-by-frame, not a smooth tween. Displacement `scale: 5` on the logo,
   `2.5` on small text. Respects `prefers-reduced-motion`.

2. **Post-it that "sticks"** — as each devil appears in voting, the post-it comes
   **toward you (Z axis)** and adheres by pivoting from the **top-right corner**,
   like sticking a note onto glass. No bounce (`cubic-bezier(0.16, 1, 0.3, 1)`,
   `transform-origin: 88% 8%`, `translateZ + rotateX/rotateY → 0`).

3. **Stack of post-its** — on each vote, the next one piles **on top** of the
   previous with tiny random rotation/offset (±7°, ±10px) → a growing pile feel.
   Max 10 on screen; the bottom ones **fade out** in opacity (mobile performance).

4. **Intro fades** — slide sequence: each enters with a fade+shift (0.6s) and on
   **tap** exits with a fade (0.4s) → next one enters.

5. **Details**: pulsing emoji on loading screens; subtle **zoom on hover (scale
   1.04)** on panel tiles (mouse only).

---

## 5. Screens built

### Public (mobile-first; on desktop the voting view shows as a centered "phone")
- **Intro (sequence)**: 1) logo with boil + "mololo" signature; 2–4) text slides
  (concept, welcome, mechanic) with keywords in red; 5) sign-up ("Introduce tu
  nombre" + buttons **SEND / RATHER ANONYMOUS**, same size).
- **Voting**: `#1f1e1e` background; top-right counter **"quedan N"** (independent
  of the ID — devils appear in **random order** per voter); center = pile of
  post-its; bottom two buttons **NO / SÍ** (identical blocks, cream border; **NO
  only changes its text color to red**, no fill).
- **Final screen**: 😈 + *"¡Has votado todos los diablos!"* ("los diablos" in red)
  + thank-you with the name in red.
- **/ejemplo**: identical to voting but **saves nothing** (demo to show people),
  with a red "ejemplo" stamp top-left.
- **Loading / error / 404**: same fanzine look (dark background, emoji, text in
  spaced small caps).

### Admin panel (Dev mode, private)
Solid fanzine look: `#1f1e1e` background, cream text, uppercase, block buttons.
- **Navbar** with the logo (horizontal on desktop / 3 lines on mobile) + Capture ·
  Panel · Logout.
- **Participation**: stat cards (voters, devils/person, % finished, named /
  anonymous) + **drop-off chart** (scatter: each point a voter, X = minutes, Y =
  devils voted, with a mean line).
- **Devils**: grid of all 100 as **yellow post-its** (very subtle rounded
  corners), each showing its **vote count (YES only)**, an **edit** button in a
  box (inside: delete with a "Yes/No" confirm). A **sort by: ID / votes** control.
- **Top 9 / Frame**: overlay with a **simple, responsive black frame**, 3×3 of
  post-its; they can be **rearranged by dragging** (they swap positions) to
  compose the piece. Each top-9 devil shows a **ranking circle** bottom-left
  (1 = most voted; number white for 4th–9th, **red** for 1st–3rd).
- Actions: open/close voting, backup, reset.

---

## 6. Components / key patterns

- **Fanzine block button**: dark fill, **3px cream border**, square corner,
  uppercase 800, `letter-spacing` ~0.05–0.1em. Primary variant = red text.
- **Post-it (tile)**: `#feff9c` square, centered devil SVG (red shape `#cb3747` +
  black detail), 2px black border, 4px radius.
- **Badge/stamp**: against-the-grain rectangle (red/cream/yellow), uppercase,
  tracking, square corner.
- **Ranking circle**: `#1f1e1e` circle with a post-it-yellow border, bold number;
  red if top 3.

---

## 7. Tech stack (context, in case it matters)
- Front: **React + Vite**, plain CSS (single `styles.css` with variables).
- Vectorization: 2-layer SVG (`<g id="forma">` red `#CB3747`, `<g id="detalles">`
  black `#1A1A1A`), `viewBox 0 0 74 74`.
- Boil animation = SVG filters + CSS (no libraries).
- Logo and previews generated with `sharp` (black→cream, the word "diablos"
  re-tinted red; OG image = devil on a yellow post-it over `#1f1e1e`, 1200×630).

---

## 8. What could be designed next
(Possible briefs for Claude design / a designer)
- Extended identity: manifesto-video cover, social templates (IG / stories), expo
  poster.
- Packaging for **screen prints** (numbered/signed) and **t-shirts** (DTF).
- Mockups of the physical **10×10 frame** (all 100) and the **3×3 print** (top 9).
- Store (Shopify) in this aesthetic.
- A consistent visual system (tokens) for all of the above.

> Always keep: handmade + cukipunky, the red/black/cream/post-it-yellow palette,
> bold uppercase type with serif accents, and the "boil" as the signature motion.
