import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";
import { pool } from "./db.js"; 
import { config } from "./config.js";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

/* ==============================
    CONFIGURACIÓN DE MULTER
============================== */
const uploadDir = path.join(__dirname, "../public/uploads/profile_pics");

if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure upload directory exists
        try {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log(`Created upload directory: ${uploadDir}`);
            }
            cb(null, uploadDir);
        } catch (error) {
            console.error("Error ensuring upload directory exists:", error);
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        try {
            // Validate file extension
            const ext = path.extname(file.originalname).toLowerCase();
            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            
            if (!allowedExtensions.includes(ext)) {
                return cb(new Error(`Extensión de archivo no permitida: ${ext}`), null);
            }
            
            const timestamp = Date.now();
            // Use a temporary filename, will be renamed after session validation
            const filename = `temp_${timestamp}${ext}`;
            
            console.log(`Generated temporary filename: ${filename}`);
            cb(null, filename);
        } catch (error) {
            console.error("Error generating filename:", error);
            cb(error, null);
        }
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Only one file at a time
    },
    fileFilter: (req, file, cb) => {
        try {
            // Check MIME type
            const allowedMimeTypes = [
                'image/jpeg',
                'image/jpg', 
                'image/png',
                'image/gif',
                'image/webp'
            ];
            
            if (!allowedMimeTypes.includes(file.mimetype)) {
                console.log(`Rejected file with MIME type: ${file.mimetype}`);
                return cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
            }
            
            // Additional validation for file name
            if (!file.originalname || file.originalname.length > 255) {
                return cb(new Error("Nombre de archivo inválido"), false);
            }
            
            console.log(`Accepted file: ${file.originalname}, MIME: ${file.mimetype}`);
            cb(null, true);
        } catch (error) {
            console.error("Error in file filter:", error);
            cb(error, false);
        }
    }
});

/* ==============================
   MIDDLEWARES
============================== */
// Custom middleware to validate profile picture requests
app.use('/uploads/profile_pics', (req, res, next) => {
  const requestedFile = req.path.substring(1); // Remove leading slash
  const fullPath = path.join(__dirname, "../public/uploads/profile_pics", requestedFile);
  
  // Skip validation for .gitkeep
  if (requestedFile === '.gitkeep') {
    return next();
  }
  
  // Validate file exists and is accessible
  if (!validateFileExists(fullPath)) {
    console.log(`Blocked request for non-existent profile picture: ${requestedFile}`);
    return res.status(404).json({ 
      error: "Imagen no encontrada",
      message: "La imagen solicitada no existe o no es accesible"
    });
  }
  
  // Log successful file access
  console.log(`Serving profile picture: ${requestedFile}`);
  next();
});

app.use(express.static(path.join(__dirname, "../public")));
app.use(cors({
    origin: config.server.cors.origin,
    credentials: true,
}));
app.use(express.json());
app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000,
        secure: false, // Para desarrollo local
        sameSite: 'lax'
    },
}));

/* ==============================
   SPOTIFY API
============================== */
const CLIENT_ID = config.spotify.clientId;
const CLIENT_SECRET = config.spotify.clientSecret;
let token = "";
let tokenExpires = 0;

async function getToken() {
  if (Date.now() < tokenExpires) return token;

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  token = data.access_token;
  tokenExpires = Date.now() + data.expires_in * 1000;
  return token;
}

/* ==============================
   MIDDLEWARE DE ADMIN
============================== */
function requireAdmin(req, res, next) {
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

/* ==============================
   RUTAS DE USUARIO
============================== */
// Registro
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hash]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: "Usuario ya existe o datos inválidos" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`Intento de login para el usuario: ${username}`);

  try {
    const [rows] = await pool.query("SELECT id, username, password, role, is_blocked, blocked_reason, profile_pic_url FROM users WHERE username = ?", [username]);
    if (rows.length === 0) {
      console.log(`Error: Usuario ${username} no encontrado en DB.`);
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const user = rows[0];
    
    // Verificar si el usuario está bloqueado
    if (user.is_blocked) {
      console.log(`Usuario ${username} está bloqueado. Razón: ${user.blocked_reason}`);
      return res.status(403).json({ 
        error: "Cuenta bloqueada", 
        message: `Tu cuenta ha sido bloqueada. Razón: ${user.blocked_reason || 'No especificada'}` 
      });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    console.log(`Comparación de contraseña para ${username}: ${valid ? 'EXITOSA' : 'FALLIDA'}`);

    if (!valid) return res.status(401).json({ error: "Contraseña incorrecta" });

    req.session.userId = user.id;
    console.log(`Sesión establecida para userId: ${user.id}`);

    res.json({ 
      success: true, 
      userId: user.id,
      username: user.username, 
      role: user.role,
      profilePictureUrl: user.profile_pic_url
    });
  } catch (err) {
    console.error("Error al procesar login:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Enhanced session endpoint with dual verification
app.get("/me", async (req, res) => {
  if (!req.session.userId) return res.json({ loggedIn: false });
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, is_blocked, profile_pic_url FROM users WHERE id = ?',
      [req.session.userId]
    );
    
    if (rows.length === 0 || rows[0].is_blocked) {
      req.session.destroy();
      return res.json({ loggedIn: false });
    }
    
    const user = rows[0];
    
    // Perform dual verification and auto-synchronization
    const syncResult = await autoSynchronizeProfilePicture(req.session.userId);
    let validatedProfilePicUrl = user.profile_pic_url;
    
    if (syncResult.success && syncResult.repaired) {
      // If auto-synchronization occurred, the profile picture URL should be null
      validatedProfilePicUrl = null;
      console.log(`Session endpoint: auto-synchronized profile picture for user ${req.session.userId}`);
    } else if (syncResult.verification && !syncResult.verification.consistent) {
      // If there's still an inconsistency, use null as fallback
      validatedProfilePicUrl = null;
    }
    
    res.json({ 
      loggedIn: true, 
      userId: req.session.userId,
      username: user.username,
      role: user.role,
      profilePictureUrl: validatedProfilePicUrl,
      dataSync: {
        synchronized: syncResult.success,
        action: syncResult.action,
        consistent: syncResult.verification ? syncResult.verification.consistent : true
      }
    });
  } catch (error) {
    console.error('Error en /me:', error);
    res.json({ loggedIn: false });
  }
});

// Helper function to safely delete a file
function safeDeleteFile(filePath) {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve({ success: false, reason: "No file path provided" });
      return;
    }
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`File deleted successfully: ${filePath}`);
        resolve({ success: true });
      } else {
        console.log(`File not found for deletion: ${filePath}`);
        resolve({ success: false, reason: "File not found" });
      }
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      resolve({ success: false, reason: error.message });
    }
  });
}

// Helper function to validate file existence
function validateFileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (error) {
    console.error(`Error validating file existence ${filePath}:`, error);
    return false;
  }
}

// Enhanced helper function for dual verification of profile pictures
async function performDualVerification(userId) {
  try {
    // Check database record
    const [rows] = await pool.query(
      "SELECT profile_pic_url FROM users WHERE id = ?",
      [userId]
    );
    
    if (rows.length === 0) {
      return {
        userExists: false,
        databaseRecord: false,
        physicalFile: false,
        consistent: false,
        needsRepair: false
      };
    }
    
    const profilePicUrl = rows[0].profile_pic_url;
    const verification = {
      userExists: true,
      databaseRecord: profilePicUrl !== null,
      physicalFile: false,
      consistent: false,
      needsRepair: false,
      profilePicUrl
    };
    
    // Check physical file if URL exists in database
    if (profilePicUrl) {
      const fullPath = path.join(__dirname, "../public", profilePicUrl);
      verification.physicalFile = validateFileExists(fullPath);
    }
    
    // Determine consistency and repair needs
    verification.consistent = verification.databaseRecord === verification.physicalFile;
    verification.needsRepair = !verification.consistent;
    
    return verification;
    
  } catch (error) {
    console.error(`Error in dual verification for user ${userId}:`, error);
    return {
      userExists: false,
      databaseRecord: false,
      physicalFile: false,
      consistent: false,
      needsRepair: false,
      error: error.message
    };
  }
}

