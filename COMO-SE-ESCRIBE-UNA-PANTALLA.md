# Cómo se escribe una pantalla de Convivir en React

Cada pantalla sale de su vista en `diagramas/vistas/` (HTML del sistema de diseño) y se vuelve un componente en `src/paginas/<rol>/<Nombre>.jsx`. El diseño ya está decidido: la pantalla en React se ve igual que la vista.

## Lo que ya existe y se reutiliza

| Pieza | Dónde | Para qué |
|---|---|---|
| Estilos | `src/estilos/convivir.css` | La misma hoja de las vistas. Las clases (`btn`, `superficie`, `tabla`, `pildora p-ok`, `veredicto v-no`, `calendario`, `franjas`, `linea-tiempo`, `documento-impreso`…) se usan igual con `className` |
| Marco | `src/aplicacion/Marco.jsx` | Barra, navegación del rol, subnavegación y tema. La página no los pinta: empieza en `<main className="pagina">` |
| Rutas | `src/aplicacion/Aplicacion.jsx` | Ya están todas. No se tocan |
| Sesión | `useSesion()` de `src/aplicacion/sesion.jsx` | `sesion.persona`, `sesion.rol`, `sesion.inmuebles` |
| Componentes | `src/componentes/` | `Dialogo`, `Campo`, `Pildora`, `useConfirmar()`, y en `Basicos.jsx`: `Encabezado`, `Vacio`, `Cargando`, `ErrorDeCarga`, `Buscador`, `Segmentos`, `Pestanas`, `AvisoDatosDeEjemplo` |
| Formato | `src/utilidades/formato.js` | `pesos(1340000)` da `$ 1 340 000`, más `cifra`, `decimal`, `fecha`, `hora` y `legible` |
| API | `src/api/` | `pedir()` y los clientes. Hoy solo existen inmuebles y tipos de inmueble |
| Ejemplos | `src/paginas/administrador/Inmuebles.jsx`, `Inmueble.jsx` y `TiposInmueble.jsx` | Lista con filtros, detalle con pestañas, diálogos con validación y errores del servidor |

## Reglas

1. **El diseño es el de la vista.** Mismo texto, misma estructura, mismas clases, mismos estados. Lo que la vista hace con JavaScript suelto (mostrar un veredicto, abrir un diálogo, filtrar) se hace con estado de React.
2. **Sin colores literales ni `box-shadow`.** Si falta un estilo, se escribe en un objeto `style` o en un CSS Module de la página usando solo `var(--…)`.
3. **Textos del sistema de diseño.** El botón dice qué pasa, la confirmación conserva el verbo (`useConfirmar()('Visita registrada')`), el error explica y dirige, y el vacío invita.
4. **Cada campo obligatorio** se valida antes de enviar, y su error va en el `error` de `<Campo>` con el mismo texto que el `data-error` de la vista.
5. **Si la pantalla no tiene API todavía**, usa datos de ejemplo:
   - Los datos van en `src/datos/<area>.js` (un archivo por área, por ejemplo `src/datos/porteria.js`).
   - Se cargan con la misma forma que tendría la respuesta de la API, para que conectarla después sea cambiar una función.
   - La pantalla muestra arriba `<AvisoDatosDeEjemplo casoDeUso="CU-07" />`.
   - Las acciones cambian el estado en memoria y confirman.
6. **Accesible.** Botones de verdad (`<button>`), `aria-current`, `aria-pressed` y `aria-selected` como en la vista, y foco visible.
7. **Responsivo.** A 375 px no hay desplazamiento horizontal de la página.
8. **Nombres en español**, como el resto del código.
