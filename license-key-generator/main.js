const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

// استيراد وظيفة توليد المفاتيح من الملف المحلي
const { generateKeyForSpecificDevice, validateDeviceId } = require('./licenseGenerator.js')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 900,
    minWidth: 700,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1e293b',
    icon: path.join(__dirname, '../assets/icon.ico'),
    autoHideMenuBar: true,
    title: 'DentaDesk - مولد مفاتيح الترخيص'
  })

  mainWindow.loadFile('index.html')

  // فتح أدوات المطور في وضع التطوير
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools()
  }
}

// عند جاهزية التطبيق
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// إغلاق التطبيق عند إغلاق جميع النوافذ (في Windows و Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// معالج توليد المفتاح
ipcMain.handle('generate-license-key', async (event, { deviceId, licenseType, region }) => {
  try {
    // التحقق من صحة معرف الجهاز
    if (!validateDeviceId(deviceId)) {
      return {
        success: false,
        error: 'معرف الجهاز غير صالح! يجب أن يكون مكون من 32 حرف hex'
      }
    }

    // توليد المفتاح
    const license = generateKeyForSpecificDevice(deviceId, licenseType, region)

    return {
      success: true,
      license: {
        licenseKey: license.licenseKey,
        deviceId: license.deviceId,
        generatedAt: license.generatedAt,
        licenseType: license.metadata.licenseType,
        region: license.metadata.region
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'حدث خطأ في توليد المفتاح'
    }
  }
})

// معالج نسخ النص
ipcMain.handle('copy-to-clipboard', async (event, text) => {
  const { clipboard } = require('electron')
  clipboard.writeText(text)
  return { success: true }
})

