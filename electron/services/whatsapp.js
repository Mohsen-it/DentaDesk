const { app, BrowserWindow } = require('electron')
const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const path = require('path')

let client
let lastQr = null
let isReady = false
let isInitializing = false
let isResetting = false
let initAttemptCount = 0

const sessionPath = app.getPath('userData') + '/whatsapp-session'

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Health check function to verify client status
async function performHealthCheck() {
  if (!client) {
    console.log('🔍 Health check: No client instance')
    return false
  }

  try {
    const state = await client.getState().catch(() => null)
    const stateStr = String(state || '').toLowerCase()
    const isHealthy = stateStr === 'connected' || stateStr === 'authenticated'
    console.log(`🔍 Health check result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (state: ${stateStr})`)
    return isHealthy
  } catch (err) {
    console.warn('❌ Health check failed:', err.message)
    return false
  }
}

// Periodic health monitoring
setInterval(async () => {
  console.log(`⏰ Health check interval triggered at ${new Date().toISOString()}`)
  if (!isReady && !isInitializing && !isResetting) {
    console.log('⏰ Conditions met for health check (client not ready, not initializing, not resetting)')
    const isHealthy = await performHealthCheck()
    if (!isHealthy) {
      console.log('🚨 Client appears unhealthy, attempting recovery...')
      try {
        await initializeClient()
      } catch (err) {
        console.warn('❌ Automatic recovery failed:', err.message)
      }
    } else {
      console.log('✅ Client is healthy, no recovery needed')
    }
  } else {
    console.log(`⏰ Skipping health check (ready: ${isReady}, initializing: ${isInitializing}, resetting: ${isResetting})`)
  }
}, 30000) // فحص كل 30 ثانية

