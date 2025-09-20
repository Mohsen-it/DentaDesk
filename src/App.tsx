import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { usePatientStore } from './store/patientStore'
import { useAppointmentStore } from './store/appointmentStore'
import { useSettingsStore } from './store/settingsStore'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext'
import { useRealTimeSync } from './hooks/useRealTimeSync'
import { useRealTimeTableSync } from './hooks/useRealTimeTableSync'
import { useAuth } from './hooks/useAuth'
import { useLicense } from './hooks/useLicense'
import { useSystemShortcuts } from './hooks/useKeyboardShortcuts'
import { useTreatmentNames } from './hooks/useTreatmentNames'
import { enhanceKeyboardEvent } from '@/utils/arabicKeyboardMapping'
import LoginScreen from './components/auth/LoginScreen'
import LicenseEntryScreen from './components/auth/LicenseEntryScreen'
import AddPatientDialog from './components/patients/AddPatientDialog'
import ConfirmDeleteDialog from './components/ConfirmDeleteDialog'
import AppointmentCard from './components/AppointmentCard'
import AddAppointmentDialog from './components/AddAppointmentDialog'
import AddPaymentDialog from './components/payments/AddPaymentDialog'
import QuickShortcutHint from './components/help/QuickShortcutHint'
import PageLoading from './components/ui/PageLoading'
import ErrorBoundary from './components/ErrorBoundary'
import ThemeToggle from './components/ThemeToggle'

// Lazy load heavy page components
const PaymentsPage = React.lazy(() => import('./pages/Payments'))
const SettingsPage = React.lazy(() => import('./pages/Settings'))
const InventoryPage = React.lazy(() => import('./pages/Inventory'))
const ReportsPage = React.lazy(() => import('./pages/Reports'))
const Dashboard = React.lazy(() => import('./pages/Dashboard'))
const EnhancedDashboard = React.lazy(() => import('./pages/EnhancedDashboard'))
const PatientsPage = React.lazy(() => import('./pages/Patients'))
const AppointmentsPage = React.lazy(() => import('./pages/Appointments'))
const Labs = React.lazy(() => import('./pages/Labs'))
const Medications = React.lazy(() => import('./pages/Medications'))
const DentalTreatments = React.lazy(() => import('./pages/DentalTreatments'))
const ClinicNeeds = React.lazy(() => import('./pages/ClinicNeeds'))
const Expenses = React.lazy(() => import('./pages/Expenses'))
const ExternalEstimate = React.lazy(() => import('./pages/ExternalEstimate'))
import { AppSidebar } from './components/AppSidebar'
import { AppSidebarTrigger } from './components/AppSidebarTrigger'
import LiveDateTime from './components/LiveDateTime'
import SplashScreen from './components/SplashScreen'
import PaymentPasswordModal from './components/payments/PaymentPasswordModal'
import PasswordResetModal from './components/payments/PasswordResetModal'
import PasswordSetupModal from './components/payments/PasswordSetupModal'
import { isPasswordSet } from './utils/paymentSecurity'

// shadcn/ui imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

import { Plus, Filter, Search, Keyboard } from 'lucide-react'
import { Appointment } from './types'
import './App.css'
import './styles/globals.css'

// Lazy load GlobalSearch component
const GlobalSearch = React.lazy(() => import('@/components/globalThis/GlobalSearch'))

