const { contextBridge, ipcRenderer } = require('electron')

// كشف واجهة برمجية آمنة للواجهة
contextBridge.exposeInMainWorld('electronAPI', {
  generateLicenseKey: (deviceId, licenseType, region) => 
    ipcRenderer.invoke('generate-license-key', { deviceId, licenseType, region }),
  
  copyToClipboard: (text) => 
    ipcRenderer.invoke('copy-to-clipboard', text)
})

