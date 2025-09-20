/**
 * نظام تسجيل محسن للتطبيق
 * يدعم مستويات مختلفة من التسجيل مع إمكانية التحكم في الإنتاج
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private level: LogLevel
  private isDev: boolean

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development' || 
                 (typeof window !== 'undefined' && window.location?.hostname === 'localhost')
    
    // في الإنتاج، تسجيل الأخطاء فقط
    // في التطوير، تسجيل كل شيء
    this.level = this.isDev ? LogLevel.DEBUG : LogLevel.ERROR
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level}]`
    
    if (args.length > 0) {
      return `${prefix} ${message} ${args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')}`
    }
    
    return `${prefix} ${message}`
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, ...args))
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, ...args))
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, ...args))
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, ...args))
    }
  }

  // تسجيل معلومات النظام (مهم للتشخيص)
  system(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔧 [SYSTEM] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الأمان (مهم للمراقبة)
  security(message: string, ...args: any[]): void {
    console.warn(`🔐 [SECURITY] ${message}`, ...args)
  }

  // تسجيل معلومات الأداء
  performance(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`⚡ [PERF] ${message}`, ...args)
    }
  }

  // تسجيل معلومات المستخدم (بدون معلومات حساسة)
  user(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`👤 [USER] ${message}`, ...args)
    }
  }

  // تسجيل معلومات قاعدة البيانات
  database(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🗄️ [DB] ${message}`, ...args)
    }
  }

  // تسجيل معلومات API
  api(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🌐 [API] ${message}`, ...args)
    }
  }

  // تسجيل معلومات WhatsApp
  whatsapp(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`📱 [WHATSAPP] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الترخيص
  license(message: string, ...args: any[]): void {
    console.warn(`🔑 [LICENSE] ${message}`, ...args)
  }

  // تسجيل معلومات المصادقة
  auth(message: string, ...args: any[]): void {
    console.warn(`🔐 [AUTH] ${message}`, ...args)
  }

  // تسجيل معلومات الدفع
  payment(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`💳 [PAYMENT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات المواعيد
  appointment(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`📅 [APPOINTMENT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات المرضى
  patient(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`👥 [PATIENT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات العلاج
  treatment(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🦷 [TREATMENT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات المختبر
  lab(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🧪 [LAB] ${message}`, ...args)
    }
  }

  // تسجيل معلومات المخزون
  inventory(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`📦 [INVENTORY] ${message}`, ...args)
    }
  }

  // تسجيل معلومات التقارير
  report(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`📊 [REPORT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الإعدادات
  settings(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`⚙️ [SETTINGS] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الواجهة
  ui(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🖥️ [UI] ${message}`, ...args)
    }
  }

  // تسجيل معلومات البحث
  search(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔍 [SEARCH] ${message}`, ...args)
    }
  }

  // تسجيل معلومات التصدير
  export(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`📤 [EXPORT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الاستيراد
  import(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`📥 [IMPORT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات النسخ الاحتياطي
  backup(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`💾 [BACKUP] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الاستعادة
  restore(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔄 [RESTORE] ${message}`, ...args)
    }
  }

  // تسجيل معلومات التحديث
  update(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔄 [UPDATE] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الحذف
  delete(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🗑️ [DELETE] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الإنشاء
  create(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`➕ [CREATE] ${message}`, ...args)
    }
  }

  // تسجيل معلومات التعديل
  edit(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`✏️ [EDIT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات العرض
  view(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`👁️ [VIEW] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الطباعة
  print(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🖨️ [PRINT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الإشعارات
  notification(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔔 [NOTIFICATION] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الأخطاء الحرجة
  critical(message: string, ...args: any[]): void {
    console.error(`🚨 [CRITICAL] ${message}`, ...args)
  }

  // تسجيل معلومات التحذيرات المهمة
  warning(message: string, ...args: any[]): void {
    console.warn(`⚠️ [WARNING] ${message}`, ...args)
  }

  // تسجيل معلومات النجاح
  success(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`✅ [SUCCESS] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الفشل
  failure(message: string, ...args: any[]): void {
    console.error(`❌ [FAILURE] ${message}`, ...args)
  }

  // تسجيل معلومات التحميل
  loading(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`⏳ [LOADING] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الإكمال
  complete(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`✅ [COMPLETE] ${message}`, ...args)
    }
  }

  // تسجيل معلومات البدء
  start(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🚀 [START] ${message}`, ...args)
    }
  }

  // تسجيل معلومات التوقف
  stop(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🛑 [STOP] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الإعادة المحاولة
  retry(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔄 [RETRY] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الإلغاء
  cancel(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`❌ [CANCEL] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الإلغاء
  skip(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`⏭️ [SKIP] ${message}`, ...args)
    }
  }

  // تسجيل معلومات التخطي
  ignore(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🙈 [IGNORE] ${message}`, ...args)
    }
  }

  // تسجيل معلومات التخطي
  bypass(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🚧 [BYPASS] ${message}`, ...args)
    }
  }

  // تسجيل معلومات التجاوز
  override(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔄 [OVERRIDE] ${message}`, ...args)
    }
  }

  // تسجيل معلومات التجاوز
  fallback(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔄 [FALLBACK] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الاحتياطي
  alternative(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔄 [ALTERNATIVE] ${message}`, ...args)
    }
  }

  // تسجيل معلومات البديل
  default(message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🔄 [DEFAULT] ${message}`, ...args)
    }
  }

  // تسجيل معلومات الافتراضي
  custom(category: string, message: string, ...args: any[]): void {
    if (this.isDev) {
      console.log(`🏷️ [${category.toUpperCase()}] ${message}`, ...args)
    }
  }

  // تسجيل معلومات مخصصة
  group(name: string, callback: () => void): void {
    if (this.isDev) {
      console.group(name)
      callback()
      console.groupEnd()
    }
  }

  // تسجيل معلومات المجموعة
  time(label: string): void {
    if (this.isDev) {
      console.time(label)
    }
  }

  // تسجيل معلومات الوقت
  timeEnd(label: string): void {
    if (this.isDev) {
      console.timeEnd(label)
    }
  }

  // تسجيل معلومات نهاية الوقت
  table(data: any): void {
    if (this.isDev) {
      console.table(data)
    }
  }

  // تسجيل معلومات الجدول
  trace(message: string): void {
    if (this.isDev) {
      console.trace(message)
    }
  }

  // تسجيل معلومات التتبع
  count(label: string): void {
    if (this.isDev) {
      console.count(label)
    }
  }

  // تسجيل معلومات العداد
  countReset(label: string): void {
    if (this.isDev) {
      console.countReset(label)
    }
  }

  // تسجيل معلومات إعادة تعيين العداد
  clear(): void {
    if (this.isDev) {
      console.clear()
    }
  }

  // تسجيل معلومات المسح
  assert(condition: boolean, message: string): void {
    if (this.isDev) {
      console.assert(condition, message)
    }
  }

  // تسجيل معلومات التأكيد
  dir(obj: any): void {
    if (this.isDev) {
      console.dir(obj)
    }
  }

  // تسجيل معلومات الكائن
  dirxml(obj: any): void {
    if (this.isDev) {
      console.dirxml(obj)
    }
  }

  // تسجيل معلومات XML
  profile(label: string): void {
    if (this.isDev) {
      console.profile(label)
    }
  }

  // تسجيل معلومات الملف الشخصي
  profileEnd(label: string): void {
    if (this.isDev) {
      console.profileEnd(label)
    }
  }

  // تسجيل معلومات نهاية الملف الشخصي
  markTimeline(label: string): void {
    if (this.isDev) {
      console.markTimeline(label)
    }
  }

  // تسجيل معلومات علامة الجدول الزمني
  timeline(label: string): void {
    if (this.isDev) {
      console.timeline(label)
    }
  }

  // تسجيل معلومات الجدول الزمني
  timelineEnd(label: string): void {
    if (this.isDev) {
      console.timelineEnd(label)
    }
  }

  // تسجيل معلومات نهاية الجدول الزمني
  groupCollapsed(name: string): void {
    if (this.isDev) {
      console.groupCollapsed(name)
    }
  }

  // تسجيل معلومات المجموعة المطوية
  groupEnd(): void {
    if (this.isDev) {
      console.groupEnd()
    }
  }

  // تسجيل معلومات نهاية المجموعة
  memory(): void {
    if (this.isDev) {
      console.memory()
    }
  }

  // تسجيل معلومات الذاكرة
  getLevel(): LogLevel {
    return this.level
  }

  // الحصول على مستوى التسجيل
  setLevel(level: LogLevel): void {
    this.level = level
  }

  // تعيين مستوى التسجيل
  isDevelopment(): boolean {
    return this.isDev
  }

  // التحقق من وضع التطوير
  isProduction(): boolean {
    return !this.isDev
  }

  // التحقق من وضع الإنتاج
}

// إنشاء instance واحد للاستخدام في التطبيق
const logger = new Logger()

export default logger

// تصدير Logger class للاستخدام المتقدم
export { Logger }
