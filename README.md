# Ramo de flores amarillas

Animación en JavaScript (canvas 2D, sin dependencias) de un ramo grande de
flores amarillas que se arma solo en pantalla.

Abre `index.html` en el navegador. No hay build ni instalación.

## La secuencia

1. **Tallos** — crecen desde el amarre siguiendo curvas de Bézier, en abanico.
2. **Hojas** — se despliegan a lo largo de cada tallo en cuanto el tallo las pasa.
3. **Corolas** — abren con un rebote elástico, pétalo por pétalo, escalonadas.
4. **Escena viva** — viento en rachas, polen flotando, destellos sobre las
   corolas y dos mariposas que orbitan el ramo.

## Detalles

- **Cinco tipos de flor** (girasol, margarita, ranúnculo, copa, menuda y
  capullo) con paletas de amarillo variadas, gradientes por pétalo y corazón
  de semillas en espiral de ángulo dorado.
- **Composición adaptable**: la cúpula de corolas, el cono de papel y el lazo
  se recalculan según el formato de pantalla, así el ramo se arma igual de
  bien en horizontal que en vertical.
- **Interacción**: el cursor sopla el viento sobre los tallos; un toque en la
  escena suelta pétalos; *Volver a florecer* genera un ramo nuevo con otra
  semilla.
- Respeta `prefers-reduced-motion`: arranca con el ramo ya florecido y deja
  solo un movimiento mínimo.
- Reproducible: `?semilla=12345` en la URL fija un ramo concreto.

## Archivos

| Archivo      | Contenido                                        |
| ------------ | ------------------------------------------------ |
| `index.html` | Página y rótulo de la escena                     |
| `styles.css` | Estilos de la interfaz sobre el lienzo           |
| `bouquet.js` | Toda la animación: composición, dibujo y física  |