// Helper function for auto-synchronization of inconsistent states
async function autoSynchronizeProfilePicture(userId) {
  try {
    const verification = await performDualVerification(userId);
    
    if (!verification.userExists || verification.consistent) {
      return {
        success: true,
        action: verification.consistent ? 'no_action_needed' : 'user_not_found',
        verification
      };
    }
    
    if (verification.needsRepair) {
      if (verification.databaseRecord && !verification.physicalFile) {
        // Case: DB has record but file doesn't exist - clean up DB
        await pool.query(
          "UPDATE users SET profile_pic_url = NULL WHERE id = ?",
          [userId]
        );
        
        console.log(`Auto-synchronized: cleaned DB reference for user ${userId}`);
        return {
          success: true,
          action: 'cleaned_database_reference',
          verification,
          repaired: true
        };
      }
      
      if (!verification.databaseRecord && verification.physicalFile) {
        // Case: File exists but no DB record - this shouldn't happen in normal flow
        // but we could optionally clean up the orphaned file
        const fileName = path.basename(verification.profilePicUrl || '');
        if (fileName) {
          const filePath = path.join(__dirname, "../public/uploads/profile_pics", fileName);
          await safeDeleteFile(filePath);
          
          console.log(`Auto-synchronized: removed orphaned file for user ${userId}`);
          return {
            success: true,
            action: 'removed_orphaned_file',
            verification,
            repaired: true
          };
        }
      }
    }
    
    return {
      success: true,
      action: 'no_repair_needed',
      verification
    };
    
  } catch (error) {
    console.error(`Error in auto-synchronization for user ${userId}:`, error);
    return {
      success: false,
      error: error.message,
      action: 'synchronization_failed'
    };
  }
}

