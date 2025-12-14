# Setup Rápido para Producción

## 🚀 Pasos Rápidos (15 minutos)

### 1. Preparar Spotify API (5 min)
1. Ir a https://developer.spotify.com/dashboard
2. Crear app "MusicBoxd"
3. Copiar Client ID y Client Secret
4. Agregar Redirect URI: `https://tu-dominio.com`

### 2. Subir a GitHub (3 min)
```bash
git init
git add .
git commit -m "MusicBoxd - Ready for deployment"
git remote add origin https://github.com/tu-usuario/musicboxd.git
git push -u origin main
```

### 3. Desplegar en Railway (5 min)
1. Ir a https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Seleccionar tu repositorio
4. Agregar servicio MySQL
5. Configurar variables de entorno:

```env
NODE_ENV=production
SPOTIFY_CLIENT_ID=tu_client_id_aqui
SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui
SESSION_SECRET=clave_super_secreta_aleatoria_123456
```

### 4. Configurar Base de Datos (2 min)
1. En Railway, ir a MySQL service
2. Copiar credenciales y agregar a variables:
```env
DB_HOST=containers-us-west-xxx.railway.app
DB_USER=root
DB_PASSWORD=password_generado
DB_NAME=railway
DB_PORT=3306
```

3. Conectar a base de datos y ejecutar:
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  profile_pic_url VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(20) NOT NULL DEFAULT 'album',
  spotify_id VARCHAR(50) NOT NULL,
  user_id INT NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 5. Finalizar (1 min)
1. Agregar variable final:
```env
FRONTEND_URL=https://tu-app-name.up.railway.app
```

2. Esperar despliegue (2-3 minutos)
3. ¡Listo! Tu app está en línea 🎉

## ✅ Verificación

- [ ] App carga correctamente
- [ ] Registro de usuario funciona
- [ ] Login funciona
- [ ] Búsqueda de álbumes funciona
- [ ] Crear reseña funciona
- [ ] Perfil de usuario funciona

## 🔗 URLs Importantes

- **Tu app**: https://tu-app-name.up.railway.app
- **Railway Dashboard**: https://railway.app/dashboard
- **Spotify Dashboard**: https://developer.spotify.com/dashboard

## 🆘 Si algo falla

1. **Revisar logs en Railway**
2. **Verificar variables de entorno**
3. **Verificar conexión a base de datos**
4. **Verificar credenciales de Spotify**

## 💡 Tips

- Usa nombres descriptivos para tu app
- Guarda las credenciales en un lugar seguro
- Haz backup de la base de datos regularmente
- Considera usar un dominio personalizado para mayor profesionalismo