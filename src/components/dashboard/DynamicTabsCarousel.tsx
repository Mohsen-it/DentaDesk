import React, { useState, useCallback, useMemo, memo, lazy, Suspense } from 'react'
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

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  const tabs = useMemo(() => [
    {
      id: 'today',
      title: 'اليوم',
      icon: Calendar,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      id: 'statistics',
      title: 'إحصائيات',
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      id: 'alerts',
      title: 'تنبيهات',
      icon: Bell,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
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
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div></div>}>
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
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 dark:border-purple-400"></div></div>}>
              <DashboardAnalytics />
            </Suspense>
          </div>
        )
      case 'alerts':
        return (
          <div className={`h-full transition-all duration-300 ${isTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 dark:border-red-400"></div></div>}>
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

  return (
    <div
      className="h-full flex flex-col bg-slate-100 dark:bg-card rounded-xl shadow-xl dark:shadow-lg overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Tab Navigation Header */}
      <div className="bg-slate-100 dark:bg-card p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {activeTabData && (
              <div className={`p-3 rounded-xl ${activeTabData.bgColor}`}>
                <activeTabData.icon className={`w-6 h-6 ${activeTabData.color}`} />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                {activeTabData?.title}
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {activeTab === 'today' && 'الأنشطة والمواعيد اليومية'}
                {activeTab === 'statistics' && 'تحليلات وإحصائيات شاملة'}
                {activeTab === 'alerts' && 'التنبيهات والإشعارات المهمة'}
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTab('prev')}
              disabled={isTransitioning}
              className="bg-slate-100 dark:bg-card hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTab('next')}
              disabled={isTransitioning}
              className="bg-slate-100 dark:bg-card hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tab Indicators */}
        <div className="flex items-center justify-center gap-2" role="tablist" aria-label="أشرطة التبويب">
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  isActive
                    ? `bg-white dark:bg-slate-900 shadow-md dark:shadow-lg ${tab.color} font-semibold`
                    : 'bg-slate-100 dark:bg-card hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{tab.title}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-current rounded-full" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {renderTabContent}

        {/* Loading overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-700 dark:text-slate-300">جاري التحميل...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default DynamicTabsCarousel