import React, { memo, useCallback } from 'react'
import EnhancedHeader from './EnhancedHeader'
import LeftSidebarStatistics from './LeftSidebarStatistics'
import DynamicTabsCarousel from './DynamicTabsCarousel'
import FloatingQuickActions from './FloatingQuickActions'

interface NewDashboardLayoutProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
  onOpenSettings?: () => void
}

const NewDashboardLayout = memo(function NewDashboardLayout({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onAddPatient,
  onAddAppointment,
  onAddPayment,
  onOpenSettings
}: NewDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const handleSearchResultSelect = useCallback((result: any) => {
    console.log('Selected search result:', result)

    // Navigate based on result type and open details
    switch (result.type) {
      case 'patient':
        localStorage.setItem('selectedPatientForDetails', JSON.stringify({
          patient: result.data,
          openDetailsModal: true
        }))
        onNavigateToPatients?.()
        break
      case 'appointment':
        localStorage.setItem('selectedAppointmentForDetails', JSON.stringify({
          appointment: result.data,
          openDetailsModal: true
        }))
        onNavigateToAppointments?.()
        break
      case 'payment':
        localStorage.setItem('selectedPaymentForDetails', JSON.stringify({
          payment: result.data,
          openDetailsModal: true
        }))
        onNavigateToPayments?.()
        break
      case 'treatment':
        localStorage.setItem('selectedTreatmentForDetails', JSON.stringify({
          treatment: result.data,
          patientId: result.relatedData?.patientId,
          openDetailsModal: true
        }))
        onNavigateToTreatments?.()
        break
      case 'prescription':
        localStorage.setItem('selectedPrescriptionForDetails', JSON.stringify({
          prescription: result.data,
          openDetailsModal: true
        }))
        onNavigateToTreatments?.()
        break
      default:
        break
    }
  }, [onNavigateToPatients, onNavigateToAppointments, onNavigateToPayments, onNavigateToTreatments])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 rtl" dir="rtl">
      {/* Responsive CSS Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr] rtl:md:grid-cols-[1fr_280px] rtl:lg:grid-cols-[1fr_320px] rtl:xl:grid-cols-[1fr_350px] grid-rows-[auto_1fr] h-screen gap-0 md:gap-1 lg:gap-2">
        {/* Header - spans full width on mobile, top row on desktop */}
        <div className="col-span-1 lg:col-span-2 row-start-1" role="banner" data-testid="dashboard-header">
          <EnhancedHeader
            onRefresh={() => {}}
            onOpenSettings={onOpenSettings}
            onSearchResultSelect={handleSearchResultSelect}
            onToggleMobileSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        {/* Left Sidebar - responsive behavior */}
        <div className={`md:row-start-2 md:col-start-1 rtl:md:col-start-2 lg:row-start-2 lg:col-start-1 rtl:lg:col-start-2 bg-slate-100 dark:bg-slate-800 border-r rtl:border-l border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'block' : 'hidden md:block'
        } ${
          sidebarOpen
            ? 'fixed md:relative inset-y-0 right-0 md:right-auto w-80 md:w-full z-40 md:z-auto transform translate-x-0 md:translate-x-0'
            : 'md:relative md:translate-x-0'
        }`} role="complementary" aria-label="إحصائيات العيادة" data-testid="dashboard-sidebar">
          <LeftSidebarStatistics />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 dark:bg-slate-900 dark:bg-opacity-70 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content - dynamic tabs carousel */}
        <div className={`row-start-2 col-start-1 md:col-start-2 rtl:md:col-start-1 lg:col-start-2 rtl:lg:col-start-1 xl:col-start-2 rtl:xl:col-start-1 p-4 md:p-5 lg:p-6 xl:p-8 overflow-hidden transition-all duration-300 bg-white dark:bg-slate-800 ${
          sidebarOpen ? 'md:ml-0 lg:ml-0 xl:ml-0' : ''
        }`} role="main" data-testid="dashboard-main">
          <DynamicTabsCarousel
            onNavigateToPatients={onNavigateToPatients}
            onNavigateToAppointments={onNavigateToAppointments}
            onNavigateToPayments={onNavigateToPayments}
            onNavigateToTreatments={onNavigateToTreatments}
            onAddPatient={onAddPatient}
            onAddAppointment={onAddAppointment}
            onAddPayment={onAddPayment}
          />
        </div>
      </div>

      {/* Floating Quick Actions Bar - responsive positioning */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 lg:bottom-6" data-testid="floating-actions">
        <FloatingQuickActions
          onAddPatient={onAddPatient}
          onAddAppointment={onAddAppointment}
          onAddPayment={onAddPayment}
        />
      </div>

      {/* Mobile sidebar toggle - can be added later if needed */}
    </div>
  )
})

export default NewDashboardLayout