# Convivir · Frontend

Interfaz web de Convivir, plataforma para la gestión y control de propiedades horizontales. Hecha con React y Vite.

Habla con el backend ([convivir-backend](https://github.com/EstebanGutierrezPolo/convivir-backend)) por la ruta `/api`, que Vite reenvía a la API.

## Correrlo en el PC

Necesita Node 22 o superior y el backend corriendo en `http://localhost:8080`.

```bash
npm install
npm run dev
```

Abre http://localhost:3000

Si el backend está en otra dirección, se indica con la variable `API_URL`.

## Cómo está organizado

| Carpeta | Contenido |
|---|---|
| `src/estilos/convivir.css` | La hoja del sistema de diseño, copiada tal cual de `diagramas/vistas/convivir.css` |
| `src/aplicacion/` | Rutas, marco (barra y navegación por rol), sesión y tema |
| `src/componentes/` | Piezas del sistema de diseño: diálogo, campo, píldora, confirmaciones, pestañas, segmentos |
| `src/paginas/<rol>/` | Una pantalla por vista, para administrador, vigilante y residente. El consejo usa Cartera y Auditoría en modo consulta |
| `src/api/` | Cliente de la API (`/api`) |
| `src/datos/` | Datos de ejemplo de las pantallas cuya API todavía no existe |

Cada pantalla sale de su vista en `diagramas/vistas/`. Cómo se escribe una está en [COMO-SE-ESCRIBE-UNA-PANTALLA.md](COMO-SE-ESCRIBE-UNA-PANTALLA.md).

### Qué está conectado al backend

| Pantalla | API |
|---|---|
| Inmuebles, detalle del inmueble con su historial | CU-02 `/api/inmuebles` |
| Tipos de inmueble | CU-19 `/api/tipos-inmueble` |

Las demás funcionan con datos de ejemplo y lo dicen arriba con un aviso. Se conectan a medida que el backend tenga la API de su caso de uso.

### Inicio de sesión

La sesión la valida el backend (CU-01) y vive en una cookie del servidor. La primera vez, el backend crea estas cuentas de ejemplo con la contraseña de `CONVIVIR_CONTRASENA_INICIAL` del archivo `.env`:

| Cuenta | Rol |
|---|---|
| `paula.ortega` | Administradora |
| `jhon.rojas` | Vigilante |
| `lucia.mendoza` | Residente |
| `hernan.ruiz` | Consejo |
| `marta.oviedo` | Cuenta bloqueada |

## Correrlo con Docker

El `Dockerfile` compila la aplicación y la sirve con Node en el puerto 3000. Se levanta junto al backend y la base de datos con el `docker-compose.yml` del proyecto.
