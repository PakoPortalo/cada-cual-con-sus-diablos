# 👿 Cada cual con sus diablos

Proyecto de arte cerrado y finito. 100 caras de diablo en post-its (Posca rojo+negro,
estética "cookie punk") → digitalizar → votar → producir físico → vender + vídeo.

Autor: Pako · 2026 · v1.0 (fuente: `cada-cual-con-sus-diablos.docx`)

---

## Visión

- 100 post-its dibujados (rojo fondo + negro detalles, solo cabeza, formato post it 7.5x7.5cm).
- Estética **Cukipunky**: tierno + punk a la vez. cute y macarra, gamberro.
- Pipeline: pintura tradicional → tecnología → participación colectiva.
- 4 productos: cuadro 10×10 (expo, no venta) · serigrafías 3×3 · camisetas DTF · pegatinas

## 4 fases secuenciales

| # | Fase | Descripción |
|---|------|-------------|
| 01 | Digitalización | Fotografiar + vectorizar 100 post-its con la app |
| 02 | Votación | "Tinder de diablos" — amigos puntúan vía web |
| 03 | Producción | Cuadro grande + serigrafías 3×3 + camisetas DTF |
| 04 | Comunicación | Web venta (Shopify) + vídeo manifiesto |

---

## La app — 1 web app, 2 modos

Web responsive, móvil sin instalar. Un dominio, dos modos. Stack: React / Node.js.

### Modo Dev (solo Pako, con login)
- Captura foto del post-it.
- Detección automática del borde (estilo escáner DNI) + recorte.
- Procesado: normalizar orientación, eliminar fondo amarillo.
- Vectorizar a 2 capas: roja (forma) + negra (detalles) → SVG con 2 grupos.
- Guardar en DB: ID 001–100, SVG + JPEG original, estado=pendiente.
- Panel admin: ver diablos + puntuación, editar/re-escanear, exportar ranking.

### Modo Público (amigos votan, sin login o link directo)
- Diablos uno a uno, pantalla casi completa.
- Mecánica votación — **DECISIÓN PENDIENTE**:
  - A: Swipe izq/der (riesgo conflicto gestos navegador).
  - B: 2 botones grandes 👿/💀 (**recomendado**, más fiable móvil).
  - C: Tap zona izq/der de imagen.
- Cada voto suma/no al ranking. Sin votar 2× al mismo (sesión/cookie).
- Mostrar diablos restantes + top 9 provisional al terminar.

### Base de datos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | 001–100 |
| nombre | STRING | apodo opcional (por definir) |
| imagen_original | JPEG/PNG | foto post-it recortado |
| imagen_svg | SVG | vector 2 capas rojo+negro |
| votos_positivos | INT | a favor |
| votos_negativos | INT | en contra |
| score | FLOAT | votos+ / total |
| fecha_subida | DATE | digitalización |
| estado | ENUM | pendiente / activo / archivado |

### Stack sugerido
- Frontend: React. Backend: Node.js + Express.
- DB: SQLite (simple) o Supabase (acceso remoto fácil).
- Vectorización: **Potrace** (open source, B&W).
- Detección post-it: OpenCV.js (frontend) o sharp + bordes (backend).
- Hosting: Vercel (front) + Railway/Fly.io (back), o VPS único.

---

## Pipeline de vectorización

3 colores exactos: amarillo (fondo), rojo (forma), negro (detalles) → vectorización limpia.

1. **Bordes**: detectar 4 vértices → corrección perspectiva (homografía) → recorte.
2. **Separar colores**: quitar amarillo (threshold HSV/RGB), máscara roja, máscara negra.
3. **Vectorizar por capa**: Potrace a cada máscara → `<g id="forma">` rojo, `<g id="detalles">` negro.
4. **Exportar SVG**: 2 grupos, 1:1 post-it (~74×74mm), compatible Illustrator + PNG alta-res preview.

### SVG objetivo
```svg
<svg viewBox="0 0 74 74" xmlns="...">
  <g id="forma"    fill="#C0392B"><!-- paths rojos  --></g>
  <g id="detalles" fill="#1A1A1A"><!-- paths negros --></g>
</svg>
```

Uso posterior: cuadro 3×3 (AI/Figma), camisetas (SVG → Victor Morera DTF), web (Shopify).

---

## Productos físicos

- **Cuadro grande**: 100 post-its originales, marco a medida 10×10 (~76×76cm). Pieza original, se expone, NO se vende.
- **Serigrafías 3×3**: 9 ganadores del ranking. Técnica serigrafía con **Circografía** (contactados). Dims/copias/papel por definir. Firmadas + numeradas. *Pendiente: 3×3 (9) o 3×4 (12)*.
- **Camisetas**: 1 diablo (ganador absoluto). DTF con **Víctor Morera (More)**. En Shopify cliente elige top 3–9. Color/tallas/precio por definir.

### Proveedores
| Elemento | Estado | Notas |
|----------|--------|-------|
| Serigrafías 3×3 | ⏳ | Circografía — pendiente presupuesto |
| Camisetas DTF | ⏳ | Víctor Morera — pendiente confirmar |
| Marco 10×10 | ⏳ | Buscar enmarcador a medida |
| Web venta | 🔄 | Shopify disponible — configurar |

