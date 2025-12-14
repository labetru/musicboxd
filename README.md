# MusicBoxd - Letterboxd para Música

Una aplicación web para reseñar álbumes musicales usando la API de Spotify.

## Características

- 🎵 Búsqueda de álbumes con Spotify API
- ⭐ Sistema de reseñas con calificaciones 1-5 estrellas
- 👤 Perfiles de usuario con fotos
- 📊 Feed dinámico con álbumes destacados
- 🔐 Autenticación segura con sesiones

## Tecnologías

- **Backend**: Node.js, Express, MySQL
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **APIs**: Spotify Web API
- **Base de datos**: MySQL (XAMPP)

## Instalación

### 1. Configurar XAMPP
1. Instalar y ejecutar XAMPP
2. Iniciar Apache y MySQL
3. Abrir phpMyAdmin (http://localhost/phpmyadmin)

### 2. Crear Base de Datos
```sql
-- Ejecutar en phpMyAdmin o MySQL CLI
source database/schema.sql
```

### 3. Instalar Dependencias
```bash
npm install
```

### 4. Configurar Spotify API
1. Crear app en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Obtener Client ID y Client Secret
3. Actualizar credenciales en `server/server.js` (líneas 44-45)

### 5. Crear Administrador
```bash
# Crear usuario administrador
node scripts/create-admin.js tu_contraseña_segura
```

### 6. Ejecutar Aplicación
```bash
npm start
```

La aplicación estará disponible en: http://localhost:3000

## Comandos Útiles

### Desarrollo
```bash
# Iniciar aplicación
npm start

# Verificar base de datos
mysql -u root -p
USE musicboxd;
SHOW TABLES;
```

### Mantenimiento
```bash
# Backup de base de datos
mysqldump -u root -p musicboxd > backup.sql

# Restaurar base de datos
mysql -u root -p musicboxd < backup.sql
```

### Solución de Problemas
- **Error MySQL**: Verificar que XAMPP esté ejecutándose
- **Error Spotify**: Verificar credenciales en developer dashboard
- **Puerto ocupado**: Cambiar puerto en `server/server.js`

## Estructura del Proyecto

```
musicboxd/
├── database/
│   └── schema.sql          # Esquema de base de datos
├── server/
│   ├── server.js          # Servidor Express principal
│   └── db.js              # Configuración MySQL
├── public/
│   ├── css/
│   │   └── styles.css     # Estilos CSS
│   ├── js/
│   │   ├── app.js         # Lógica principal frontend
│   │   ├── main.js        # Funciones auxiliares
│   │   └── login.js       # Autenticación frontend
│   ├── uploads/           # Fotos de perfil
│   └── index.html         # Página principal
├── package.json
└── README.md
```

## Uso

1. **Registro**: Crear cuenta con username, email y contraseña
2. **Búsqueda**: Buscar álbumes por nombre o artista
3. **Reseñas**: Calificar álbumes con estrellas y comentarios
4. **Perfil**: Ver estadísticas y reseñas destacadas
5. **Feed**: Explorar álbumes populares y reseñas destacadas

## Funcionalidades Principales

- **Carrusel de Álbumes**: Navegación visual de álbumes mejor calificados
- **Sistema de Perfiles**: Estadísticas personales y fotos de perfil
- **Feed Dinámico**: Contenido curado automáticamente
- **Búsqueda Inteligente**: Integración completa con Spotify
- **Responsive Design**: Optimizado para móviles y desktop

## Sistema de Administración

### 🛡️ Moderación Integrada
- **Panel de administración** completo
- **Bloqueo de usuarios** con razones
- **Ocultación de reseñas** inapropiadas
- **Sistema de reportes** para usuarios
- **Estadísticas en tiempo real**

Ver documentación completa: [ADMIN.md](ADMIN.md)

### Acceso de Administrador
1. Crear cuenta admin con el script: `node scripts/create-admin.js`
2. Iniciar sesión con credenciales de admin
3. Acceder al panel en `/admin.html`

## Despliegue en Producción

### 🚀 Despliegue Rápido (Railway)
1. Subir código a GitHub
2. Conectar con Railway
3. Agregar servicio MySQL
4. Configurar variables de entorno
5. **Crear administrador** con el script
6. ¡Listo!

Ver guías detalladas:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guía completa
- [setup-production.md](setup-production.md) - Setup rápido (15 min)
- [ADMIN.md](ADMIN.md) - Sistema de administración

### Variables de Entorno Requeridas
```env
NODE_ENV=production
DB_HOST=tu-host
DB_USER=tu-usuario
DB_PASSWORD=tu-password
DB_NAME=musicboxd
SPOTIFY_CLIENT_ID=tu-client-id
SPOTIFY_CLIENT_SECRET=tu-client-secret
SESSION_SECRET=clave-aleatoria
FRONTEND_URL=https://tu-dominio.com
```

## Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request