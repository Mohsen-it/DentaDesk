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
    <Card className="fixed bottom-4 md:bottom-6 lg:bottom-8 left-1/2 transform -translate-x-1/2 z-50 shadow-xl dark:shadow-2xl border-0 bg-card backdrop-blur-xl rtl rounded-2xl" role="toolbar" aria-label="إجراءات سريعة">
      <div className="flex flex-col md:flex-row items-center gap-3 p-4 rtl-layout">
        {/* Enhanced Action buttons */}
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button
              key={index}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-4 py-3 md:px-6 md:py-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg shadow-md ${action.color} ${action.textColor} rtl:flex-row-reverse text-sm md:text-base min-h-[44px] md:min-h-[48px] active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              aria-label={`${action.label} (${action.shortcut})`}
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
              <span className="font-semibold">{action.label}</span>
              <span className="text-xs opacity-90 bg-black/25 dark:bg-white/25 px-2 py-1 rounded-lg font-mono" aria-hidden="true">
                {action.shortcut}
              </span>
            </Button>
          )
        })}

        {/* Enhanced Quick access indicator */}
        <div className="flex items-center gap-2 text-foreground ml-4 rtl:mr-4 rtl:ml-0 rtl:flex-row-reverse bg-muted/50 px-3 py-2 rounded-xl">
          <Zap className="w-4 h-4 rtl:order-2 text-primary" />
          <span className="text-sm font-semibold rtl:order-1">إجراءات سريعة</span>
        </div>
      </div>

      {/* Enhanced floating animation effect */}
      <div className="absolute -inset-2 bg-gradient-to-r from-primary/15 via-accent/15 to-muted/15 rounded-2xl blur-lg opacity-30 -z-10 animate-pulse" />
    </Card>
  )
})

export default FloatingQuickActions