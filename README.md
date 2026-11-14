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

## Correrlo con Docker

El `Dockerfile` compila la aplicación y la sirve con Node en el puerto 3000. Se levanta junto al backend y la base de datos con el `docker-compose.yml` del proyecto.
