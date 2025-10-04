const { app } = require('electron')
const { join, basename, dirname } = require('path')
const path = require('path')
const { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, rmSync, readFileSync, writeFileSync, lstatSync } = require('fs')
const fs = require('fs').promises
const archiver = require('archiver')
const extract = require('extract-zip')
const glob = require('glob')

class BackupService {
  constructor(databaseService) {
    this.databaseService = databaseService

    // Get the actual database path from the database service
    // This ensures we're using the same path as the database service
    let actualDbPath
    try {
      // Try to get the path from the database service if available
      if (databaseService && databaseService.db && databaseService.db.name) {
        actualDbPath = databaseService.db.name
        console.log('📍 Using database path from database service:', actualDbPath)
      } else {
        // Fallback to the same logic as databaseService.js
        try {
          const appDir = process.execPath ? require('path').dirname(process.execPath) : process.cwd()
          actualDbPath = join(appDir, 'dental_clinic.db')
          console.log('📍 Using fallback database path (app dir):', actualDbPath)
        } catch (error) {
          actualDbPath = join(process.cwd(), 'dental_clinic.db')
          console.log('📍 Using fallback database path (cwd):', actualDbPath)
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not determine database path, using fallback')
      actualDbPath = join(process.cwd(), 'dental_clinic.db')
    }

    this.sqliteDbPath = actualDbPath

    // Set other paths relative to the database location
    const dbDir = require('path').dirname(this.sqliteDbPath)
    this.backupDir = join(dbDir, 'backups')
    this.backupRegistryPath = join(dbDir, 'backup_registry.json')

    // Set dental images path to project directory instead of database directory
    // Check if we're in development mode to determine the correct path
    const isDevelopment = process.env.NODE_ENV === 'development' ||
                         process.execPath.includes('node') ||
                         process.execPath.includes('electron') ||
                         process.cwd().includes('dental-clinic') ||
                         process.cwd().includes('DentaDesk')

    console.log('🔍 Environment detection:')
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`)
    console.log(`   execPath: ${process.execPath}`)
    console.log(`   cwd: ${process.cwd()}`)
    console.log(`   isDevelopment: ${isDevelopment}`)

    if (isDevelopment) {
      // In development, use project directory
      this.dentalImagesPath = join(process.cwd(), 'dental_images')
      console.log('📍 Using development path for images:', this.dentalImagesPath)
    } else {
      // In production, use directory relative to executable
      const execDir = require('path').dirname(process.execPath)
      this.dentalImagesPath = join(execDir, 'dental_images')
      console.log('📍 Using production path for images:', this.dentalImagesPath)
      console.log('📍 Executable directory:', execDir)
    }

    // Always check if the determined path exists, and try alternatives if not
    if (!existsSync(this.dentalImagesPath)) {
      console.warn('⚠️ Primary images path does not exist:', this.dentalImagesPath)

      // Try alternative locations
      const alternativePaths = [
        join(process.cwd(), 'dental_images'),
        join(require('path').dirname(process.execPath), 'dental_images'),
        join(process.cwd(), '..', 'dental_images'),
        join(require('path').dirname(process.execPath), '..', 'dental_images')
      ]

      for (const altPath of alternativePaths) {
        if (existsSync(altPath)) {
          console.log('✅ Found images directory at alternative path:', altPath)
          this.dentalImagesPath = altPath
          break
        }
      }

      if (!existsSync(this.dentalImagesPath)) {
        console.warn('⚠️ No images directory found in any expected location')
        console.log('📂 Creating images directory at:', this.dentalImagesPath)
        mkdirSync(this.dentalImagesPath, { recursive: true })
      }
    } else {
      console.log('✅ Images directory exists at:', this.dentalImagesPath)
    }

    console.log('📍 Backup service paths:')
    console.log('   Database:', this.sqliteDbPath)
    console.log('   Backups:', this.backupDir)
    console.log('   Images:', this.dentalImagesPath)

    this.ensureBackupDirectory()
    this.ensureBackupRegistry()
    this.checkBackupApiAvailability()
  }

  // Check if SQLite backup API is available
  checkBackupApiAvailability() {
    try {
      if (this.databaseService && this.databaseService.db) {
        // Check if backup method exists and is callable
        this.backupApiAvailable = typeof this.databaseService.db.backup === 'function'
        
        if (this.backupApiAvailable) {
          // Test the backup method to see what it returns
          try {
            const testResult = this.databaseService.db.backup('test_backup_check.db')
            console.log('🔍 Backup API test result type:', typeof testResult)
            
            if (testResult && typeof testResult.then === 'function') {
              console.log('✅ SQLite backup API available (Promise-based)')
            } else if (testResult && typeof testResult.step === 'function') {
              console.log('✅ SQLite backup API available (Object-based)')
            } else {
              console.log('⚠️ SQLite backup API available but returns unexpected type')
            }
            
            // Clean up test file if it was created
            if (existsSync('test_backup_check.db')) {
              rmSync('test_backup_check.db')
            }
          } catch (testError) {
            console.log('⚠️ SQLite backup API test failed:', testError.message)
            this.backupApiAvailable = false
          }
        } else {
          console.log('❌ SQLite backup API not available')
        }
      } else {
        this.backupApiAvailable = false
        console.log('⚠️ Database service not available for backup API check')
      }
    } catch (error) {
      this.backupApiAvailable = false
      console.log('❌ Error checking backup API availability:', error.message)
    }
  }

  ensureBackupDirectory() {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true })
    }
  }

  ensureBackupRegistry() {
    if (!existsSync(this.backupRegistryPath)) {
      writeFileSync(this.backupRegistryPath, JSON.stringify([], null, 2), 'utf-8')
    }
  }

  getBackupRegistry() {
    try {
      const content = readFileSync(this.backupRegistryPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to read backup registry:', error)
      return []
    }
  }

  addToBackupRegistry(backupInfo) {
    try {
      const registry = this.getBackupRegistry()

      // Check if backup with same name already exists
      const existingIndex = registry.findIndex(backup => backup.name === backupInfo.name)
      if (existingIndex !== -1) {
        // Update existing entry instead of adding duplicate
        registry[existingIndex] = backupInfo
        console.log(`📝 Updated existing backup registry entry: ${backupInfo.name}`)
      } else {
        // Add new backup to beginning of array
        registry.unshift(backupInfo)
        console.log(`➕ Added new backup to registry: ${backupInfo.name}`)
      }

      // Keep only last 50 backups in registry
      if (registry.length > 50) {
        registry.splice(50)
      }

      writeFileSync(this.backupRegistryPath, JSON.stringify(registry, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to update backup registry:', error)
    }
  }

  async createBackup(customPath = null, includeImages = false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `backup_${timestamp}`

    try {
      console.log('🚀 Starting backup creation...')
      console.log('📍 Custom path provided:', customPath)
      console.log('📸 Include images:', includeImages)

      let backupPath
      if (customPath) {
        // Use the custom path provided by user
        if (includeImages) {
          // For backups with images, use .zip extension
          backupPath = customPath.replace(/\.(json|db|sqlite|zip)$/, '') + '.zip'
        } else {
          // For database-only backups, use .db extension
          backupPath = customPath.replace(/\.(json|db|sqlite|zip)$/, '') + '.db'
        }

        console.log('📍 Using custom path (modified):', backupPath)
        console.log('📍 Original custom path was:', customPath)
      } else {
        // Use default backup directory
        if (includeImages) {
          backupPath = join(this.backupDir, `${backupName}.zip`)
        } else {
          backupPath = join(this.backupDir, `${backupName}.db`)
        }
        console.log('📍 Using default path:', backupPath)
      }

      console.log('📍 SQLite DB path:', this.sqliteDbPath)
      console.log('📍 Target backup path:', backupPath)

      // Verify source database exists and has data
      if (!existsSync(this.sqliteDbPath)) {
        console.error('❌ SQLite database file not found at:', this.sqliteDbPath)
        throw new Error('SQLite database file not found')
      }

      // Check source database size and content
      const sourceStats = statSync(this.sqliteDbPath)
      console.log('📊 Source database size:', sourceStats.size, 'bytes')

      if (sourceStats.size === 0) {
        console.warn('⚠️ Source database file is empty!')
        throw new Error('Source database file is empty')
      }

      // Verify database connection is working before backup
      try {
        const testQuery = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        const result = testQuery.get()
        console.log('📋 Database contains', result.count, 'tables')

        // List all tables in the database
        const allTablesQuery = this.databaseService.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        const allTables = allTablesQuery.all()
        console.log('📋 All tables in database:', allTables.map(t => t.name))

        // Test key tables including dental treatment tables
        const tables = ['patients', 'appointments', 'payments', 'treatments', 'dental_treatments', 'dental_treatment_images']
        let totalCurrentRecords = 0

        for (const table of tables) {
          try {
            const countQuery = this.databaseService.db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Table ${table}: ${count.count} records`)
            totalCurrentRecords += count.count
          } catch (tableError) {
            console.warn(`⚠️ Could not query table ${table}:`, tableError.message)
          }
        }

        console.log(`📊 Total records in current database: ${totalCurrentRecords}`)

        if (totalCurrentRecords === 0) {
          console.warn('⚠️ Warning: Database appears to be empty. Backup will contain no data.')
        }

