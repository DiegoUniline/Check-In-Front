# Check-In Front (React + Vite)

Frontend del sistema **Check-In**.

## URL (producción)

- GitHub Pages: `https://diegouniline.github.io/Check-In-Front/`

## Correr en local (sin afectar producción)

### Requisitos

- Node.js 18+
- Backend corriendo (local o remoto)

### 1) Configurar variables de entorno (local)

Este repo trae una plantilla en `Check-In-Front/env.example`.

Pasos:

- Copia `Check-In-Front/env.example` a `Check-In-Front/.env.local`
- Ajusta `VITE_API_URL` según dónde tengas el backend:
  - Backend local: `http://localhost:3000/api`
  - Backend remoto (Heroku): `https://checkinapi-5cc3a2116a1c.herokuapp.com/api`

> Nota: `.env.local` NO se commitea. Esto evita tocar el entorno productivo.

### 0) Nota importante sobre el login en local

Si apuntas a **backend local** (`http://localhost:3000/api`) pero tu backend local está usando credenciales de una **DB remota** (por ejemplo las de Heroku), puede fallar con:

- `ER_ACCESS_DENIED_ERROR` / “Access denied …”

Soluciones típicas:

- **Rápida (para desarrollar solo Front):** usa `VITE_API_URL=https://checkinapi-5cc3a2116a1c.herokuapp.com/api` y NO levantes el backend local.
- **Correcta (para no tocar datos de producción):** levanta el backend local con una **DB local**, creando el schema desde `check-in-back/database/schema.sql` y configurando `check-in-back/.env` con tus credenciales locales.

### 2) Instalar dependencias y levantar el Front

```sh
cd Check-In-Front
npm install
npm run dev
```

## Publicar cambios a GitHub Pages

El Front se publica desde este repositorio. Flujo recomendado:

- Haces cambios en local
- Commit + push a tu rama principal (por ejemplo `main`)
- GitHub Pages se actualiza según la configuración del repo (branch/folder o Actions)

Si actualmente no se actualiza automáticamente con un push, hay que agregar un workflow de GitHub Actions para construir `Check-In-Front` y desplegarlo en Pages (te lo puedo dejar listo, pero primero te pido confirmación porque impacta deploy/producción).

## Tecnologías

- React 18 + TypeScript
- Vite (plugin `react-swc`)
- TailwindCSS + shadcn/ui (Radix UI)
- React Router
- TanStack Query
- Zod + React Hook Form
