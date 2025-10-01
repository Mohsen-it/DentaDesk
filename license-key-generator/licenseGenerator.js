/**
 * Device-Bound License Generator
 * مولد مفاتيح الترخيص المرتبطة بالجهاز
 * نسخة مدمجة لتطبيق Electron
 */

const crypto = require('crypto')

class LicenseGenerator {
  constructor() {
    this.masterKey = 'DENTAL_CLINIC_MASTER_KEY_2025_SECURE_ENCRYPTION'
    this.algorithm = 'aes-256-cbc'
  }

  /**
   * إنشاء مفتاح خوارزمي مرتبط بالجهاز
   */
  generateAlgorithmicKey(deviceId, metadata = {}) {
    // إنشاء seed من معرف الجهاز والمفتاح الرئيسي
    const seed = deviceId + this.masterKey + (metadata.licenseType || 'STANDARD')

    // إنشاء hash أساسي
    const baseHash = crypto.createHash('sha256').update(seed).digest('hex')

    // تقسيم الـ hash إلى أجزاء (5 أحرف لكل جزء)
    const part1 = baseHash.substring(0, 5).toUpperCase()
    const part2 = baseHash.substring(8, 13).toUpperCase()
    const part3 = baseHash.substring(16, 21).toUpperCase()
    const part4 = baseHash.substring(24, 29).toUpperCase()

    // تنسيق المفتاح: XXXXX-XXXXX-XXXXX-XXXXX
    return `${part1}-${part2}-${part3}-${part4}`
  }

  /**
   * إنشاء مفتاح ترخيص لجهاز معين
   */
  generateForDevice(deviceId, metadata = {}) {
    try {
      // إنشاء مفتاح باستخدام خوارزمية رياضية
      const licenseKey = this.generateAlgorithmicKey(deviceId, metadata)

      return {
        licenseKey: licenseKey,
        deviceId: deviceId,
        metadata: {
          licenseType: metadata.licenseType || 'STANDARD',
          region: metadata.region || 'GLOBAL',
          isLifetime: true,
          maxDevices: 1,
          ...metadata
        },
        generatedAt: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error generating license:', error)
      throw error
    }
  }
}

/**
 * إنشاء مفتاح لمعرف جهاز محدد
 */
function generateKeyForSpecificDevice(deviceId, licenseType = 'STANDARD', region = 'GLOBAL') {
  try {
    const generator = new LicenseGenerator()
    
    const license = generator.generateForDevice(deviceId, {
      licenseType: licenseType,
      region: region,
      purpose: 'customer-specific',
      generatedBy: 'electron-app'
    })

    return license

  } catch (error) {
    console.error('❌ خطأ في إنشاء المفتاح:', error.message)
    throw error
  }
}

/**
 * التحقق من صحة معرف الجهاز
 */
function validateDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== 'string') {
    return false
  }

  // يجب أن يكون 32 حرف hex
  const regex = /^[a-f0-9]{32}$/i
  return regex.test(deviceId)
}

module.exports = {
  LicenseGenerator,
  generateKeyForSpecificDevice,
  validateDeviceId
}

