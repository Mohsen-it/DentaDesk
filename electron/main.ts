const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron')
const { join } = require('path')

// ✅ معالج الأخطاء الشامل
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  console.error('Stack:', error.stack)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
})

// ✅ تسجيل معلومات النظام
console.log('🚀 Starting Dental Clinic Management System')
console.log('📋 System Info:')
console.log('  - Platform:', process.platform)
console.log('  - Architecture:', process.arch)
console.log('  - Node Version:', process.version)
console.log('  - Electron Version:', process.versions.electron)
console.log('  - Chrome Version:', process.versions.chrome)

// Import license manager and predefined licenses
let licenseManager = null
let predefinedLicenses = null
try {
  const { licenseManager: lm } = require('./licenseManager.js')
  licenseManager = lm

  predefinedLicenses = require('./predefinedLicenses.js')
  console.log('✅ License manager loaded successfully')
  console.log('✅ Predefined licenses loaded successfully')
} catch (error) {
  console.error('❌ Failed to load license manager:', error)
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
console.log('🔧 Development Mode:', isDev)

let mainWindow = null
let databaseService = null
let backupService = null
let reportsService = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      // ✅ إعدادات إضافية لحل مشكلة الشاشة البيضاء
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      // ✅ تحسين الأداء
      backgroundThrottling: false,
      // ✅ تعطيل DevTools في الإنتاج
      devTools: isDev,
      // ✅ إعدادات إضافية للتوافق
      spellcheck: false,
      // ✅ تحسين معالجة الصور والموارد
      webgl: true,
      plugins: false,
    },
    titleBarStyle: 'hiddenInset', // شريط عنوان شفاف
    titleBarOverlay: {
      color: 'rgba(255, 255, 255, 0.1)', // شفاف
      symbolColor: '#1e293b',
      height: 40
    },
    show: false,
    title: 'DentalClinic - agorracode',
    icon: join(__dirname, '../assets/icon.png'),
    // ✅ إعدادات إضافية للنافذة
    backgroundColor: '#ffffff', // لون خلفية أبيض لتجنب الشاشة السوداء
    // ✅ تحسين الأداء
    useContentSize: true,
  })

  // Set CSP headers for security
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:5173 ws://localhost:5173 https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:5173; style-src 'self' 'unsafe-inline' http://localhost:5173 https://fonts.googleapis.com; img-src 'self' data: blob: http://localhost:5173 https://api.qrserver.com; font-src 'self' data: http://localhost:5173 https://fonts.gstatic.com;"
            : "default-src 'self' 'unsafe-inline' data: blob: https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://api.qrserver.com; font-src 'self' https://fonts.gstatic.com;"
        ]
      }
    })
  })

  // Load the app
  if (isDev) {
    // Wait a bit for Vite server to start
    setTimeout(() => {
      console.log('🔄 Loading development server...')
      mainWindow.loadURL('http://localhost:5173')
      mainWindow.webContents.openDevTools()
    }, 2000)
  } else {
    // ✅ تحسين تحميل الإنتاج مع معالجة شاملة للأخطاء
    const indexPath = join(__dirname, '../dist/index.html')
    console.log('📁 Loading production build from:', indexPath)

    // التحقق من وجود الملف أولاً
    const fs = require('fs')
    if (!fs.existsSync(indexPath)) {
      console.error('❌ index.html not found at:', indexPath)
      console.log('📂 Available files in dist:')
      try {
        const distPath = join(__dirname, '../dist')
        if (fs.existsSync(distPath)) {
          const files = fs.readdirSync(distPath)
          files.forEach(file => console.log('  -', file))
        } else {
          console.error('❌ dist directory not found at:', distPath)
        }
      } catch (err) {
        console.error('❌ Error reading dist directory:', err)
      }
      return
    }

    // تحميل الملف مع معالجة الأخطاء
    mainWindow.loadFile(indexPath)
      .then(() => {
        console.log('✅ Successfully loaded index.html')
      })
      .catch(err => {
        console.error('❌ Failed to load index.html:', err)
        console.log('🔄 Trying alternative loading method...')

        // طريقة بديلة: استخدام file:// URL
        const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`
        console.log('🔄 Trying file URL:', fileUrl)

        mainWindow.loadURL(fileUrl)
          .then(() => {
            console.log('✅ Successfully loaded with file:// URL')
          })
          .catch(urlErr => {
            console.error('❌ Failed to load with file:// URL:', urlErr)
            console.log('🔄 Trying data URL fallback...')

            // طريقة أخيرة: تحميل محتوى HTML مباشرة
            try {
              const htmlContent = fs.readFileSync(indexPath, 'utf8')
              const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
              mainWindow.loadURL(dataUrl)
                .then(() => {
                  console.log('✅ Successfully loaded with data URL')
                })
                .catch(dataErr => {
                  console.error('❌ All loading methods failed:', dataErr)
                })
            } catch (readErr) {
              console.error('❌ Failed to read HTML file:', readErr)
            }
          })
      })
  }

  // ✅ تحسين معالجة عرض النافذة
  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show')
    mainWindow?.show()

    // Force focus on the window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Enforce single instance to avoid double-open behavior
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, _argv, _workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    console.log('🚀 Electron app is ready, initializing services...')

    // Create window first for faster UI startup
    createWindow()

    // Initialize database service with migration support
    console.log('🚀 Starting database service initialization...')
    try {
      console.log('📦 Importing DatabaseService...')
      const { DatabaseService } = require('../src/services/databaseService.js')
      console.log('✅ DatabaseService imported successfully')

      // Initialize SQLite database service
      const dbPath = join(app.getPath('userData'), 'dental_clinic.db')
      console.log('🗄️ Database will be created at:', dbPath)

      // Ensure userData directory exists
      const userDataPath = app.getPath('userData')
      console.log('📁 User data path:', userDataPath)

      if (!require('fs').existsSync(userDataPath)) {
        require('fs').mkdirSync(userDataPath, { recursive: true })
        console.log('✅ Created userData directory:', userDataPath)
      }

      console.log('🏗️ Creating DatabaseService instance...')
      try {
        databaseService = new DatabaseService() // Remove dbPath parameter since constructor doesn't accept it
        console.log('✅ DatabaseService instance created successfully')
      } catch (dbError: any) {
        console.error('❌ Failed to create DatabaseService instance:', dbError.message)
        console.error('Stack trace:', dbError.stack)
        databaseService = null
      }

      // Check if database file was created
      if (require('fs').existsSync(dbPath)) {
        const stats = require('fs').statSync(dbPath)
        console.log('📊 Database file exists, size:', stats.size, 'bytes')
      } else {
        console.log('❌ Database file was not created')
      }

      console.log('✅ SQLite database service initialized successfully')

    } catch (error) {
      console.error('❌ Failed to initialize database service:', error)
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
      databaseService = null
    }

    console.log('📋 Final database service status:', databaseService ? 'ACTIVE' : 'NULL')

    // WhatsApp reminders aliases for renderer API
    ipcMain.handle('whatsapp-reminders:set-settings', async (_event, newSettings) => {
      try {
        console.log('🔧 Main: Handling whatsapp-reminders:set-settings request with payload:', newSettings);

        // Log all payload properties
        console.log('🔧 Payload details:', {
          whatsapp_reminder_enabled: newSettings.whatsapp_reminder_enabled,
          hours_before: newSettings.hours_before,
          minutes_before: newSettings.minutes_before,
          message: newSettings.message,
          custom_enabled: newSettings.custom_enabled
        });

        if (databaseService) {
          // Ensure all WhatsApp reminder columns exist before update
          try {
            console.log('🔧 Checking database schema for WhatsApp columns...');
            const cols = databaseService.db.prepare(`PRAGMA table_info(settings)`).all()
            console.log('🔧 Current settings table columns:', cols?.map((c: any) => c.name) || [])

            // Check for all required WhatsApp columns
            const requiredColumns = [
              'whatsapp_reminder_enabled',
              'whatsapp_reminder_hours_before',
              'whatsapp_reminder_minutes_before',
              'whatsapp_reminder_message',
              'whatsapp_reminder_custom_enabled'
            ]

            for (const columnName of requiredColumns) {
              const hasColumn = cols?.some((c: any) => c.name === columnName)
              if (!hasColumn) {
                console.log(`🔧 Adding missing column: ${columnName}`);
                let defaultValue = '0'
                if (columnName === 'whatsapp_reminder_message') {
                  defaultValue = "'مرحبًا {{patient_name}}، تذكير بموعدك في عيادة الأسنان بتاريخ {{appointment_date}} الساعة {{appointment_time}}. نشكرك على التزامك.'"
                }
                databaseService.db.prepare(`ALTER TABLE settings ADD COLUMN ${columnName} ${columnName === 'whatsapp_reminder_message' ? 'TEXT' : 'INTEGER'} DEFAULT ${defaultValue}`).run()
                console.log(`✅ Column ${columnName} added successfully`);
              }
            }
          } catch (schemaErr) {
            console.warn('⚠️ Schema check failed:', schemaErr.message)
          }

          const currentSettings = await databaseService.getSettings();
          const updatedSettings = {
            ...currentSettings,
            whatsapp_reminder_enabled: newSettings.whatsapp_reminder_enabled !== undefined ? newSettings.whatsapp_reminder_enabled : currentSettings.whatsapp_reminder_enabled,
            whatsapp_reminder_hours_before: newSettings.hours_before !== undefined ? newSettings.hours_before : currentSettings.whatsapp_reminder_hours_before,
            whatsapp_reminder_minutes_before: newSettings.minutes_before !== undefined ? newSettings.minutes_before : (currentSettings.whatsapp_reminder_minutes_before || newSettings.hours_before * 60),
            whatsapp_reminder_message: newSettings.message !== undefined ? newSettings.message : currentSettings.whatsapp_reminder_message,
            whatsapp_reminder_custom_enabled: newSettings.custom_enabled !== undefined ? newSettings.custom_enabled : currentSettings.whatsapp_reminder_custom_enabled,
          };

          // Apply default minutes if not explicitly set and custom_enabled is off
          if (updatedSettings.whatsapp_reminder_minutes_before === 0 && updatedSettings.whatsapp_reminder_hours_before > 0) {
            updatedSettings.whatsapp_reminder_minutes_before = updatedSettings.whatsapp_reminder_hours_before * 60;
          }

          await databaseService.updateSettings(updatedSettings);

          // Verify the update was successful
          const verifySettings = await databaseService.getSettings();
          console.log('🔍 Verification - whatsapp_reminder_enabled after update:', verifySettings?.whatsapp_reminder_enabled);

          console.log('✅ WhatsApp settings saved successfully');
          return { success: true };
        } else {
          return { success: false, error: 'Database service not available' };
        }
      } catch (error) {
        console.error('❌ Error saving WhatsApp settings:', error);
        return { success: false, error: error.message || 'Failed to save WhatsApp settings' };
      }
    });

    ipcMain.handle('whatsapp-reminders:get-settings', async () => {
      try {
        if (databaseService) {
          const settings = await databaseService.getSettings();
          console.log('🔧 Main: Retrieved settings from databaseService.getSettings():', settings);
          const hours = settings.whatsapp_reminder_hours_before || 3;
          const minutesRaw = settings.whatsapp_reminder_minutes_before;
          const minutesResolved = (typeof minutesRaw === 'number' && minutesRaw > 0) ? minutesRaw : (hours * 60);
          return {
            whatsapp_reminder_enabled: settings.whatsapp_reminder_enabled || 0,
            hours_before: hours,
            minutes_before: minutesResolved,
            message: settings.whatsapp_reminder_message || '',
            custom_enabled: settings.whatsapp_reminder_custom_enabled || 0,
          };
        } else {
          console.warn('🔧 Main: databaseService not available, returning default WhatsApp reminder settings.');
          return {
            whatsapp_reminder_enabled: 0,
            hours_before: 3,
            minutes_before: 180,
            message: '',
            custom_enabled: 0,
          };
        }
      } catch (error) {
        console.error('❌ Error getting WhatsApp settings:', error);
        return null;
      }
    });

    // Debug handler for testing IPC communication and database access
    ipcMain.handle('debug:test-whatsapp-handler', async () => {
      console.log('🔧 Main: DEBUG - debug:test-whatsapp-handler called successfully')
      return {
        success: true,
        message: 'IPC communication is working',
        timestamp: new Date().toISOString(),
        handlerRegistered: true
      }
    })

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
