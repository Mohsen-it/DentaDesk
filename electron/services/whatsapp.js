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

const sessionPath = app.getPath('userData') + '/whatsapp-session'

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function initializeClient() {
  if (isInitializing) return
  if (client) {
    try { await client.getState() ; return } catch (_) { /* fallthrough to recreate */ }
  }
  isInitializing = true

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath,
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
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
  })

  client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason)
    isReady = false
  })

  client.on('loading_screen', (percent, message) => {
    console.log('WhatsApp loading:', percent, message)
  })

  // Initialize with retry to avoid transient "Target closed" during boot/reset
  try {
    let attempts = 0
    const maxInitAttempts = 3
    while (attempts < maxInitAttempts) {
      try {
        await client.initialize()
        break
      } catch (err) {
        attempts += 1
        const msg = String(err && err.message ? err.message : err || '')
        const isTargetClosed = msg.includes('Target closed')
        if (!isTargetClosed || attempts >= maxInitAttempts) {
          throw err
        }
        await sleep(500 * attempts)
      }
    }
  } finally {
    isInitializing = false
  }
}

async function sendMessage(phoneNumber, message) {
  if (!client) {
    await initializeClient()
  }

  // Wait until client is ready
  const waitUntilReady = async (timeoutMs = 15000) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (isReady) return
      try {
        const state = await client.getState().catch(() => null)
        if (state && String(state).toLowerCase() !== 'disconnected') return
      } catch (_) {}
      await new Promise(r => setTimeout(r, 250))
    }
    throw new Error('WhatsApp client not ready')
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

  const maxRetries = 3
  let attempts = 0
  while (attempts < maxRetries) {
    try {
      await client.sendMessage(wid, message)
      return
    } catch (err) {
      attempts += 1
      if (attempts >= maxRetries) throw err
      await new Promise((r) => setTimeout(r, 1000 * attempts))
    }
  }
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

function getWhatsAppStatus() {
  return {
    isReady,
    hasQr: !!lastQr,
    qr: lastQr || undefined,
  }
}

module.exports = {
  initializeClient,
  sendMessage,
  resetWhatsAppSession,
  getWhatsAppStatus,
}


