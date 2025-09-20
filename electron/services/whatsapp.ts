import { Client, LocalAuth } from 'whatsapp-web.js';
import * as os from 'os';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const qrcode = require('qrcode-terminal');
import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

let client: Client | null = null; // Allow client to be null initially
let lastQr: string | null = null;
let isReady = false;
let lastReadyAt: number | null = null;
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 5;
let isInitializing = false; // Flag to prevent multiple concurrent initializations

const sessionPath = app.getPath('userData') + '/whatsapp-session';

export async function initializeClient(): Promise<void> {
  if (isInitializing) {
    console.log('⏳ WhatsApp client initialization already in progress, skipping.');
    return;
  }

  isInitializing = true;
  initializationAttempts++;
  console.log(`🚀 Initializing WhatsApp client (attempt ${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})...`);

  // Skip WhatsApp initialization if already initialized and ready
  if (client && isReady) {
    console.log('✅ WhatsApp client already initialized and ready.');
    isInitializing = false;
    return;
  }

  // Determine Chrome executable path for packaged app
  let executablePath: string | undefined = undefined;
  if (process.env.NODE_ENV === 'production' || !process.env.IS_DEV) {
    // Logic to find Chrome path in production
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        console.log(`✅ تم العثور على Chrome في: ${executablePath}`);
        break;
      }
    }
    if (!executablePath) {
      console.warn('⚠️ لم يتم العثور على مسار Chrome القابل للتنفيذ. قد تواجه مشاكل في تهيئة WhatsApp.');
    }
  } else {
    // In development, puppeteer can usually find it automatically
    console.log('🔧 في وضع التطوير، سيبحث Puppeteer عن Chrome تلقائيًا.');
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath,
    }),
    puppeteer: {
      executablePath,
      headless: true, // Run in headless mode for better performance
      ignoreHTTPSErrors: true, // Add this line
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
    isInitializing = false; // Reset flag on success
    initializationAttempts = 0; // Reset attempts on success
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
    isInitializing = false; // Reset flag on failure
    attemptReinitialization();
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
    isInitializing = false; // Reset flag on disconnection
    attemptReinitialization();
  });

  // Handle client initialization with timeout
  const initTimeout = 60 * 1000; // 60 seconds (increased from 30)
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
    isInitializing = false; // Reset flag on failure
    attemptReinitialization();
    throw error;
  }
}

// Function to attempt re-initialization with exponential backoff
function attemptReinitialization() {
  if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
    const delay = Math.pow(2, initializationAttempts) * 1000; // Exponential backoff (2s, 4s, 8s, etc.)
    console.log(`⏳ Retrying WhatsApp client initialization in ${delay / 1000} seconds...`);
    setTimeout(() => initializeClient(), delay);
  } else {
    console.error(`❌ Maximum WhatsApp client initialization attempts reached (${MAX_INITIALIZATION_ATTEMPTS}). Clearing session data.`);
    clearSessionData(); // Clear session if max attempts reached
  }
}

export function getClient(): Client | null {
  return client;
}

export function getLastQr(): string | null {
  return lastQr;
}

export function getIsReady(): boolean {
  return isReady;
}

export function getLastReadyAt(): number | null {
  return lastReadyAt;
}

// Function to clear WhatsApp session data
export function clearSessionData(): void {
  if (client) {
    try {
      client.destroy(); // Destroy the client instance
      client = null;
      isReady = false;
      lastQr = null;
      initializationAttempts = 0;
      isInitializing = false;
    } catch (e) {
      console.error('Error destroying WhatsApp client:', e);
    }
  }
  if (fs.existsSync(sessionPath)) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('✅ WhatsApp session data cleared.');
    } catch (e) {
      console.error('❌ Error clearing WhatsApp session directory:', e);
    }
  }
  // Inform renderer processes about session clear
  BrowserWindow.getAllWindows().forEach(window => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send('whatsapp:session_cleared');
    }
  });
}

export async function sendMessage(phoneNumber: string, message: string): Promise<void> {
  if (!isReady || !client) {
    throw new Error('WhatsApp client is not ready.');
  }
  // Logic to send message
  const sanitizedNumber = phoneNumber.replace(/[-\s]/g, ''); // Remove dashes and spaces
  const finalNumber = sanitizedNumber.startsWith('+') ? sanitizedNumber : `+${sanitizedNumber}`;

  try {
    const exists = await client.isRegisteredUser(finalNumber);
    if (exists) {
      await client.sendMessage(`${finalNumber}@c.us`, message);
      console.log(`✅ Message sent to ${finalNumber}`);
    } else {
      throw new Error(`Phone number ${finalNumber} is not registered on WhatsApp.`);
    }
  } catch (error) {
    console.error(`❌ Failed to send message to ${finalNumber}:`, error);
    throw error;
  }
}