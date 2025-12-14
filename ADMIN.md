# Sistema de Administración - MusicBoxd

## 🛡️ Funcionalidades de Moderación

### Características Implementadas

1. **Sistema de Roles**
   - Usuarios normales (`user`)
   - Administradores (`admin`)

2. **Gestión de Usuarios**
   - Bloquear/desbloquear cuentas
   - Ver estadísticas de usuarios
   - Historial de acciones
hol
3. **Moderación de Contenido**
   - Ocultar/mostrar reseñas
   - Sistema de reportes
   - Filtrado automático de contenido oculto

4. **Panel de Administración**
   - Estadísticas en tiempo real
   - Gestión centralizada
   - Interfaz intuitiva

## 🚀 Configuración Inicial

### 1. Crear Administrador

**Opción A: Usar el script (Recomendado)**
```bash
node scripts/create-admin.js tu_contraseña_segura
```

**Opción B: Manual**
```sql
-- Generar hash con bcrypt y reemplazar
INSERT INTO users (username, email, password, role) VALUES 
('admin', 'admin@musicboxd.com', 'hash_bcrypt_aqui', 'admin');
```

### 2. Acceder al Panel

1. Iniciar sesión con cuenta de administrador
2. El botón "🛡️ Admin" aparecerá en la navbar
3. Ir a `/admin.html` o hacer clic en el botón

## 📊 Funcionalidades del Panel

### Dashboard Principal
- **Estadísticas generales**
  - Total de usuarios y bloqueados
  - Total de reseñas y ocultas
  - Reportes pendientes

### Gestión de Usuarios
- **Ver todos los usuarios**
  - Información básica
  - Número de reseñas
  - Estado de la cuenta
  - Fecha de registro

- **Acciones disponibles**
  - Bloquear usuario (con razón)
  - Desbloquear usuario
  - Ver historial

### Moderación de Reseñas
- **Ver reseñas reportadas**
  - Contenido de la reseña
  - Número de reportes
  - Usuario que la escribió
  - Estado actual

- **Acciones disponibles**
  - Ocultar reseña (con razón)
  - Mostrar reseña oculta
  - Ver reportes relacionados

### Sistema de Reportes
- **Ver todos los reportes**
  - Usuario que reporta
  - Motivo del reporte
  - Descripción detallada
  - Estado del reporte

- **Acciones disponibles**
  - Marcar como resuelto
  - Descartar reporte
  - Agregar notas de resolución

## 🔒 Seguridad

### Middleware de Autenticación
```javascript
// Verificar si es administrador
requireAdmin(req, res, next)

// Verificar si está autenticado
requireAuth(req, res, next)

// Verificar si está bloqueado
checkUserBlocked(req, res, next)
```

### Protección de Rutas
- Todas las rutas `/admin/*` requieren permisos de administrador
- Verificación automática de usuarios bloqueados
- Sesiones seguras con cookies httpOnly

## 📋 Flujo de Moderación

### Cuando un Usuario es Reportado

1. **Usuario reporta** contenido inapropiado
2. **Sistema registra** el reporte en la base de datos
3. **Administrador revisa** en el panel de admin
4. **Administrador toma acción**:
   - Ocultar reseña
   - Bloquear usuario
   - Descartar reporte
5. **Sistema aplica** la acción automáticamente

### Filtrado Automático

- **Reseñas ocultas** no aparecen en:
  - Feed principal
  - Búsquedas
  - Estadísticas públicas
  - Perfiles de usuario

- **Usuarios bloqueados**:
  - No pueden iniciar sesión
  - Sesión se destruye automáticamente
  - No pueden crear contenido

## 🛠️ Comandos Útiles

### Generar Hash de Contraseña
```bash
node scripts/create-admin.js nueva_contraseña
```

### Verificar Administradores
```sql
SELECT username, email, role FROM users WHERE role = 'admin';
```

### Ver Estadísticas
```sql
-- Usuarios bloqueados
SELECT COUNT(*) FROM users WHERE is_blocked = TRUE;

-- Reseñas ocultas
SELECT COUNT(*) FROM reviews WHERE is_hidden = TRUE;

-- Reportes pendientes
SELECT COUNT(*) FROM reports WHERE status = 'pending';
```

## 🚨 Mejores Prácticas

### Seguridad
1. **Cambiar contraseña por defecto** inmediatamente
2. **Usar contraseñas fuertes** para administradores
3. **Revisar logs** regularmente
4. **Limitar número** de administradores

### Moderación
1. **Documentar razones** de bloqueos/ocultaciones
2. **Revisar reportes** regularmente
3. **Ser consistente** en las decisiones
4. **Comunicar políticas** claramente

### Mantenimiento
1. **Backup regular** de la base de datos
2. **Monitorear estadísticas** de moderación
3. **Actualizar políticas** según sea necesario
4. **Capacitar nuevos** administradores

## 🔧 Personalización

### Agregar Nuevos Motivos de Reporte
```sql
-- Modificar enum en la tabla reports
ALTER TABLE reports MODIFY COLUMN reason ENUM('spam', 'inappropriate', 'harassment', 'fake', 'copyright', 'other');
```

### Agregar Nuevos Roles
```sql
-- Modificar enum en la tabla users
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'moderator', 'admin');
```

### Personalizar Panel de Admin
- Editar `public/admin.html` para el diseño
- Modificar `public/js/admin.js` para la funcionalidad
- Agregar nuevas rutas en `server/server.js`

## 📞 Soporte

Si encuentras problemas con el sistema de administración:

1. Verificar logs del servidor
2. Comprobar permisos de base de datos
3. Revisar configuración de sesiones
4. Verificar middleware de autenticación

Para más ayuda, revisar la documentación técnica en `/server/middleware.js`.