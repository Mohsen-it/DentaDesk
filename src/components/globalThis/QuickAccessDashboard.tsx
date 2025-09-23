import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KeyboardShortcut, ShortcutTooltip } from '@/components/ui/KeyboardShortcut'
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  Plus,
  Eye,
  RefreshCw,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { QuickAccessService } from '@/services/quickAccessService'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { Patient, Appointment, Payment, ToothTreatment } from '@/types'

interface QuickAccessDashboardProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

export default function QuickAccessDashboard({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: QuickAccessDashboardProps) {

  const {
    quickAccessData,
    isLoadingQuickAccess,
    loadQuickAccessData,
    refreshQuickAccessData
  } = useGlobalStore()

  useEffect(() => {
    loadQuickAccessData()
  }, [loadQuickAccessData])

  // Handle refresh - optimized with useCallback
  const handleRefresh = useCallback(async () => {
    await refreshQuickAccessData()
  }, [refreshQuickAccessData])

  // Memoized navigation handlers for performance
  const handleNavigateToPatients = useCallback(() => {
    console.log('👥 Navigate to Patients clicked!')
    onNavigateToPatients?.()
  }, [onNavigateToPatients])

  const handleNavigateToAppointments = useCallback(() => {
    console.log('📅 Navigate to Appointments clicked!')
    onNavigateToAppointments?.()
  }, [onNavigateToAppointments])

  const handleNavigateToPayments = useCallback(() => {
    console.log('💰 Navigate to Payments clicked!')
    onNavigateToPayments?.()
  }, [onNavigateToPayments])

  const handleNavigateToTreatments = useCallback(() => {
    onNavigateToTreatments?.()
  }, [onNavigateToTreatments])

  // Format currency - now using centralized currency management
  const { formatAmount } = useCurrency()

  // Memoized format functions for performance
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG')
  }, [])

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  if (isLoadingQuickAccess) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 md:p-5 lg:p-6">
              <div className="h-16 md:h-20 lg:h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!quickAccessData) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4 md:p-5 lg:p-6">
          <div className="text-center py-8 md:py-12 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-4 opacity-50" />
            <p className="text-sm md:text-base font-tajawal mb-4">فشل في تحميل بيانات الوصول السريع</p>
            <Button variant="outline" size="sm" className="mt-2 hover:bg-destructive/10 hover:text-destructive transition-all duration-200" onClick={handleRefresh} aria-label="إعادة تحميل البيانات">
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 md:space-y-5 lg:space-y-6 animate-fade-in" dir="rtl">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
        {/* Total Patients */}
        <Card className="hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 cursor-pointer bg-card border-border" onClick={onNavigateToPatients} role="button" tabIndex={0} aria-label={`عرض مرضى جدد اليوم: ${quickAccessData.quickStats.totalPatients} مريض`}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground font-tajawal">مرضى جدد اليوم</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mt-1">{quickAccessData.quickStats.totalPatients}</p>
              </div>
              <div className="p-2 md:p-3 bg-primary/10 dark:bg-primary/20 rounded-lg ml-3 md:ml-4">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today Appointments */}
        <Card className="hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 cursor-pointer bg-card border-border" onClick={onNavigateToAppointments} role="button" tabIndex={0} aria-label={`عرض مواعيد اليوم: ${quickAccessData.quickStats.todayAppointments} موعد`}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground font-tajawal">مواعيد اليوم</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mt-1">{quickAccessData.quickStats.todayAppointments}</p>
              </div>
              <div className="p-2 md:p-3 bg-medical/10 dark:bg-medical/20 rounded-lg ml-3 md:ml-4">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-medical" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 cursor-pointer bg-card border-border" onClick={onNavigateToPayments} role="button" tabIndex={0} aria-label={`عرض دفعات اليوم: ${quickAccessData.quickStats.pendingPayments} دفعة`}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground font-tajawal">دفعات اليوم</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mt-1">{quickAccessData.quickStats.pendingPayments}</p>
              </div>
              <div className="p-2 md:p-3 bg-accent/10 dark:bg-accent/20 rounded-lg ml-3 md:ml-4">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Urgent Alerts */}
        <Card className="hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 bg-card border-border" role="region" aria-label={`تنبيهات اليوم: ${quickAccessData.quickStats.urgentAlerts} تنبيه`}>
          <CardContent className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground font-tajawal">تنبيهات اليوم</p>
                <p className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mt-1">{quickAccessData.quickStats.urgentAlerts}</p>
                {quickAccessData.quickStats.urgentAlerts > 0 && (
                  <div className="absolute inset-0 bg-destructive/5 dark:bg-destructive/10 animate-pulse rounded-lg pointer-events-none" aria-hidden="true" />
                )}
              </div>
              <div className="p-2 md:p-3 bg-destructive/10 dark:bg-destructive/20 rounded-lg ml-3 md:ml-4">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - moved here from Analytics */}
      <Card className="bg-card border-border hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
        <CardHeader className="p-4 md:p-5 lg:p-6">
          <CardTitle className="flex items-center gap-2 font-tajawal text-lg md:text-xl lg:text-2xl">
            <Plus className="w-5 h-5 md:w-6 md:h-6" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button onClick={onNavigateToPatients} className="h-12 justify-start transition-all duration-200" aria-label="الانتقال إلى إدارة المرضى">
              <Users className="w-4 h-4 mr-2" />
              إدارة المرضى
            </Button>
            <Button onClick={onNavigateToAppointments} variant="outline" className="h-12 justify-start transition-all duration-200" aria-label="الانتقال إلى إدارة المواعيد">
              <Calendar className="w-4 h-4 mr-2" />
              إدارة المواعيد
            </Button>
            <Button onClick={onNavigateToPayments} variant="outline" className="h-12 justify-start transition-all duration-200" aria-label="الانتقال إلى إدارة المدفوعات">
              <DollarSign className="w-4 h-4 mr-2" />
              إدارة المدفوعات
            </Button>
            <Button onClick={onNavigateToTreatments} variant="outline" className="h-12 justify-start transition-all duration-200" aria-label="الانتقال إلى إدارة العلاجات">
              <Activity className="w-4 h-4 mr-2" />
              إدارة العلاجات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {/* <Card >
        <CardHeader className='dark:bg-slate-900'> 
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ShortcutTooltip shortcut="A" description="إضافة مريض جديد">
              <Button
                onClick={() => {
                  console.log('🏥 Add Patient button clicked!')
                  onAddPatient?.()
                }}
                className="h-12 justify-between hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  إضافة مريض جديد
                </div>
                <KeyboardShortcut shortcut="A" size="sm" />
              </Button>
            </ShortcutTooltip>

            <ShortcutTooltip shortcut="S" description="حجز موعد جديد">
              <Button
                onClick={() => {
                  console.log('📅 Add Appointment button clicked!')
                  onAddAppointment?.()
                }}
                variant="outline"
                className="h-12 justify-between hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  حجز موعد جديد
                </div>
                <KeyboardShortcut shortcut="S" size="sm" />
              </Button>
            </ShortcutTooltip>

            <ShortcutTooltip shortcut="D" description="تسجيل دفعة جديدة">
              <Button
                onClick={() => {
                  console.log('💰 Add Payment button clicked!')
                  onAddPayment?.()
                }}
                variant="outline"
                className="h-12 justify-between hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  تسجيل دفعة جديدة
                </div>
                <KeyboardShortcut shortcut="D" size="sm" />
              </Button>
            </ShortcutTooltip>
          </div>
        </CardContent>
      </Card> */}

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
        {/* Recent Patients */}
        <Card className="bg-card border-border hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
          <CardHeader className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-tajawal text-lg md:text-xl lg:text-2xl">
                <Users className="w-5 h-5 md:w-6 md:h-6" />
                المرضى الأخيرون
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigateToPatients}
                className="hover:bg-primary/10 hover:text-primary transition-all duration-200 text-sm md:text-base"
                aria-label="عرض جميع المرضى"
              >
                <Eye className="w-4 h-4 mr-1 md:mr-2" />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.recentPatients.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Users className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base font-tajawal">لا توجد مرضى حديثون</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.recentPatients.map((patient: Patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm md:text-base font-tajawal">{patient.full_name}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          #{patient.serial_number} | {patient.age} سنة
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-1 border-primary/20 text-primary">
                        {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-primary/10" aria-label={`عرض تفاصيل المريض ${patient.full_name}`}>
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="bg-card border-border hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
          <CardHeader className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-tajawal text-lg md:text-xl lg:text-2xl">
                <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                مواعيد اليوم
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigateToAppointments}
                className="hover:bg-medical/10 hover:text-medical transition-all duration-200 text-sm md:text-base"
                aria-label="عرض جميع مواعيد اليوم"
              >
                <Eye className="w-4 h-4 mr-1 md:mr-2" />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.todayAppointments.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base font-tajawal">لا توجد مواعيد اليوم</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.todayAppointments.slice(0, 5).map((appointment: Appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-medical/10 dark:bg-medical/20 rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 md:w-5 md:h-5 text-medical" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm md:text-base font-tajawal">{appointment.title}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {appointment.patient?.full_name || 'مريض غير محدد'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-1 border-medical/20 text-medical">
                        {formatTime(appointment.start_time)}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-medical/10" aria-label={`عرض تفاصيل الموعد ${appointment.title}`}>
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
        {/* Pending Payments */}
        <Card className="bg-card border-border hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
          <CardHeader className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-tajawal text-lg md:text-xl lg:text-2xl">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6" />
                الدفعات الآجلة
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigateToPayments}
                className="hover:bg-accent/10 hover:text-accent transition-all duration-200 text-sm md:text-base"
                aria-label="عرض جميع الدفعات الآجلة"
              >
                <Eye className="w-4 h-4 mr-1 md:mr-2" />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.pendingPayments.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <DollarSign className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base font-tajawal">لا توجد دفعات آجلة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.pendingPayments.slice(0, 5).map((payment: Payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-accent/10 dark:bg-accent/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm md:text-base font-tajawal">
                          {payment.patient?.full_name || 'مريض غير محدد'}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs px-2 py-1 bg-destructive/10 text-destructive border-destructive/20">
                        {formatAmount(
                          payment.total_amount_due ||
                          payment.remaining_balance ||
                          payment.amount ||
                          0
                        )}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-destructive/10" aria-label={`عرض تفاصيل الدفعة للمريض ${payment.patient?.full_name || 'غير محدد'}`}>
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgent Treatments */}
        <Card className="bg-card border-border hover:shadow-lg dark:hover:shadow-xl transition-all duration-200">
          <CardHeader className="p-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-tajawal text-lg md:text-xl lg:text-2xl">
                <Activity className="w-5 h-5 md:w-6 md:h-6" />
                العلاجات العاجلة
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleNavigateToTreatments} className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200 text-sm md:text-base" aria-label="عرض جميع العلاجات العاجلة">
                <Eye className="w-4 h-4 mr-1 md:mr-2" />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.urgentTreatments.length === 0 ? (
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Activity className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-4 opacity-50" />
                <p className="text-sm md:text-base font-tajawal">لا توجد علاجات عاجلة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.urgentTreatments.slice(0, 5).map((treatment: ToothTreatment) => (
                  <div key={treatment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-destructive/10 dark:bg-destructive/20 rounded-full flex items-center justify-center">
                        <Activity className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm md:text-base font-tajawal">
                          {treatment.treatment_type} - السن {treatment.tooth_number}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {treatment.patient?.full_name || 'مريض غير محدد'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-1 border-destructive/20 text-destructive">
                        {treatment.treatment_status === 'planned' ? 'مخطط' : 'قيد التنفيذ'}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 md:h-7 md:w-7 p-0 hover:bg-destructive/10" aria-label={`عرض تفاصيل العلاج ${treatment.treatment_type} للسن ${treatment.tooth_number}`}>
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
