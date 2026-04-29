import { pool } from './db.js';
import jwt from 'jsonwebtoken';

// Middleware para verificar autenticación
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}

// Middleware para verificar admin
export function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "No autorizado" });
  }
  
  pool.query("SELECT role FROM users WHERE id = ?", [req.session.userId])
    .then(([rows]) => {
      if (rows.length === 0 || rows[0].role !== 'admin') {
        return res.status(403).json({ error: "Acceso denegado - Solo administradores" });
      }
      next();
    })
    .catch(err => {
      console.error("Error verificando admin:", err);
      res.status(500).json({ error: "Error del servidor" });
    });
}

// Middleware para verificar bloqueo de usuario
export function checkUserBlocked(req, res, next) {
  if (!req.session.userId) {
    return next();
  }
  
  pool.query("SELECT is_blocked FROM users WHERE id = ?", [req.session.userId])
    .then(([rows]) => {
      if (rows.length > 0 && rows[0].is_blocked) {
        req.session.destroy();
        return res.status(403).json({ error: "Usuario bloqueado" });
      }
      next();
    })
    .catch(err => {
      console.error("Error verificando bloqueo:", err);
      next();
    });
}

// Middleware JWT para clientes móviles
// Valida el header Authorization: Bearer <token>
export function requireJwt(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token JWT requerido' });
  }

  const token = authHeader.slice(7); // Remove "Bearer "
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('JWT_SECRET no está configurado en las variables de entorno');
    return res.status(500).json({ error: 'Error de configuración del servidor' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.jwtUser = decoded; // { userId, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token JWT inválido o expirado' });
  }
}

// Middleware JWT para rutas de admin en clientes móviles
// Requiere JWT válido con role === 'admin'
export function requireJwtAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token JWT requerido' });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('JWT_SECRET no está configurado en las variables de entorno');
    return res.status(500).json({ error: 'Error de configuración del servidor' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado - Solo administradores' });
    }
    req.jwtUser = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token JWT inválido o expirado' });
  }
}
