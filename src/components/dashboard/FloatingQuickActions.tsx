import React, { memo, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  UserPlus,
  Calendar,
  CreditCard,
  Zap
} from 'lucide-react'

interface FloatingQuickActionsProps {
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

const FloatingQuickActions = memo(function FloatingQuickActions({
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: FloatingQuickActionsProps) {
  const actions = useMemo(() => [
    {
      label: 'إضافة مريض',
      icon: UserPlus,
      color: 'bg-blue-600 hover:bg-blue-700 focus:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 dark:focus:bg-blue-900',
      textColor: 'text-white',
      shortcut: 'A',
      onClick: onAddPatient
    },
    {
      label: 'حجز موعد',
      icon: Calendar,
      color: 'bg-blue-600 hover:bg-blue-700 focus:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 dark:focus:bg-blue-900',
      textColor: 'text-white',
      shortcut: 'S',
      onClick: onAddAppointment
    },
    {
      label: 'تسجيل دفعة',
      icon: CreditCard,
      color: 'bg-blue-600 hover:bg-blue-700 focus:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 dark:focus:bg-blue-900',
      textColor: 'text-white',
      shortcut: 'D',
      onClick: onAddPayment
    }
  ], [onAddPatient, onAddAppointment, onAddPayment])

  return (
    <Card className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 shadow-lg dark:shadow-lg border-0 bg-white dark:bg-slate-800 backdrop-blur-lg rtl md:bottom-8" role="toolbar" aria-label="إجراءات سريعة">
      <div className="flex flex-col md:flex-row items-center gap-2 p-3 rtl-layout">
        {/* Action buttons */}
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button
              key={index}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg dark:shadow-lg ${action.color} ${action.textColor} rtl:flex-row-reverse text-sm md:text-base min-h-[44px] md:min-h-[48px] active:scale-95`}
              aria-label={`${action.label} (${action.shortcut})`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{action.label}</span>
              <span className="text-xs opacity-75 bg-black/20 dark:bg-slate-900/20 px-2 py-1 rounded" aria-hidden="true">
                {action.shortcut}
              </span>
            </Button>
          )
        })}

        {/* Quick access indicator */}
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 ml-4 rtl:mr-4 rtl:ml-0 rtl:flex-row-reverse">
          <Zap className="w-4 h-4 rtl:order-2" />
          <span className="text-sm font-medium rtl:order-1">إجراءات سريعة</span>
        </div>
      </div>

      {/* Floating animation effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-green-500/20 to-purple-500/20 dark:from-slate-500/20 dark:via-slate-500/20 dark:to-slate-500/20 rounded-lg blur opacity-25 -z-10 animate-pulse" />
    </Card>
  )
})

export default FloatingQuickActions