---

## Comunicación

- **Vídeo manifiesto**: alma del proyecto. NO making-of/tutorial → manifiesto artístico + humor (estilo Pako). Reel IG vertical 60–90s + YouTube extendido. Contenido: por qué diablos/post-its, los 100, proceso+app, Tinder, productos, dónde comprar. Publicar al lanzar.
- **Web Shopify**: serigrafías (tirada numerada) + camisetas (selector diablo). Futuro: prints digitales. Dominio por definir (¿cadacualconsusdiablos.com?). Integrar IG Shopping.

---

## Decisiones pendientes

### 🔴 Urgentes (bloquean avance)
1. **Nombre definitivo** — diablos vs demonios / cual vs uno. Afecta dominio, branding, vídeo, serigrafías.
2. **Numerar los 100 post-its** (ID 001–100) antes de digitalizar.
3. **Swipe o botones** en votación — afecta frontend desde el inicio.

### 🟡 Importantes (definen producto)
- ¿Votos anónimos o con nombre?
- ¿Cuántos amigos votan? (10/30/50 → normalización puntuación).
- ¿Ranking en tiempo real o solo al final?
- ¿Composición 3×3 (9) o 3×4 (12)?
- ¿Copias por serigrafía? (10/20/50).
- ¿Cuadro grande se expone o queda en casa?

### 🟢 Para más adelante
- Precios serigrafías/camisetas.
- ¿Presentar en contexto artístico (expo/feria)?
- ¿Edición especial con 9 perdedores?
- ¿Subtítulos inglés en YouTube?
- ¿Plan redes durante proceso o solo lanzamiento?

---

## Timeline orientativo

| # | Tarea | Entregable |
|---|-------|-----------|
| 01 | Prep + nombre | Nombre, numeración, dominio |
| 02 | App MVP | Login dev + captura + vectorización + DB funcional |
| 03 | Digitalización | 100 diablos vectorizados en DB |
| 04 | Votación | App pública activa X días |
| 05 | Ranking | Exportar top 9/12 |
| 06 | Producción | Encargar serigrafías + camisetas + marco |
| 07 | Web Shopify | Tienda activa |
| 08 | Vídeo | Grabar/montar/publicar IG + YouTube |
| 09 | Lanzamiento | Post + vídeo + web → proyecto cerrado |

---

## Estado actual

✅ Hecho: 100 post-its dibujados · concepto (Cookie Punk).
🔄 En curso: cuenta Shopify (contenido pendiente).
⏳ Pendiente: nombre · numeración · toda la app (dev/vectorización/votación/DB) · digitalización · votación · ranking · serigrafías · camisetas · marco · vídeo.

---

## Plan de implementación (próximos pasos para la app)

> Foco técnico: lo que esta carpeta puede empezar a construir ya. No requiere las decisiones de branding.

### Milestone 1 — Scaffold + DB
1. Init repo: frontend React (Vite) + backend Node/Express. Decidir mono-repo vs dos carpetas.
2. DB SQLite con la tabla `diablos` (esquema de arriba). Migración inicial.
3. API REST mínima: `GET /diablos`, `GET /diablos/:id`, `POST /diablos`, `POST /diablos/:id/voto`.

### Milestone 2 — Pipeline vectorización (núcleo técnico)
4. Probar Potrace sobre un post-it de muestra antes de integrar (validar calidad B&W → SVG).
5. Detección borde + homografía (OpenCV.js o backend sharp). Recorte automático.
6. Separación 3 colores por threshold HSV → 2 máscaras (roja, negra).
7. Vectorizar cada máscara → ensamblar SVG 2 grupos (`forma`/`detalles`) con fills `#C0392B`/`#1A1A1A`.
8. Guardar SVG + JPEG + asignar ID en DB.

### Milestone 3 — Modo Dev
9. Login simple (usuario+contraseña Pako). Sesión.
10. UI captura foto (input cámara móvil) → preview recorte → vectorizar → guardar.
11. Panel admin: grid de diablos con score, editar/re-escanear, exportar ranking (CSV/JSON).

### Milestone 4 — Modo Público (votación)
12. Vista diablo a pantalla casi completa, uno a uno.
13. Implementar mecánica **botones 👿/💀** (recomendado v1). Swipe como mejora posterior.
14. Control anti-doble-voto (cookie/sesión). Contador restantes.
15. Pantalla final top 9 provisional.

### Milestone 5 — Deploy + exportación
16. Deploy front (Vercel) + back (Railway/Fly.io).
17. Exportar ranking final → handoff a producción física (serigrafías/camisetas).

### Riesgos / validar pronto
- **Calidad vectorización**: validar Potrace + thresholds con fotos reales antes de escalar a 100. El fondo amarillo y la luz variable son el mayor riesgo.
- **Detección borde en móvil**: si OpenCV.js es pesado, alternativa = recorte manual asistido.
- **Normalización votos**: depende de nº votantes (decisión pendiente). Diseñar `score` flexible.
