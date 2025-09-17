import React, { useState, useCallback, useMemo, memo, lazy, Suspense, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Zap
} from 'lucide-react'

// Lazy load heavy components
const QuickAccessDashboard = lazy(() => import('@/components/globalThis/QuickAccessDashboard'))
const SmartAlerts = lazy(() => import('@/components/globalThis/SmartAlerts'))
const DashboardAnalytics = lazy(() => import('@/components/dashboard/DashboardAnalytics'))

interface DynamicTabsCarouselProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

const DynamicTabsCarousel = memo(function DynamicTabsCarousel({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: DynamicTabsCarouselProps) {
  const [activeTab, setActiveTab] = useState('today')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Refs for logging
  const containerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  const tabs = useMemo(() => [
    {
      id: 'today',
      title: 'اليوم',
      icon: Calendar,
      color: 'text-primary dark:text-primary-foreground',
      bgColor: 'bg-primary/10 dark:bg-primary/20'
    },
    {
      id: 'statistics',
      title: 'إحصائيات',
      icon: BarChart3,
      color: 'text-accent dark:text-accent-foreground',
      bgColor: 'bg-accent/10 dark:bg-accent/20'
    },
    {
      id: 'alerts',
      title: 'تنبيهات',
      icon: Bell,
      color: 'text-destructive dark:text-destructive-foreground',
      bgColor: 'bg-destructive/10 dark:bg-destructive/20'
    }
  ], [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null) // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientX)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }, [])

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      // Swiped left - go to next tab
      navigateTab('next')
    } else if (isRightSwipe) {
      // Swiped right - go to previous tab
      navigateTab('prev')
    }
  }, [touchStart, touchEnd])

  // Diagnostic logging for layout dimensions, spacing, and responsive behavior
  useEffect(() => {
    const logDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        console.log('[DynamicTabsCarousel] Container dimensions:', {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          activeTab,
          isTransitioning
        })
      }

      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect()
        const style = window.getComputedStyle(headerRef.current)
        console.log('[DynamicTabsCarousel] Header dimensions and spacing:', {
          width: rect.width,
          height: rect.height,
          paddingTop: style.paddingTop,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
          gap: style.gap,
          activeTab
        })
      }

      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect()
        console.log('[DynamicTabsCarousel] Content area dimensions:', {
          width: rect.width,
          height: rect.height,
          activeTab,
          isTransitioning
        })
      }
    }

    // Log on mount and when activeTab or isTransitioning changes
    logDimensions()

    // Add resize listener for responsive behavior
    const handleResize = () => {
      console.log('[DynamicTabsCarousel] Window resize detected')
      logDimensions()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [activeTab, isTransitioning])

  const handleTabChange = useCallback((tabId: string) => {
    if (isTransitioning) return

    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTab(tabId)
      setIsTransitioning(false)
    }, 150)
  }, [isTransitioning])

  const navigateTab = useCallback((direction: 'prev' | 'next') => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
    let newIndex

    if (direction === 'next') {
      newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1
    } else {
      newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
    }

    handleTabChange(tabs[newIndex].id)
  }, [tabs, activeTab, handleTabChange])

  const activeTabData = useMemo(() => tabs.find(tab => tab.id === activeTab), [tabs, activeTab])

  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return (
          <div className={`h-full transition-all duration-300 ${isTransitioning ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <QuickAccessDashboard
                onNavigateToPatients={onNavigateToPatients}
                onNavigateToAppointments={onNavigateToAppointments}
                onNavigateToPayments={onNavigateToPayments}
                onNavigateToTreatments={onNavigateToTreatments}
                onAddPatient={onAddPatient}
                onAddAppointment={onAddAppointment}
                onAddPayment={onAddPayment}
              />
            </Suspense>
          </div>
        )
      case 'statistics':
        return (
          <div className={`h-full transition-all duration-300 ${isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>}>
              <DashboardAnalytics />
            </Suspense>
          </div>
        )
      case 'alerts':
        return (
          <div className={`h-full transition-all duration-300 ${isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive"></div></div>}>
              <SmartAlerts
                maxVisible={25}
                showHeader={true}
                compact={false}
                showReadAlerts={true}
              />
            </Suspense>
          </div>
        )
      default:
        return null
    }
  }, [activeTab, isTransitioning, onNavigateToPatients, onNavigateToAppointments, onNavigateToPayments, onNavigateToTreatments, onAddPatient, onAddAppointment, onAddPayment])

  const renderStart = performance.now()

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-card rounded-xl shadow-xl dark:shadow-2xl overflow-hidden backdrop-blur-sm animate-fade-in"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Enhanced Tab Navigation Header */}
      <div ref={headerRef} className="bg-card p-4 md:p-5 lg:p-6 border-b border-border backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-3 md:gap-4">
            {activeTabData && (
              <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${activeTabData.bgColor} shadow-sm`}>
                <activeTabData.icon className={`w-5 h-5 md:w-6 md:h-6 ${activeTabData.color}`} />
              </div>
            )}
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-bold text-foreground font-tajawal">
                {activeTabData?.title}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {activeTab === 'today' && 'الأنشطة والمواعيد اليومية'}
                {activeTab === 'statistics' && 'تحليلات وإحصائيات شاملة'}
                {activeTab === 'alerts' && 'التنبيهات والإشعارات المهمة'}
              </p>
            </div>
          </div>

          {/* Enhanced Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTab('prev')}
              disabled={isTransitioning}
              className="bg-background hover:bg-accent border-border shadow-sm backdrop-blur-sm"
              aria-label="التبويب السابق"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTab('next')}
              disabled={isTransitioning}
              className="bg-background hover:bg-accent border-border shadow-sm backdrop-blur-sm"
              aria-label="التبويب التالي"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Enhanced Tab Indicators */}
        <div className="flex items-center justify-center gap-2 md:gap-3" role="tablist" aria-label="أشرطة التبويب">
          {tabs.map((tab, index) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                disabled={isTransitioning}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                aria-label={tab.title}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    navigateTab('prev')
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    navigateTab('next')
                  } else if (e.key === 'Home') {
                    e.preventDefault()
                    handleTabChange(tabs[0].id)
                  } else if (e.key === 'End') {
                    e.preventDefault()
                    handleTabChange(tabs[tabs.length - 1].id)
                  }
                }}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl transition-all duration-300 shadow-sm ${
                  isActive
                    ? `bg-background shadow-md dark:shadow-lg ${tab.color} font-semibold ring-2 ring-offset-2 ring-current ring-opacity-20`
                    : 'bg-muted hover:bg-accent text-foreground hover:shadow-md backdrop-blur-sm'
                }`}
              >
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? '' : 'text-muted-foreground'}`} aria-hidden="true" />
                <span className={`text-xs md:text-sm ${isActive ? 'text-foreground' : 'text-foreground'}`}>{tab.title}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-current rounded-full animate-pulse" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div ref={contentRef} className="flex-1 overflow-hidden relative" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {renderTabContent}

        {/* Loading overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-foreground">جاري التحميل...</span>
            </div>
          </div>
        )}
      </div>

      {(() => {
        const renderEnd = performance.now()
        console.log(`[DynamicTabsCarousel] Render performance: ${(renderEnd - renderStart).toFixed(2)}ms for tab ${activeTab}`)
        return null
      })()}
    </div>
  )
})

export default DynamicTabsCarousel