import { Client, LocalAuth } from 'whatsapp-web.js';
import * as os from 'os';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const qrcode = require('qrcode-terminal');
import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

let client: Client;
let lastQr: string | null = null;
let isReady = false;
let lastReadyAt: number | null = null;

const sessionPath = app.getPath('userData') + '/whatsapp-session';

export async function initializeClient(): Promise<void> {
  // Skip WhatsApp initialization if already initialized
  if (client && isReady) {
    console.log('✅ WhatsApp client already initialized')
    return
  }

  console.log('🚀 Initializing WhatsApp client...')
  
  // تحديد مسار Chrome للتطبيق المصدر
  let executablePath: string | undefined = undefined
  if (process.env.NODE_ENV === 'production' || !process.env.IS_DEV) {
    // في التطبيق المصدر، نحتاج للبحث عن Chrome في المسارات المحتملة
    const possiblePaths = [
      path.join(process.resourcesPath, 'chrome-win', 'chrome.exe'),
      path.join(process.resourcesPath, 'chrome', 'chrome.exe'),
      path.join(__dirname, '..', '..', 'chrome-win', 'chrome.exe'),
      path.join(__dirname, '..', '..', 'chrome', 'chrome.exe'),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
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
      executablePath,
      headless: true, // Run in headless mode for better performance
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-video-decode',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--disable-canvas-aa',
        '--disable-gl-drawing-for-tests',
        '--disable-extensions',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-speech-api',
        '--disable-web-security',
        '--disable-site-isolation-trials',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disk-cache-size=104857600', // 100MB disk cache
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--disable-sync',
        '--metrics-recording-only',
        '--disable-background-networking',
        '--disable-breakpad',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-ipc-flooding-protection',
        '--disable-features=site-per-process,TranslateUI',
        '--disable-hang-monitor',
        '--disable-partial-raster',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync-tabs',
        '--disable-zero-copy',
        '--enable-low-end-device-mode',
        '--font-render-hinting=none',
        '--force-color-profile=srgb',
        '--blink-settings=imagesEnabled=false', // Disable images
      ],
    },
  });

  client.on('qr', (qr) => {
    lastQr = qr;
    console.log('QR RECEIVED', qr);
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents && !window.webContents.isDestroyed()) {
        window.webContents.send('whatsapp:qr', qr);
      }
    });
  });

  client.on('ready', () => {
    isReady = true;
    lastReadyAt = Date.now();
    console.log('WhatsApp Client is READY!');
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents && !window.webContents.isDestroyed()) {
        window.webContents.send('whatsapp:ready');
      }
    });
  });

  client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
  });

  client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    isReady = false;
    lastQr = null;
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents && !window.webContents.isDestroyed()) {
        window.webContents.send('whatsapp:auth_failure', msg);
      }
    });
  });

  client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    isReady = false;
    lastQr = null;
    BrowserWindow.getAllWindows().forEach(window => {
      if (window.webContents && !window.webContents.isDestroyed()) {
        window.webContents.send('whatsapp:disconnected', reason);
      }
    });
    // Attempt to re-initialize after a delay
    setTimeout(() => {
      console.log('Attempting to re-initialize WhatsApp client...');
      initializeClient();
    }, 5000);
  });

  // Handle client initialization with timeout
  const initTimeout = 30 * 1000; // 30 seconds
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('WhatsApp client initialization timed out')), initTimeout)
  );

  try {
    await Promise.race([client.initialize(), timeoutPromise]);
    console.log('✅ WhatsApp client initialized successfully (or already running)');
  } catch (error) {
    console.error('❌ WhatsApp client initialization failed:', error);
    isReady = false;
    lastQr = null;
    throw error;
  }
}

export async function sendMessage(phoneNumber: string, message: string): Promise<void> {
  const formattedNumber = phoneNumber + '@c.us';
  const maxRetries = 3;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await client.sendMessage(formattedNumber, message);
      console.log(`Message sent to ${formattedNumber}`);
      return;
    } catch (error) {
      attempts++;
      console.error(`Failed to send message (attempt ${attempts}):`, error);
      if (attempts >= maxRetries) {
        throw new Error(`Failed to send message after ${maxRetries} attempts`);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }
}

export async function resetWhatsAppSession(): Promise<void> {
  console.log('Resetting WhatsApp session...');
  if (client) {
    try {
      await client.destroy();
      console.log('Client destroyed.');
    } catch (e) {
      console.warn('Error destroying client:', e);
    }
  }
  if (fs.existsSync(sessionPath)) {
    console.log('Deleting session data...');
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log('Session data deleted.');
  }
  client = undefined as any; // Clear the client object
  isReady = false;
  lastQr = null;
  console.log('WhatsApp session reset complete. Re-initializing client...');
  await initializeClient();
}

export function getWhatsAppStatus() {
  return {
    isReady: isReady,
    hasQr: lastQr !== null,
    qr: lastQr,
    lastReadyAt: lastReadyAt,
    uptime: isReady && lastReadyAt ? Date.now() - lastReadyAt : 0
  };
}