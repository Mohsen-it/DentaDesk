import React, { memo, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'
import { usePatientStore } from '@/store/patientStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { useGlobalStore } from '@/store/globalStore'
import { useCurrency } from '@/contexts/CurrencyContext'

const LeftSidebarStatistics = memo(function LeftSidebarStatistics() {
  const { patients } = usePatientStore()
  const { payments, pendingAmount } = usePaymentStore()
  const { appointments } = useAppointmentStore()
  const { unreadAlertsCount } = useGlobalStore()
  const { formatAmount } = useCurrency()

  // Calculate urgent alerts (appointments today + pending payments)
  const { todayString, todayAppointments } = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayAppts = appointments.filter(apt =>
      apt.start_time.startsWith(todayStr) && apt.status === 'scheduled'
    ).length
    return { todayString: todayStr, todayAppointments: todayAppts }
  }, [appointments])

  const urgentAlerts = useMemo(() =>
    todayAppointments + (pendingAmount > 0 ? 1 : 0) + unreadAlertsCount,
    [todayAppointments, pendingAmount, unreadAlertsCount]
  )

  const stats = useMemo(() => [
    {
      title: 'إجمالي المرضى',
      value: patients.length,
      icon: Users,
      color: 'text-primary dark:text-primary-foreground',
      bgColor: 'bg-primary/10 dark:bg-primary/20',
      trend: '+2 هذا الأسبوع'
    },

    {
      title: 'التنبيهات العاجلة',
      value: urgentAlerts,
      icon: AlertTriangle,
      color: 'text-destructive dark:text-destructive-foreground',
      bgColor: 'bg-destructive/10 dark:bg-destructive/20',
      trend: urgentAlerts > 0 ? 'يتطلب اهتمام' : 'كل شيء على ما يرام'
    }
  ], [patients.length, pendingAmount, urgentAlerts, formatAmount])

  return (
    <div className="h-full p-4 md:p-5 lg:p-6 bg-sidebar animate-fade-in" role="region" aria-label="إحصائيات العيادة">
      <div className="space-y-5 md:space-y-6 lg:space-y-7">
        <div className="text-center space-y-2">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-sidebar-foreground mb-1 md:mb-2 font-tajawal">
            إحصائيات سريعة
          </h2>
          <p className="text-xs md:text-sm text-sidebar-foreground/70">
            نظرة عامة على العيادة
          </p>
        </div>

        <div className="space-y-3 md:space-y-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="relative overflow-hidden bg-card border-border shadow-md dark:shadow-lg hover:shadow-lg dark:hover:shadow-xl transition-all duration-300 rtl backdrop-blur-sm" role="article" aria-label={`إحصائية ${stat.title}`} data-testid="stat-card">
                <CardContent className="p-4 md:p-5 lg:p-6">
                  <div className="flex items-center justify-between mb-3 md:mb-4 rtl:flex-row-reverse">
                    <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${stat.bgColor} shadow-sm`} aria-hidden="true">
                      <Icon className={`w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 ${stat.color}`} />
                    </div>
                    <Badge variant="secondary" className="text-xs px-2 py-1 rtl:flex-row-reverse shadow-sm" aria-label={`اتجاه: ${stat.trend}`}>
                      <TrendingUp className="w-3 h-3 ml-1 rtl:mr-1 rtl:ml-0" aria-hidden="true" />
                      {stat.trend}
                    </Badge>
                  </div>

                  <div className="space-y-1 md:space-y-2">
                    <p className="text-xs md:text-sm font-medium text-foreground">
                      {stat.title}
                    </p>
                    <p className={`text-2xl md:text-3xl font-bold ${stat.color}`} aria-live="polite">
                      {stat.value}
                    </p>
                  </div>

                  {/* Enhanced animated background effect for urgent alerts */}
                  {stat.title === 'التنبيهات العاجلة' && urgentAlerts > 0 && (
                    <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 animate-pulse rounded-lg pointer-events-none" aria-hidden="true" data-testid="urgent-alerts" />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Enhanced additional quick stats */}
        <Card className="bg-card border-border shadow-md dark:shadow-lg backdrop-blur-sm hover:shadow-lg dark:hover:shadow-xl transition-all duration-300">
          <CardContent className="p-3 md:p-4">
            <div className="text-center space-y-1 md:space-y-2">
              <div className="text-xs md:text-sm text-foreground font-medium">
                مواعيد اليوم
              </div>
              <div className="text-xl md:text-2xl font-bold text-medical dark:text-medical-foreground">
                {todayAppointments}
              </div>
              <div className="text-xs text-muted-foreground">
                مواعيد مجدولة
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

export default LeftSidebarStatistics