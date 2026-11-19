import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import Aplicacion from './aplicacion/Aplicacion.jsx'
import { ProveedorSesion } from './aplicacion/sesion.jsx'
import { ProveedorConfirmaciones } from './componentes/Confirmaciones.jsx'
import './estilos/convivir.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <ProveedorConfirmaciones>
          <Aplicacion />
        </ProveedorConfirmaciones>
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>,
)