async function initializeClient() {
  if (isInitializing) return
  if (client) {
    try { await client.getState() ; return } catch (_) { /* fallthrough to recreate */ }
  }
  isInitializing = true

  // تحديد مسار Chrome للتطبيق المصدر
  let executablePath = null
  if (process.env.NODE_ENV === 'production' || !process.env.IS_DEV) {
    // في التطبيق المصدر، نحتاج للبحث عن Chrome في المسارات المحتملة
    const possiblePaths = [
      path.join(process.resourcesPath, 'chrome-win', 'chrome.exe'),
      path.join(process.resourcesPath, 'chrome', 'chrome.exe'),
      path.join(__dirname, '..', '..', 'chrome-win', 'chrome.exe'),
      path.join(__dirname, '..', '..', 'chrome', 'chrome.exe'),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Users\\' + require('os').userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
    ]
    
    for (const chromePath of possiblePaths) {
      try {
        if (fs.existsSync(chromePath)) {
          executablePath = chromePath
          console.log('✅ تم العثور على Chrome في:', chromePath)
          break
        }
      } catch (err) {
        // تجاهل الأخطاء والاستمرار
      }
    }
    
    if (!executablePath) {
      console.warn('⚠️ لم يتم العثور على Chrome، سيتم استخدام المتصفح الافتراضي')
    }
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath,
    }),
    puppeteer: {
      headless: true,
      executablePath: executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
      ],
    },
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
    qrMaxRetries: 12,
    // Note: webVersionCache can be set to a fixed remote HTML when needed
  })

  client.on('qr', (qr) => {
    try {
      console.log('QR Code received, scan it with your WhatsApp app:')
      qrcode.generate(qr, { small: true })
    } catch (_) {}
    lastQr = qr
    try {
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('whatsapp:qr', qr)
      }
    } catch (err) {
      console.warn('Failed to broadcast QR to renderer:', err)
    }
  })

  client.on('ready', () => {
    console.log('WhatsApp client is ready!')
    isReady = true

    // Send success notification to renderer
    try {
      const { BrowserWindow } = require('electron')
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('whatsapp:session:connected', {
          message: 'تم ربط حساب واتساب بنجاح!',
          timestamp: Date.now()
        })
      }
    } catch (err) {
      console.warn('Failed to send connection notification:', err.message)
    }
  })

  client.on('authenticated', () => {
    console.log('WhatsApp authenticated')
    try {
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('whatsapp:ready')
      }
    } catch (_) {}
  })

  client.on('change_state', (state) => {
    console.log('WhatsApp state changed:', state)
  })

  client.on('auth_failure', (msg) => {
    console.error('Authentication failed:', msg)
    isReady = false
    lastQr = null

    // إرسال إشعار فشل المصادقة للواجهة
    try {
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('whatsapp:auth_failure', {
          message: 'فشل في المصادقة: ' + msg,
          timestamp: Date.now()
        })
      }
    } catch (err) {
      console.warn('Failed to send auth failure notification:', err.message)
    }

    // في حالة فشل المصادقة، قد نحتاج لإعادة توليد QR
    if (!isResetting) {
      console.log('Authentication failed, clearing session for fresh start...')
      setTimeout(() => {
        resetWhatsAppSession().catch(err => {
          console.error('Failed to reset session after auth failure:', err.message)
        })
      }, 3000)
    }
  })

  client.on('loading_screen', (percent, message) => {
    console.log('WhatsApp loading:', percent, message)
  })

  // Initialize with enhanced retry logic and better error handling
  try {
    let attempts = 0
    const maxInitAttempts = 5
    let lastError = null

    while (attempts < maxInitAttempts) {
      initAttemptCount++
      const globalAttempt = initAttemptCount
      console.log(`🚀 Initializing WhatsApp client (attempt ${attempts + 1}/${maxInitAttempts}, global attempt #${globalAttempt})...`)
      try {
        await client.initialize()
        console.log('✅ WhatsApp client initialized successfully')
        break
      } catch (err) {
        attempts += 1
        lastError = err
        const msg = String(err && err.message ? err.message : err || '')

        console.warn(`WhatsApp initialization attempt ${attempts} failed:`, msg)

        // أنواع الأخطاء الشائعة وكيفية التعامل معها
        const isRetryableError = (
          msg.includes('Target closed') ||
          msg.includes('Session closed') ||
          msg.includes('Protocol error') ||
          msg.includes('WebSocket') ||
          msg.includes('net::ERR') ||
          msg.includes('timeout') ||
          msg.includes('ECONNRESET') ||
          msg.includes('ENOTFOUND')
        )

        if (!isRetryableError || attempts >= maxInitAttempts) {
          console.error('Non-retryable error or max attempts reached:', msg)
          
          // إرسال إشعار الخطأ للواجهة
          try {
            const windows = BrowserWindow.getAllWindows()
            for (const win of windows) {
              win.webContents.send('whatsapp:error', {
                message: 'فشل في تهيئة واتساب: ' + msg,
                timestamp: Date.now(),
                retryable: false
              })
            }
          } catch (err) {
            console.warn('Failed to send error notification:', err.message)
          }
          
          throw err
        }

        // إرسال إشعار إعادة المحاولة للواجهة
        try {
          const windows = BrowserWindow.getAllWindows()
          for (const win of windows) {
            win.webContents.send('whatsapp:retrying', {
              message: 'إعادة محاولة الاتصال... (' + (attempts + 1) + '/' + maxInitAttempts + ')',
              timestamp: Date.now(),
              attempt: attempts + 1,
              maxAttempts: maxInitAttempts
            })
          }
        } catch (err) {
          console.warn('Failed to send retry notification:', err.message)
        }

        // زيادة وقت الانتظار تدريجياً
        const waitTime = Math.min(1000 * Math.pow(2, attempts), 10000)
        console.log(`Waiting ${waitTime}ms before retry...`)
        await sleep(waitTime)

        // إعادة إنشاء الـ client في بعض الحالات
        if (msg.includes('Target closed') && attempts > 2) {
          console.log('Recreating WhatsApp client instance...')
          try {
            await client.destroy().catch(() => {})
          } catch (_) {}
          await sleep(1000)
        }
      }
    }

    if (attempts >= maxInitAttempts) {
      throw lastError || new Error('Failed to initialize WhatsApp client after maximum attempts')
    }
  } finally {
    isInitializing = false
  }
}

