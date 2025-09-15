import { Client, LocalAuth } from 'whatsapp-web.js';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const qrcode = require('qrcode-terminal');
import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

let client: Client;
let lastQr: string | null = null;
let isReady = false;

const sessionPath = app.getPath('userData') + '/whatsapp-session';

export async function initializeClient(): Promise<void> {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath,
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // <- this one doesn't work in Windows
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', (qr: string) => {
    console.log('QR Code received, scan it with your WhatsApp app:');
    qrcode.generate(qr, { small: true });
    lastQr = qr;
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send('whatsapp:qr', qr);
      }
    } catch (err) {
      console.warn('Failed to broadcast QR to renderer:', err);
    }
  });

  client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    isReady = true;
  });

  client.on('auth_failure', (msg: string) => {
    console.error('Authentication failed:', msg);
  });

  client.on('disconnected', (reason: string) => {
    console.log('Client was disconnected:', reason);
    isReady = false;
  });

  await client.initialize();
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
  try {
    if (client) {
      try {
        await client.logout();
      } catch (_) {}
      try {
        await client.destroy();
      } catch (_) {}
    }

    if (fs.existsSync(sessionPath)) {
      const rm = (target: string) => {
        if (fs.lstatSync(target).isDirectory()) {
          for (const entry of fs.readdirSync(target)) {
            rm(path.join(target, entry));
          }
          fs.rmdirSync(target);
        } else {
          fs.unlinkSync(target);
        }
      };
      rm(sessionPath);
    }

    lastQr = null;
    isReady = false;
    await initializeClient();
  } catch (error) {
    console.error('Failed to reset WhatsApp session:', error);
    throw error;
  }
}

export function getWhatsAppStatus() {
  return {
    isReady,
    hasQr: !!lastQr,
    qr: lastQr || undefined
  };
}