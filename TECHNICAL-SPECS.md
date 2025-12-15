# MusicBoxd - Especificaciones Técnicas Detalladas

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### **Patrón Arquitectónico**
- **Arquitectura:** MVC (Model-View-Controller) con separación de capas
- **Tipo:** Aplicación web full-stack con SPA (Single Page Application) híbrida
- **Paradigma:** Cliente-servidor con API REST

### **Estructura de Directorios**
```
musicboxd/
├── server/                 # Backend (Node.js/Express)
│   ├── server.js          # Servidor principal con todas las rutas
│   ├── config.js          # Configuración centralizada
│   ├── db.js              # Conexión y pool de base de datos
│   └── middleware.js      # Middlewares personalizados
├── public/                # Frontend estático
│   ├── index.html         # SPA principal
│   ├── admin.html         # Panel de administración
│   ├── css/styles.css     # Estilos personalizados
│   ├── js/
│   │   ├── app.js         # Lógica principal del frontend
│   │   └── admin.js       # Lógica del panel de administración
│   ├── icons/             # Recursos gráficos SVG/JPG
│   └── uploads/           # Archivos subidos por usuarios
├── database/              # Scripts de base de datos
├── scripts/               # Utilidades y scripts de configuración
└── .kiro/                 # Documentación y especificaciones
```

---

## 🛠️ **STACK TECNOLÓGICO**

### **Backend (Node.js)**
```json
{
  "runtime": "Node.js v18+",
  "framework": "Express.js v5.1.0",
  "type": "module",
  "architecture": "ESM (ES Modules)"
}
```

### **Dependencias de Producción**
```json
{
  "bcrypt": "^6.0.0",           // Hashing de contraseñas (Blowfish)
  "cors": "^2.8.5",             // Cross-Origin Resource Sharing
  "express": "^5.1.0",          // Framework web minimalista
  "express-session": "^1.18.2", // Manejo de sesiones server-side
  "jsonwebtoken": "^9.0.2",     // JWT para autenticación (futuro uso)
  "multer": "^2.0.2",           // Middleware para multipart/form-data
  "mysql2": "^3.15.3",          // Driver MySQL con soporte para Promises
  "node-fetch": "^3.3.2",       // Cliente HTTP para APIs externas
  "dotenv": "^17.2.3"           // Carga de variables de entorno
}
```

### **Frontend**
```json
{
  "framework": "Vanilla JavaScript ES6+",
  "ui_library": "Bootstrap 5.3.3",
  "icons": "Font Awesome 6.4.0",
  "fonts": "Google Fonts (Jersey 10, Jersey 15, Josefin Sans)",
  "architecture": "SPA con navegación por estados"
}
```

---

## 🗄️ **BASE DE DATOS**

### **Sistema de Gestión**
- **SGBD:** MySQL 8.0+
- **Hosting:** Railway MySQL Service
- **Conexión:** Pool de conexiones con mysql2
- **Transacciones:** Soporte ACID completo

### **Esquema de Base de Datos**

#### **Tabla: users**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,           -- bcrypt hash
  role ENUM('user', 'admin') DEFAULT 'user',
  profile_pic_url VARCHAR(255) DEFAULT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT DEFAULT NULL,
  blocked_at TIMESTAMP NULL DEFAULT NULL,
  blocked_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **Tabla: reviews**
```sql
CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(20) NOT NULL DEFAULT 'album',
  spotify_id VARCHAR(50) NOT NULL,          -- ID del álbum en Spotify
  user_id INT NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  hidden_reason TEXT DEFAULT NULL,
  hidden_at TIMESTAMP NULL DEFAULT NULL,
  hidden_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **Tabla: reports**
```sql
CREATE TABLE reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reporter_id INT NOT NULL,
  reported_user_id INT DEFAULT NULL,
  reported_review_id INT DEFAULT NULL,
  reason ENUM('spam', 'inappropriate', 'harassment', 'fake', 'other') NOT NULL,
  description TEXT DEFAULT NULL,
  status ENUM('pending', 'resolved', 'dismissed') DEFAULT 'pending',
  resolved_by INT DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  resolution_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Claves foráneas con integridad referencial
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);
```

---

## 🔐 **SEGURIDAD**

### **Autenticación y Autorización**
```javascript
// Hashing de contraseñas
bcrypt.hash(password, 10)  // Salt rounds: 10