async function sendMessage(phoneNumber, message) {
  if (!client) {
    await initializeClient()
  }

  // Wait until client is ready with better error handling and retry logic
  const waitUntilReady = async (timeoutMs = 30000, maxRetries = 3) => {
    let attempts = 0

    while (attempts < maxRetries) {
      const start = Date.now()

      // انتظار جاهزية الـ client
      while (Date.now() - start < timeoutMs) {
        if (isReady) return

        try {
          const state = await client.getState().catch(() => null)
          const stateStr = String(state || '').toLowerCase()

          // إذا كان الـ client جاهز أو متصل
          if (state && (stateStr === 'connected' || stateStr === 'authenticated')) {
            return
          }

          // إذا كان منفصل، سنحاول إعادة التهيئة
          if (stateStr === 'disconnected') {
            console.log('Client is disconnected, attempting to reconnect...')
            break
          }
        } catch (err) {
          console.warn('Error checking client state:', err.message)
        }

        await sleep(500) // انتظر نصف ثانية قبل المحاولة التالية
      }

      attempts++
      console.log(`WhatsApp client not ready (attempt ${attempts}/${maxRetries})`)

      // إذا لم ننجح في المحاولة الأولى، حاول إعادة تهيئة الـ client
      if (attempts < maxRetries) {
        try {
          console.log('Attempting to reinitialize WhatsApp client...')
          isReady = false
          await initializeClient()
          await sleep(2000) // انتظر 2 ثانية بعد إعادة التهيئة
        } catch (err) {
          console.warn('Failed to reinitialize client:', err.message)
        }
      }
    }

    throw new Error(`WhatsApp client not ready after ${maxRetries} attempts within ${timeoutMs}ms`)
  }
  await waitUntilReady()

  // Normalize phone number (digits only)
  const sanitized = String(phoneNumber).replace(/\D/g, '')
  if (!sanitized) throw new Error('Invalid phone number')

  // Resolve number to WhatsApp ID
  const numberInfo = await client.getNumberId(sanitized)
  if (!numberInfo || !numberInfo._serialized) {
    throw new Error('Number is not on WhatsApp or invalid format')
  }
  const wid = numberInfo._serialized

  const maxRetries = 5
  let attempts = 0
  let lastError = null

  while (attempts < maxRetries) {
    try {
      console.log(`Sending WhatsApp message (attempt ${attempts + 1}/${maxRetries}) to ${sanitized}...`)
      await client.sendMessage(wid, message)
      console.log('WhatsApp message sent successfully')
      return
    } catch (err) {
      attempts += 1
      lastError = err
      const msg = String(err && err.message ? err.message : err || '')

      console.warn(`Send message attempt ${attempts} failed:`, msg)

      // أنواع الأخطاء التي يمكن إعادة المحاولة فيها
      const isRetryableError = (
        msg.includes('timeout') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ENOTFOUND') ||
        msg.includes('Network') ||
        msg.includes('connection') ||
        msg.includes('busy') ||
        msg.includes('rate limit')
      )

      if (!isRetryableError || attempts >= maxRetries) {
        console.error('Non-retryable error or max attempts reached:', msg)
        break
      }

      // زيادة وقت الانتظار بين المحاولات
      const waitTime = Math.min(2000 * attempts, 10000)
      console.log(`Waiting ${waitTime}ms before retry...`)
      await sleep(waitTime)

      // التأكد من أن الـ client ما زال جاهز بعد الانتظار
      try {
        await waitUntilReady(5000, 1)
      } catch (readyErr) {
        console.warn('Client not ready after wait:', readyErr.message)
      }
    }
  }

  throw lastError || new Error('Failed to send WhatsApp message after maximum attempts')
}

async function resetWhatsAppSession() {
  if (isResetting) return
  isResetting = true
  try {
    if (client) {
      try { await client.logout() } catch (_) {}
      try { await client.destroy() } catch (_) {}
    }

    if (fs.existsSync(sessionPath)) {
      try {
        if (fs.rmSync) {
          fs.rmSync(sessionPath, { recursive: true, force: true })
        } else {
          const rm = (target) => {
            try {
              if (fs.lstatSync(target).isDirectory()) {
                for (const entry of fs.readdirSync(target)) {
                  rm(path.join(target, entry))
                }
                fs.rmdirSync(target)
              } else {
                fs.unlinkSync(target)
              }
            } catch (err) {
              if (err && (err.code === 'EBUSY' || err.code === 'EPERM')) {
                try { fs.renameSync(target, target + '.tmp_delete') } catch (_) {}
              } else {
                throw err
              }
            }
          }
          rm(sessionPath)
        }
      } catch (err) {
        console.warn('Non-fatal: failed to remove session path immediately:', err && err.message ? err.message : err)
      }
    }

    lastQr = null
    isReady = false

    // Send session deleted notification
    try {
      const { BrowserWindow } = require('electron')
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        win.webContents.send('whatsapp:session:deleted', {
          message: 'تم حذف جلسة واتساب بنجاح',
          timestamp: Date.now()
        })
      }
    } catch (err) {
      console.warn('Failed to send deletion notification:', err.message)
    }

    await sleep(300)
    try {
      await initializeClient()
    } catch (err) {
      const msg = String(err && err.message ? err.message : err || '')
      if (msg.includes('Target closed')) {
        await sleep(700)
        await initializeClient()
      } else {
        throw err
      }
    }
  } catch (error) {
    console.error('Failed to reset WhatsApp session:', error)
    throw error
  } finally {
    isResetting = false
  }
}

async function getWhatsAppStatus() {
  let currentState = null
  let isClientHealthy = false

  try {
    if (client) {
      currentState = await client.getState().catch(() => null)
      const stateStr = String(currentState || '').toLowerCase()
      isClientHealthy = stateStr === 'connected' || stateStr === 'authenticated'
    }
  } catch (err) {
    console.warn('Error getting client status:', err.message)
  }

  return {
    isReady: isReady && isClientHealthy,
    hasQr: !!lastQr,
    qr: lastQr || undefined,
    state: currentState,
    isClientHealthy,
    lastQrTimestamp: lastQr ? Date.now() : null,
  }
}

module.exports = {
  initializeClient,
  sendMessage,
  resetWhatsAppSession,
  getWhatsAppStatus,
  performHealthCheck,
}


