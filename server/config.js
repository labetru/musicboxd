// Configuración para desarrollo y producción
export const config = {
  // Base de datos
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'musicboxd',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },
  
  // Servidor
  server: {
    port: process.env.PORT || 3000,
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL] 
        : ["http://127.0.0.1:5500", "http://localhost:8080", "http://localhost:5500", "http://localhost:3000"]
    }
  },
  
  // Spotify API
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || "2625a8f9cd154ad3abe2ed39636245a2",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "94efec8b374947288706c3b41f9fde4d"
  },
  
  // Sesiones
  session: {
    secret: process.env.SESSION_SECRET || "clave_super_secreta_cambiar_en_produccion",
    secure: process.env.NODE_ENV === 'production'
  }
};