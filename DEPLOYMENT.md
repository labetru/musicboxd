# Guía de Despliegue - MusicBoxd

## 🚀 Opciones de Hosting

### Opción 1: Railway (Recomendada) ⭐

**Ventajas:**
- Fácil configuración
- Base de datos MySQL incluida
- Despliegue automático desde Git
- Plan gratuito disponible

**Pasos:**

1. **Preparar el repositorio**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Subir a GitHub**
   - Crear repositorio en GitHub
   - Conectar y subir código:
   ```bash
   git remote add origin https://github.com/tu-usuario/musicboxd.git
   git push -u origin main
   ```

3. **Desplegar en Railway**
   - Ir a [railway.app](https://railway.app)
   - Conectar con GitHub
   - Seleccionar tu repositorio
   - Railway detectará automáticamente que es Node.js

4. **Configurar base de datos**
   - En Railway, agregar servicio MySQL
   - Copiar las credenciales de conexión

5. **Configurar variables de entorno**
   En Railway, agregar estas variables:
   ```
   NODE_ENV=production
   DB_HOST=[Railway MySQL Host]
   DB_USER=[Railway MySQL User]
   DB_PASSWORD=[Railway MySQL Password]
   DB_NAME=[Railway MySQL Database]
   DB_PORT=3306
   SPOTIFY_CLIENT_ID=tu_client_id
   SPOTIFY_CLIENT_SECRET=tu_client_secret
   SESSION_SECRET=clave_super_secreta_aleatoria
   FRONTEND_URL=https://tu-app.railway.app
   ```

6. **Importar base de datos**
   - Usar Railway CLI o phpMyAdmin
   - Importar `database/schema.sql`

### Opción 2: Render + PlanetScale

**Ventajas:**
- Muy confiable
- Base de datos serverless
- SSL automático

**Pasos:**

1. **Configurar PlanetScale (Base de datos)**
   - Crear cuenta en [planetscale.com](https://planetscale.com)
   - Crear base de datos `musicboxd`
   - Obtener string de conexión

2. **Desplegar en Render**
   - Ir a [render.com](https://render.com)
   - Conectar repositorio de GitHub
   - Configurar como Web Service
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Variables de entorno en Render:**
   ```
   NODE_ENV=production
   DATABASE_URL=[PlanetScale Connection String]
   SPOTIFY_CLIENT_ID=tu_client_id
   SPOTIFY_CLIENT_SECRET=tu_client_secret
   SESSION_SECRET=clave_aleatoria
   FRONTEND_URL=https://tu-app.onrender.com
   ```

### Opción 3: Vercel (Solo Frontend) + Railway (Backend)

**Para proyectos que requieren separación frontend/backend**

## 🔧 Configuración de Spotify API

1. **Ir a Spotify Developer Dashboard**
   - https://developer.spotify.com/dashboard

2. **Crear nueva aplicación**
   - Nombre: MusicBoxd
   - Descripción: App de reseñas musicales

3. **Configurar Redirect URIs**
   - Agregar tu dominio de producción
   - Ejemplo: `https://tu-app.railway.app`

4. **Copiar credenciales**
   - Client ID
   - Client Secret

## 📋 Checklist Pre-Despliegue

- [ ] Código subido a GitHub
- [ ] Variables de entorno configuradas
- [ ] Base de datos creada e importada
- [ ] Spotify API configurada
- [ ] URLs actualizadas en el código
- [ ] Archivos de configuración creados

## 🐛 Solución de Problemas

### Error de CORS
```javascript
// Verificar que FRONTEND_URL esté configurado correctamente
FRONTEND_URL=https://tu-dominio.com
```

### Error de Base de Datos
```bash
# Verificar conexión
DB_HOST=tu-host
DB_USER=tu-usuario
DB_PASSWORD=tu-password
DB_NAME=musicboxd
```

### Error de Spotify API
- Verificar que las credenciales sean correctas
- Verificar que el dominio esté en Redirect URIs

## 📊 Monitoreo

### Logs en Railway
```bash
railway logs
```

### Logs en Render
- Ver en el dashboard de Render
- Sección "Logs"

## 🔄 Actualizaciones

### Railway
- Push a GitHub → Despliegue automático

### Render
- Push a GitHub → Despliegue automático

## 💰 Costos Estimados

### Railway
- **Gratis**: $5 crédito mensual
- **Pro**: $20/mes

### Render
- **Gratis**: 750 horas/mes
- **Starter**: $7/mes

### PlanetScale
- **Gratis**: 1 base de datos
- **Scaler**: $29/mes

## 🎯 Recomendación Final

Para un proyecto final universitario, recomiendo:

1. **Railway** - Más fácil y todo en uno
2. **Plan gratuito** - Suficiente para demostración
3. **Dominio personalizado** - Opcional pero profesional

¿Necesitas ayuda con algún paso específico?