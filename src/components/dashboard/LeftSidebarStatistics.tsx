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
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      trend: '+2 هذا الأسبوع'
    },
    {
      title: 'المدفوعات المعلقة',
      value: formatAmount(pendingAmount),
      icon: DollarSign,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      trend: 'يحتاج متابعة'
    },
    {
      title: 'التنبيهات العاجلة',
      value: urgentAlerts,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900',
      trend: urgentAlerts > 0 ? 'يتطلب اهتمام' : 'كل شيء على ما يرام'
    }
  ], [patients.length, pendingAmount, urgentAlerts, formatAmount])

  return (
    <div className="h-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6" role="region" aria-label="إحصائيات العيادة">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            إحصائيات سريعة
          </h2>
          <p className="text-sm text-slate-800 dark:text-slate-200">
            نظرة عامة على العيادة
          </p>
        </div>

        <div className="space-y-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="relative overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-lg hover:shadow-xl dark:hover:shadow-xl transition-all duration-300 rtl" role="article" aria-label={`إحصائية ${stat.title}`} data-testid="stat-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4 rtl:flex-row-reverse">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`} aria-hidden="true">
                      <Icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                    <Badge variant="secondary" className="text-xs rtl:flex-row-reverse" aria-label={`اتجاه: ${stat.trend}`}>
                      <TrendingUp className="w-3 h-3 ml-1 rtl:mr-1 rtl:ml-0" aria-hidden="true" />
                      {stat.trend}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {stat.title}
                    </p>
                    <p className={`text-3xl font-bold ${stat.color}`} aria-live="polite">
                      {stat.value}
                    </p>
                  </div>

                  {/* Animated background effect for urgent alerts */}
                  {stat.title === 'التنبيهات العاجلة' && urgentAlerts > 0 && (
                    <div className="absolute inset-0 bg-red-500/10 dark:bg-red-500/10 animate-pulse rounded-lg pointer-events-none" aria-hidden="true" data-testid="urgent-alerts" />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Additional quick stats */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-lg backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <div className="text-sm text-slate-800 dark:text-slate-200">
                مواعيد اليوم
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {todayAppointments}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

export default LeftSidebarStatistics