function AppContent() {
  // ALL HOOKS MUST BE CALLED IN THE SAME ORDER EVERY TIME
  // This prevents "Rendered more hooks than during the previous render" error

  // Theme and UI hooks (always first)
  const { setDarkMode } = useTheme()
  const { toast } = useToast()

  // Authentication and license hooks
  const { isAuthenticated, isLoading: authLoading, passwordEnabled, login } = useAuth()
  const {
    isLicenseValid,
    isFirstRun,
    isLoading: licenseLoading,
    error: licenseError,
    machineInfo,
    activateLicense
  } = useLicense()
  const { formatAmount } = useCurrency()

  // Custom hooks (always in same order)
  useRealTimeSync()
  useRealTimeTableSync()
  useTreatmentNames()

  // Store hooks (always in same order)
  const { loadPatients, patients } = usePatientStore()
  const {
    appointments,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    loadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
  } = useAppointmentStore()
  const { loadSettings } = useSettingsStore()

  // State hooks (always in same order)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showSplash, setShowSplash] = useState(true)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [showPaymentPasswordModal, setShowPaymentPasswordModal] = useState(false)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [showPasswordSetupModal, setShowPasswordSetupModal] = useState(false)
  const [isPaymentsAuthenticated, setIsPaymentsAuthenticated] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  // Appointment states
  const [showAddAppointment, setShowAddAppointment] = useState(false)
  const [showEditAppointment, setShowEditAppointment] = useState(false)
  const [showDeleteAppointmentConfirm, setShowDeleteAppointmentConfirm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Callback hooks
  const formatCurrency = useCallback((amount: number) => {
    return formatAmount(amount)
  }, [formatAmount])

  const handleSearchResultSelect = useCallback((result: any) => {
    console.log('🎯 Search result selected:', result)

    // Navigate to appropriate tab based on result type
    switch (result.type) {
      case 'patient':
        setActiveTab('patients')
        break
      case 'appointment':
        setActiveTab('appointments')
        break
      case 'payment':
        handleTabChange('payments')
        break
      case 'treatment':
        setActiveTab('dental-treatments')
        break
      case 'prescription':
        setActiveTab('medications')
        break
      default:
        // Default to dashboard if type is unknown
        setActiveTab('dashboard')
        break
    }

    // Close the search overlay
    setShowGlobalSearch(false)
  }, [])

  // Custom tab change handler with optional password protection
  const handleTabChange = (tab: string) => {
    if (tab === 'payments') {
      if (isPasswordSet()) {
        // Password is set, check if already authenticated
        if (!isPaymentsAuthenticated) {
          setShowPaymentPasswordModal(true)
        } else {
          setActiveTab('payments')
        }
      } else {
        // No password set, allow direct access
        setActiveTab('payments')
      }
    } else {
      // Reset payments authentication when switching away
      if (isPaymentsAuthenticated) {
        setIsPaymentsAuthenticated(false)
      }
      setActiveTab(tab)
    }
  }

  // Effect hooks (all grouped together)
  useEffect(() => {
    console.log('🚀 App.tsx: App component mounted')

    // Check if electronAPI is available
    if (typeof window !== 'undefined') {
      console.log('🔌 electronAPI available:', !!window.electronAPI)
      console.log('🔌 window.electron available:', !!window.electron)
    }

    return () => {
      console.log('🔄 App.tsx: App component unmounting')
    }
  }, [])

  // Setup keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // تجاهل الاختصارات إذا كان المستخدم يكتب في input أو textarea
      // إلا إذا كان يستخدم Ctrl أو Alt
      const target = event.target as HTMLElement
      const isTyping = (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.getAttribute('type') === 'number' ||
        target.closest('[data-prevent-shortcuts="true"]') ||
        target.closest('[data-no-global-shortcuts="true"]') ||
        target.hasAttribute('data-prevent-shortcuts') ||
        target.hasAttribute('data-no-global-shortcuts')
      )

      // تجاهل الاختصارات إذا كان Ctrl مضغوطاً (ما عدا F1)
      if (event.ctrlKey && event.key !== 'F1') {
        return
      }

      // السماح بالاختصارات المهمة حتى أثناء الكتابة
      const isImportantShortcut = event.altKey

      if (isTyping && !isImportantShortcut) {
        // تسجيل للتشخيص
        console.log('🚫 App.tsx: Ignoring shortcut for typing element:', {
          key: event.key,
          tagName: target.tagName,
          hasPreventAttr: target.hasAttribute('data-prevent-shortcuts'),
          hasNoGlobalAttr: target.hasAttribute('data-no-global-shortcuts')
        })
        return
      }

      // استخدام الدالة المحسنة لمعالجة أحداث لوحة المفاتيح
      const enhanced = enhanceKeyboardEvent(event)

      // Navigation shortcuts (0-8) with Arabic numeral support - updated for visible tabs
      if (enhanced.mappedKey === '0') {
        enhanced.preventDefault()
        setActiveTab('dashboard')
      } else if (enhanced.mappedKey === '1') {
        enhanced.preventDefault()
        setActiveTab('patients')
      } else if (enhanced.mappedKey === '2') {
        enhanced.preventDefault()
        setActiveTab('appointments')
      } else if (enhanced.mappedKey === '3') {
        enhanced.preventDefault()
        handleTabChange('payments')
      } else if (enhanced.mappedKey === '4') {
        enhanced.preventDefault()
        setActiveTab('labs')
      } else if (enhanced.mappedKey === '5') {
        enhanced.preventDefault()
        setActiveTab('dental-treatments')
      } else if (enhanced.mappedKey === '6') {
        enhanced.preventDefault()
        setActiveTab('expenses')
      } else if (enhanced.mappedKey === '7') {
        enhanced.preventDefault()
        setActiveTab('reports')
      } else if (enhanced.mappedKey === '8') {
        enhanced.preventDefault()
        setActiveTab('settings')
      }

      // Quick actions - اختصارات متجاورة ASD (دعم محسن للعربية والإنجليزية)
      if (enhanced.mappedKey.toLowerCase() === 'a') {
        enhanced.preventDefault()
        console.log('🎯 Shortcut A/ش pressed - Opening Add Patient dialog')
        setShowAddPatient(true)
      } else if (enhanced.mappedKey.toLowerCase() === 's') {
        enhanced.preventDefault()
        console.log('🎯 Shortcut S/س pressed - Opening Add Appointment dialog')
        setShowAddAppointment(true)
      } else if (enhanced.mappedKey.toLowerCase() === 'd') {
        enhanced.preventDefault()
        console.log('🎯 Shortcut D/ي pressed - Opening Add Payment dialog')
        setShowAddPayment(true)
      }

      // Refresh (دعم الحرف العربي ق)
      if (enhanced.mappedKey.toLowerCase() === 'r') {
        enhanced.preventDefault()
        console.log('🎯 Shortcut R/ق pressed - Refreshing page')
        window.location.reload()
      }

      // Search (دعم الحرف العربي ب)
      if (enhanced.mappedKey.toLowerCase() === 'f') {
        enhanced.preventDefault()
        console.log('🎯 Shortcut F/ب pressed - Opening global search')
        setShowGlobalSearch(true)
      }

      // Open Settings (F1)
      if (event.key === 'F1') {
        event.preventDefault()
        console.log('🎯 Opening Settings')
        setActiveTab('settings')
      }
    }

    // Always add/remove event listener to maintain consistent hook order
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // Removed conditional dependencies to prevent hook order issues

  // F12 diagnostic shortcut
  useEffect(() => {
    const handleF12 = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault()
        setShowDiagnostics(true)
      }
    }
    window.addEventListener('keydown', handleF12)
    return () => window.removeEventListener('keydown', handleF12)
  }, [])

  // Handle successful payment authentication
  const handlePaymentAuthSuccess = () => {
    setIsPaymentsAuthenticated(true)
    setActiveTab('payments')
  }

  // Handle password setup success
  const handlePasswordSetupSuccess = () => {
    setIsPaymentsAuthenticated(true)
    setActiveTab('payments')
  }

  // Handle password reset success
  const handlePasswordResetSuccess = () => {
    setShowPasswordResetModal(false)
    // After reset, user needs to authenticate again
    setTimeout(() => {
      setShowPaymentPasswordModal(true)
    }, 500)
  }





  // All appointment states moved to top level hooks section



  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    toast({
      title: type === 'success' ? 'نجح' : 'خطأ',
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    })
  }

  // Store hooks moved to top level to ensure consistent hook order


  useEffect(() => {
    // Initialize app only if both license is valid AND authenticated
    const initializeApp = async () => {
      if (isLicenseValid && isAuthenticated) {
        console.time('🚀 App Data Initialization')
        console.log('🚀 Initializing app with valid license and authentication')

        // Stage 1: Load critical settings first (non-blocking for UI)
        console.time('⚙️ Settings Loading')
        loadSettings().then(() => {
          console.timeEnd('⚙️ Settings Loading')
        }).catch(error => {
          console.error('Settings loading failed:', error)
        })

        // Stage 2: Load data progressively to avoid blocking UI
        setTimeout(() => {
          console.time('👥 Patients Loading')
          loadPatients().then(() => {
            console.timeEnd('👥 Patients Loading')
          }).catch(error => {
            console.error('Patients loading failed:', error)
          })

          setTimeout(() => {
            console.time('📅 Appointments Loading')
            loadAppointments().then(() => {
              console.timeEnd('📅 Appointments Loading')
              console.timeEnd('🚀 App Data Initialization')
            }).catch(error => {
              console.error('Appointments loading failed:', error)
            })
          }, 500) // Small delay between data loads
        }, 200) // Delay data loading to prioritize UI rendering
      } else {
        console.log('⏳ Waiting for license validation and authentication before initializing app')
      }
    }

    initializeApp()
  }, [isLicenseValid, isAuthenticated, loadPatients, loadAppointments, loadSettings])

  const handleLogin = async (password: string): Promise<boolean> => {
    setLoginLoading(true)
    try {
      const success = await login(password)
      return success
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLicenseActivation = async (licenseKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 Handling license activation...')
      const result = await activateLicense(licenseKey)

      if (result.success) {
        toast({
          title: 'نجح التفعيل',
          description: 'تم تفعيل الترخيص بنجاح',
          variant: 'default',
        })
      } else {
        toast({
          title: 'فشل التفعيل',
          description: result.error || 'فشل في تفعيل الترخيص',
          variant: 'destructive',
        })
      }

      return result
    } catch (error) {
      console.error('❌ License activation error:', error)
      const errorMessage = 'حدث خطأ أثناء تفعيل الترخيص'
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      })
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  // Show splash screen initially
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  // Show loading screen while checking license or auth status
  if (licenseLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {licenseLoading ? 'جاري التحقق من الترخيص...' : 'جاري التحميل...'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            إذا استمر هذا التحميل، حاول إعادة تشغيل التطبيق
          </p>
        </div>
      </div>
    )
  }

  // Show error screen if there's a license error
  if (licenseError && !isFirstRun) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">خطأ في الترخيص</h2>
          <p className="text-muted-foreground mb-4">{licenseError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  // Diagnostic screen state - now moved to top level hooks section

  // F12 diagnostic shortcut moved to top level hooks section

  if (showDiagnostics) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">تشخيص التطبيق</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">حالة التطبيق</h2>
              <div className="space-y-2">
                <p>ترخيص صالح: {isLicenseValid ? '✅' : '❌'}</p>
                <p>مصادق عليه: {isAuthenticated ? '✅' : '❌'}</p>
                <p>كلمة مرور مطلوبة: {passwordEnabled ? '✅' : '❌'}</p>
                <p>أول تشغيل: {isFirstRun ? '✅' : '❌'}</p>
              </div>
            </div>
            <div className="bg-card p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3">واجهات API</h2>
              <div className="space-y-2">
                <p>electronAPI متوفر: {!!window.electronAPI ? '✅' : '❌'}</p>
                <p>electron متوفر: {!!window.electron ? '✅' : '❌'}</p>
                <p>window.electronAPI.patients: {!!window.electronAPI?.patients ? '✅' : '❌'}</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => setShowDiagnostics(false)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
            >
              إغلاق التشخيص
            </button>
          </div>
        </div>
      </div>
    )
  }

  // CRITICAL: Show license entry screen if license is invalid or first run
  // This must come BEFORE authentication check to ensure license is validated first
  if (!isLicenseValid || isFirstRun) {
    return (
      <LicenseEntryScreen
        onActivate={handleLicenseActivation}
        isLoading={licenseLoading}
        machineInfo={machineInfo || undefined}
      />
    )
  }

  // Show login screen if password is enabled and user is not authenticated
  // This only shows AFTER license is validated
  if (passwordEnabled && !isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} isLoading={loginLoading} />
  }







  // Appointment handlers
  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowEditAppointment(true)
  }

  const handleDeleteAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowDeleteAppointmentConfirm(true)
  }

  const handleConfirmDeleteAppointment = async () => {
    if (selectedAppointment) {
      try {
        await deleteAppointment(selectedAppointment.id)
        setShowDeleteAppointmentConfirm(false)
        setSelectedAppointment(null)
        showNotification("تم حذف الموعد بنجاح", "success")
      } catch (error) {
        console.error('Error deleting appointment:', error)
        showNotification("فشل في حذف الموعد. يرجى المحاولة مرة أخرى", "error")
      }
    }
  }

  const handleUpdateAppointment = async (id: string, appointmentData: Partial<Appointment>) => {
    try {
      await updateAppointment(id, appointmentData)
      setShowEditAppointment(false)
      setSelectedAppointment(null)
      showNotification("تم تحديث الموعد بنجاح", "success")
    } catch (error) {
      console.error('Error updating appointment:', error)
      showNotification("فشل في تحديث الموعد. يرجى المحاولة مرة أخرى", "error")
    }
  }


  const formatDate = (date: string) => {
    const dateObj = new Date(date)
    const day = dateObj.getDate()
    const month = dateObj.getMonth() + 1 // Add 1 because getMonth() returns 0-11
    const year = dateObj.getFullYear()

    // Format as DD/MM/YYYY
    const formattedDay = day.toString().padStart(2, '0')
    const formattedMonth = month.toString().padStart(2, '0')

    return `${formattedDay}/${formattedMonth}/${year}`
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };







  const renderContent = () => {
    switch (activeTab) {
      case 'patients':
        return <PatientsPage onNavigateToTreatments={setActiveTab} onNavigateToPayments={setActiveTab} />;
      case 'appointments':
        return <AppointmentsPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'labs':
        return <Labs />;
      case 'medications':
        return <Medications />;
      case 'dental-treatments':
        return <DentalTreatments />;
      case 'clinic-needs':
        return <ClinicNeeds />;
      case 'expenses':
        return <Expenses />;
      case 'reports':
        return <ReportsPage />;
      case 'external-estimate':
        return <ExternalEstimate />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <EnhancedDashboard
          onNavigateToPatients={() => setActiveTab('patients')}
          onNavigateToAppointments={() => setActiveTab('appointments')}
          onNavigateToPayments={() => setActiveTab('payments')}
          onNavigateToTreatments={() => setActiveTab('dental-treatments')}
          onAddPatient={() => setShowAddPatient(true)}
          onAddAppointment={() => setShowAddAppointment(true)}
          onAddPayment={() => setShowAddPayment(true)}
        />;
    }
  };

  // Get current page title
  const getCurrentPageTitle = () => {
    const pageMap = {
      dashboard: 'لوحة التحكم',
      patients: 'المرضى',
      appointments: 'المواعيد',
      payments: 'المدفوعات',
      inventory: 'المخزون',
      labs: 'المختبرات',
      medications: 'الأدوية والوصفات',
      'dental-treatments': 'العلاجات السنية',
      'clinic-needs': 'احتياجات العيادة',
      'expenses': 'مصروفات العيادة',
      reports: 'التقارير',
      'external-estimate': 'فاتورة تقديرية خارجية',
      settings: 'الإعدادات'
    }
    return pageMap[activeTab as keyof typeof pageMap] || 'لوحة التحكم'
  }

  return (
    <SidebarProvider>
        <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 rtl-layout">
            {/* Left side - Breadcrumbs */}
            <div className="flex items-center gap-2 px-4">
              <Breadcrumb>
                <BreadcrumbList className="flex-rtl">
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
                      🦷 نظام إدارة العيادة السنية
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-sky-600 dark:text-sky-400">{getCurrentPageTitle()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Center - Global Search */}
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

            {/* Right side - Controls */}
            <div className="ml-auto-rtl flex items-center gap-3 px-4 space-x-3-rtl">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mx-2 h-4" />

              <QuickShortcutHint />
              <ThemeToggle />
              <div className="text-sm text-muted-foreground bg-accent/30 px-3 py-1 rounded-full">
                <LiveDateTime />
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-10 pt-4 max-w-full overflow-hidden relative rtl-layout">
            <div className="w-full max-w-none content-wrapper">
              <ErrorBoundary>
                <Suspense fallback={<PageLoading message="جاري تحميل الصفحة..." />}>
                  {renderContent()}
                </Suspense>
              </ErrorBoundary>
            </div>


          </div>
        </SidebarInset>

      {/* Dialogs */}

      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={showAddPatient}
        onOpenChange={setShowAddPatient}
      />

      {/* Add Appointment Dialog */}
      <AddAppointmentDialog
        isOpen={showAddAppointment}
        onClose={() => setShowAddAppointment(false)}
        onSave={async (appointmentData) => {
          try {
            await createAppointment(appointmentData)
            setShowAddAppointment(false)
            showNotification("تم إضافة الموعد الجديد بنجاح", "success")
          } catch (error) {
            console.error('Error creating appointment:', error)
            showNotification("فشل في إضافة الموعد. يرجى المحاولة مرة أخرى", "error")
          }
        }}
        patients={patients}
        treatments={[]} // Will be loaded from treatments store later
      />

      {/* Edit Appointment Dialog */}
      {showEditAppointment && selectedAppointment && (
        <AddAppointmentDialog
          isOpen={showEditAppointment}
          onClose={() => {
            setShowEditAppointment(false)
            setSelectedAppointment(null)
          }}
          onSave={async (appointmentData) => {
            try {
              await updateAppointment(selectedAppointment.id, appointmentData)
              setShowEditAppointment(false)
              setSelectedAppointment(null)
              showNotification("تم تحديث الموعد بنجاح", "success")
            } catch (error) {
              console.error('Error updating appointment:', error)
              showNotification("فشل في تحديث الموعد. يرجى المحاولة مرة أخرى", "error")
            }
          }}
          patients={patients}
          treatments={[]}
          initialData={selectedAppointment}
        />
      )}

      {/* Delete Appointment Confirmation Dialog */}
      {showDeleteAppointmentConfirm && selectedAppointment && (
        <ConfirmDeleteDialog
          isOpen={showDeleteAppointmentConfirm}
          patient={null}
          appointment={selectedAppointment}
          onClose={() => {
            setShowDeleteAppointmentConfirm(false)
            setSelectedAppointment(null)
          }}
          onConfirm={handleConfirmDeleteAppointment}
          isLoading={appointmentsLoading}
        />
      )}

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
      />



        {/* Password Protection Modals */}
        <PaymentPasswordModal
          isOpen={showPaymentPasswordModal}
          onClose={() => setShowPaymentPasswordModal(false)}
          onSuccess={handlePaymentAuthSuccess}
          onForgotPassword={() => {
            setShowPaymentPasswordModal(false)
            setShowPasswordResetModal(true)
          }}
        />

        <PasswordResetModal
          isOpen={showPasswordResetModal}
          onClose={() => setShowPasswordResetModal(false)}
          onSuccess={handlePasswordResetSuccess}
        />

        <PasswordSetupModal
          isOpen={showPasswordSetupModal}
          onClose={() => setShowPasswordSetupModal(false)}
          onSuccess={handlePasswordSetupSuccess}
        />

        {/* Global Search Overlay */}
        {showGlobalSearch && (
          <div className="fixed inset-0 bg-black/50 dark:bg-slate-900/50 z-50 flex items-start justify-center pt-24">
            <div className="w-full max-w-2xl mx-4">
              <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-slate-700"></div></div>}>
                <GlobalSearch
                  onResultSelect={handleSearchResultSelect}
                  onClose={() => setShowGlobalSearch(false)}
                  autoFocus={true}
                />
              </Suspense>
            </div>
          </div>
        )}

        <Toaster />
      </SidebarProvider>
    );
  }

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AppContent />
      </CurrencyProvider>
    </ThemeProvider>
  );
}


export default App;