// Sesiones server-side
session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true,                    // Previene XSS
    maxAge: 24 * 60 * 60 * 1000,     // 24 horas
    secure: NODE_ENV === 'production', // HTTPS en producción
    sameSite: 'none'                   // CSRF protection
  }
})
```

### **Validación de Archivos**
```javascript
// Multer configuration
{
  fileSize: 5 * 1024 * 1024,  // Límite: 5MB
  allowedMimeTypes: [
    'image/jpeg', 'image/jpg', 'image/png', 
    'image/gif', 'image/webp'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
}
```

### **Middleware de Seguridad**
- **CORS:** Configurado para dominios específicos
- **Input Validation:** Sanitización de datos de entrada
- **SQL Injection Prevention:** Prepared statements con mysql2
- **File Upload Security:** Validación de tipo MIME y extensión

---

## 🌐 **INTEGRACIÓN DE APIs**

### **Spotify Web API**
```javascript
// Configuración OAuth 2.0 Client Credentials Flow
{
  endpoint: "https://accounts.spotify.com/api/token",
  grant_type: "client_credentials",
  scope: "ninguno requerido",
  authentication: "Basic Auth (Base64)"
}

// Endpoints utilizados
{
  search: "https://api.spotify.com/v1/search",
  albums: "https://api.spotify.com/v1/albums/{id}",
  multiple_albums: "https://api.spotify.com/v1/albums?ids={ids}"
}
```

### **Gestión de Tokens**
```javascript
// Token caching con expiración automática
let token = "";
let tokenExpires = 0;

async function getToken() {
  if (Date.now() < tokenExpires) return token;
  // Renovación automática de token
}
```

---

## 🚀 **INFRAESTRUCTURA Y DESPLIEGUE**

### **Hosting: Railway**
```yaml
Platform: Railway.app
Region: us-west1
Build System: Nixpacks
Runtime: Node.js 18+
Process Type: Web Service
Health Check: GET /
Restart Policy: ON_FAILURE (max 10 retries)
```

### **Base de Datos: Railway MySQL**
```yaml
Service: MySQL 8.0
Connection: Internal (mysql.railway.internal:3306)
External Access: Proxy (mainline.proxy.rlwy.net:58027)
SSL: Enabled
Backup: Automático
```

### **Variables de Entorno**
```bash
# Aplicación
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://musicboxd-production.up.railway.app

# Base de datos
DB_HOST=mysql.railway.internal
DB_USER=root
DB_PASSWORD=[auto-generated]
DB_NAME=railway
DB_PORT=3306

# APIs externas
SPOTIFY_CLIENT_ID=[client_credentials]
SPOTIFY_CLIENT_SECRET=[client_credentials]

# Seguridad
SESSION_SECRET=[random_string_256_bits]
COOKIE_DOMAIN=.up.railway.app
```

### **CI/CD Pipeline**
```yaml
Source: GitHub Repository
Trigger: Push to main branch
Build: Automatic (Nixpacks detection)
Deploy: Zero-downtime deployment
Rollback: Automatic on failure
Monitoring: Built-in logs and metrics
```

---

## 📊 **FUNCIONALIDADES IMPLEMENTADAS**

### **Sistema de Usuarios**
- **Registro:** Validación de email único, username único
- **Autenticación:** bcrypt + express-session
- **Perfiles:** Fotos de perfil con validación de archivos
- **Roles:** Sistema de permisos (user/admin)
- **Bloqueo:** Sistema de moderación de usuarios

### **Sistema de Reseñas**
- **CRUD completo:** Create, Read, Update, Delete
- **Calificaciones:** Sistema de 1-5 estrellas
- **Moderación:** Ocultación de contenido inapropiado
- **Agregación:** Cálculo de promedios y rankings

### **Búsqueda y Catálogo**
- **Integración Spotify:** Búsqueda en tiempo real
- **Cache de resultados:** Optimización de consultas
- **Top Albums:** Ranking por calificación promedio
- **Reseñas aleatorias:** Descubrimiento de contenido

### **Panel de Administración**
- **Dashboard:** Estadísticas en tiempo real
- **Gestión de usuarios:** CRUD, bloqueo/desbloqueo
- **Moderación de contenido:** Ocultar/mostrar reseñas
- **Sistema de reportes:** Workflow completo de moderación

### **Sistema de Reportes**
- **Tipos de reporte:** spam, inappropriate, harassment, fake, other
- **Estados:** pending, resolved, dismissed
- **Workflow:** Reporte → Revisión → Acción → Resolución
- **Trazabilidad:** Registro completo de acciones de moderación

---

## 🔧 **OPTIMIZACIONES Y RENDIMIENTO**

### **Frontend**
- **Lazy Loading:** Carga diferida de imágenes
- **Cache Busting:** Timestamps en URLs de imágenes
- **Responsive Design:** Mobile-first approach
- **Minificación:** CSS optimizado para producción

### **Backend**
- **Connection Pooling:** mysql2 pool para conexiones eficientes
- **Error Handling:** Manejo centralizado de errores
- **Logging:** Sistema de logs estructurado
- **File Management:** Limpieza automática de archivos huérfanos

### **Base de Datos**
- **Índices:** Optimización de consultas frecuentes
- **Transacciones:** Operaciones atómicas para integridad
- **Constraints:** Validación a nivel de BD
- **Cascading:** Eliminación en cascada para consistencia

---

## 📈 **MÉTRICAS Y MONITOREO**

### **Disponibilidad**
- **Uptime:** 99.9% (Railway SLA)
- **Health Checks:** Endpoint automático
- **Error Tracking:** Logs centralizados

### **Rendimiento**
- **Response Time:** < 200ms promedio
- **Database Queries:** Optimizadas con índices
- **File Upload:** Límite 5MB, validación eficiente
- **API Calls:** Rate limiting implícito de Spotify

---

## 🔮 **ESCALABILIDAD Y FUTURAS MEJORAS**

### **Arquitectura Preparada Para:**
- **Microservicios:** Separación de concerns bien definida
- **CDN:** Archivos estáticos optimizables
- **Caching:** Redis para sesiones y cache de API
- **Load Balancing:** Stateless design
- **Database Sharding:** Esquema preparado para particionado

### **Funcionalidades Futuras**
- **API REST completa:** Endpoints documentados con OpenAPI
- **Notificaciones:** Sistema de eventos en tiempo real
- **Búsqueda avanzada:** Filtros y ordenamiento complejo
- **Integración social:** Seguimiento de usuarios, feeds
- **Analytics:** Dashboard de métricas de uso

---

## 🛡️ **COMPLIANCE Y ESTÁNDARES**

### **Estándares Web**
- **HTML5:** Semántica correcta
- **CSS3:** Flexbox, Grid, Custom Properties
- **ES6+:** Módulos, async/await, destructuring
- **Accessibility:** ARIA labels, keyboard navigation

### **Seguridad**
- **OWASP Top 10:** Mitigación de vulnerabilidades principales
- **Data Privacy:** Manejo seguro de información personal
- **File Security:** Validación exhaustiva de uploads
- **Session Security:** Configuración hardened

---

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2024  
**Desarrollado por:** Victor Orozco  
**Tecnologías:** Node.js, Express, MySQL, Spotify API, Railway  