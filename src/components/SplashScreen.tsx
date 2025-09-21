import React, { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'

interface SplashScreenProps {
  onComplete: () => void
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('جاري التحميل...')

  const steps = [
    { label: 'جاري تحميل الترخيص...', duration: 500 },
    { label: 'جاري التحقق من قاعدة البيانات...', duration: 800 },
    { label: 'جاري تحميل الإعدادات...', duration: 600 },
    { label: 'جاري تهيئة النظام...', duration: 400 },
    { label: 'جاري التحضير للاستخدام...', duration: 300 }
  ]

  useEffect(() => {
    let currentStepIndex = 0
    let startTime = Date.now()

    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const currentStepData = steps[currentStepIndex]

      if (elapsed >= currentStepData.duration) {
        // Move to next step
        currentStepIndex++
        startTime = Date.now()

        if (currentStepIndex >= steps.length) {
          // Complete loading
          setProgress(100)
          setCurrentStep('اكتمل التحميل!')
          setTimeout(() => {
            onComplete()
          }, 500)
          return
        }

        setCurrentStep(currentStepData.label)
        setProgress((currentStepIndex / steps.length) * 100)
      } else {
        // Update progress within current step
        const stepProgress = (elapsed / currentStepData.duration) * (100 / steps.length)
        setProgress((currentStepIndex / steps.length) * 100 + stepProgress)
      }

      requestAnimationFrame(updateProgress)
    }

    requestAnimationFrame(updateProgress)
  }, [onComplete])

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            🦷 DentaDesk
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            نظام إدارة العيادة السنية
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2 mb-3" />
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              {currentStep}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              {Math.round(progress)}% مكتمل
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-4 border border-slate-200/50 dark:border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            💡 نصائح سريعة:
          </h3>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <li>• استخدم F للبحث السريع</li>
            <li>• استخدم أرقام 1-8 للتنقل بين الأقسام</li>
            <li>• استخدم A لإضافة مريض جديد</li>
            <li>• استخدم S لإضافة موعد جديد</li>
          </ul>
        </div>

        {/* Version Info */}
        <div className="text-center mt-6 text-xs text-slate-500 dark:text-slate-500">
          <p>الإصدار 2.1.0</p>
          <p>© 2024 AgorraCode</p>
        </div>
      </div>
    </div>
  )
}

export default SplashScreen