// Helper function to clean up old profile pictures for a user
async function cleanupOldProfilePictures(userId, currentFileName) {
  const profilePicsDir = path.join(__dirname, "../public/uploads/profile_pics");
  const userPrefix = `${userId}_profile`;
  
  try {
    const files = fs.readdirSync(profilePicsDir);
    const userFiles = files.filter(file => 
      file.startsWith(userPrefix) && file !== currentFileName
    );
    
    let deletedCount = 0;
    for (const file of userFiles) {
      const filePath = path.join(profilePicsDir, file);
      const deleteResult = await safeDeleteFile(filePath);
      if (deleteResult.success) {
        deletedCount++;
      }
    }
    
    console.log(`Cleaned up ${deletedCount} old profile pictures for user ${userId}`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error(`Error cleaning up old profile pictures for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

// Error handler for multer
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err);
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({ 
          success: false, 
          error: "El archivo es demasiado grande. Máximo 5MB permitido." 
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          success: false, 
          error: "Solo se permite subir un archivo a la vez." 
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          success: false, 
          error: "Campo de archivo inesperado." 
        });
      default:
        return res.status(400).json({ 
          success: false, 
          error: "Error al procesar el archivo: " + err.message 
        });
    }
  } else if (err) {
    console.error("Upload error:", err);
    return res.status(400).json({ 
      success: false, 
      error: err.message || "Error al subir el archivo" 
    });
  }
  next();
}

// Upload de foto de perfil
app.post("/user/upload-photo", upload.single('profilePicture'), handleMulterError, async (req, res) => {
  console.log(`Upload request from user: ${req.session.userId}`);
  
  if (!req.session.userId) {
    console.log("Upload failed: No session");
    return res.status(401).json({ success: false, error: "No autorizado" });
  }

  if (!req.file) {
    console.log("Upload failed: No file");
    return res.status(400).json({ success: false, error: "No se subió ningún archivo." });
  }

  // Validate uploaded file exists and is accessible
  if (!validateFileExists(req.file.path)) {
    console.log("Upload failed: Uploaded file not accessible");
    return res.status(500).json({ success: false, error: "El archivo subido no es accesible" });
  }

  // Rename file with correct userId
  const ext = path.extname(req.file.originalname).toLowerCase();
  const timestamp = Date.now();
  const correctFilename = `${req.session.userId}_profile_${timestamp}${ext}`;
  const correctFilePath = path.join(path.dirname(req.file.path), correctFilename);
  
  // Rename the temporary file
  fs.renameSync(req.file.path, correctFilePath);
  
  console.log(`File uploaded and renamed: ${correctFilename}, size: ${req.file.size}, type: ${req.file.mimetype}`);
  const relativePath = `/uploads/profile_pics/${correctFilename}`;
  const newFilePath = correctFilePath;

  try {
    // Start transaction for atomic operation
    await pool.query('START TRANSACTION');
    
    // Get current profile picture URL
    const [userRows] = await pool.query(
      "SELECT profile_pic_url FROM users WHERE id = ?",
      [req.session.userId]
    );
    
    if (userRows.length === 0) {
      await pool.query('ROLLBACK');
      await safeDeleteFile(newFilePath);
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }
    
    const oldPhotoUrl = userRows[0]?.profile_pic_url;
    
    // Update database with new photo URL
    const [result] = await pool.query(
      "UPDATE users SET profile_pic_url = ? WHERE id = ?",
      [relativePath, req.session.userId]
    );
    
    console.log(`Usuario ${req.session.userId} actualizó su foto a: ${relativePath}, affected rows: ${result.affectedRows}`);
    
    if (result.affectedRows === 0) {
      console.log("Warning: No rows affected in update");
      await pool.query('ROLLBACK');
      await safeDeleteFile(newFilePath);
      return res.status(500).json({ success: false, error: "No se pudo actualizar el perfil" });
    }
    
    // Commit the database transaction
    await pool.query('COMMIT');
    
    // Clean up old profile pictures (including the specific old one and any orphaned files)
    await cleanupOldProfilePictures(req.session.userId, correctFilename);
    
    // Double-check that the new file still exists after cleanup
    if (!validateFileExists(newFilePath)) {
      console.error("Critical error: New profile picture was accidentally deleted during cleanup");
      return res.status(500).json({ 
        success: false, 
        error: "Error crítico: la nueva foto fue eliminada accidentalmente" 
      });
    }
    
    res.json({ 
      success: true, 
      url: relativePath,
      message: "Foto de perfil actualizada correctamente",
      userId: req.session.userId
    });
    
  } catch (err) {
    console.error("Error al guardar la URL de la foto de perfil en la DB:", err);
    
    // Rollback database changes
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error("Error during rollback:", rollbackErr);
    }
    
    // Clean up uploaded file on error
    await safeDeleteFile(newFilePath);
    
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor: " + err.message 
    });
  }
});

// Enhanced route with dual verification for image existence
app.get("/check-image/:userId", async (req, res) => {
  const userId = req.params.userId;
  
  // Validate userId parameter
  if (!userId || isNaN(parseInt(userId))) {
    return res.status(400).json({ 
      exists: false, 
      error: "ID de usuario inválido" 
    });
  }
  
  try {
    // Step 1: Check database record
    const [rows] = await pool.query(
      "SELECT profile_pic_url FROM users WHERE id = ?",
      [userId]
    );
    
    if (rows.length === 0) {
      return res.json({ 
        exists: false, 
        url: null,
        reason: "Usuario no encontrado",
        dualVerification: {
          databaseRecord: false,
          physicalFile: false,
          consistent: true
        }
      });
    }
    
    const profilePicUrl = rows[0].profile_pic_url;
    const dualVerification = {
      databaseRecord: profilePicUrl !== null,
      physicalFile: false,
      consistent: false,
      autoRepaired: false
    };
    
    if (!profilePicUrl) {
      dualVerification.consistent = true; // No URL in DB and no file expected
      return res.json({ 
        exists: false, 
        url: null,
        reason: "Usuario no tiene foto de perfil configurada",
        dualVerification
      });
    }
    
    // Step 2: Check physical file existence
    const fullPath = path.join(__dirname, "../public", profilePicUrl);
    const fileExists = validateFileExists(fullPath);
    dualVerification.physicalFile = fileExists;
    dualVerification.consistent = dualVerification.databaseRecord === dualVerification.physicalFile;
    
    // Step 3: Auto-repair inconsistencies
    if (dualVerification.databaseRecord && !dualVerification.physicalFile) {
      console.log(`Dual verification failed for user ${userId}: DB has record but file missing`);
      
      // Auto-repair: clean up the database reference to the missing file
      try {
        await pool.query(
          "UPDATE users SET profile_pic_url = NULL WHERE id = ? AND profile_pic_url = ?",
          [userId, profilePicUrl]
        );
        console.log(`Auto-repaired: cleaned up missing profile picture reference for user ${userId}`);
        dualVerification.autoRepaired = true;
        dualVerification.consistent = true; // Now consistent after repair
      } catch (cleanupErr) {
        console.error("Error in auto-repair:", cleanupErr);
      }
    }
    
    res.json({ 
      exists: fileExists && dualVerification.databaseRecord, 
      url: (fileExists && dualVerification.databaseRecord) ? profilePicUrl : null,
      dbUrl: profilePicUrl,
      reason: dualVerification.consistent ? 
        (fileExists ? "Archivo encontrado y verificado" : "Sin foto de perfil") :
        "Inconsistencia detectada y reparada automáticamente",
      dualVerification
    });
    
  } catch (err) {
    console.error("Error in dual verification:", err);
    res.status(500).json({ 
      exists: false, 
      error: "Error interno del servidor: " + err.message 
    });
  }
});

// Enhanced endpoint for comprehensive data synchronization and validation
app.post("/admin/validate-profile-files", requireAdmin, async (req, res) => {
  try {
    const profilePicsDir = path.join(__dirname, "../public/uploads/profile_pics");
    
    // Get all users with profile pictures from database
    const [dbUsers] = await pool.query(
      "SELECT id, profile_pic_url FROM users WHERE profile_pic_url IS NOT NULL"
    );
    
    // Get all files in the profile pictures directory
    let filesInDir = [];
    try {
      filesInDir = fs.readdirSync(profilePicsDir).filter(file => 
        file !== '.gitkeep' && fs.statSync(path.join(profilePicsDir, file)).isFile()
      );
    } catch (dirErr) {
      console.error("Error reading profile pics directory:", dirErr);
      return res.status(500).json({ 
        error: "No se pudo acceder al directorio de fotos de perfil" 
      });
    }
    
    const results = {
      dbRecords: dbUsers.length,
      filesInDirectory: filesInDir.length,
      missingFiles: [],
      orphanedFiles: [],
      cleanedDbReferences: 0,
      deletedOrphanedFiles: 0,
      autoRepairActions: [],
      inconsistenciesFound: 0,
      inconsistenciesResolved: 0
    };
    
    // Check for missing files (in DB but not on filesystem)
    for (const user of dbUsers) {
      const fileName = path.basename(user.profile_pic_url);
      const fullPath = path.join(profilePicsDir, fileName);
      
      if (!validateFileExists(fullPath)) {
        results.missingFiles.push({
          userId: user.id,
          url: user.profile_pic_url,
          expectedPath: fullPath
        });
        results.inconsistenciesFound++;
        
        // Auto-repair: Clean up database reference
        try {
          await pool.query(
            "UPDATE users SET profile_pic_url = NULL WHERE id = ?",
            [user.id]
          );
          results.cleanedDbReferences++;
          results.inconsistenciesResolved++;
          results.autoRepairActions.push({
            action: 'cleaned_db_reference',
            userId: user.id,
            url: user.profile_pic_url,
            reason: 'File missing from filesystem'
          });
        } catch (cleanupErr) {
          console.error(`Error cleaning DB reference for user ${user.id}:`, cleanupErr);
          results.autoRepairActions.push({
            action: 'cleanup_failed',
            userId: user.id,
            url: user.profile_pic_url,
            error: cleanupErr.message
          });
        }
      }
    }
    
    // Check for orphaned files (on filesystem but not in DB)
    const dbFileNames = dbUsers.map(user => path.basename(user.profile_pic_url));
    for (const fileName of filesInDir) {
      if (!dbFileNames.includes(fileName)) {
        const filePath = path.join(profilePicsDir, fileName);
        results.orphanedFiles.push({
          fileName,
          path: filePath
        });
        results.inconsistenciesFound++;
        
        // Auto-repair: Delete orphaned file
        const deleteResult = await safeDeleteFile(filePath);
        if (deleteResult.success) {
          results.deletedOrphanedFiles++;
          results.inconsistenciesResolved++;
          results.autoRepairActions.push({
            action: 'deleted_orphaned_file',
            fileName,
            path: filePath,
            reason: 'File not referenced in database'
          });
        } else {
          results.autoRepairActions.push({
            action: 'delete_failed',
            fileName,
            path: filePath,
            error: deleteResult.reason
          });
        }
      }
    }
    
    console.log("Profile files validation completed:", results);
    res.json({
      success: true,
      message: `Validación y sincronización completada. ${results.inconsistenciesResolved}/${results.inconsistenciesFound} inconsistencias resueltas automáticamente.`,
      results
    });
    
  } catch (err) {
    console.error("Error validating profile files:", err);
    res.status(500).json({ 
      error: "Error interno del servidor: " + err.message 
    });
  }
});

// New endpoint for automatic data synchronization and validation
app.post("/sync-profile-data", async (req, res) => {
  try {
    const profilePicsDir = path.join(__dirname, "../public/uploads/profile_pics");
    
    // Get all users with profile pictures from database
    const [dbUsers] = await pool.query(
      "SELECT id, profile_pic_url FROM users WHERE profile_pic_url IS NOT NULL"
    );
    
    const syncResults = {
      totalChecked: dbUsers.length,
      inconsistenciesFound: 0,
      autoRepaired: 0,
      errors: []
    };
    
    // Perform dual verification for each user's profile picture
    for (const user of dbUsers) {
      try {
        const fileName = path.basename(user.profile_pic_url);
        const fullPath = path.join(profilePicsDir, fileName);
        
        // Dual verification: check both database record and physical file
        const dbHasRecord = user.profile_pic_url !== null;
        const fileExists = validateFileExists(fullPath);
        
        if (dbHasRecord && !fileExists) {
          // Inconsistency detected: DB has record but file doesn't exist
          syncResults.inconsistenciesFound++;
          
          // Auto-repair: clean up database reference
          await pool.query(
            "UPDATE users SET profile_pic_url = NULL WHERE id = ?",
            [user.id]
          );
          
          syncResults.autoRepaired++;
          console.log(`Auto-repaired inconsistency for user ${user.id}: removed DB reference to missing file`);
        }
      } catch (error) {
        syncResults.errors.push({
          userId: user.id,
          error: error.message
        });
      }
    }
    
    // Check for orphaned files and clean them up
    try {
      const filesInDir = fs.readdirSync(profilePicsDir).filter(file => 
        file !== '.gitkeep' && fs.statSync(path.join(profilePicsDir, file)).isFile()
      );
      
      const dbFileNames = dbUsers.map(user => path.basename(user.profile_pic_url));
      
      for (const fileName of filesInDir) {
        if (!dbFileNames.includes(fileName)) {
          syncResults.inconsistenciesFound++;
          
          const filePath = path.join(profilePicsDir, fileName);
          const deleteResult = await safeDeleteFile(filePath);
          
          if (deleteResult.success) {
            syncResults.autoRepaired++;
            console.log(`Auto-repaired: deleted orphaned file ${fileName}`);
          }
        }
      }
    } catch (dirError) {
      syncResults.errors.push({
        type: 'directory_scan',
        error: dirError.message
      });
    }
    
    res.json({
      success: true,
      message: `Sincronización completada. ${syncResults.autoRepaired}/${syncResults.inconsistenciesFound} inconsistencias reparadas automáticamente.`,
      results: syncResults
    });
    
  } catch (err) {
    console.error("Error in data synchronization:", err);
    res.status(500).json({ 
      error: "Error en sincronización de datos: " + err.message 
    });
  }
});

// Endpoint para limpiar archivos huérfanos específicos
app.delete("/admin/cleanup-orphaned-files", requireAdmin, async (req, res) => {
  try {
    const profilePicsDir = path.join(__dirname, "../public/uploads/profile_pics");
    
    // Get all users with profile pictures from database
    const [dbUsers] = await pool.query(
      "SELECT profile_pic_url FROM users WHERE profile_pic_url IS NOT NULL"
    );
    
    // Get all files in directory
    let filesInDir = [];
    try {
      filesInDir = fs.readdirSync(profilePicsDir).filter(file => 
        file !== '.gitkeep' && fs.statSync(path.join(profilePicsDir, file)).isFile()
      );
    } catch (dirErr) {
      return res.status(500).json({ 
        error: "No se pudo acceder al directorio de fotos de perfil" 
      });
    }
    
    const dbFileNames = dbUsers.map(user => path.basename(user.profile_pic_url));
    const orphanedFiles = [];
    let deletedCount = 0;
    
    // Find and delete orphaned files
    for (const fileName of filesInDir) {
      if (!dbFileNames.includes(fileName)) {
        const filePath = path.join(profilePicsDir, fileName);
        orphanedFiles.push(fileName);
        
        const deleteResult = await safeDeleteFile(filePath);
        if (deleteResult.success) {
          deletedCount++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Limpieza completada. ${deletedCount} archivos huérfanos eliminados.`,
      orphanedFiles,
      deletedCount,
      totalFilesChecked: filesInDir.length
    });
    
  } catch (err) {
    console.error("Error cleaning up orphaned files:", err);
    res.status(500).json({ 
      error: "Error interno del servidor: " + err.message 
    });
  }
});

