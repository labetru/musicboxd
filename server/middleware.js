import { pool } from './db.js';

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

// Middleware para verificar si el usuario está bloqueado
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