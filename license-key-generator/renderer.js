// عناصر النموذج
const form = document.getElementById('licenseForm')
const deviceIdInput = document.getElementById('deviceId')
const licenseTypeSelect = document.getElementById('licenseType')
const regionSelect = document.getElementById('region')
const generateBtn = document.getElementById('generateBtn')

// عناصر النتيجة
const resultContainer = document.getElementById('resultContainer')
const licenseKeyDisplay = document.getElementById('licenseKeyDisplay')
const deviceIdDisplay = document.getElementById('deviceIdDisplay')
const licenseTypeDisplay = document.getElementById('licenseTypeDisplay')
const regionDisplay = document.getElementById('regionDisplay')
const generatedAtDisplay = document.getElementById('generatedAtDisplay')
const copyBtn = document.getElementById('copyBtn')

// عناصر الخطأ
const errorContainer = document.getElementById('errorContainer')
const errorMessage = document.getElementById('errorMessage')

// رسالة النسخ
const copyNotification = document.getElementById('copyNotification')

// أسماء أنواع التراخيص بالعربية
const licenseTypeNames = {
  'STANDARD': 'عادي',
  'PROFESSIONAL': 'احترافي',
  'PREMIUM': 'مميز',
  'ENTERPRISE': 'مؤسسي',
  'ULTIMATE': 'شامل'
}

// أسماء المناطق بالعربية
const regionNames = {
  'GLOBAL': 'عالمي',
  'SAUDI': 'السعودية',
  'UAE': 'الإمارات',
  'KUWAIT': 'الكويت',
  'QATAR': 'قطر',
  'BAHRAIN': 'البحرين',
  'OMAN': 'عمان',
  'GCC': 'دول الخليج',
  'MENA': 'الشرق الأوسط'
}

// معالجة إرسال النموذج
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  // إخفاء النتائج والأخطاء السابقة
  resultContainer.classList.add('hidden')
  errorContainer.classList.add('hidden')

  // الحصول على القيم
  const deviceId = deviceIdInput.value.trim()
  const licenseType = licenseTypeSelect.value
  const region = regionSelect.value

  // التحقق من معرف الجهاز
  if (!deviceId || deviceId.length !== 32) {
    showError('معرف الجهاز يجب أن يكون مكون من 32 حرف بالضبط!')
    return
  }

  if (!/^[a-fA-F0-9]{32}$/.test(deviceId)) {
    showError('معرف الجهاز يجب أن يحتوي على أرقام وحروف من a إلى f فقط!')
    return
  }

  // تعطيل الزر
  generateBtn.disabled = true
  generateBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    <span>جاري التوليد...</span>
  `

  try {
    // توليد المفتاح
    const result = await window.electronAPI.generateLicenseKey(deviceId, licenseType, region)

    if (result.success) {
      showResult(result.license)
    } else {
      showError(result.error || 'حدث خطأ في توليد المفتاح')
    }
  } catch (error) {
    showError('حدث خطأ غير متوقع: ' + error.message)
  } finally {
    // إعادة تفعيل الزر
    generateBtn.disabled = false
    generateBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
      <span>توليد مفتاح الترخيص</span>
    `
  }
})

// عرض النتيجة
function showResult(license) {
  // تعبئة البيانات
  licenseKeyDisplay.textContent = license.licenseKey
  deviceIdDisplay.textContent = license.deviceId.substring(0, 16) + '...'
  licenseTypeDisplay.textContent = licenseTypeNames[license.licenseType] || license.licenseType
  regionDisplay.textContent = regionNames[license.region] || license.region
  
  // تنسيق التاريخ
  const date = new Date(license.generatedAt)
  generatedAtDisplay.textContent = date.toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // إظهار النتيجة
  resultContainer.classList.remove('hidden')

  // التمرير إلى النتيجة
  setTimeout(() => {
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, 100)
}

// عرض الخطأ
function showError(message) {
  errorMessage.textContent = message
  errorContainer.classList.remove('hidden')

  // التمرير إلى الخطأ
  setTimeout(() => {
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, 100)
}

// نسخ المفتاح
copyBtn.addEventListener('click', async () => {
  const licenseKey = licenseKeyDisplay.textContent

  try {
    await window.electronAPI.copyToClipboard(licenseKey)
    showCopyNotification()
  } catch (error) {
    // محاولة استخدام clipboard API الخاص بالمتصفح
    try {
      await navigator.clipboard.writeText(licenseKey)
      showCopyNotification()
    } catch (err) {
      showError('فشل في نسخ المفتاح')
    }
  }
})

// إظهار رسالة النسخ
function showCopyNotification() {
  copyNotification.classList.remove('hidden')
  
  setTimeout(() => {
    copyNotification.classList.add('hidden')
  }, 2000)
}

// تنسيق معرف الجهاز أثناء الكتابة
deviceIdInput.addEventListener('input', (e) => {
  // السماح فقط بالأحرف والأرقام hex
  e.target.value = e.target.value.toLowerCase().replace(/[^a-f0-9]/g, '')
})