// Endpoint for system-wide data synchronization (can be called periodically)
app.post("/system/sync-data", async (req, res) => {
  try {
    console.log("Starting system-wide data synchronization...");
    
    // Get all users
    const [allUsers] = await pool.query("SELECT id FROM users");
    
    const syncStats = {
      totalUsers: allUsers.length,
      usersChecked: 0,
      inconsistenciesFound: 0,
      autoRepaired: 0,
      errors: []
    };
    
    // Perform dual verification and auto-synchronization for each user
    for (const user of allUsers) {
      try {
        syncStats.usersChecked++;
        const syncResult = await autoSynchronizeProfilePicture(user.id);
        
        if (syncResult.verification && syncResult.verification.needsRepair) {
          syncStats.inconsistenciesFound++;
        }
        
        if (syncResult.repaired) {
          syncStats.autoRepaired++;
        }
        
        if (!syncResult.success) {
          syncStats.errors.push({
            userId: user.id,
            error: syncResult.error
          });
        }
      } catch (userError) {
        syncStats.errors.push({
          userId: user.id,
          error: userError.message
        });
      }
    }
    
    // Additional cleanup: remove any orphaned files
    try {
      const profilePicsDir = path.join(__dirname, "../public/uploads/profile_pics");
      const filesInDir = fs.readdirSync(profilePicsDir).filter(file => 
        file !== '.gitkeep' && fs.statSync(path.join(profilePicsDir, file)).isFile()
      );
      
      const [dbUsers] = await pool.query(
        "SELECT profile_pic_url FROM users WHERE profile_pic_url IS NOT NULL"
      );
      const dbFileNames = dbUsers.map(user => path.basename(user.profile_pic_url));
      
      let orphanedFilesRemoved = 0;
      for (const fileName of filesInDir) {
        if (!dbFileNames.includes(fileName)) {
          const filePath = path.join(profilePicsDir, fileName);
          const deleteResult = await safeDeleteFile(filePath);
          if (deleteResult.success) {
            orphanedFilesRemoved++;
            syncStats.autoRepaired++;
          }
        }
      }
      
      syncStats.orphanedFilesRemoved = orphanedFilesRemoved;
    } catch (cleanupError) {
      syncStats.errors.push({
        type: 'orphaned_file_cleanup',
        error: cleanupError.message
      });
    }
    
    console.log("System-wide synchronization completed:", syncStats);
    
    res.json({
      success: true,
      message: `Sincronización del sistema completada. ${syncStats.autoRepaired} reparaciones automáticas realizadas.`,
      stats: syncStats
    });
    
  } catch (err) {
    console.error("Error in system-wide synchronization:", err);
    res.status(500).json({ 
      error: "Error en sincronización del sistema: " + err.message 
    });
  }
});

/* ==============================
   RUTAS DE SPOTIFY
============================== */
app.get("/search", async (req, res) => {
  const q = req.query.q;
  try {
    const token = await getToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album,track&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al buscar en Spotify" });
  }
});

// Detalle de álbum
app.get("/album/:id", async (req, res) => {
  try {
    const token = await getToken();
    const response = await fetch(
      `https://api.spotify.com/v1/albums/${req.params.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener álbum" });
  }
});

// Obtener tracks de álbum con preview URLs
app.get("/album/:id/tracks", async (req, res) => {
  const albumId = req.params.id;
  const startTime = Date.now();
  
  try {
    // Validar ID del álbum
    if (!albumId || albumId.length !== 22) {
      return res.status(400).json({ 
        error: "ID de álbum inválido",
        hasPreview: false,
        tracks: [],
        albumId: albumId
      });
    }

    const token = await getToken();
    
    if (!token) {
      console.error(`No se pudo obtener token de Spotify para álbum ${albumId}`);
      return res.status(503).json({ 
        error: "Servicio de música temporalmente no disponible",
        hasPreview: false,
        tracks: [],
        albumId: albumId,
        retryable: true
      });
    }

    // Realizar petición a Spotify con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout

    const response = await fetch(
      `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        albumId: albumId
      };
      
      console.error(`Spotify API error:`, errorDetails);
      
      // Manejar diferentes tipos de errores de Spotify
      if (response.status === 401) {
        return res.status(503).json({ 
          error: "Error de autenticación con el servicio de música",
          hasPreview: false,
          tracks: [],
          albumId: albumId,
          retryable: true
        });
      } else if (response.status === 404) {
        return res.status(404).json({ 
          error: "Álbum no encontrado en el servicio de música",
          hasPreview: false,
          tracks: [],
          albumId: albumId,
          retryable: false
        });
      } else if (response.status === 429) {
        return res.status(429).json({ 
          error: "Demasiadas solicitudes. Intenta más tarde",
          hasPreview: false,
          tracks: [],
          albumId: albumId,
          retryable: true,
          retryAfter: response.headers.get('Retry-After') || 60
        });
      } else {
        return res.status(503).json({ 
          error: "Error del servicio de música",
          hasPreview: false,
          tracks: [],
          albumId: albumId,
          retryable: true
        });
      }
    }

    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      console.warn(`[TRACKS] Respuesta inesperada de Spotify para álbum ${albumId}:`, data);
      return res.status(404).json({ 
        error: "No se encontraron tracks para este álbum",
        hasPreview: false,
        tracks: [],
        albumId: albumId,
        retryable: false
      });
    }

    // Validar y procesar tracks con preview URLs de Deezer
    const processedTracks = await Promise.all(data.items.map(async (track, index) => {
      // Primero intentar con Spotify (por si acaso)
      let previewUrl = validatePreviewUrl(track.preview_url);
      let source = 'spotify';
      
      // Si no hay preview de Spotify, buscar en Deezer
      if (!previewUrl && track.artists && track.artists.length > 0) {
        const deezerResult = await searchDeezerPreview(track.name, track.artists[0].name);
        previewUrl = deezerResult.preview_url;
        source = deezerResult.source;
      }
      
      return {
        id: track.id,
        name: track.name || 'Track sin nombre',
        preview_url: previewUrl,
        duration_ms: track.duration_ms || 0,
        track_number: track.track_number || 0,
        artists: track.artists ? track.artists.map(artist => ({
          name: artist.name || 'Artista desconocido',
          id: artist.id
        })) : [],
        available: previewUrl !== null,
        source: source
      };
    }));

    // Filtrar tracks con preview disponible
    const tracksWithPreview = processedTracks.filter(track => track.available);
    const deezerTracks = tracksWithPreview.filter(track => track.source === 'deezer');
    const spotifyTracks = tracksWithPreview.filter(track => track.source === 'spotify');
    
    const result = {
      tracks: processedTracks,
      tracksWithPreview: tracksWithPreview,
      hasPreview: tracksWithPreview.length > 0,
      totalTracks: processedTracks.length,
      tracksWithPreviewCount: tracksWithPreview.length,
      albumId: albumId,
      processingTime: Date.now() - startTime,
      sources: {
        spotify: spotifyTracks.length,
        deezer: deezerTracks.length,
        total: tracksWithPreview.length
      }
    };

    res.json(result);

  } catch (err) {
    const processingTime = Date.now() - startTime;
    
    // Log detallado del error
    console.error(`Error crítico obteniendo tracks del álbum ${albumId}:`, {
      error: err.message,
      stack: err.stack,
      albumId: albumId,
      processingTime: processingTime
    });
    
    // Determinar si el error es recuperable
    const isNetworkError = err.name === 'AbortError' || err.code === 'ECONNRESET' || 
                          err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT';
    
    res.status(500).json({ 
      error: isNetworkError ? 
        "Error de conexión con el servicio de música" : 
        "Error interno del servidor",
      hasPreview: false,
      tracks: [],
      albumId: albumId,
      retryable: isNetworkError,
      processingTime: processingTime
    });
  }
});

