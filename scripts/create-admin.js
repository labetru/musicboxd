#!/usr/bin/env node

import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import { config } from '../server/config.js';

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

async function createAdmin() {
  console.log(`${colors.blue}${colors.bold}🛡️  MusicBoxd - Creador de Administrador${colors.reset}\n`);

  // Obtener argumentos de línea de comandos
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`${colors.yellow}Uso: node scripts/create-admin.js <contraseña> [username] [email]${colors.reset}`);
    console.log(`${colors.yellow}Ejemplo: node scripts/create-admin.js mi_contraseña_segura${colors.reset}`);
    console.log(`${colors.yellow}Ejemplo: node scripts/create-admin.js mi_contraseña admin admin@musicboxd.com${colors.reset}\n`);
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
    
    // Crear conexión a la base de datos
    const connection = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      port: config.database.port,
      ssl: config.database.ssl
    });

    console.log(`${colors.green}✅ Conectado a la base de datos${colors.reset}`);

    // Verificar si el usuario ya existe
    console.log(`${colors.blue}🔍 Verificando si el usuario ya existe...${colors.reset}`);
    const [existingUsers] = await connection.execute(
      'SELECT id, username, role FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.role === 'admin') {
        console.log(`${colors.yellow}⚠️  El usuario '${existingUser.username}' ya es administrador${colors.reset}`);
        
        // Preguntar si quiere actualizar la contraseña
        console.log(`${colors.blue}¿Desea actualizar la contraseña? (y/N)${colors.reset}`);
        
        // Para simplificar, actualizamos automáticamente
        console.log(`${colors.blue}🔄 Actualizando contraseña...${colors.reset}`);
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.execute(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, existingUser.id]
        );
        
        console.log(`${colors.green}✅ Contraseña actualizada para el administrador '${existingUser.username}'${colors.reset}`);
      } else {
        // Actualizar usuario existente a admin
        console.log(`${colors.blue}🔄 Convirtiendo usuario existente en administrador...${colors.reset}`);
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.execute(
          'UPDATE users SET password = ?, role = ? WHERE id = ?',
          [hashedPassword, 'admin', existingUser.id]
        );
        
        console.log(`${colors.green}✅ Usuario '${existingUser.username}' convertido en administrador${colors.reset}`);
      }
    } else {
      // Crear nuevo usuario administrador
      console.log(`${colors.blue}👤 Creando nuevo usuario administrador...${colors.reset}`);
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await connection.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, 'admin']
      );
      
      console.log(`${colors.green}✅ Administrador creado exitosamente${colors.reset}`);
    }

    // Mostrar información del administrador
    const [adminUsers] = await connection.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE role = ?',
      ['admin']
    );

    console.log(`\n${colors.bold}📋 Administradores en el sistema:${colors.reset}`);
    console.log('─'.repeat(60));
    adminUsers.forEach((admin, index) => {
      console.log(`${colors.green}${index + 1}. ${admin.username}${colors.reset}`);
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🆔 ID: ${admin.id}`);
      console.log(`   📅 Creado: ${admin.created_at}`);
      console.log('');
    });

    // Cerrar conexión
    await connection.end();

    console.log(`${colors.green}${colors.bold}🎉 ¡Proceso completado exitosamente!${colors.reset}`);
    console.log(`\n${colors.blue}📝 Información de acceso:${colors.reset}`);
    console.log(`   👤 Usuario: ${username}`);
    console.log(`   📧 Email: ${email}`);
    console.log(`   🔑 Contraseña: [la que proporcionaste]`);
    console.log(`\n${colors.yellow}🔒 Recuerda cambiar la contraseña después del primer acceso${colors.reset}`);
    console.log(`${colors.yellow}🛡️  Accede al panel de admin en: /admin.html${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`${colors.yellow}💡 Sugerencias:${colors.reset}`);
      console.log(`   • Verifica que la base de datos esté ejecutándose`);
      console.log(`   • Revisa la configuración en server/config.js`);
      console.log(`   • Verifica las variables de entorno`);
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log(`${colors.yellow}💡 La tabla 'users' no existe. Ejecuta primero:${colors.reset}`);
      console.log(`   mysql -u root -p < database/schema.sql`);
    }
    
    process.exit(1);
  }
}

// Ejecutar el script
createAdmin();