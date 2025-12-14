#!/usr/bin/env node

import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { config } from '../server/config.js';

// Cargar variables de entorno del archivo .env
dotenv.config();

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function setupDatabase() {
  console.log(`${colors.blue}${colors.bold}🗄️  MusicBoxd - Configuración de Base de Datos${colors.reset}\n`);

  // Obtener argumentos de línea de comandos
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`${colors.yellow}Uso: node scripts/setup-database.js <contraseña_admin> [username] [email]${colors.reset}`);
    console.log(`${colors.yellow}Ejemplo: node scripts/setup-database.js admin123${colors.reset}`);
    console.log(`${colors.yellow}Ejemplo: node scripts/setup-database.js admin123 admin admin@musicboxd.com${colors.reset}\n`);
    process.exit(1);
  }

  const password = args[0];
  const username = args[1] || 'admin';
  const email = args[2] || 'admin@musicboxd.com';

  // Validar contraseña
  if (password.length < 6) {
    console.log(`${colors.red}❌ Error: La contraseña debe tener al menos 6 caracteres${colors.reset}`);
    process.exit(1);
  }

  try {
    console.log(`${colors.blue}📡 Conectando a la base de datos...${colors.reset}`);
    
    // Crear conexión a la base de datos usando directamente las variables de entorno
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT),
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log(`${colors.blue}🔗 Conectando a: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}${colors.reset}`);

    console.log(`${colors.green}✅ Conectado a la base de datos${colors.reset}`);

    // Crear tabla users
    console.log(`${colors.blue}🏗️  Creando tabla 'users'...${colors.reset}`);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        profile_pic_url VARCHAR(255) DEFAULT NULL,
        is_blocked BOOLEAN DEFAULT FALSE,
        blocked_reason TEXT DEFAULT NULL,
        blocked_at TIMESTAMP NULL DEFAULT NULL,
        blocked_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log(`${colors.green}✅ Tabla 'users' creada${colors.reset}`);

    // Crear tabla reviews
    console.log(`${colors.blue}🏗️  Creando tabla 'reviews'...${colors.reset}`);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type VARCHAR(20) NOT NULL DEFAULT 'album',
        spotify_id VARCHAR(50) NOT NULL,
        user_id INT NOT NULL,
        stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
        comment TEXT NOT NULL,
        is_hidden BOOLEAN DEFAULT FALSE,
        hidden_reason TEXT DEFAULT NULL,
        hidden_at TIMESTAMP NULL DEFAULT NULL,
        hidden_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log(`${colors.green}✅ Tabla 'reviews' creada${colors.reset}`);

    // Crear tabla reports
    console.log(`${colors.blue}🏗️  Creando tabla 'reports'...${colors.reset}`);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reports (
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
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reported_review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log(`${colors.green}✅ Tabla 'reports' creada${colors.reset}`);

    // Verificar si el usuario admin ya existe
    console.log(`${colors.blue}🔍 Verificando usuario administrador...${colors.reset}`);
    const [existingUsers] = await connection.execute(
      'SELECT id, username, role FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      console.log(`${colors.yellow}⚠️  El usuario '${existingUser.username}' ya existe${colors.reset}`);
      
      // Actualizar a admin si no lo es
      if (existingUser.role !== 'admin') {
        console.log(`${colors.blue}🔄 Convirtiendo en administrador...${colors.reset}`);
        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.execute(
          'UPDATE users SET password = ?, role = ? WHERE id = ?',
          [hashedPassword, 'admin', existingUser.id]
        );
        console.log(`${colors.green}✅ Usuario convertido en administrador${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Usuario ya es administrador${colors.reset}`);
      }
    } else {
      // Crear nuevo usuario administrador
      console.log(`${colors.blue}👤 Creando usuario administrador...${colors.reset}`);
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await connection.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, 'admin']
      );
      
      console.log(`${colors.green}✅ Administrador creado exitosamente${colors.reset}`);
    }

    // Mostrar resumen
    const [adminUsers] = await connection.execute(
      'SELECT username, email FROM users WHERE role = ?',
      ['admin']
    );

    console.log(`\n${colors.bold}📋 Configuración completada:${colors.reset}`);
    console.log('─'.repeat(50));
    console.log(`${colors.green}✅ Base de datos configurada${colors.reset}`);
    console.log(`${colors.green}✅ Tablas creadas (users, reviews, reports)${colors.reset}`);
    console.log(`${colors.green}✅ Administradores: ${adminUsers.length}${colors.reset}`);
    
    adminUsers.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.username} (${admin.email})`);
    });

    // Cerrar conexión
    await connection.end();

    console.log(`\n${colors.green}${colors.bold}🎉 ¡Base de datos lista para usar!${colors.reset}`);
    console.log(`\n${colors.blue}📝 Credenciales de acceso:${colors.reset}`);
    console.log(`   👤 Usuario: ${username}`);
    console.log(`   🔑 Contraseña: ${password}`);
    console.log(`\n${colors.yellow}🌐 Tu aplicación está lista en:${colors.reset}`);
    console.log(`${colors.yellow}   https://musicboxd-production.up.railway.app${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    console.error(`${colors.red}Detalles: ${error.stack}${colors.reset}`);
    process.exit(1);
  }
}

// Ejecutar el script
setupDatabase();