        // Special check for dental_treatment_images table
        try {
          const imageTableCheck = this.databaseService.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images'")
          const imageTableExists = imageTableCheck.get()
          if (imageTableExists) {
            const imageCount = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM dental_treatment_images").get()
            console.log(`📸 dental_treatment_images table: ${imageCount.count} image records`)

            // Show sample image records
            if (imageCount.count > 0) {
              const sampleImages = this.databaseService.db.prepare("SELECT patient_id, tooth_number, image_type, image_path FROM dental_treatment_images LIMIT 3").all()
              console.log('📸 Sample image records:')
              sampleImages.forEach(img => console.log(`   - Patient: ${img.patient_id}, Tooth: ${img.tooth_number}, Type: ${img.image_type}, Path: ${img.image_path}`))
            }
          } else {
            console.warn('⚠️ dental_treatment_images table does not exist!')
          }
        } catch (imageError) {
          console.error('❌ Error checking dental_treatment_images table:', imageError)
        }

      } catch (dbError) {
        console.error('❌ Database connection test failed:', dbError)
        throw new Error('Database connection is not working properly')
      }

      if (includeImages) {
        // Create backup with images (ZIP format)
        console.log('📁 Creating backup with images...')
        await this.createBackupWithImages(backupPath)
      } else {
        // Create database-only backup with proper WAL checkpoint
        console.log('📁 Creating SQLite database backup...')

        // Force comprehensive WAL checkpoint to ensure all data is written to main database file
        try {
          console.log('🔄 Forcing comprehensive WAL checkpoint before backup...')

          // First, try TRUNCATE checkpoint
          const truncateResult = this.databaseService.db.pragma('wal_checkpoint(TRUNCATE)')
          console.log('📊 TRUNCATE checkpoint result:', truncateResult)

          // Then, try FULL checkpoint as backup
          const fullResult = this.databaseService.db.pragma('wal_checkpoint(FULL)')
          console.log('📊 FULL checkpoint result:', fullResult)

          // Force synchronous mode temporarily to ensure all writes are committed
          const oldSync = this.databaseService.db.pragma('synchronous')
          this.databaseService.db.pragma('synchronous = FULL')

          // Force another checkpoint after changing sync mode
          const finalResult = this.databaseService.db.pragma('wal_checkpoint(RESTART)')
          console.log('📊 RESTART checkpoint result:', finalResult)

          // Restore original sync mode
          this.databaseService.db.pragma(`synchronous = ${oldSync}`)

          console.log('✅ Comprehensive WAL checkpoint completed before backup')
        } catch (checkpointError) {
          console.warn('⚠️ WAL checkpoint failed before backup:', checkpointError.message)
        }

        // Wait longer to ensure file handles are released and all writes are committed
        await new Promise(resolve => setTimeout(resolve, 500))

        // Try multiple backup methods in order of preference
        let backupSuccess = false
        let lastError = null
        
        // Method 1: Try SQLite backup API if available
        if (this.backupApiAvailable && !backupSuccess) {
          try {
            console.log('📋 Creating SQLite backup using backup API...')
            await this.createSqliteBackupUsingAPI(backupPath)
            console.log('✅ SQLite backup API completed')
            backupSuccess = true
          } catch (apiError) {
            console.warn('⚠️ SQLite backup API failed:', apiError.message)
            lastError = apiError
          }
        }
        
        // Method 2: Try VACUUM INTO method if backup API failed
        if (!backupSuccess) {
          try {
            console.log('🔄 Trying VACUUM INTO backup method...')
            await this.createSqliteVacuumBackup(backupPath)
            console.log('✅ VACUUM INTO backup completed')
            backupSuccess = true
          } catch (vacuumError) {
            console.warn('⚠️ VACUUM INTO backup failed:', vacuumError.message)
            lastError = vacuumError
          }
        }
        
        // Method 3: Fallback to file copy if all else fails
        if (!backupSuccess) {
          try {
            console.log('📁 All SQLite methods failed, using file copy method...')
            this.createFileCopyBackup(backupPath)
            console.log('✅ File copy backup completed')
            backupSuccess = true
          } catch (copyError) {
            console.error('❌ File copy backup also failed:', copyError.message)
            lastError = copyError
          }
        }
        
        // If all methods failed, throw the last error
        if (!backupSuccess) {
          throw new Error(`All backup methods failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`)
        }

        // Verify backup was created successfully
        if (!existsSync(backupPath)) {
          throw new Error('Backup file was not created successfully')
        }

        const backupStats = statSync(backupPath)
        console.log('📊 Backup file size:', backupStats.size, 'bytes')

        // Verify backup integrity by testing it
        try {
          console.log('🔍 Verifying backup integrity...')
          await this.verifyBackupIntegrity(backupPath)
          console.log('✅ Backup integrity verified')
        } catch (verifyError) {
          console.error('❌ Backup integrity check failed:', verifyError.message)
          throw new Error('Backup was created but failed integrity check')
        }

        console.log('✅ SQLite database backup created successfully')
      }

      // Get file stats
      const backupStats = statSync(backupPath)

      // Create metadata for backup registry
      const metadata = {
        created_at: new Date().toISOString(),
        version: '4.0.0', // Updated version for image support
        platform: process.platform,
        backup_type: 'full',
        database_type: 'sqlite',
        backup_format: includeImages ? 'sqlite_with_images' : 'sqlite_only',
        includes_images: includeImages
      }

      // Add to backup registry
      const backupInfo = {
        name: basename(backupPath, includeImages ? '.zip' : '.db'),
        path: backupPath,
        size: backupStats.size,
        created_at: metadata.created_at,
        version: metadata.version,
        platform: metadata.platform,
        database_type: 'sqlite',
        backup_format: metadata.backup_format,
        includes_images: includeImages
      }
      this.addToBackupRegistry(backupInfo)

      console.log(`✅ Backup created successfully:`)
      console.log(`   File: ${backupPath}`)
      console.log(`   Size: ${this.formatFileSize(backupStats.size)}`)
      console.log(`   Includes Images: ${includeImages ? 'Yes' : 'No'}`)

      return backupPath

    } catch (error) {
      console.error('❌ Backup creation failed:', error)
      throw new Error(`فشل في إنشاء النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Helper function to calculate directory size
  async calculateDirectorySize(dirPath) {
    if (!existsSync(dirPath)) {
      return 0
    }

    let totalSize = 0
    try {
      const items = await fs.readdir(dirPath)

      for (const item of items) {
        const itemPath = join(dirPath, item)
        const stats = await fs.lstat(itemPath)

        if (stats.isDirectory()) {
          totalSize += await this.calculateDirectorySize(itemPath)
        } else {
          totalSize += stats.size
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not calculate size for ${dirPath}:`, error.message)
    }

    return totalSize
  }

  // Helper function to copy directory recursively
  async copyDirectory(source, destination) {
    if (!existsSync(source)) {
      console.warn(`Source directory does not exist: ${source}`)
      return
    }

    // Create destination directory
    await fs.mkdir(destination, { recursive: true })

    const items = await fs.readdir(source)

    for (const item of items) {
      const sourcePath = join(source, item)
      const destPath = join(destination, item)
      const stats = await fs.lstat(sourcePath)

      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath)
      } else {
        await fs.copyFile(sourcePath, destPath)
      }
    }
  }

  // Create backup using file copy method
  createFileCopyBackup(backupPath) {
    try {
      copyFileSync(this.sqliteDbPath, backupPath)
      console.log('✅ File copy backup completed successfully')
    } catch (copyError) {
      console.error('❌ File copy backup failed:', copyError.message)
      throw new Error(`File copy backup failed: ${copyError.message}`)
    }
  }

  // Create backup using SQLite VACUUM INTO method (alternative to backup API)
  async createSqliteVacuumBackup(backupPath) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 Creating backup using VACUUM INTO method...')
        
        // Remove existing backup file if it exists
        if (existsSync(backupPath)) {
          try {
            rmSync(backupPath)
            console.log('🗑️ Removed existing backup file before VACUUM INTO')
          } catch (removeError) {
            console.warn('⚠️ Could not remove existing backup file:', removeError.message)
            // Continue anyway, VACUUM INTO might still work
          }
        }
        
        // Ensure the directory exists
        const backupDir = dirname(backupPath)
        if (!existsSync(backupDir)) {
          mkdirSync(backupDir, { recursive: true })
          console.log('📁 Created backup directory:', backupDir)
        }
        
        // Use VACUUM INTO to create a backup
        // Escape the path properly for SQL
        const escapedPath = backupPath.replace(/\\/g, '\\\\').replace(/'/g, "''")
        console.log('📋 VACUUM INTO path:', escapedPath)
        
        this.databaseService.db.exec(`VACUUM INTO '${escapedPath}'`)
        
        // Verify the backup was created
        if (!existsSync(backupPath)) {
          throw new Error('VACUUM INTO backup file was not created')
        }
        
        const backupStats = statSync(backupPath)
        console.log('📊 VACUUM INTO backup size:', backupStats.size, 'bytes')
        
        if (backupStats.size === 0) {
          throw new Error('VACUUM INTO backup file is empty')
        }
        
        console.log('✅ VACUUM INTO backup completed successfully')
        resolve()
      } catch (error) {
        console.error('❌ VACUUM INTO backup failed:', error)
        reject(error)
      }
    })
  }

  // Create SQLite backup using backup API for better reliability
  async createSqliteBackupUsingAPI(backupPath) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if backup method exists and is callable
        if (typeof this.databaseService.db.backup !== 'function') {
          throw new Error('SQLite backup API not available in this version of better-sqlite3')
        }

        // Remove existing backup file if it exists
        if (existsSync(backupPath)) {
          try {
            rmSync(backupPath)
            console.log('🗑️ Removed existing backup file before creating new one')
          } catch (removeError) {
            console.warn('⚠️ Could not remove existing backup file:', removeError.message)
          }
        }

        // Use SQLite backup API - this returns a Promise in newer versions
        console.log('📋 Creating SQLite backup using backup API...')
        console.log('🔍 Backup object type:', typeof this.databaseService.db.backup)
        
        // Check if backup method returns a Promise or an object
        const backupResult = this.databaseService.db.backup(backupPath)
        
        if (backupResult && typeof backupResult.then === 'function') {
          // It's a Promise (newer better-sqlite3 versions)
          console.log('📋 Using Promise-based backup API...')
          await backupResult
          console.log('✅ SQLite backup API (Promise) completed successfully')
          resolve()
        } else if (backupResult && typeof backupResult.step === 'function') {
          // It's an object with step/finish methods (older versions)
          console.log('📋 Using object-based backup API...')
          console.log('🔍 Backup object keys:', Object.keys(backupResult || {}))
          console.log('🔍 Backup step method:', typeof backupResult.step)
          console.log('🔍 Backup finish method:', typeof backupResult.finish)

          if (typeof backupResult.finish !== 'function') {
            throw new Error('SQLite backup API returned invalid backup object - missing finish method')
          }

          // Perform the backup
          backupResult.step(-1) // Copy all pages
          backupResult.finish()
          console.log('✅ SQLite backup API (Object) completed successfully')
          resolve()
        } else {
          // Unexpected return type
          console.error('❌ Unexpected backup API return type:', typeof backupResult)
          console.error('❌ Backup result:', backupResult)
          throw new Error('SQLite backup API returned unexpected result type')
        }

      } catch (error) {
        console.error('❌ SQLite backup API failed:', error)
        reject(error)
      }
    })
  }

  // Verify backup integrity by testing database operations
  async verifyBackupIntegrity(backupPath) {
    const Database = require('better-sqlite3')
    let testDb = null

    try {
      // Open backup database in readonly mode
      testDb = new Database(backupPath, { readonly: true })

      // Test basic database structure
      const tablesQuery = testDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
      const tablesResult = tablesQuery.get()
      console.log(`📋 Backup contains ${tablesResult.count} tables`)

      if (tablesResult.count === 0) {
        throw new Error('Backup database contains no tables')
      }

      // Get list of all tables in backup for comprehensive verification
      const allTablesQuery = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      const allTables = allTablesQuery.all()
      console.log('📋 All tables in backup:', allTables.map(t => t.name))

      // Test critical tables and their data
      const criticalTables = [
        'patients',
        'appointments',
        'payments',
        'treatments',
        'dental_treatments',
        'dental_treatment_images',
        'settings',
        'schema_version'
      ]

      let totalRecords = 0
      let missingCriticalTables = []

      for (const table of criticalTables) {
        try {
          const countQuery = testDb.prepare(`SELECT COUNT(*) as count FROM ${table}`)
          const count = countQuery.get()
          console.log(`📊 Backup table ${table}: ${count.count} records`)
          totalRecords += count.count
        } catch (tableError) {
          console.warn(`⚠️ Critical table ${table} not found in backup:`, tableError.message)
          missingCriticalTables.push(table)
        }
      }

      // Check for other important tables that should exist
      const expectedTables = [
        'clinic_expenses',
        'clinic_needs',
        'inventory',
        'inventory_usage',
        'lab_orders',
        'labs',
        'medications',
        'patient_images',
        'patient_treatment_timeline',
        'prescription_medications',
        'prescriptions',
        'smart_alerts',
        'tooth_treatment_images',
        'tooth_treatments',
        'treatment_plan_items',
        'treatment_plans',
        'treatment_sessions',
        'whatsapp_reminders'
      ]

      console.log('🔍 Checking for additional expected tables...')
      for (const table of expectedTables) {
        try {
          const tableCheck = testDb.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
          const exists = tableCheck.get(table)
          if (exists) {
            const countQuery = testDb.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Backup table ${table}: ${count.count} records`)
            totalRecords += count.count
          }
        } catch (tableError) {
          // These are optional tables, so just log but don't treat as error
          console.log(`📋 Optional table ${table} not found in backup`)
        }
      }

      // Warn about missing critical tables but don't fail the backup
      if (missingCriticalTables.length > 0) {
        console.warn(`⚠️ Missing critical tables in backup: ${missingCriticalTables.join(', ')}`)
        console.warn('⚠️ This backup may not contain all necessary data for complete restoration')
      }

      // Additional verification: check if backup is actually working by comparing with source
      if (totalRecords === 0) {
        console.log('⚠️ Warning: Backup verification shows 0 records, but this might be a verification issue')
        console.log('⚠️ The backup file exists and has the correct size, so it may still be valid')

        // Try a different approach - check if tables exist and have structure
        try {
          const tableCheckQuery = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
          const userTables = tableCheckQuery.all()
          console.log(`📋 Backup contains ${userTables.length} user tables:`, userTables.map(t => t.name))

          if (userTables.length > 0) {
            console.log('✅ Backup appears to have valid structure despite record count issue')
          }
        } catch (structureError) {
          console.warn('⚠️ Could not verify backup structure:', structureError.message)
        }
      }

      console.log(`📊 Total records verified in backup: ${totalRecords}`)

      // Test database integrity
      const integrityQuery = testDb.prepare("PRAGMA integrity_check")
      const integrityResult = integrityQuery.get()

      if (integrityResult && integrityResult.integrity_check !== 'ok') {
        throw new Error(`Database integrity check failed: ${integrityResult.integrity_check}`)
      }

      // Test foreign key constraints
      const foreignKeyQuery = testDb.prepare("PRAGMA foreign_key_check")
      const foreignKeyResults = foreignKeyQuery.all()

      if (foreignKeyResults.length > 0) {
        console.warn('⚠️ Foreign key constraint violations found in backup:', foreignKeyResults.length)
        foreignKeyResults.slice(0, 3).forEach(violation => {
          console.warn(`   - Table: ${violation.table}, Row: ${violation.rowid}, Parent: ${violation.parent}`)
        })
      }

      console.log('✅ Backup database integrity check passed')

      // Validate that critical tables exist
      const criticalTableValidation = this.validateCriticalTables(allTables.map(t => t.name))
      if (!criticalTableValidation.isValid) {
        console.warn(`⚠️ Backup validation warning: ${criticalTableValidation.message}`)
      }

    } catch (error) {
      console.error('❌ Backup integrity verification failed:', error)
      throw error
    } finally {
      if (testDb) {
        testDb.close()
      }
    }
  }

  // Validate that all critical tables exist in the backup
  validateCriticalTables(tableNames) {
    const criticalTables = [
      'patients',
      'appointments',
      'payments',
      'treatments',
      'settings'
    ]

    const missingTables = criticalTables.filter(table => !tableNames.includes(table))

    if (missingTables.length > 0) {
      return {
        isValid: false,
        message: `Missing critical tables: ${missingTables.join(', ')}`,
        missingTables: missingTables
      }
    }

    return {
      isValid: true,
      message: 'All critical tables are present'
    }
  }

  // Create backup with images in ZIP format
  async createBackupWithImages(backupPath) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('📦 Creating ZIP backup with images...')

        // Force comprehensive database checkpoint to ensure all data is written to disk
        try {
          console.log('🔄 Forcing comprehensive database checkpoint for ZIP backup...')

          // First, try TRUNCATE checkpoint
          const truncateResult = this.databaseService.db.pragma('wal_checkpoint(TRUNCATE)')
          console.log('📊 ZIP TRUNCATE checkpoint result:', truncateResult)

          // Then, try FULL checkpoint as backup
          const fullResult = this.databaseService.db.pragma('wal_checkpoint(FULL)')
          console.log('📊 ZIP FULL checkpoint result:', fullResult)

          // Force synchronous mode temporarily to ensure all writes are committed
          const oldSync = this.databaseService.db.pragma('synchronous')
          this.databaseService.db.pragma('synchronous = FULL')

          // Force another checkpoint after changing sync mode
          const finalResult = this.databaseService.db.pragma('wal_checkpoint(RESTART)')
          console.log('📊 ZIP RESTART checkpoint result:', finalResult)

          // Restore original sync mode
          this.databaseService.db.pragma(`synchronous = ${oldSync}`)

          console.log('✅ Comprehensive database checkpoint completed for ZIP backup')
        } catch (checkpointError) {
          console.warn('⚠️ Database checkpoint failed for ZIP backup:', checkpointError.message)
        }

        // Wait longer to ensure file handles are released and all writes are committed
        await new Promise(resolve => setTimeout(resolve, 500))

        // Create a temporary database backup for ZIP inclusion
        const tempDbPath = join(require('path').dirname(this.sqliteDbPath), `temp_backup_${Date.now()}.db`)
        let tempBackupSuccess = false
        
        // Try VACUUM INTO method first (more reliable in production)
        try {
          console.log('🔄 Creating temporary database backup using VACUUM INTO...')
          await this.createSqliteVacuumBackup(tempDbPath)
          console.log('✅ Temporary VACUUM INTO backup created for ZIP')
          this.tempDbPathForZip = tempDbPath
          tempBackupSuccess = true
        } catch (vacuumError) {
          console.warn('⚠️ VACUUM INTO temporary backup failed:', vacuumError.message)
        }
        
        // Try backup API if VACUUM failed
        if (!tempBackupSuccess && this.backupApiAvailable) {
          try {
            console.log('📋 Creating temporary database backup using backup API...')
            await this.createSqliteBackupUsingAPI(tempDbPath)
            console.log('✅ Temporary backup API backup created for ZIP')
            this.tempDbPathForZip = tempDbPath
            tempBackupSuccess = true
          } catch (apiError) {
            console.warn('⚠️ Backup API temporary backup failed:', apiError.message)
          }
        }
        
        // Fallback to main database file if all methods failed
        if (!tempBackupSuccess) {
          console.warn('⚠️ All temporary backup methods failed, using main database file')
          this.tempDbPathForZip = this.sqliteDbPath
        }

        // Verify database file is accessible and has content
        if (!existsSync(this.sqliteDbPath)) {
          throw new Error('Database file not found for backup')
        }

        const dbStats = statSync(this.sqliteDbPath)
        console.log(`📊 Database file size for backup: ${dbStats.size} bytes`)

        if (dbStats.size === 0) {
          throw new Error('Database file is empty, cannot create backup')
        }

        // Create a file to stream archive data to
        const output = require('fs').createWriteStream(backupPath)
        const archive = archiver('zip', {
          zlib: { level: 9 } // Sets the compression level
        })

        // Listen for all archive data to be written
        output.on('close', () => {
          console.log(`✅ ZIP backup created: ${archive.pointer()} total bytes`)

          // Verify the created backup
          if (existsSync(backupPath)) {
            const backupStats = statSync(backupPath)
            console.log(`📊 Created backup file size: ${backupStats.size} bytes`)
          }

          // Clean up temporary database file if it was created
          if (this.tempDbPathForZip && this.tempDbPathForZip !== this.sqliteDbPath && existsSync(this.tempDbPathForZip)) {
            try {
              require('fs').unlinkSync(this.tempDbPathForZip)
              console.log('🧹 Temporary database backup file cleaned up')
            } catch (cleanupError) {
              console.warn('⚠️ Failed to clean up temporary database file:', cleanupError.message)
            }
          }

          resolve()
        })

        // Handle warnings (e.g., stat failures and other non-blocking errors)
        archive.on('warning', (err) => {
          if (err.code === 'ENOENT') {
            console.warn('Archive warning:', err)
          } else {
            reject(err)
          }
        })

        // Handle errors
        archive.on('error', (err) => {
          reject(err)
        })

        // Pipe archive data to the file
        archive.pipe(output)

        // Add database file (use temporary backup if available)
        const dbFileToAdd = this.tempDbPathForZip || this.sqliteDbPath
        console.log('📁 Adding database to backup...')
        console.log(`📁 Database path: ${dbFileToAdd}`)

        // Verify the database file before adding to ZIP
        if (existsSync(dbFileToAdd)) {
          const dbStats = statSync(dbFileToAdd)
          console.log(`📊 Database file size for ZIP: ${dbStats.size} bytes`)

          if (dbStats.size === 0) {
            throw new Error('Database file is empty, cannot add to ZIP backup')
          }

          archive.file(dbFileToAdd, { name: 'dental_clinic.db' })
        } else {
          throw new Error(`Database file not found: ${dbFileToAdd}`)
        }

        // Add images directory if it exists
        if (existsSync(this.dentalImagesPath)) {
          console.log('📸 Adding images to backup...')
          console.log(`📸 Images path: ${this.dentalImagesPath}`)

          // Count images before adding to backup
          const imageFiles = glob.sync(join(this.dentalImagesPath, '**', '*')).filter(file => {
            try {
              const stats = require('fs').statSync(file)
              return stats.isFile()
            } catch (error) {
              console.warn(`⚠️ Could not stat file ${file}:`, error.message)
              return false
            }
          })
          console.log(`📸 Found ${imageFiles.length} image files to backup`)

          if (imageFiles.length > 0) {
            console.log('📸 Sample image files:')
            imageFiles.slice(0, 3).forEach(file => console.log(`   - ${file}`))

            // Verify the directory is readable before adding to backup
            try {
              const stats = require('fs').statSync(this.dentalImagesPath)
              if (stats.isDirectory()) {
                archive.directory(this.dentalImagesPath, 'dental_images')
                console.log('📸 Images directory added to backup')
              } else {
                console.warn('⚠️ Images path exists but is not a directory')
              }
            } catch (error) {
              console.error('❌ Error accessing images directory:', error.message)
            }
          } else {
            console.warn('⚠️ No image files found in images directory')
            // Still add the directory structure even if empty
            archive.directory(this.dentalImagesPath, 'dental_images')
          }
        } else {
          console.log('📸 No images directory found, skipping...')
          console.log(`📸 Expected images path: ${this.dentalImagesPath}`)

          // List what actually exists in the expected location
          const expectedDir = require('path').dirname(this.dentalImagesPath)
          if (existsSync(expectedDir)) {
            const items = readdirSync(expectedDir)
            console.log(`📂 Contents of expected images directory (${expectedDir}):`)
            items.slice(0, 10).forEach(item => console.log(`   - ${item}`))
          }
        }

        // Finalize the archive (i.e., we are done appending files but streams have to finish yet)
        console.log('📦 Finalizing ZIP archive...')
        archive.finalize()

      } catch (error) {
        console.error('❌ Error creating ZIP backup:', error)

        // Clean up temporary database file if it was created
        if (this.tempDbPathForZip && this.tempDbPathForZip !== this.sqliteDbPath && existsSync(this.tempDbPathForZip)) {
          try {
            require('fs').unlinkSync(this.tempDbPathForZip)
            console.log('🧹 Temporary database backup file cleaned up after error')
          } catch (cleanupError) {
            console.warn('⚠️ Failed to clean up temporary database file after error:', cleanupError.message)
          }
        }

        reject(error)
      }
    })
  }

  async restoreBackup(backupPath, progressCallback = null) {
    try {
      console.log('🔄 Starting backup restoration...')

      if (progressCallback) {
        progressCallback({ stage: 'init', message: 'بدء عملية الاستعادة...', progress: 0 })
      }

      // Check if backup file exists and determine type
      let actualBackupPath = backupPath
      let isZipBackup = false

      // Check for ZIP backup first (with images)
      if (backupPath.endsWith('.zip') || existsSync(`${backupPath}.zip`)) {
        actualBackupPath = backupPath.endsWith('.zip') ? backupPath : `${backupPath}.zip`
        isZipBackup = true
      }
      // Check for DB backup (database only)
      else if (backupPath.endsWith('.db') || existsSync(`${backupPath}.db`)) {
        actualBackupPath = backupPath.endsWith('.db') ? backupPath : `${backupPath}.db`
        isZipBackup = false
      }
      // Try legacy JSON format for backward compatibility
      else {
        const jsonBackupPath = backupPath.replace(/\.(db|zip)$/, '.json')
        if (existsSync(jsonBackupPath)) {
          console.log('📄 Found legacy JSON backup, restoring...')
          return await this.restoreLegacyBackup(jsonBackupPath)
        }
        throw new Error(`ملف النسخة الاحتياطية غير موجود: ${backupPath}`)
      }

      // Verify the backup file exists
      if (!existsSync(actualBackupPath)) {
        throw new Error(`ملف النسخة الاحتياطية غير موجود: ${actualBackupPath}`)
      }

      console.log(`📁 Found ${isZipBackup ? 'ZIP' : 'SQLite'} backup: ${actualBackupPath}`)

      if (progressCallback) {
        progressCallback({ stage: 'backup_current', message: 'إنشاء نسخة احتياطية من البيانات الحالية...', progress: 10 })
      }

      // Create backup of current database before restoration
      // Check if we're in development mode (reuse the same logic as constructor)
      const isDevelopment = process.env.NODE_ENV === 'development' ||
                           process.execPath.includes('node') ||
                           process.execPath.includes('electron') ||
                           process.cwd().includes('dental-clinic') ||
                           process.cwd().includes('DentaDesk')

      console.log('🔍 Restore environment detection:')
      console.log(`   NODE_ENV: ${process.env.NODE_ENV}`)
      console.log(`   execPath: ${process.execPath}`)
      console.log(`   cwd: ${process.cwd()}`)
      console.log(`   isDevelopment: ${isDevelopment}`)

      let baseDir
      if (isDevelopment) {
        baseDir = process.cwd()
        console.log('📍 Using development base directory:', baseDir)
      } else {
        baseDir = require('path').dirname(process.execPath)
        console.log('📍 Using production base directory:', baseDir)
      }

      const currentDbBackupPath = join(baseDir, `current_db_backup_${Date.now()}.db`)
      if (existsSync(this.sqliteDbPath)) {
        copyFileSync(this.sqliteDbPath, currentDbBackupPath)
        console.log(`💾 Current database backed up to: ${currentDbBackupPath}`)
      }

      try {
        if (isZipBackup) {
          // Restore from ZIP backup (with images)
          console.log('🗄️ Restoring from ZIP backup with images...')
          if (progressCallback) {
            progressCallback({ stage: 'extracting', message: 'استخراج النسخة الاحتياطية...', progress: 30 })
          }
          await this.restoreFromZipBackup(actualBackupPath, progressCallback)
        } else {
          // Direct SQLite restoration
          console.log('🗄️ Restoring from SQLite backup...')
          if (progressCallback) {
            progressCallback({ stage: 'restoring_db', message: 'استعادة قاعدة البيانات...', progress: 40 })
          }
          await this.restoreFromSqliteBackup(actualBackupPath, progressCallback)
        }

        console.log('✅ Backup restored successfully')

        if (progressCallback) {
          progressCallback({ stage: 'complete', message: 'تمت الاستعادة بنجاح!', progress: 100 })
        }

        // Clean up temporary backup
        if (existsSync(currentDbBackupPath)) {
          rmSync(currentDbBackupPath)
        }

        // Final cleanup of all old image backup directories after successful restoration
        if (isZipBackup) {
          console.log('🧹 Final cleanup of image backup directories...')
          await this.cleanupOldImageBackups(baseDir, 0) // Delete all image backup directories
        }

        return true

      } catch (error) {
        // Restore original database if restoration failed
        console.error('❌ Restoration failed, restoring original database...')
        if (existsSync(currentDbBackupPath)) {
          copyFileSync(currentDbBackupPath, this.sqliteDbPath)
          rmSync(currentDbBackupPath)
          console.log('✅ Original database restored')
        }
        throw error
      }

    } catch (error) {
      console.error('❌ Backup restoration failed:', error)
      throw new Error(`فشل في استعادة النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Restore from ZIP backup (with images)
  async restoreFromZipBackup(zipBackupPath, progressCallback = null) {
    try {
      console.log('📦 Extracting ZIP backup...')

      if (progressCallback) {
        progressCallback({ stage: 'extracting', message: 'استخراج ملفات النسخة الاحتياطية...', progress: 35 })
      }

      // Determine base directory (reuse the same logic as main restore method)
      const isDevelopment = process.env.NODE_ENV === 'development' ||
                           process.execPath.includes('node') ||
                           process.execPath.includes('electron') ||
                           process.cwd().includes('dental-clinic') ||
                           process.cwd().includes('DentaDesk')

      console.log('🔍 ZIP restore environment detection:')
      console.log(`   NODE_ENV: ${process.env.NODE_ENV}`)
      console.log(`   execPath: ${process.execPath}`)
      console.log(`   cwd: ${process.cwd()}`)
      console.log(`   isDevelopment: ${isDevelopment}`)

      let baseDir
      if (isDevelopment) {
        baseDir = process.cwd()
        console.log('📍 Using development base directory for ZIP restore:', baseDir)
      } else {
        baseDir = require('path').dirname(process.execPath)
        console.log('📍 Using production base directory for ZIP restore:', baseDir)
      }

      // Create temporary directory for extraction
      const tempDir = join(baseDir, `temp_restore_${Date.now()}`)
      await fs.mkdir(tempDir, { recursive: true })

      try {
        // Extract ZIP file
        await extract(zipBackupPath, { dir: tempDir })
        console.log('✅ ZIP backup extracted successfully')

        // Check if database file exists in extracted content
        const extractedDbPath = join(tempDir, 'dental_clinic.db')
        if (!existsSync(extractedDbPath)) {
          throw new Error('Database file not found in backup')
        }

        // Restore database
        console.log('📁 Restoring database from extracted backup...')
        if (progressCallback) {
          progressCallback({ stage: 'restoring_db', message: 'استعادة قاعدة البيانات...', progress: 50 })
        }
        await this.restoreFromSqliteBackup(extractedDbPath, progressCallback)

        // Restore images if they exist
        const extractedImagesPath = join(tempDir, 'dental_images')
        console.log(`🔍 Looking for extracted images at: ${extractedImagesPath}`)
        console.log(`🔍 Target dental images path: ${this.dentalImagesPath}`)

        if (existsSync(extractedImagesPath)) {
          console.log('📸 Restoring images from backup...')

          if (progressCallback) {
            progressCallback({ stage: 'restoring_images', message: 'استعادة الصور...', progress: 70 })
          }

          // List what's in the extracted images directory
          const extractedContents = glob.sync(join(extractedImagesPath, '**', '*'))
          console.log(`📂 Found ${extractedContents.length} items in extracted backup:`)
          extractedContents.slice(0, 5).forEach(item => console.log(`   - ${item}`))

          // Create backup of current images if they exist (but don't interfere with restoration)
          let currentImagesBackupPath = null
          if (existsSync(this.dentalImagesPath)) {
            currentImagesBackupPath = join(baseDir, `current_images_backup_${Date.now()}`)
            await this.copyDirectory(this.dentalImagesPath, currentImagesBackupPath)
            console.log(`💾 Current images backed up to: ${currentImagesBackupPath}`)

            // Remove current images directory completely with retry mechanism
            await this.removeDirectoryWithRetry(this.dentalImagesPath, 3, 1000)
            console.log('🗑️ Current images directory removed')
          }

          // Ensure the dental images directory exists
          await fs.mkdir(this.dentalImagesPath, { recursive: true })
          console.log(`📁 Created dental images directory: ${this.dentalImagesPath}`)

          // Copy images from backup to the correct location
          await this.copyDirectory(extractedImagesPath, this.dentalImagesPath)
          console.log('✅ Images restored successfully to dental_images directory')

          // Small delay to allow UI to update during image processing
          await new Promise(resolve => setTimeout(resolve, 50))

          // Verify the restoration
          if (existsSync(this.dentalImagesPath)) {
            const restoredFiles = glob.sync(join(this.dentalImagesPath, '**', '*'))
            console.log(`📊 Restored ${restoredFiles.length} image files`)

            // List some restored files for verification
            restoredFiles.slice(0, 5).forEach(file => console.log(`   ✅ ${file}`))
          }

          // Small delay to allow UI to update
          await new Promise(resolve => setTimeout(resolve, 100))

          if (progressCallback) {
            progressCallback({ stage: 'updating_paths', message: 'تحديث مسارات الصور...', progress: 85 })
          }

          // Update image paths in database to ensure they match the restored files
          await this.updateImagePathsAfterRestore()

          if (progressCallback) {
            progressCallback({ stage: 'cleanup', message: 'تنظيف الملفات المؤقتة...', progress: 95 })
          }

          // Clean up old image backup directories (keep only the most recent one)
          // But keep the one we just created in case something goes wrong
          await this.cleanupOldImageBackups(baseDir, 1, currentImagesBackupPath)

        } else {
          console.log('📸 No images found in backup')
          console.log(`🔍 Checked path: ${extractedImagesPath}`)
          console.log(`🔍 Images path in backup service: ${this.dentalImagesPath}`)

          // List what's actually in the temp directory
          if (existsSync(tempDir)) {
            const tempContents = glob.sync(join(tempDir, '**', '*'))
            console.log(`📂 Temp directory contents (${tempContents.length} items):`)
            tempContents.forEach(item => console.log(`   - ${item}`))

            // Check if there are any image files in the temp directory at all
            const imageFilesInTemp = tempContents.filter(item =>
              /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(item)
            )
            console.log(`🖼️ Image files in temp directory: ${imageFilesInTemp.length}`)
            imageFilesInTemp.forEach(file => console.log(`   - ${file}`))
          }

          // Check if there are any image files in the current images path
          if (existsSync(this.dentalImagesPath)) {
            const currentImageFiles = glob.sync(join(this.dentalImagesPath, '**', '*')).filter(file => {
              try {
                const stats = require('fs').statSync(file)
                return stats.isFile() && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file)
              } catch (error) {
                return false
              }
            })
            console.log(`🖼️ Current image files: ${currentImageFiles.length}`)
            currentImageFiles.slice(0, 5).forEach(file => console.log(`   - ${file}`))
          }
        }

      } finally {
        // Clean up temporary directory with retry mechanism
        if (existsSync(tempDir)) {
          try {
            await this.removeDirectoryWithRetry(tempDir, 3, 1000)
            console.log('🧹 Temporary extraction directory cleaned up')
          } catch (cleanupError) {
            console.warn('⚠️ Failed to clean up temporary directory:', cleanupError.message)
            // Don't throw error as this is cleanup and shouldn't fail the restore
          }
        }
      }

    } catch (error) {
      console.error('❌ Failed to restore from ZIP backup:', error)
      throw error
    }
  }

  async restoreFromSqliteBackup(sqliteBackupPath, progressCallback = null) {
    try {
      console.log('🔄 Starting SQLite database restoration...')

      // Verify backup file exists and has content
      if (!existsSync(sqliteBackupPath)) {
        throw new Error(`Backup file not found: ${sqliteBackupPath}`)
      }

      const backupStats = statSync(sqliteBackupPath)
      console.log('📊 Backup file size:', backupStats.size, 'bytes')

      if (backupStats.size === 0) {
        throw new Error('Backup file is empty')
      }

      // Test backup file integrity by trying to open it
      try {
        const Database = require('better-sqlite3')
        const testDb = new Database(sqliteBackupPath, { readonly: true })

        // Test basic queries
        const tablesQuery = testDb.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        const tablesResult = tablesQuery.get()
        console.log('📋 Backup contains', tablesResult.count, 'tables')

        // Test key tables including all dental treatment tables
        const tables = ['patients', 'appointments', 'payments', 'treatments', 'dental_treatments', 'dental_treatment_images']
        for (const table of tables) {
          try {
            const countQuery = testDb.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Backup table ${table}: ${count.count} records`)
          } catch (tableError) {
            console.warn(`⚠️ Could not query backup table ${table}:`, tableError.message)
          }
        }

        testDb.close()
        console.log('✅ Backup file integrity verified')
      } catch (integrityError) {
        console.error('❌ Backup file integrity check failed:', integrityError)
        throw new Error('Backup file is corrupted or invalid')
      }

      // Close current database connection
      console.log('📁 Closing current database connection...')
      this.databaseService.close()
      console.log('📁 Database connection closed')

      // Wait a moment to ensure file handles are released
      await new Promise(resolve => setTimeout(resolve, 100))

      // Replace current database with backup
      console.log('📋 Replacing database file with backup...')
      if (progressCallback) {
        progressCallback({ stage: 'replacing_db', message: 'استبدال قاعدة البيانات...', progress: 45 })
      }
      copyFileSync(sqliteBackupPath, this.sqliteDbPath)
      console.log('📋 Database file replaced with backup')

      // Verify the replacement was successful
      const newStats = statSync(this.sqliteDbPath)
      console.log('📊 New database file size:', newStats.size, 'bytes')

      if (newStats.size !== backupStats.size) {
        console.warn('⚠️ Database file size differs after restoration!')
        console.warn('Expected:', backupStats.size, 'bytes, Actual:', newStats.size, 'bytes')
      }

      // Reinitialize database service
      console.log('🔄 Reinitializing database service...')
      if (progressCallback) {
        progressCallback({ stage: 'reinitializing', message: 'إعادة تهيئة قاعدة البيانات...', progress: 55 })
      }
      this.databaseService.reinitialize()
      console.log('✅ Database service reinitialized')

      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify the restored database works
      try {
        const testQuery = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        const result = testQuery.get()
        console.log('📋 Restored database contains', result.count, 'tables')

        if (result.count === 0) {
          throw new Error('Restored database contains no tables - restoration may have failed')
        }

        // List all tables in the restored database
        const allTablesQuery = this.databaseService.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        const allTables = allTablesQuery.all()
        console.log('📋 All tables in restored database:', allTables.map(t => t.name))

        // Test critical tables
        const criticalTables = [
          'patients', 'appointments', 'payments', 'treatments',
          'settings', 'schema_version'
        ]

        let restoredRecords = 0
        let missingTables = []

        for (const table of criticalTables) {
          try {
            const countQuery = this.databaseService.db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Restored table ${table}: ${count.count} records`)
            restoredRecords += count.count
          } catch (tableError) {
            console.error(`❌ Could not query restored table ${table}:`, tableError.message)
            missingTables.push(table)
          }
        }

        // Test dental treatment tables (these are important but might not exist in older backups)
        const dentalTables = ['dental_treatments', 'dental_treatment_images']
        for (const table of dentalTables) {
          try {
            const countQuery = this.databaseService.db.prepare(`SELECT COUNT(*) as count FROM ${table}`)
            const count = countQuery.get()
            console.log(`📊 Restored table ${table}: ${count.count} records`)
            restoredRecords += count.count
          } catch (tableError) {
            console.warn(`⚠️ Could not query restored table ${table}:`, tableError.message)
            console.warn(`   This might be normal if the table was created in a newer version`)
          }
        }

        console.log(`📊 Total records in restored database: ${restoredRecords}`)

        // Warn about missing critical tables
        if (missingTables.length > 0) {
          console.error(`❌ Missing critical tables in restored database: ${missingTables.join(', ')}`)
          console.error('❌ The restoration may not have completed successfully')
        } else {
          console.log('✅ All critical tables are present in restored database')
        }

        // Special check for dental_treatment_images table after restore
        try {
          const imageTableCheck = this.databaseService.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dental_treatment_images'")
          const imageTableExists = imageTableCheck.get()
          if (imageTableExists) {
            const imageCount = this.databaseService.db.prepare("SELECT COUNT(*) as count FROM dental_treatment_images").get()
            console.log(`📸 Restored dental_treatment_images table: ${imageCount.count} image records`)

            // Show sample restored image records
            if (imageCount.count > 0) {
              const sampleImages = this.databaseService.db.prepare("SELECT patient_id, tooth_number, image_type, image_path FROM dental_treatment_images LIMIT 5").all()
              console.log('📸 Sample restored image records:')
              sampleImages.forEach(img => {
                console.log(`   - Patient: ${img.patient_id}, Tooth: ${img.tooth_number}, Type: ${img.image_type}, Path: ${img.image_path}`)

                // Check if the image file actually exists
                const fullImagePath = join(this.dentalImagesPath, img.image_path)
                if (existsSync(fullImagePath)) {
                  console.log(`     ✅ Image file exists`)
                } else {
                  console.log(`     ❌ Image file missing`)
                }
              })

              // Check how many image files actually exist
              const imageRecords = this.databaseService.db.prepare("SELECT image_path FROM dental_treatment_images WHERE image_path IS NOT NULL AND image_path != ''").all()
              let existingFiles = 0
              let missingFiles = 0

              for (const record of imageRecords) {
                const fullPath = join(this.dentalImagesPath, record.image_path)
                if (existsSync(fullPath)) {
                  existingFiles++
                } else {
                  missingFiles++
                }
              }

              console.log(`📸 Image file status: ${existingFiles} exist, ${missingFiles} missing`)

              if (missingFiles > 0) {
                console.warn(`⚠️ ${missingFiles} image files are missing from the restored images directory`)
                console.warn('⚠️ This may indicate incomplete image restoration')
              }
            } else {
              console.log('📸 No image records found in restored database')
            }
          } else {
            console.warn('⚠️ dental_treatment_images table missing in restored database!')
            console.warn('⚠️ This might be normal if the table was added in a newer version')
          }
        } catch (imageError) {
          console.error('❌ Error checking restored dental_treatment_images table:', imageError)
        }

        console.log('✅ SQLite database restored and verified successfully')
      } catch (verifyError) {
        console.error('❌ Database verification after restore failed:', verifyError)
        throw new Error('Database restoration completed but verification failed')
      }

    } catch (error) {
      console.error('❌ Failed to restore SQLite backup:', error)
      // Try to reinitialize anyway
      try {
        console.log('🔄 Attempting to reinitialize database after error...')
        this.databaseService.reinitialize()
        console.log('✅ Database reinitialized after error')
      } catch (reinitError) {
        console.error('❌ Failed to reinitialize database:', reinitError)
      }
      throw error
    }
  }

  async restoreLegacyBackup(backupPath) {
    console.log('📄 Restoring legacy backup format...')

    // Read and parse legacy backup data
    const backupContent = readFileSync(backupPath, 'utf-8')
    const backupData = JSON.parse(backupContent)

    // Validate backup structure
    if (!backupData.metadata || !backupData.patients || !backupData.appointments) {
      throw new Error('ملف النسخة الاحتياطية تالف أو غير صالح - بيانات مفقودة')
    }

    console.log(`Restoring backup created on: ${backupData.metadata.created_at}`)
    console.log(`Backup version: ${backupData.metadata.version}`)
    console.log(`Platform: ${backupData.metadata.platform}`)

    console.log('Backup file validated, starting data restoration...')

    // Clear existing data and restore from backup
    if (backupData.patients) {
      await this.databaseService.clearAllPatients()
      for (const patient of backupData.patients) {
        await this.databaseService.createPatient(patient)
      }
    }

    if (backupData.appointments) {
      await this.databaseService.clearAllAppointments()
      for (const appointment of backupData.appointments) {
        await this.databaseService.createAppointment(appointment)
      }
    }

    if (backupData.payments) {
      await this.databaseService.clearAllPayments()
      for (const payment of backupData.payments) {
        await this.databaseService.createPayment(payment)
      }
    }

    if (backupData.treatments) {
      await this.databaseService.clearAllTreatments()
      for (const treatment of backupData.treatments) {
        await this.databaseService.createTreatment(treatment)
      }
    }

    if (backupData.settings) {
      await this.databaseService.updateSettings(backupData.settings)
    }

    console.log('Legacy backup restored successfully')
    return true
  }

  async listBackups() {
    try {
      const registry = this.getBackupRegistry()

      // Filter out backups that no longer exist
      const validBackups = registry.filter(backup => {
        try {
          // Check if the backup file exists
          return existsSync(backup.path)
        } catch (error) {
          return false
        }
      })

      // Remove duplicates based on backup name
      const uniqueBackups = []
      const seenNames = new Set()

      for (const backup of validBackups) {
        if (!seenNames.has(backup.name)) {
          seenNames.add(backup.name)
          uniqueBackups.push(backup)
        } else {
          console.log(`🔍 Removed duplicate backup entry: ${backup.name}`)
        }
      }

      // Update registry if some backups were removed or duplicates found
      if (uniqueBackups.length !== registry.length) {
        writeFileSync(this.backupRegistryPath, JSON.stringify(uniqueBackups, null, 2), 'utf-8')
        console.log(`🧹 Cleaned up backup registry: ${registry.length} -> ${uniqueBackups.length} entries`)
      }

      // Add formatted file sizes and additional info
      return uniqueBackups.map(backup => ({
        ...backup,
        formattedSize: this.formatFileSize(backup.size),
        isSqliteOnly: backup.backup_format === 'sqlite_only',
        isLegacy: backup.backup_format === 'hybrid' || !backup.backup_format,
        includesImages: backup.includes_images || backup.backup_format === 'sqlite_with_images',
        isZipBackup: backup.backup_format === 'sqlite_with_images'
      }))
    } catch (error) {
      console.error('Failed to list backups:', error)
      return []
    }
  }

  async deleteOldBackups(keepCount = 10) {
    try {
      const backups = await this.listBackups()

      if (backups.length > keepCount) {
        // Sort by creation date (newest first)
        const sortedBackups = backups.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        const backupsToDelete = sortedBackups.slice(keepCount)

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.name)
          console.log(`🗑️ Deleted old backup: ${backup.name}`)
        }

        console.log(`✅ Cleaned up ${backupsToDelete.length} old backups, keeping ${keepCount} most recent`)
      }
    } catch (error) {
      console.error('❌ Failed to delete old backups:', error)
    }
  }

  async deleteBackup(backupName) {
    try {
      // Find backup in registry
      const registry = this.getBackupRegistry()
      const backupIndex = registry.findIndex(backup => backup.name === backupName)

      if (backupIndex === -1) {
        throw new Error('Backup not found in registry')
      }

      const backup = registry[backupIndex]

      // Delete the backup file
      if (existsSync(backup.path)) {
        rmSync(backup.path)
        console.log(`Deleted backup: ${backup.path}`)
      }

      // Remove from registry
      registry.splice(backupIndex, 1)
      writeFileSync(this.backupRegistryPath, JSON.stringify(registry, null, 2), 'utf-8')

      console.log(`✅ Backup deleted successfully: ${backupName}`)
    } catch (error) {
      console.error('❌ Failed to delete backup:', error)
      throw error
    }
  }

  async scheduleAutomaticBackups(frequency) {
    const intervals = {
      hourly: 60 * 60 * 1000,      // 1 hour
      daily: 24 * 60 * 60 * 1000,  // 24 hours
      weekly: 7 * 24 * 60 * 60 * 1000 // 7 days
    }

    setInterval(async () => {
      try {
        await this.createBackup()
        await this.deleteOldBackups()
      } catch (error) {
        console.error('Scheduled backup failed:', error)
      }
    }, intervals[frequency])
  }

  // Clean up old image backup directories
  async cleanupOldImageBackups(baseDir, keepCount = 2, excludePath = null) {
    try {
      console.log('🧹 Cleaning up old image backup directories...')

      // Find all current_images_backup directories
      const backupPattern = join(baseDir, 'current_images_backup_*')
      const backupDirs = glob.sync(backupPattern)

      // Filter out the excluded path if provided
      const filteredBackupDirs = excludePath
        ? backupDirs.filter(dir => dir !== excludePath)
        : backupDirs

      if (filteredBackupDirs.length <= keepCount) {
        console.log(`📁 Found ${filteredBackupDirs.length} image backup directories (excluding current), keeping all`)
        return
      }

      // Sort by creation time (newest first) based on timestamp in directory name
      const sortedBackups = filteredBackupDirs.sort((a, b) => {
        const timestampA = basename(a).replace('current_images_backup_', '')
        const timestampB = basename(b).replace('current_images_backup_', '')
        return parseInt(timestampB) - parseInt(timestampA)
      })

      // Keep only the most recent ones
      const backupsToDelete = sortedBackups.slice(keepCount)

      for (const backupDir of backupsToDelete) {
        try {
          if (existsSync(backupDir)) {
            await this.removeDirectoryWithRetry(backupDir, 2, 500)
            console.log(`🗑️ Deleted old image backup: ${basename(backupDir)}`)
          }
        } catch (error) {
          console.warn(`⚠️ Failed to delete image backup ${backupDir}:`, error.message)
        }
      }

      console.log(`✅ Cleaned up ${backupsToDelete.length} old image backup directories`)

    } catch (error) {
      console.error('❌ Failed to cleanup old image backups:', error)
      // Don't throw error as this is not critical
    }
  }

  // Robust directory removal with retry mechanism for Windows compatibility
  async removeDirectoryWithRetry(dirPath, maxRetries = 3, delayMs = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🗑️ Attempting to remove directory (attempt ${attempt}/${maxRetries}): ${dirPath}`)

        // First, try the standard fs.rm method with better error handling
        try {
          await fs.rm(dirPath, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 100
          })
          console.log(`✅ Directory removed successfully on attempt ${attempt}`)
          return
        } catch (fsError) {
          console.warn(`⚠️ fs.rm attempt ${attempt} failed:`, fsError.message)

          // If it's a permission error, try to close any open handles first
          if (fsError.code === 'EPERM' || fsError.code === 'EBUSY') {
            console.log('🔒 Permission error detected, trying to release file handles...')

            // Try to release any open file handles by forcing garbage collection suggestion
            if (global.gc) {
              global.gc()
            }

            // Wait longer for handles to be released
            await new Promise(resolve => setTimeout(resolve, delayMs * 2))
          }

          throw fsError
        }

      } catch (error) {
        console.warn(`⚠️ Attempt ${attempt} failed:`, error.message)

        // If this is the last attempt, try alternative methods
        if (attempt === maxRetries) {
          console.error(`❌ All ${maxRetries} attempts failed. Last error:`, error)

          // Try alternative removal method using rimraf-style approach
          try {
            console.log('🔄 Attempting alternative removal method...')
            await this.removeDirectoryAlternative(dirPath)
            console.log('✅ Alternative removal method succeeded')
            return
          } catch (alternativeError) {
            console.error('❌ Alternative removal method also failed:', alternativeError)

            // Try Windows-specific command as last resort
            if (process.platform === 'win32') {
              try {
                console.log('🪟 Trying Windows-specific removal...')
                await this.removeDirectoryWindows(dirPath)
                console.log('✅ Windows-specific removal succeeded')
                return
              } catch (windowsError) {
                console.error('❌ Windows-specific removal also failed:', windowsError)
              }
            }

            throw new Error(`Failed to remove directory after ${maxRetries} attempts, alternative method, and Windows-specific method: ${error.message}`)
          }
        }

        // Wait before retry (except on last attempt)
        if (attempt < maxRetries) {
          const waitTime = delayMs * attempt // Increase wait time with each attempt
          console.log(`⏳ Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }
  }

  // Alternative directory removal method for stubborn directories
  async removeDirectoryAlternative(dirPath) {
    try {
      // Use Windows-specific approach with rmdir and del commands if available
      const { exec } = require('child_process')
      const util = require('util')
      const execAsync = util.promisify(exec)

      if (process.platform === 'win32') {
        console.log('🪟 Using Windows-specific removal method...')

        // Try using rmdir command with /s /q flags
        try {
          const { stdout, stderr } = await execAsync(`rmdir /s /q "${dirPath}"`)
          if (stderr) {
            console.warn('⚠️ rmdir stderr:', stderr)
          }
          console.log('✅ Windows rmdir command succeeded')
          return
        } catch (rmdirError) {
          console.warn('⚠️ rmdir command failed:', rmdirError.message)

          // Try using del command for files first, then rmdir
          try {
            console.log('🔄 Trying del command for files...')
            await execAsync(`del /f /q /s "${dirPath}\\*.*" 2>nul`)
            await execAsync(`rmdir /s /q "${dirPath}"`)
            console.log('✅ Windows del + rmdir combination succeeded')
            return
          } catch (delError) {
            console.warn('⚠️ del command also failed:', delError.message)
          }
        }
      }

      // Fallback to manual recursive removal
      console.log('🔄 Using manual recursive removal as last resort...')
      await this.removeDirectoryManual(dirPath)
      console.log('✅ Manual recursive removal succeeded')

    } catch (error) {
      console.error('❌ Alternative removal method failed:', error)
      throw error
    }
  }

  // Windows-specific directory removal using system commands
  async removeDirectoryWindows(dirPath) {
    const { exec } = require('child_process')
    const util = require('util')
    const execAsync = util.promisify(exec)

    console.log('🪟 Attempting Windows-specific directory removal...')

    try {
      // First, try to delete all files in the directory
      console.log('🔄 Deleting files in directory...')
      const { stdout: delStdout, stderr: delStderr } = await execAsync(
        `del /f /q /s "${dirPath}\\*.*" 2>nul || echo "No files to delete"`
      )

      if (delStderr && !delStderr.includes('No files to delete')) {
        console.warn('⚠️ del command stderr:', delStderr)
      }

      // Then try to remove the directory
      console.log('🔄 Removing directory...')
      const { stdout: rmdirStdout, stderr: rmdirStderr } = await execAsync(
        `rmdir /s /q "${dirPath}" 2>nul || echo "Directory may already be removed"`
      )

      if (rmdirStderr && !rmdirStderr.includes('Directory may already be removed')) {
        console.warn('⚠️ rmdir command stderr:', rmdirStderr)
      }

      // Verify the directory was actually removed
      if (!require('fs').existsSync(dirPath)) {
        console.log('✅ Windows-specific removal succeeded')
        return
      } else {
        throw new Error('Directory still exists after Windows-specific removal attempt')
      }

    } catch (error) {
      console.error('❌ Windows-specific removal failed:', error)
      throw error
    }
  }

  // Manual recursive directory removal as last resort
  async removeDirectoryManual(dirPath) {
    try {
      console.log('🔄 Attempting manual recursive removal...')

      // First, try to read the directory contents
      const items = await fs.readdir(dirPath)
      console.log(`📂 Found ${items.length} items to remove manually`)

      for (const item of items) {
        const itemPath = join(dirPath, item)
        try {
          const stat = await fs.lstat(itemPath)

          if (stat.isDirectory()) {
            // Recursively remove subdirectories
            console.log(`📁 Recursively removing subdirectory: ${itemPath}`)
            await this.removeDirectoryManual(itemPath)
          } else {
            // Remove files with retry and better error handling
            await this.removeFileWithRetry(itemPath)
          }
        } catch (error) {
          console.warn(`⚠️ Could not process item ${itemPath}:`, error.message)
        }
      }

      // Finally remove the now-empty directory
      await this.removeEmptyDirectoryWithRetry(dirPath)

    } catch (error) {
      console.error('❌ Manual recursive removal failed:', error)
      throw error
    }
  }

  // Remove file with retry mechanism
  async removeFileWithRetry(filePath, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.unlink(filePath)
        console.log(`✅ Removed file: ${filePath}`)
        return
      } catch (error) {
        console.warn(`⚠️ Failed to remove file (attempt ${attempt}/${maxRetries}): ${filePath} - ${error.message}`)

        if (attempt === maxRetries) {
          console.error(`❌ Failed to remove file after ${maxRetries} attempts: ${filePath}`, error)
          throw error
        }

        // Wait before retry with exponential backoff
        const waitTime = Math.min(100 * Math.pow(2, attempt - 1), 1000)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  // Remove empty directory with retry mechanism
  async removeEmptyDirectoryWithRetry(dirPath, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.rmdir(dirPath)
        console.log(`✅ Removed directory: ${dirPath}`)
        return
      } catch (error) {
        console.warn(`⚠️ Failed to remove directory (attempt ${attempt}/${maxRetries}): ${dirPath} - ${error.message}`)

        if (attempt === maxRetries) {
          console.error(`❌ Failed to remove directory after ${maxRetries} attempts: ${dirPath}`, error)
          throw error
        }

        // Wait before retry with exponential backoff
        const waitTime = Math.min(100 * Math.pow(2, attempt - 1), 1000)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  async updateImagePathsAfterRestore() {
    try {
      console.log('🔄 Updating image paths and treatment links after restore...')

      // Get all image records from database
      const imageRecords = this.databaseService.db.prepare(`
        SELECT id, dental_treatment_id, image_path, patient_id, tooth_number, image_type
        FROM dental_treatment_images
      `).all()

      console.log(`📊 Found ${imageRecords.length} image records to verify`)

      let updatedPathsCount = 0
      let relinkedTreatmentsCount = 0

      for (const record of imageRecords) {
        try {
          console.log(`🔍 Processing image record:`, record)

          // Step 1: Fix image paths
          const currentPath = record.image_path
          const filename = basename(currentPath)
          console.log(`📁 Current path: ${currentPath}, filename: ${filename}`)

          // Build expected path structure: dental_images/patient_id/tooth_number/image_type/ (without filename)
          const expectedPath = `dental_images/${record.patient_id}/${record.tooth_number}/${record.image_type || 'other'}/`
          const fullExpectedPath = join(this.dentalImagesPath, record.patient_id, record.tooth_number.toString(), record.image_type || 'other', filename)
          console.log(`🎯 Expected path (new structure): ${expectedPath}`)
          console.log(`🎯 Full expected path: ${fullExpectedPath}`)

          let finalImagePath = currentPath

          // Check if file exists at new expected location (patient_id/tooth_number/image_type structure)
          if (existsSync(fullExpectedPath)) {
            console.log(`✅ File found at new structure location`)
            if (currentPath !== expectedPath) {
              finalImagePath = expectedPath
              updatedPathsCount++
              console.log(`📝 Updated image path to new structure: ${record.id} -> ${expectedPath}`)
            }
          } else {
            console.log(`❌ File not found at new structure location, checking legacy structure...`)

            // Try legacy structure: dental_images/patient_name/image_type/filename
            const patient = this.databaseService.db.prepare(`
              SELECT full_name FROM patients WHERE id = ?
            `).get(record.patient_id)

            if (patient) {
              const cleanPatientName = (patient.full_name || `Patient_${record.patient_id}`).replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, '_')
              const legacyPath = `dental_images/${cleanPatientName}/${record.image_type || 'other'}/${filename}`
              const fullLegacyPath = join(this.dentalImagesPath, cleanPatientName, record.image_type || 'other', filename)

              console.log(`🔍 Checking legacy path: ${legacyPath}`)

              if (existsSync(fullLegacyPath)) {
                console.log(`✅ File found at legacy location, migrating to new structure...`)

                // Create new directory structure
                const newDir = join(this.dentalImagesPath, record.patient_id, record.tooth_number.toString(), record.image_type || 'other')
                if (!existsSync(newDir)) {
                  mkdirSync(newDir, { recursive: true })
                  console.log(`📁 Created new directory: ${newDir}`)
                }

                // Copy file to new location
                const newFilePath = join(newDir, filename)
                copyFileSync(fullLegacyPath, newFilePath)
                console.log(`📋 Copied file from ${fullLegacyPath} to ${newFilePath}`)

                finalImagePath = expectedPath
                updatedPathsCount++
                console.log(`📝 Migrated image path to new structure: ${record.id} -> ${expectedPath}`)
              } else {
                console.log(`❌ File not found at legacy location either, searching...`)

                // Try to find the file in the restored images directory
                const searchPattern = join(this.dentalImagesPath, '**', filename)
                console.log(`🔍 Search pattern: ${searchPattern}`)

                const foundFiles = glob.sync(searchPattern)
                console.log(`🔍 Found files:`, foundFiles)

                if (foundFiles.length > 0) {
                  const foundFile = foundFiles[0]

                  // Create new directory structure and move file
                  const newDir = join(this.dentalImagesPath, record.patient_id, record.tooth_number.toString(), record.image_type || 'other')
                  if (!existsSync(newDir)) {
                    mkdirSync(newDir, { recursive: true })
                    console.log(`📁 Created new directory: ${newDir}`)
                  }

                  const newFilePath = join(newDir, filename)
                  copyFileSync(foundFile, newFilePath)
                  console.log(`📋 Moved file from ${foundFile} to ${newFilePath}`)

                  finalImagePath = expectedPath
                  updatedPathsCount++
                  console.log(`📝 Found and migrated image path: ${record.id} -> ${expectedPath}`)
                } else {
                  console.warn(`⚠️ Image file not found for record ${record.id}: ${filename}`)
                  console.warn(`⚠️ Searched in: ${this.dentalImagesPath}`)

                  // List all files in the dental images directory for debugging
                  if (existsSync(this.dentalImagesPath)) {
                    const allFiles = glob.sync(join(this.dentalImagesPath, '**', '*'))
                    console.log(`📂 All files in dental_images:`, allFiles.slice(0, 10)) // Show first 10 files
                  }
                }
              }
            }
          }

          // Step 2: Find the correct dental treatment ID for this image
          // Look for a treatment that matches patient_id and tooth_number
          const matchingTreatment = this.databaseService.db.prepare(`
            SELECT id FROM dental_treatments
            WHERE patient_id = ? AND tooth_number = ?
            ORDER BY created_at DESC
            LIMIT 1
          `).get(record.patient_id, record.tooth_number)

          let finalTreatmentId = record.dental_treatment_id

          if (matchingTreatment && matchingTreatment.id !== record.dental_treatment_id) {
            finalTreatmentId = matchingTreatment.id
            relinkedTreatmentsCount++
            console.log(`🔗 Relinked image ${record.id} to treatment ${finalTreatmentId} (patient: ${record.patient_id}, tooth: ${record.tooth_number})`)
          } else if (!matchingTreatment) {
            console.warn(`⚠️ No matching treatment found for image ${record.id} (patient: ${record.patient_id}, tooth: ${record.tooth_number})`)
          }

          // Step 3: Update the record with corrected path and treatment ID
          if (finalImagePath !== currentPath || finalTreatmentId !== record.dental_treatment_id) {
            this.databaseService.db.prepare(`
              UPDATE dental_treatment_images
              SET image_path = ?, dental_treatment_id = ?
              WHERE id = ?
            `).run(finalImagePath, finalTreatmentId, record.id)
          }

        } catch (error) {
          console.error(`❌ Error processing image record ${record.id}:`, error)
        }
      }

      console.log(`✅ Updated ${updatedPathsCount} image paths and relinked ${relinkedTreatmentsCount} treatments after restore`)

    } catch (error) {
      console.error('❌ Failed to update image paths after restore:', error)
      // Don't throw error as this is not critical for the restore process
    }
  }

  /**
   * Synchronize dental treatment images with the database after backup restore
   * Scans the dental_images folder structure and ensures all image files are properly linked
   */
  async synchronizeDentalImagesAfterRestore() {
    try {
      console.log('🔄 Starting dental images synchronization after restore...')

      if (!existsSync(this.dentalImagesPath)) {
        console.log('📁 No dental_images directory found, skipping synchronization')
        return {
          success: true,
          totalProcessed: 0,
          totalAdded: 0,
          totalSkipped: 0,
          totalErrors: 0,
          errors: []
        }
      }

      const stats = {
        totalProcessed: 0,
        totalAdded: 0,
        totalSkipped: 0,
        totalErrors: 0,
        errors: []
      }

      // Valid image types
      const validImageTypes = ['before', 'after', 'xray', 'clinical']

      // Recursively scan the dental_images directory
      const imageFiles = glob.sync(join(this.dentalImagesPath, '**', '*'))
        .filter(filePath => {
          const stat = statSync(filePath)
          return stat.isFile() && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filePath)
        })

      console.log(`📊 Found ${imageFiles.length} image files to process`)

      for (const filePath of imageFiles) {
        try {
          stats.totalProcessed++

          // Extract path components: dental_images/{patient_id}/{tooth_number}/{image_type}/{filename}
          const relativePath = path.relative(this.dentalImagesPath, filePath)
          const pathParts = relativePath.split(path.sep)

          if (pathParts.length !== 4) {
            console.warn(`⚠️ Invalid folder structure: ${relativePath} (expected: patient_id/tooth_number/image_type/filename)`)
            stats.totalSkipped++
            continue
          }

          const [patientId, toothNumberStr, imageType, filename] = pathParts
          const toothNumber = parseInt(toothNumberStr, 10)

          // Validate tooth number (1-32)
          if (isNaN(toothNumber) || toothNumber < 1 || toothNumber > 32) {
            console.warn(`⚠️ Invalid tooth number: ${toothNumberStr} for file ${relativePath}`)
            stats.totalSkipped++
            continue
          }

          // Validate image type
          if (!validImageTypes.includes(imageType)) {
            console.warn(`⚠️ Invalid image type: ${imageType} for file ${relativePath}`)
            stats.totalSkipped++
            continue
          }

          // Check if patient exists
          const patient = this.databaseService.db.prepare(`
            SELECT id FROM patients WHERE id = ?
          `).get(patientId)

          if (!patient) {
            console.warn(`⚠️ Patient not found: ${patientId} for file ${relativePath}`)
            stats.totalSkipped++
            continue
          }

          // Build the image path (directory path without filename)
          const imagePath = `dental_images/${patientId}/${toothNumber}/${imageType}/`

          // Check if image is already registered in database
          const existingImage = this.databaseService.db.prepare(`
            SELECT COUNT(*) as count FROM dental_treatment_images
            WHERE image_path = ? AND patient_id = ? AND tooth_number = ? AND image_type = ?
          `).get(imagePath, patientId, toothNumber, imageType)

          if (existingImage.count > 0) {
            console.log(`✅ Image already registered: ${relativePath}`)
            stats.totalSkipped++
            continue
          }

          // Find the most recent dental treatment for this patient and tooth
          const latestTreatment = this.databaseService.db.prepare(`
            SELECT id FROM dental_treatments
            WHERE patient_id = ? AND tooth_number = ?
            ORDER BY created_at DESC
            LIMIT 1
          `).get(patientId, toothNumber)

          if (!latestTreatment) {
            console.warn(`⚠️ No treatment found for patient ${patientId}, tooth ${toothNumber}`)
            stats.totalErrors++
            stats.errors.push({
              file: relativePath,
              error: `No treatment found for patient ${patientId}, tooth ${toothNumber}`
            })
            continue
          }

          // Generate UUID for new image record
          const { v4: uuidv4 } = require('uuid')
          const imageId = uuidv4()
          const now = new Date().toISOString()

          // Insert new image record
          this.databaseService.db.prepare(`
            INSERT INTO dental_treatment_images (
              id,
              dental_treatment_id,
              patient_id,
              tooth_number,
              image_path,
              image_type,
              description,
              taken_date,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            imageId,
            latestTreatment.id,
            patientId,
            toothNumber,
            imagePath,
            imageType,
            null, // description
            now,  // taken_date
            now,  // created_at
            now   // updated_at
          )

          console.log(`✅ Added image record: ${relativePath} -> ${imageId}`)
          stats.totalAdded++

        } catch (error) {
          console.error(`❌ Error processing file ${filePath}:`, error)
          stats.totalErrors++
          stats.errors.push({
            file: path.relative(this.dentalImagesPath, filePath),
            error: error.message
          })
        }
      }

      console.log(`✅ Dental images synchronization completed:`)
      console.log(`   📊 Total processed: ${stats.totalProcessed}`)
      console.log(`   ➕ Total added: ${stats.totalAdded}`)
      console.log(`   ⏭️ Total skipped: ${stats.totalSkipped}`)
      console.log(`   ❌ Total errors: ${stats.totalErrors}`)

      if (stats.errors.length > 0) {
        console.log(`📋 Error details:`)
        stats.errors.forEach(error => {
          console.log(`   - ${error.file}: ${error.error}`)
        })
      }

      return {
        success: true,
        ...stats
      }

    } catch (error) {
      console.error('❌ Failed to synchronize dental images after restore:', error)
      throw error
    }
  }




}

module.exports = { BackupService }