// Función auxiliar para validar preview URLs
// Función auxiliar para buscar preview en Deezer
async function searchDeezerPreview(trackName, artistName) {
  try {
    if (!trackName || !artistName) {
      return { preview_url: null, source: 'none' };
    }
    
    // Limpiar nombres para búsqueda
    const cleanTrackName = trackName.replace(/[^\w\s]/g, '').trim();
    const cleanArtistName = artistName.replace(/[^\w\s]/g, '').trim();
    const searchQuery = `${cleanArtistName} ${cleanTrackName}`.trim();
    
    if (!searchQuery) {
      return { preview_url: null, source: 'none' };
    }
    
    console.log(`[DEEZER] Buscando: "${searchQuery}"`);
    
    // Buscar en Deezer API (no requiere autenticación)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const deezerResponse = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}&limit=5`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!deezerResponse.ok) {
      console.log(`[DEEZER] Error HTTP: ${deezerResponse.status}`);
      return { preview_url: null, source: 'deezer_error' };
    }
    
    const deezerData = await deezerResponse.json();
    
    if (deezerData.data && deezerData.data.length > 0) {
      // Buscar la mejor coincidencia
      for (const deezerTrack of deezerData.data) {
        if (deezerTrack.preview && deezerTrack.preview.length > 0) {
          console.log(`[DEEZER] Preview encontrado: ${deezerTrack.title} - ${deezerTrack.artist.name}`);
          return { 
            preview_url: deezerTrack.preview,
            source: 'deezer',
            deezer_id: deezerTrack.id,
            matched_title: deezerTrack.title,
            matched_artist: deezerTrack.artist.name
          };
        }
      }
    }
    
    console.log(`[DEEZER] No se encontraron previews para: "${searchQuery}"`);
    return { preview_url: null, source: 'deezer_no_results' };
    
  } catch (error) {
    console.warn(`[DEEZER] Error buscando "${trackName}" - "${artistName}":`, error.message);
    return { preview_url: null, source: 'deezer_error' };
  }
}

function validatePreviewUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  // Validar URLs de Spotify (legacy)
  const spotifyPreviewPattern = /^https:\/\/p\.scdn\.co\/mp3-preview\//;
  if (spotifyPreviewPattern.test(url)) {
    return url;
  }
  
  // Validar URLs de Deezer
  const deezerPreviewPattern = /^https:\/\/cdns-preview-[a-z0-9]\.dzcdn\.net\//;
  if (deezerPreviewPattern.test(url)) {
    return url;
  }
  
  // Validación básica para otras URLs HTTPS
  if (url.startsWith('https://') && url.includes('preview')) {
    return url;
  }
  
  return null;
}

/* ==============================
   RUTAS DE RESEÑAS
============================== */

