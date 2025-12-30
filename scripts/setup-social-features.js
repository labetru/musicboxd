import mysql from 'mysql2/promise';
import { config } from '../server/config.js';
import fs from 'fs';
import path from 'path';

async function setupSocialFeatures() {
  let connection;
  
  try {
    console.log('🔗 Conectando a la base de datos...');
    console.log('📍 Host:', config.database.host);
    console.log('📍 Database:', config.database.database);
    connection = await mysql.createConnection(config.database);
    
    console.log('📋 Verificando tablas existentes...');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const hasSocialTables = tableNames.includes('user_follows') && tableNames.includes('notifications');
    const hasUserCounters = await checkUserCounters(connection);
    
    if (hasSocialTables && hasUserCounters) {
      console.log('✅ Las funcionalidades sociales ya están configuradas.');
      return;
    }
    
    console.log('🚀 Configurando funcionalidades sociales...');
    
    // Leer y ejecutar el script de migración
    const migrationPath = path.join(process.cwd(), 'database', 'social_network_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Dividir el SQL en declaraciones individuales
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('USE'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✓ Ejecutado:', statement.substring(0, 50) + '...');
        } catch (error) {
          // Ignorar errores de columnas/tablas que ya existen
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⚠️  Ya existe:', statement.substring(0, 50) + '...');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('🎉 Funcionalidades sociales configuradas exitosamente!');
    console.log('📊 Tablas creadas:');
    console.log('   - user_follows (relaciones de seguimiento)');
    console.log('   - notifications (notificaciones de usuario)');
    console.log('   - Campos agregados a users: followers_count, following_count');
    
  } catch (error) {
    console.error('❌ Error configurando funcionalidades sociales:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function checkUserCounters(connection) {
  try {
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('followers_count', 'following_count')
    `, [config.database.database]);
    
    return columns.length === 2;
  } catch (error) {
    return false;
  }
}

// Ejecutar si se llama directamente
if (process.argv[1] && process.argv[1].endsWith('setup-social-features.js')) {
  setupSocialFeatures();
}

export { setupSocialFeatures };