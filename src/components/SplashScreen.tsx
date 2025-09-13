import React, { useState, useEffect } from 'react'
import { useStableClinicName, useStableClinicLogo } from '../hooks/useStableSettings'
import { useTheme } from '../contexts/ThemeContext'
import { Button } from './ui/button'

interface SplashScreenProps {
  onComplete: () => void
  duration?: number // in milliseconds, default 3000
}

export function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const clinicName = useStableClinicName()
  const clinicLogo = useStableClinicLogo()
  const { isDarkMode } = useTheme()
  const [isVisible, setIsVisible] = useState(true)
  const [isFading, setIsFading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Handle completion with fade out
  const handleComplete = () => {
    setIsFading(true)
    setTimeout(() => {
      setIsVisible(false)
      onComplete()
    }, 500) // Fade out duration
  }

  // Auto-complete after duration and update progress
  useEffect(() => {
    const startTime = Date.now()
    const endTime = startTime + duration

    const updateProgress = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      setProgress(newProgress)

      if (now >= endTime) {
        handleComplete()
      }
    }

    const interval = setInterval(updateProgress, 50) // Update every 50ms for smooth animation
    updateProgress() // Initial call

    return () => clearInterval(interval)
  }, [duration])

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === ' ') {
        event.preventDefault()
        handleComplete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-all duration-500 ${
        isFading ? 'opacity-0' : 'opacity-100'
      } rtl-layout`}
      dir="rtl"
    >
      {/* Background with gradient */}
      <div className={`absolute inset-0 ${
        isDarkMode
          ? 'bg-gradient-to-br from-primary/10 via-background to-secondary/10'
          : 'bg-gradient-to-br from-primary/5 via-background to-secondary/5'
      }`} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-md mx-auto px-6">
        {/* Clinic Logo */}
        {clinicLogo && (
          <div className="mb-8 animate-pulse">
            <img
              src={clinicLogo}
              alt="شعار العيادة"
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-primary/20 shadow-2xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Clinic Name */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-['Tajawal'] tracking-wide">
          {clinicName}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-muted-foreground mb-8 font-['Tajawal']">
          مرحباً بكم في نظام إدارة العيادة
        </p>

        {/* Loading Indicator */}
        <div className="mb-8">
          <div className="flex space-x-2 rtl:space-x-reverse">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
          </div>
        </div>

        {/* Skip Button */}
        <Button
          onClick={handleComplete}
          variant="outline"
          size="sm"
          className="text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          تخطي
        </Button>

        {/* Hint Text */}
        <p className="text-xs text-muted-foreground mt-4 font-['Tajawal']">
          اضغط على ESC أو Space للتخطي
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-48 md:w-64">
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default SplashScreen