// Ruta opcional para logging de errores del cliente (para monitoreo)
app.post("/log-error", (req, res) => {
  try {
    const { component, error, level } = req.body;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: component || 'unknown',
      level: level || 'error',
      error: error || {},
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.session?.userId || 'anonymous'
    };
    
    console.error(`[CLIENT-ERROR] ${component}:`, logEntry);
    
    // En producción, aquí podrías enviar a un servicio de monitoreo
    // como Sentry, LogRocket, etc.
    
    res.json({ success: true, logged: true });
  } catch (err) {
    console.error("Error al procesar log de cliente:", err);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// Crear reseña
app.post("/reviews/album/:spotify_id", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ success: false, error: "No logueado" });

  const { stars, comment } = req.body;
  const spotify_id = req.params.spotify_id;

  if (!stars || stars < 1 || stars > 5 || !comment)
    return res.status(400).json({ success: false, error: "Datos inválidos" });

  try {
    const [result] = await pool.query(
      "INSERT INTO reviews (type, spotify_id, user_id, stars, comment) VALUES (?, ?, ?, ?, ?)",
      ["album", spotify_id, req.session.userId, stars, comment]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Leer reseñas de álbum (solo las visibles)
app.get("/reviews/album/:spotify_id", async (req, res) => {
  const spotify_id = req.params.spotify_id;
  try {
    const [rows] = await pool.query(
    "SELECT r.*, u.username, u.profile_pic_url " + 
    "FROM reviews r JOIN users u ON r.user_id = u.id " +
    "WHERE r.spotify_id = ? AND r.type = 'album' AND r.is_hidden = FALSE AND u.is_blocked = FALSE",
    [spotify_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
/* ==============================
   RUTAS DE ÁLBUMES
============================== */
// Top albums
app.get('/albums/top', async (req, res) => {
    try {
        const sql = `
            SELECT spotify_id, AVG(stars) AS avgStars, COUNT(*) AS reviewCount
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.type='album' AND r.is_hidden = FALSE AND u.is_blocked = FALSE
            GROUP BY spotify_id
            ORDER BY avgStars DESC, reviewCount DESC
            LIMIT 20
        `;

        const [rows] = await pool.query(sql);

        if (rows.length === 0) {
            return res.json([]);
        }
        
        const token = await getToken();
        const ids = rows.map(r => r.spotify_id).join(",");

        const response = await fetch(
            `https://api.spotify.com/v1/albums?ids=${ids}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json();

        const result = data.albums
            .filter(a => a !== null)
            .map(album => {
                const review = rows.find(r => r.spotify_id === album.id);
                return {
                    ...album,
                    avgStars: Number(review.avgStars),
                    reviewCount: review.reviewCount
                };
            });

        res.json(result);

    } catch (err) {
        console.error("Error al obtener top albums:", err);
        res.status(500).json({ error: "Error al obtener top albums" });
    }
});

// Reseñas aleatorias
app.get("/reviews/random", async (req, res) => {
    try {
        const [reviewsRows] = await pool.query(`
            SELECT r.*, u.username, u.profile_pic_url 
            FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.type = 'album' AND r.is_hidden = FALSE AND u.is_blocked = FALSE
            ORDER BY RAND() 
            LIMIT 8
        `);

        if (reviewsRows.length === 0) {
            return res.json([]);
        }

        const token = await getToken();
        const spotifyIds = [...new Set(reviewsRows.map(r => r.spotify_id))]; 
        const idsString = spotifyIds.join(",");

        if (!token) {
            return res.status(500).json([]);
        }

        const response = await fetch(
            `https://api.spotify.com/v1/albums?ids=${idsString}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (!response.ok) {
            return res.json([]); 
        }

        const data = await response.json();
        const albumMap = new Map();
        if (data.albums) {
            data.albums.filter(a => a !== null).forEach(album => {
                albumMap.set(album.id, {
                    albumName: album.name,
                    artistName: album.artists[0]?.name || 'Artista Desconocido',
                    albumCoverUrl: album.images[0]?.url || 'https://placehold.co/100x100/333/fff?text=No+Cover'
                });
            });
        }

        const enrichedReviews = reviewsRows.map(review => {
            const albumDetails = albumMap.get(review.spotify_id) || {};
            return {
                reviewId: review.id,
                spotifyId: review.spotify_id,
                username: review.username,
                profile_pic_url: review.profile_pic_url, 
                stars: review.stars,
                comment: review.comment,
                ...albumDetails
            };
        });

        res.json(enrichedReviews);

    } catch (err) {
        console.error("Error al obtener reseñas aleatorias:", err);
        res.status(500).json([]);
    }
});

// Obtener perfil de usuario
app.get("/user/profile/:userId", async (req, res) => {
  const targetUserId = req.params.userId;
  try {
    const [statsRows] = await pool.query(`
      SELECT 
        u.username,
        u.profile_pic_url, 
        COUNT(r.id) AS totalReviews,
        IFNULL(AVG(r.stars), 0) AS avgStars
      FROM users u
      LEFT JOIN reviews r ON u.id = r.user_id AND r.is_hidden = FALSE
      WHERE u.id = ?
      GROUP BY u.id
    `, [targetUserId]);

    if (statsRows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const userData = statsRows[0];

    const [topReviewsRows] = await pool.query(`
      SELECT 
        r.id, r.spotify_id, r.stars, r.comment
      FROM reviews r
      WHERE r.user_id = ? AND r.type = 'album' AND r.is_hidden = FALSE
      ORDER BY r.stars DESC, r.id DESC
      LIMIT 5
    `, [targetUserId]);

    if (topReviewsRows.length === 0) {
      return res.json({ ...userData, topReviews: [] });
    }

    const token = await getToken();
    
    if (!token) {
      return res.json({ ...userData, topReviews: topReviewsRows });
    }
    
    const spotifyIds = [...new Set(topReviewsRows.map(r => r.spotify_id))];
    const idsString = spotifyIds.join(",");

    const response = await fetch(
      `https://api.spotify.com/v1/albums?ids=${idsString}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) {
      return res.json({ ...userData, topReviews: topReviewsRows });
    }

    const data = await response.json();
    const albumMap = new Map();
    if (data.albums) {
      data.albums.filter(a => a !== null).forEach(album => {
        albumMap.set(album.id, {
          albumName: album.name,
          artistName: album.artists[0]?.name || 'Artista Desconocido',
          albumCoverUrl: album.images[0]?.url || 'https://placehold.co/100x100/333/fff?text=No+Cover'
        });
      });
    }

    const enrichedTopReviews = topReviewsRows.map(review => ({
      reviewId: review.id,
      stars: review.stars,
      comment: review.comment,
      ...albumMap.get(review.spotify_id)
    }));

    res.json({
      username: userData.username,
      profilePictureUrl: userData.profile_pic_url,
      totalReviews: userData.totalReviews,
      avgStars: Number(userData.avgStars).toFixed(2),
      topReviews: enrichedTopReviews
    });

  } catch (err) {
    console.error("Error al obtener datos de perfil de usuario:", err);
    res.status(500).json({ error: "Error en el servidor al obtener perfil" });
  }
});
/* ==============================
   RUTAS DE ADMINISTRACIÓN
============================== */
// Obtener todos los usuarios (solo admin)
app.get("/admin/users", requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        u.is_blocked,
        u.blocked_reason,
        u.created_at,
        COUNT(r.id) as review_count
      FROM users u
      LEFT JOIN reviews r ON u.id = r.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    
    res.json(users);
  } catch (err) {
    console.error("Error obteniendo usuarios:", err);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
});

// Obtener estadísticas (solo admin)
app.get("/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_blocked = TRUE) as blocked_users,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COUNT(*) FROM reviews WHERE is_hidden = TRUE) as hidden_reviews
    `);
    
    res.json(stats[0]);
  } catch (err) {
    console.error("Error obteniendo estadísticas:", err);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
});

// Obtener todas las reseñas para moderación (solo admin)
app.get("/admin/reviews", requireAdmin, async (req, res) => {
  try {
    const [reviews] = await pool.query(`
      SELECT 
        r.id, 
        r.spotify_id,
        r.stars, 
        r.comment,
        r.is_hidden,
        r.hidden_reason,
        r.created_at,
        u.username,
        u.id as user_id
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.type = 'album'
      ORDER BY r.created_at DESC
      LIMIT 50
    `);
    
    if (reviews.length > 0) {
      const token = await getToken();
      const spotifyIds = [...new Set(reviews.map(r => r.spotify_id))];
      const idsString = spotifyIds.join(",");
      
      if (token && idsString) {
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/albums?ids=${idsString}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (response.ok) {
            const data = await response.json();
            const albumMap = new Map();
            
            if (data.albums) {
              data.albums.filter(a => a !== null).forEach(album => {
                albumMap.set(album.id, {
                  albumName: album.name,
                  artistName: album.artists[0]?.name || 'Artista Desconocido'
                });
              });
            }
            
            reviews.forEach(review => {
              const albumInfo = albumMap.get(review.spotify_id);
              if (albumInfo) {
                review.albumName = albumInfo.albumName;
                review.artistName = albumInfo.artistName;
              }
            });
          }
        } catch (spotifyErr) {
          console.error("Error obteniendo info de Spotify para admin:", spotifyErr);
        }
      }
    }
    
    res.json(reviews);
  } catch (err) {
    console.error("Error obteniendo reseñas para admin:", err);
    res.status(500).json({ error: "Error obteniendo reseñas" });
  }
});

// Bloquear usuario (solo admin)
app.post("/admin/users/:userId/block", requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  
  console.log(`Admin ${req.session.userId} intenta bloquear usuario ${userId} con razón: ${reason}`);
  
  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: "La razón del bloqueo es obligatoria" });
  }
  
  try {
    // Iniciar transacción
    await pool.query('START TRANSACTION');
    
    // Bloquear usuario
    const [blockResult] = await pool.query(`
      UPDATE users 
      SET is_blocked = TRUE, blocked_reason = ?, blocked_at = NOW(), blocked_by = ?
      WHERE id = ?
    `, [reason.trim(), req.session.userId, userId]);
    
    console.log(`Usuario bloqueado, filas afectadas: ${blockResult.affectedRows}`);
    
    // Ocultar todas las reseñas del usuario bloqueado
    const [hideResult] = await pool.query(`
      UPDATE reviews 
      SET is_hidden = TRUE, hidden_reason = ?, hidden_at = NOW(), hidden_by = ?
      WHERE user_id = ?
    `, [`Usuario bloqueado: ${reason.trim()}`, req.session.userId, userId]);
    
    console.log(`Reseñas ocultadas, filas afectadas: ${hideResult.affectedRows}`);
    
    // Confirmar transacción
    await pool.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Usuario bloqueado y ${hideResult.affectedRows} reseñas ocultadas` 
    });
  } catch (err) {
    // Revertir transacción en caso de error
    await pool.query('ROLLBACK');
    console.error("Error bloqueando usuario:", err);
    res.status(500).json({ error: "Error al bloquear usuario" });
  }
});

// Desbloquear usuario (solo admin)
app.post("/admin/users/:userId/unblock", requireAdmin, async (req, res) => {
  const { userId } = req.params;
  
  try {
    await pool.query('START TRANSACTION');
    
    await pool.query(`
      UPDATE users 
      SET is_blocked = FALSE, blocked_reason = NULL, blocked_at = NULL, blocked_by = NULL
      WHERE id = ?
    `, [userId]);
    
    await pool.query(`
      UPDATE reviews 
      SET is_hidden = FALSE, hidden_reason = NULL, hidden_at = NULL, hidden_by = NULL
      WHERE user_id = ? AND hidden_reason LIKE 'Usuario bloqueado:%'
    `, [userId]);
    
    await pool.query('COMMIT');
    
    res.json({ success: true, message: "Usuario desbloqueado y reseñas restauradas" });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Error desbloqueando usuario:", err);
    res.status(500).json({ error: "Error al desbloquear usuario" });
  }
});

// Ocultar reseña específica (solo admin)
app.post("/admin/reviews/:reviewId/hide", requireAdmin, async (req, res) => {
  const { reviewId } = req.params;
  const { reason } = req.body;
  
  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: "La razón para ocultar es obligatoria" });
  }
  
  try {
    await pool.query(`
      UPDATE reviews 
      SET is_hidden = TRUE, hidden_reason = ?, hidden_at = NOW(), hidden_by = ?
      WHERE id = ?
    `, [reason.trim(), req.session.userId, reviewId]);
    
    res.json({ success: true, message: "Reseña ocultada" });
  } catch (err) {
    console.error("Error ocultando reseña:", err);
    res.status(500).json({ error: "Error al ocultar reseña" });
  }
});

// Mostrar reseña específica (solo admin)
app.post("/admin/reviews/:reviewId/show", requireAdmin, async (req, res) => {
  const { reviewId } = req.params;
  
  try {
    await pool.query(`
      UPDATE reviews 
      SET is_hidden = FALSE, hidden_reason = NULL, hidden_at = NULL, hidden_by = NULL
      WHERE id = ?
    `, [reviewId]);
    
    res.json({ success: true, message: "Reseña mostrada" });
  } catch (err) {
    console.error("Error mostrando reseña:", err);
    res.status(500).json({ error: "Error al mostrar reseña" });
  }
});

/* ==============================
   SISTEMA DE REPORTES
============================== */

// Crear un reporte
app.post("/reports", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const { reportedUserId, reportedReviewId, reason, description } = req.body;

  // Validar que se reporte algo (usuario o reseña)
  if (!reportedUserId && !reportedReviewId) {
    return res.status(400).json({ error: "Debe especificar un usuario o reseña a reportar" });
  }

  // Validar razón
  const validReasons = ['spam', 'inappropriate', 'harassment', 'fake', 'other'];
  if (!reason || !validReasons.includes(reason)) {
    return res.status(400).json({ error: "Razón de reporte inválida" });
  }

  try {
    // Verificar que no se reporte a sí mismo
    if (reportedUserId && reportedUserId === req.session.userId) {
      return res.status(400).json({ error: "No puedes reportarte a ti mismo" });
    }

    // Verificar que el usuario/reseña reportado existe
    if (reportedUserId) {
      const [userCheck] = await pool.query("SELECT id FROM users WHERE id = ?", [reportedUserId]);
      if (userCheck.length === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
    }

    if (reportedReviewId) {
      const [reviewCheck] = await pool.query("SELECT id, user_id FROM reviews WHERE id = ?", [reportedReviewId]);
      if (reviewCheck.length === 0) {
        return res.status(404).json({ error: "Reseña no encontrada" });
      }
      
      // No permitir reportar propia reseña
      if (reviewCheck[0].user_id === req.session.userId) {
        return res.status(400).json({ error: "No puedes reportar tu propia reseña" });
      }
    }

    // Verificar si ya existe un reporte similar del mismo usuario
    const [existingReport] = await pool.query(
      `SELECT id FROM reports 
       WHERE reporter_id = ? 
       AND (reported_user_id = ? OR reported_review_id = ?) 
       AND status = 'pending'`,
      [req.session.userId, reportedUserId || null, reportedReviewId || null]
    );

    if (existingReport.length > 0) {
      return res.status(400).json({ error: "Ya has reportado este contenido" });
    }

    // Crear el reporte
    const [result] = await pool.query(
      `INSERT INTO reports (reporter_id, reported_user_id, reported_review_id, reason, description) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.session.userId, reportedUserId || null, reportedReviewId || null, reason, description || null]
    );

    console.log(`Nuevo reporte creado: ID ${result.insertId} por usuario ${req.session.userId}`);

    res.json({ 
      success: true, 
      message: "Reporte enviado correctamente. Será revisado por un administrador.",
      reportId: result.insertId
    });

  } catch (err) {
    console.error("Error creando reporte:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Listar reportes (solo admins)
app.get("/admin/reports", requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;

    const [reports] = await pool.query(
      `SELECT 
        r.id,
        r.reason,
        r.description,
        r.status,
        r.created_at,
        r.resolved_at,
        r.resolution_notes,
        reporter.username as reporter_username,
        reported_user.username as reported_username,
        reported_user.id as reported_user_id,
        review.comment as review_comment,
        review.stars as review_stars,
        review.id as review_id,
        resolver.username as resolver_username
      FROM reports r
      LEFT JOIN users reporter ON r.reporter_id = reporter.id
      LEFT JOIN users reported_user ON r.reported_user_id = reported_user.id
      LEFT JOIN reviews review ON r.reported_review_id = review.id
      LEFT JOIN users resolver ON r.resolved_by = resolver.id
      WHERE r.status = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [status, parseInt(limit), parseInt(offset)]
    );

    // Contar total de reportes
    const [countResult] = await pool.query(
      "SELECT COUNT(*) as total FROM reports WHERE status = ?",
      [status]
    );

    res.json({
      reports,
      total: countResult[0].total,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (err) {
    console.error("Error obteniendo reportes:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Resolver un reporte (solo admins)
app.post("/admin/reports/:reportId/resolve", requireAdmin, async (req, res) => {
  const { reportId } = req.params;
  const { action, notes } = req.body; // action: 'dismiss', 'hide_review', 'block_user'

  if (!action || !['dismiss', 'hide_review', 'block_user'].includes(action)) {
    return res.status(400).json({ error: "Acción inválida" });
  }

  try {
    // Obtener información del reporte
    const [reports] = await pool.query(
      `SELECT r.*, review.user_id as review_author_id 
       FROM reports r 
       LEFT JOIN reviews review ON r.reported_review_id = review.id 
       WHERE r.id = ? AND r.status = 'pending'`,
      [reportId]
    );

    if (reports.length === 0) {
      return res.status(404).json({ error: "Reporte no encontrado o ya resuelto" });
    }

    const report = reports[0];

    // Ejecutar la acción correspondiente
    if (action === 'hide_review' && report.reported_review_id) {
      await pool.query(
        "UPDATE reviews SET is_hidden = TRUE, hidden_reason = ?, hidden_at = NOW(), hidden_by = ? WHERE id = ?",
        [notes || 'Contenido reportado por usuarios', req.session.userId, report.reported_review_id]
      );
    } else if (action === 'block_user') {
      const targetUserId = report.reported_user_id || report.review_author_id;
      if (targetUserId) {
        await pool.query(
          "UPDATE users SET is_blocked = TRUE, blocked_reason = ?, blocked_at = NOW(), blocked_by = ? WHERE id = ?",
          [notes || 'Usuario reportado por comportamiento inapropiado', req.session.userId, targetUserId]
        );
      }
    }

    // Marcar reporte como resuelto
    await pool.query(
      "UPDATE reports SET status = 'resolved', resolved_by = ?, resolved_at = NOW(), resolution_notes = ? WHERE id = ?",
      [req.session.userId, notes || `Acción tomada: ${action}`, reportId]
    );

    console.log(`Reporte ${reportId} resuelto por admin ${req.session.userId} con acción: ${action}`);

    res.json({ 
      success: true, 
      message: "Reporte resuelto correctamente",
      action 
    });

  } catch (err) {
    console.error("Error resolviendo reporte:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Descartar un reporte (solo admins)
app.post("/admin/reports/:reportId/dismiss", requireAdmin, async (req, res) => {
  const { reportId } = req.params;
  const { notes } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE reports SET status = 'dismissed', resolved_by = ?, resolved_at = NOW(), resolution_notes = ? WHERE id = ? AND status = 'pending'",
      [req.session.userId, notes || 'Reporte descartado por administrador', reportId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reporte no encontrado o ya resuelto" });
    }

    console.log(`Reporte ${reportId} descartado por admin ${req.session.userId}`);

    res.json({ 
      success: true, 
      message: "Reporte descartado correctamente" 
    });

  } catch (err) {
    console.error("Error descartando reporte:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Estadísticas de reportes (solo admins)
app.get("/admin/reports/stats", requireAdmin, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reports,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_reports,
        SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) as dismissed_reports,
        SUM(CASE WHEN reason = 'spam' THEN 1 ELSE 0 END) as spam_reports,
        SUM(CASE WHEN reason = 'inappropriate' THEN 1 ELSE 0 END) as inappropriate_reports,
        SUM(CASE WHEN reason = 'harassment' THEN 1 ELSE 0 END) as harassment_reports
      FROM reports
    `);

    res.json(stats[0]);

  } catch (err) {
    console.error("Error obteniendo estadísticas de reportes:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ==============================
   RUTAS DE LANDING PAGE
============================== */

// Obtener estadísticas para la landing page - OPTIMIZED
app.get("/api/landing/stats", async (req, res) => {
  try {
    // Optimized single query with proper indexing hints
    const [statsRows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN table_name = 'users' AND is_blocked = FALSE THEN 1 ELSE 0 END) as totalUsers,
        SUM(CASE WHEN table_name = 'reviews' AND is_hidden = FALSE THEN 1 ELSE 0 END) as totalReviews,
        COUNT(DISTINCT CASE WHEN table_name = 'reviews' AND is_hidden = FALSE THEN spotify_id END) as totalAlbums
      FROM (
        SELECT 'users' as table_name, NULL as is_hidden, is_blocked, NULL as spotify_id FROM users
        UNION ALL
        SELECT 'reviews' as table_name, is_hidden, NULL as is_blocked, spotify_id FROM reviews
      ) combined_stats
    `);
    
    const stats = statsRows[0];
    
    // Add cache headers for better performance
    res.set({
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      'ETag': `"stats-${Date.now()}"`,
      'Vary': 'Accept-Encoding'
    });
    
    res.json({
      success: true,
      totalUsers: parseInt(stats.totalUsers) || 0,
      totalReviews: parseInt(stats.totalReviews) || 0,
      totalAlbums: parseInt(stats.totalAlbums) || 0,
      cached: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("Error obteniendo estadísticas de landing page:", err);
    
    // Enhanced error handling with fallback values
    res.status(200).json({
      success: false,
      error: "Error obteniendo estadísticas",
      fallback: true,
      totalUsers: 0,
      totalReviews: 0,
      totalAlbums: 0
    });
  }
});

// Obtener álbumes destacados para la landing page - OPTIMIZED
app.get("/api/landing/featured-albums", async (req, res) => {
  try {
    // Optimized query with proper joins and indexing
    const [albumRows] = await pool.query(`
      SELECT 
        r.spotify_id,
        ROUND(AVG(r.stars), 1) as averageRating,
        COUNT(r.id) as reviewCount
      FROM reviews r
      INNER JOIN users u ON r.user_id = u.id
      WHERE r.type = 'album' 
        AND r.is_hidden = FALSE 
        AND u.is_blocked = FALSE
        AND r.spotify_id IS NOT NULL
      GROUP BY r.spotify_id
      HAVING reviewCount >= 1
      ORDER BY averageRating DESC, reviewCount DESC
      LIMIT 8
    `);
    
    if (albumRows.length === 0) {
      // Add cache headers even for empty results
      res.set({
        'Cache-Control': 'public, max-age=60', // Cache empty results for 1 minute
        'ETag': `"empty-albums-${Date.now()}"`,
      });
      
      return res.json({
        success: true,
        albums: [],
        message: "No hay álbumes reseñados aún"
      });
    }
    
    // Get Spotify data for the albums with enhanced error handling
    let token;
    try {
      token = await getToken();
    } catch (tokenError) {
      console.error("Error obteniendo token de Spotify:", tokenError);
      return res.json({
        success: false,
        error: "Error de conexión con Spotify",
        fallback: true,
        albums: [],
        message: "Servicio de música temporalmente no disponible"
      });
    }
    
    if (!token) {
      console.error("No se pudo obtener token de Spotify para álbumes destacados");
      return res.json({
        success: false,
        error: "Token de Spotify no disponible",
        fallback: true,
        albums: [],
        message: "Servicio de música temporalmente no disponible"
      });
    }
    
    const spotifyIds = albumRows.map(album => album.spotify_id);
    const idsString = spotifyIds.join(",");
    
    let spotifyData;
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/albums?ids=${idsString}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 // 10 second timeout
        }
      );
      
      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
      }
      
      spotifyData = await response.json();
    } catch (spotifyError) {
      console.error("Error en respuesta de Spotify API para álbumes destacados:", spotifyError);
      return res.json({
        success: false,
        error: "Error obteniendo datos de Spotify",
        fallback: true,
        albums: [],
        message: "Información de álbumes temporalmente no disponible"
      });
    }
    
    if (!spotifyData.albums) {
      return res.json({
        success: false,
        error: "Respuesta inválida de Spotify",
        fallback: true,
        albums: [],
        message: "Datos de álbumes no disponibles"
      });
    }
    
    // Combine database stats with Spotify data
    const featuredAlbums = spotifyData.albums
      .filter(album => album !== null)
      .map(album => {
        const stats = albumRows.find(row => row.spotify_id === album.id);
        return {
          id: album.id,
          name: album.name,
          artist: album.artists[0]?.name || 'Artista Desconocido',
          imageUrl: album.images[0]?.url || 'https://placehold.co/300x300/333/fff?text=No+Cover',
          averageRating: Number(stats.averageRating).toFixed(1),
          reviewCount: stats.reviewCount
        };
      });
    
    // Add cache headers for successful results
    res.set({
      'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
      'ETag': `"albums-${featuredAlbums.length}-${Date.now()}"`,
      'Vary': 'Accept-Encoding'
    });
    
    res.json({
      success: true,
      albums: featuredAlbums,
      message: `${featuredAlbums.length} álbumes destacados encontrados`,
      cached: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("Error obteniendo álbumes destacados:", err);
    res.json({
      success: false,
      error: "Error interno del servidor",
      fallback: true,
      albums: [],
      message: "Error cargando álbumes destacados"
    });
  }
});

// Obtener imágenes para el carrusel de fondo - OPTIMIZED
app.get("/api/landing/carousel-images", async (req, res) => {
  try {
    // Optimized query with better randomization and caching
    const [imageRows] = await pool.query(`
      SELECT DISTINCT r.spotify_id
      FROM reviews r
      INNER JOIN users u ON r.user_id = u.id
      WHERE r.type = 'album' 
        AND r.is_hidden = FALSE 
        AND u.is_blocked = FALSE
        AND r.spotify_id IS NOT NULL
      ORDER BY RAND()
      LIMIT 20
    `);
    
    if (imageRows.length === 0) {
      // Add cache headers for empty results
      res.set({
        'Cache-Control': 'public, max-age=120', // Cache empty results for 2 minutes
        'ETag': `"empty-carousel-${Date.now()}"`,
      });
      
      return res.json({
        success: true,
        images: [],
        message: "No hay álbumes para mostrar en el carrusel"
      });
    }
    
    // Get Spotify data for the albums with enhanced error handling
    let token;
    try {
      token = await getToken();
    } catch (tokenError) {
      console.error("Error obteniendo token de Spotify para carrusel:", tokenError);
      return res.json({
        success: false,
        error: "Error de conexión con Spotify",
        fallback: true,
        images: [],
        message: "Carrusel temporalmente no disponible"
      });
    }
    
    if (!token) {
      console.error("No se pudo obtener token de Spotify para carrusel");
      return res.json({
        success: false,
        error: "Token de Spotify no disponible",
        fallback: true,
        images: [],
        message: "Carrusel temporalmente no disponible"
      });
    }
    
    const spotifyIds = imageRows.map(row => row.spotify_id);
    const idsString = spotifyIds.join(",");
    
    let spotifyData;
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/albums?ids=${idsString}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000 // 8 second timeout for carousel (less critical)
        }
      );
      
      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
      }
      
      spotifyData = await response.json();
    } catch (spotifyError) {
      console.error("Error en respuesta de Spotify API para carrusel:", spotifyError);
      return res.json({
        success: false,
        error: "Error obteniendo imágenes de Spotify",
        fallback: true,
        images: [],
        message: "Carrusel temporalmente no disponible"
      });
    }
    
    if (!spotifyData.albums) {
      return res.json({
        success: false,
        error: "Respuesta inválida de Spotify",
        fallback: true,
        images: [],
        message: "Imágenes de carrusel no disponibles"
      });
    }
    
    // Extract image data for carousel with lazy loading optimization
    const carouselImages = spotifyData.albums
      .filter(album => album !== null)
      .map(album => ({
        albumId: album.id,
        imageUrl: album.images[0]?.url || 'https://placehold.co/300x300/333/fff?text=No+Cover',
        albumName: album.name,
        artistName: album.artists[0]?.name || 'Artista Desconocido',
        // Add smaller image URL for lazy loading
        thumbnailUrl: album.images[2]?.url || album.images[1]?.url || album.images[0]?.url
      }));
    
    // Add cache headers for successful results
    res.set({
      'Cache-Control': 'public, max-age=900', // Cache for 15 minutes
      'ETag': `"carousel-${carouselImages.length}-${Date.now()}"`,
      'Vary': 'Accept-Encoding'
    });
    
    res.json({
      success: true,
      images: carouselImages,
      message: `${carouselImages.length} imágenes cargadas para el carrusel`,
      cached: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error("Error obteniendo imágenes de carrusel:", err);
    res.json({
      success: false,
      error: "Error interno del servidor",
      fallback: true,
      images: [],
      message: "Error cargando carrusel"
    });
  }
});

/* ==============================
   INICIAR SERVIDOR
============================== */
app.listen(config.server.port, () => {
  console.log(`Servidor corriendo en puerto ${config.server.port}`);
});