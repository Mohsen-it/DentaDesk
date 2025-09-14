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


اريد نقل محتوى هذا الكود 
