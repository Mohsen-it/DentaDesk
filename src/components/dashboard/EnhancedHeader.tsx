import React, { useState, useCallback, memo, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Bell,
  RefreshCw,
  Settings,
  Stethoscope,
  Menu
} from 'lucide-react'
const GlobalSearch = lazy(() => import('@/components/globalThis/GlobalSearch'))
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName, useStableClinicLogo } from '@/hooks/useStableSettings'
import { useGlobalStore } from '@/store/globalStore'

interface EnhancedHeaderProps {
  onRefresh?: () => void
  onOpenSettings?: () => void
  onSearchResultSelect?: (result: any) => void
  onToggleMobileSidebar?: () => void
}

const EnhancedHeader = memo(function EnhancedHeader({
  onRefresh,
  onOpenSettings,
  onSearchResultSelect,
  onToggleMobileSidebar
}: EnhancedHeaderProps) {
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const { settings } = useSettingsStore()
  const { syncAllData, isGlobalLoading, unreadAlertsCount } = useGlobalStore()
  const clinicName = useStableClinicName()
  const clinicLogo = useStableClinicLogo()

  const handleRefresh = useCallback(async () => {
    await syncAllData()
    onRefresh?.()
  }, [syncAllData, onRefresh])

  return (
    <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-lg rtl" dir="rtl">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Right side - Actions (in RTL) */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 bg-slate-100 dark:bg-card hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            aria-label="فتح القائمة الجانبية"
          >
            <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="p-2 bg-slate-100 dark:bg-card hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            aria-label="فتح الإعدادات"
          >
            <Settings className="w-5 h-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
          </Button>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isGlobalLoading}
            className="p-2 bg-slate-100 dark:bg-card hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            aria-label={isGlobalLoading ? "جاري التحديث..." : "تحديث البيانات"}
          >
            <RefreshCw className={`w-5 h-5 text-slate-700 dark:text-slate-300 ${isGlobalLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 bg-slate-100 dark:bg-card hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            onClick={() => setShowGlobalSearch(false)} // Placeholder - could navigate to alerts
            aria-label={`التنبيهات ${unreadAlertsCount > 0 ? `(${unreadAlertsCount} جديد)` : ''}`}
          >
            <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
            {unreadAlertsCount > 0 && (
              <Badge className="absolute -top-1 -left-1 bg-red-500 dark:bg-card text-white dark:text-slate-200 text-xs h-5 w-5 flex items-center justify-center rounded-full p-0" aria-label={`${unreadAlertsCount} تنبيه جديد`}>
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-700 dark:text-slate-300 w-5 h-5 rtl:left-3 rtl:right-auto" aria-hidden="true" />
            <Input
              placeholder="البحث الشامل... (F)"
              className="pr-10 pl-4 py-2 bg-slate-50 dark:bg-card border-slate-200 dark:border-slate-700 rounded-lg shadow-sm dark:shadow-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-slate-700 focus:border-transparent rtl:pr-4 rtl:pl-10"
              readOnly
              onClick={() => setShowGlobalSearch(true)}
              aria-label="البحث الشامل"
              aria-describedby="search-shortcut"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setShowGlobalSearch(true)
                }
              }}
            />
            <span id="search-shortcut" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-card px-2 py-1 rounded rtl:right-3 rtl:left-auto" aria-hidden="true">
              F
            </span>
          </div>
        </div>

        {/* Left side - Logo and clinic name (in RTL) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-700 dark:text-slate-300">
                {clinicName}
              </h1>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                نظام إدارة العيادة السنية
              </p>
            </div>
            <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-xl flex items-center justify-center shadow-lg dark:shadow-xl border border-white/20 dark:border-slate-600/50 overflow-hidden transition-all duration-300 ease-in-out">
              {clinicLogo ? (
                <img
                  src={clinicLogo}
                  alt="شعار العيادة"
                  className="w-full h-full object-cover rounded-xl transition-opacity duration-300 ease-in-out"
                  onError={(e) => {
                    // Fallback to clinic name if logo fails to load
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center">
                        <span class="text-white dark:text-slate-100 text-xs font-bold text-center leading-tight px-1 transition-colors duration-300">
                          ${clinicName ? clinicName.slice(0, 3) : 'عيادة'}
                        </span>
                      </div>`;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white dark:text-slate-100 text-xs font-bold text-center leading-tight px-1 transition-colors duration-300">
                    {clinicName ? clinicName.slice(0, 3) : 'عيادة'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Search Overlay */}
      {showGlobalSearch && (
        <div className="fixed inset-0 bg-black/50 dark:bg-slate-900/50 z-50 flex items-start justify-center pt-24">
          <div className="w-full max-w-2xl mx-4">
            <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-slate-700"></div></div>}>
              <GlobalSearch
                onResultSelect={(result) => {
                  onSearchResultSelect?.(result)
                  setShowGlobalSearch(false)
                }}
                onClose={() => setShowGlobalSearch(false)}
                autoFocus={true}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Subtle gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
    </header>
  )
})

export default EnhancedHeader