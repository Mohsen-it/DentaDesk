/**
 * Dashboard Page - جميع المخططات تستخدم التقويم الميلادي فقط
 * All charts use ONLY Gregorian calendar system
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useExpensesStore } from '@/store/expensesStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName } from '@/hooks/useStableSettings'
import { useInventoryStore } from '@/store/inventoryStore'
import { formatCurrency, formatDate, formatTime, getChartColors, getChartConfig, getChartColorsWithFallback, formatChartValue, parseAndFormatGregorianMonth } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'
import { validateNumericData, validateDateData, transformToChartData, groupDataByPeriod, processFinancialData } from '@/lib/chartDataHelpers'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useTheme } from '@/contexts/ThemeContext'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import { useRealTimeDashboard } from '@/hooks/useRealTimeReports'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Plus,
  Eye,
  Package,
  Minus
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface DashboardStats {
  totalPatients: number
  totalAppointments: number
  totalRevenue: number
  pendingPayments: number
  todayAppointments: number
  thisMonthRevenue: number
  lowStockItems: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
}

interface DashboardProps {
  onAddPatient?: () => void
  onAddAppointment?: () => void
}

const Dashboard = React.memo(function Dashboard({ onAddPatient, onAddAppointment }: DashboardProps) {
  const { patients, loadPatients } = usePatientStore()
  const { appointments, getAppointmentsForDate, loadAppointments } = useAppointmentStore()
  const { payments, totalRevenue, pendingAmount, monthlyRevenue, loadPayments } = usePaymentStore()
  const { expenses, analytics: expensesAnalytics, loadExpenses } = useExpensesStore()
  const { settings, currency } = useSettingsStore()
  const { formatAmount } = useCurrency()
  const clinicName = useStableClinicName()
  const {
    items: inventoryItems,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    loadItems: loadInventoryItems
  } = useInventoryStore()
  const { isDarkMode } = useTheme()

  // Enable real-time synchronization for automatic updates
  useRealTimeSync()
  useRealTimeDashboard()

  // Time filtering for patients, appointments, and payments
  const patientStats = useTimeFilteredStats({
    data: patients,
    dateField: 'created_at',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  const appointmentStats = useTimeFilteredStats({
    data: appointments,
    dateField: 'start_time',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  const paymentStats = useTimeFilteredStats({
    data: payments,
    dateField: 'payment_date',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    todayAppointments: 0,
    thisMonthRevenue: 0,
    lowStockItems: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0
  })

  useEffect(() => {
    // Load all required data when component mounts
    const loadAllData = async () => {
      try {
        await Promise.all([
          loadPatients(),
          loadAppointments(),
          loadPayments(),
          loadExpenses(),
          loadInventoryItems()
        ])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
    }

    loadAllData()
  }, [loadPatients, loadAppointments, loadPayments, loadExpenses, loadInventoryItems])



  useEffect(() => {
    // Calculate dashboard statistics with validation using filtered data
    const today = new Date()
    const todayAppointments = getAppointmentsForDate(today)
    const thisMonth = today.toISOString().slice(0, 7)
    const thisMonthRevenue = typeof monthlyRevenue[thisMonth] === 'number' ? monthlyRevenue[thisMonth] : 0

    // Use filtered data for statistics
    const filteredPatientCount = patientStats.filteredData.length
    const filteredAppointmentCount = appointmentStats.filteredData.length

    // Validate all numeric values
    const validatedStats = {
      totalPatients: Math.max(0, filteredPatientCount),
      totalAppointments: Math.max(0, filteredAppointmentCount),
      totalRevenue: Math.max(0, totalRevenue || 0), // Use actual total revenue, not filtered
      pendingPayments: Math.max(0, pendingAmount || 0),
      todayAppointments: Math.max(0, todayAppointments.length),
      thisMonthRevenue: Math.max(0, thisMonthRevenue),
      lowStockItems: Math.max(0, (lowStockCount || 0) + (expiredCount || 0) + (expiringSoonCount || 0))
    }

    // Round financial values to 2 decimal places
    validatedStats.totalRevenue = Math.round(validatedStats.totalRevenue * 100) / 100
    validatedStats.pendingPayments = Math.round(validatedStats.pendingPayments * 100) / 100
    validatedStats.thisMonthRevenue = Math.round(validatedStats.thisMonthRevenue * 100) / 100

    setStats(validatedStats)
  }, [patientStats.filteredData, appointmentStats.filteredData, paymentStats.financialStats, pendingAmount, monthlyRevenue, getAppointmentsForDate, lowStockCount, expiredCount, expiringSoonCount])

  // Enhanced revenue data preparation with comprehensive validation - memoized
  const revenueData = useMemo(() => {
    try {
      const entries = Object.entries(monthlyRevenue)
        .filter(([month, revenue]) => {
          // Enhanced validation for month format and revenue value
          const isValidMonth = month.match(/^\d{4}-\d{2}$/)
          const isValidRevenue = typeof revenue === 'number' && !isNaN(revenue) && isFinite(revenue) && revenue >= 0
          return isValidMonth && isValidRevenue
        })
        .slice(-6) // Last 6 months
        .map(([month, revenue]) => {
          // Convert to Gregorian calendar format with Arabic month names
          const monthName = parseAndFormatGregorianMonth(month)

          return {
            month: monthName,
            revenue: Math.round(revenue * 100) / 100, // Round to 2 decimal places
            formattedRevenue: formatAmount(revenue)
          }
        })
        .sort((a, b) => {
          // Sort by actual date for proper chronological order
          const dateA = new Date(a.month)
          const dateB = new Date(b.month)
          return dateA.getTime() - dateB.getTime()
        })

      // Validate the final data
      if (!validateNumericData(entries)) {
        console.warn('Dashboard: Invalid revenue data detected')
        return []
      }

      return entries
    } catch (error) {
      console.error('Dashboard: Error processing revenue data:', error)
      return []
    }
  }, [monthlyRevenue, formatAmount])

  // Get professional chart colors - memoized
  const categoricalColors = useMemo(() => getChartColors('categorical', isDarkMode), [isDarkMode])
  const primaryColors = useMemo(() => getChartColors('primary', isDarkMode), [isDarkMode])
  const statusColors = useMemo(() => getChartColorsWithFallback('status', isDarkMode, 8), [isDarkMode])
  const financialColors = useMemo(() => getChartColorsWithFallback('financial', isDarkMode, 4), [isDarkMode])
  const chartConfiguration = useMemo(() => getChartConfig(isDarkMode), [isDarkMode])

  // Enhanced appointment status data with comprehensive validation - memoized
  const appointmentStatusData = useMemo(() => {
    try {
      // Define status mapping with proper Arabic labels and colors
      const statusMapping = [
        { status: 'completed', name: 'مكتمل', color: statusColors[0] }, // Green for completed
        { status: 'scheduled', name: 'مجدول', color: statusColors[4] }, // Purple for scheduled
        { status: 'cancelled', name: 'ملغي', color: statusColors[2] }, // Red for cancelled
        { status: 'no_show', name: 'لم يحضر', color: statusColors[3] } // Gray for no show
      ]

      const statusData = statusMapping.map(({ status, name, color }) => {
        const count = appointments.filter(a => a && a.status === status).length
        return {
          name,
          value: Math.max(0, count),
          color,
          percentage: appointments.length > 0 ? Math.round((count / appointments.length) * 100) : 0
        }
      }).filter(item => item.value > 0) // Only include statuses with data

      // Enhanced validation
      const totalStatusCount = statusData.reduce((sum, item) => sum + item.value, 0)
      const validAppointments = appointments.filter(a => a && typeof a === 'object')

      if (totalStatusCount !== validAppointments.length && validAppointments.length > 0) {
        console.warn('Dashboard appointment status counts mismatch:', {
          totalStatusCount,
          validAppointmentsLength: validAppointments.length,
          statusBreakdown: statusData.map(s => ({ name: s.name, value: s.value }))
        })
      }

      return statusData
    } catch (error) {
      console.error('Dashboard: Error processing appointment status data:', error)
      return []
    }
  }, [appointments, statusColors])

  const todayAppointments = getAppointmentsForDate(new Date())

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 rtl-layout p-2 md:p-4">
      {/* Enhanced Welcome Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-6 bg-gradient-to-r from-muted/50 to-accent/20 rounded-xl backdrop-blur-sm border border-border">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
              مرحباً بك في {clinicName}
            </h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            إليك ما يحدث في عيادتك - تحديث تلقائي في الوقت الفعلي
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full md:w-auto">
          <Button onClick={onAddAppointment} className="btn-rtl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg px-4 py-2 md:px-6 md:py-3">
            <Plus className="w-4 h-4 icon-right" />
            موعد جديد
          </Button>
          <Button variant="outline" onClick={onAddPatient} className="btn-rtl border-border hover:bg-accent shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg px-4 py-2 md:px-6 md:py-3">
            <Plus className="w-4 h-4 icon-right" />
            مريض جديد
          </Button>
        </div>
      </div>

      {/* Time Filter Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeFilter
          value={appointmentStats.timeFilter}
          onChange={appointmentStats.handleFilterChange}
          onClear={appointmentStats.resetFilter}
          title="فلترة زمنية - المواعيد"
          className="lg:col-span-1"
          defaultOpen={false}
        />
        <TimeFilter
          value={paymentStats.timeFilter}
          onChange={paymentStats.handleFilterChange}
          onClear={paymentStats.resetFilter}
          title="فلترة زمنية - المدفوعات"
          className="lg:col-span-1"
          defaultOpen={false}
        />
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200/50 dark:border-blue-700/50 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              إجمالي المرضى
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl md:text-3xl font-bold text-blue-800 dark:text-blue-200 mb-1">
              {patients.length}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              إجمالي المرضى المسجلين
            </p>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles("purple")} stats-card-rtl`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate) ? 'إجمالي المواعيد' : 'المواعيد المفلترة'}
            </CardTitle>
            <Calendar className={`h-4 w-4 stats-icon ${getIconStyles("purple")}`} />
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-2xl font-bold text-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? appointments.length
                : appointmentStats.filteredData.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? 'إجمالي المواعيد المسجلة'
                : `من إجمالي ${appointments.length} موعد`}
            </p>
            {appointmentStats.trend && (
              <div className={`text-xs mt-1 flex items-center ${appointmentStats.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <span>{appointmentStats.trend.isPositive ? '↗' : '↘'}</span>
                <span className="mr-1">{Math.abs(appointmentStats.trend.changePercent)}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`${getCardStyles("emerald")} stats-card-rtl`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate) ? 'المواعيد المكتملة' : 'المواعيد المكتملة المفلترة'}
            </CardTitle>
            <TrendingUp className={`h-4 w-4 stats-icon ${getIconStyles("emerald")}`} />
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-2xl font-bold text-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? appointments.filter(a => a.status === 'completed').length
                : appointmentStats.filteredData.filter(a => a.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? 'إجمالي المواعيد المكتملة'
                : 'المواعيد المكتملة في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles("green")} stats-card-rtl`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'إيرادات الشهر' : 'الإيرادات المفلترة'}
            </CardTitle>
            <DollarSign className={`h-4 w-4 stats-icon ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-2xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatAmount(stats.thisMonthRevenue)
                : formatAmount(paymentStats.financialStats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'أرباح هذا الشهر'
                : 'الإيرادات في الفترة المحددة'}
            </p>
            {paymentStats.trend && (
              <div className={`text-xs mt-1 flex items-center ${paymentStats.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <span>{paymentStats.trend.isPositive ? '↗' : '↘'}</span>
                <span className="ml-1">{Math.abs(paymentStats.trend.changePercent)}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row Stats Cards */}
      <div className="dashboard-grid-rtl grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className={`${getCardStyles("green")} stats-card-rtl`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'إجمالي الإيرادات' : 'إجمالي الإيرادات المفلترة'}
            </CardTitle>
            <DollarSign className={`h-4 w-4 stats-icon ${getIconStyles("green")}`} />
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-2xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatAmount(stats.totalRevenue)
                : formatAmount(paymentStats.financialStats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'إجمالي الإيرادات المحققة'
                : 'إجمالي الإيرادات في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles("yellow")} stats-card-rtl`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'المدفوعات المعلقة' : 'المدفوعات المعلقة المفلترة'}
            </CardTitle>
            <Clock className={`h-4 w-4 stats-icon ${getIconStyles("yellow")}`} />
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-2xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatAmount(stats.pendingPayments)
                : formatAmount(paymentStats.financialStats.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'مدفوعات في انتظار التحصيل'
                : 'مدفوعات معلقة في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        <Card className={`${getCardStyles("orange")} stats-card-rtl`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">تنبيهات المخزون</CardTitle>
            <Package className={`h-4 w-4 stats-icon ${getIconStyles("orange")}`} />
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-2xl font-bold text-foreground">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              عناصر تحتاج انتباه
            </p>
            {stats.lowStockItems > 0 && (
              <div className="mt-2 text-xs">
                <div className="flex justify-between">
                  <span>مخزون منخفض:</span>
                  <span className={getIconStyles("yellow").replace('h-4 w-4', '')}>{lowStockCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>منتهي الصلاحية:</span>
                  <span className={getIconStyles("red").replace('h-4 w-4', '')}>{expiredCount + expiringSoonCount}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Enhanced Revenue Chart */}
        <Card className="bg-card backdrop-blur-sm border-border shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 space-x-reverse text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>اتجاه الإيرادات</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              الإيرادات الشهرية خلال آخر 6 أشهر ({formatAmount(stats.totalRevenue)} إجمالي)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {revenueData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات إيرادات متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <LineChart
                  data={revenueData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray={chartConfiguration.grid.strokeDasharray}
                    stroke={chartConfiguration.grid.stroke}
                    strokeOpacity={chartConfiguration.grid.strokeOpacity}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickFormatter={(value) => formatChartValue(value, 'currency', currency)}
                    domain={[0, 'dataMax + 100']}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value), currency), 'الإيرادات']}
                    labelFormatter={(label) => `الشهر: ${label}`}
                    contentStyle={chartConfiguration.tooltip}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={financialColors[0]}
                    strokeWidth={chartConfiguration.line.strokeWidth}
                    dot={{
                      fill: financialColors[0],
                      strokeWidth: chartConfiguration.line.dot.strokeWidth,
                      r: chartConfiguration.line.dot.r
                    }}
                    activeDot={{
                      r: chartConfiguration.line.activeDot.r,
                      stroke: financialColors[0],
                      strokeWidth: chartConfiguration.line.activeDot.strokeWidth
                    }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Appointment Status Chart */}
        <Card className="bg-card border-border shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse text-foreground">
              <Calendar className="w-5 h-5 text-primary" />
              <span>حالة المواعيد</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              توزيع حالات المواعيد ({appointments.length} موعد إجمالي)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد مواعيد متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Pie
                    data={appointmentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, value }) =>
                      value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                    }
                    outerRadius={120}
                    innerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                    stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                    strokeWidth={2}
                    paddingAngle={2}
                  >
                    {appointmentStatusData.map((entry, index) => (
                      <Cell
                        key={`appointment-status-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} موعد`,
                      'العدد'
                    ]}
                    labelFormatter={(label) => `الحالة: ${label}`}
                    contentStyle={chartConfiguration.tooltip}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Status Legend */}
            {appointmentStatusData.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {appointmentStatusData.map((status, index) => (
                  <div key={`legend-${index}`} className="flex items-center space-x-2 space-x-reverse">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-muted-foreground">
                      {status.name}: {status.value} ({status.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card className="bg-card border-border shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-foreground">مواعيد اليوم</CardTitle>
          <CardDescription className="text-muted-foreground">
            {todayAppointments.length} موعد مجدول لتاريخ {formatDate(new Date(), 'long')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد مواعيد مجدولة لليوم</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 border dark:border-slate-700 rounded-lg">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-primary dark:bg-slate-400"></div>
                    <div>
                      <p className="font-medium arabic-enhanced">{appointment.patient?.full_name || appointment.patient_name || 'مريض غير معروف'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      appointment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-gray-100 text-gray-800 dark:bg-card dark:text-gray-200'
                    }`}>
                      {appointment.status === 'scheduled' ? 'مجدول' :
                       appointment.status === 'completed' ? 'مكتمل' :
                       appointment.status === 'cancelled' ? 'ملغي' :
                       appointment.status === 'no_show' ? 'لم يحضر' : appointment.status}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {todayAppointments.length > 5 && (
                <div className="text-center">
                  <Button variant="outline">
                    عرض جميع المواعيد ({todayAppointments.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})

Dashboard.displayName = 'Dashboard'

export default Dashboard