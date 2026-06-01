# Spike de vectorización — Fase 0 (go/no-go)

Valida que una foto de post-it → SVG de 2 capas con color fijo sale limpia.
**Esto decide si el proyecto es viable tal cual o hay que ajustar la captura.**

## Cómo fotografiar (jig)

Para que los umbrales de color sean estables, todas las fotos en mismas condiciones:

1. Post-it bajo un **cristal** (que quede plano, sin curvarse).
2. **Aro de luz** encima → luz uniforme, sin sombras.
3. Encuadre **fijo y cuadrado**, el post-it llenando el centro del cuadro.
4. ⚠️ Vigilar el **reflejo del cristal**. Si se cuela un brillo, probar:
   cristal mate/antirreflejo, o el aro en ángulo (no frontal puro).

## Cómo correrlo

```bash
cd backend
npm install            # solo la primera vez
# mete 3-5 fotos reales en spike/input/
npm run spike          # procesa todo spike/input/
# o una suelta:
node spike/run.js ruta/a/foto.jpg
```

## Qué revisar

Por cada foto se crea `spike/output/<nombre>/` con:

| Archivo | Qué es |
|---|---|
| `1-cropped.png` | foto recortada (lo que ve el pipeline) |
| `2-mask-forma.png` | máscara de la silueta (capa roja) |
| `3-mask-detalle.png` | máscara de detalles (capa negra) |
| `4-resultado.svg` | **SVG final** de 2 capas, color fijo |
| `5-preview.png` | render del SVG para comparar a ojo |

**Criterio de salida**: abrir `1-cropped.png` junto a `5-preview.png`. Si se parecen
en **≥80%** de las muestras → Fase 0 pasa. Si no, ajustar:

- Colores mal separados → `THRESHOLDS` en [`src/pipeline/config.js`](../src/pipeline/config.js).
- Recorte mal encuadrado → [`src/pipeline/detectBorder.js`](../src/pipeline/detectBorder.js)
  (con el jig debería ser recorte cuadrado centrado; si no, pasar `crop` manual).
- Motas/ruido → `POTRACE.turdSize` en `config.js` (subirlo elimina puntos sueltos).

> `_gen_fake.mjs` genera un post-it sintético de prueba (sin fotos reales).
> Solo para verificar que el código corre: `node spike/_gen_fake.mjs`.
