import React, { memo, useCallback } from 'react'
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
    <div className="min-h-screen bg-background rtl relative overflow-hidden" dir="rtl">
      {/* Responsive CSS Grid Layout with improved spacing and visual hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] rtl:md:grid-cols-[1fr_300px] rtl:lg:grid-cols-[1fr_340px] rtl:xl:grid-cols-[1fr_380px] grid-rows-[auto_1fr] h-screen gap-0 md:gap-3 lg:gap-4 xl:gap-5">
        {/* Header - spans full width on mobile, top row on desktop with enhanced shadow */}
        <div className="col-span-1 lg:col-span-2 row-start-1 shadow-lg" role="banner" data-testid="dashboard-header">
         
        </div>

        {/* Left Sidebar - improved responsive behavior, spacing and visual design */}
        <div className={`md:row-start-2 md:col-start-1 rtl:md:col-start-2 lg:row-start-2 lg:col-start-1 rtl:lg:col-start-2 bg-sidebar border-r rtl:border-l border-sidebar-border transition-all duration-300 ease-in-out shadow-sm ${
          sidebarOpen ? 'block' : 'hidden md:block'
        } ${
          sidebarOpen
            ? 'fixed md:relative inset-y-0 right-0 md:right-auto w-80 md:w-full z-40 md:z-auto transform translate-x-0 md:translate-x-0 dark:from-slate-800 dark:to-slate-700'
            : 'md:relative md:translate-x-0 dark:from-slate-800 dark:to-slate-700'
        }`} role="complementary" aria-label="إحصائيات العيادة" data-testid="dashboard-sidebar">
          <LeftSidebarStatistics />
        </div>

        {/* Mobile Sidebar Overlay - enhanced with backdrop blur */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content - dynamic tabs carousel with better padding, spacing and visual design */}
        <div className={`row-start-2 col-start-1 md:col-start-2 rtl:md:col-start-1 lg:col-start-2 rtl:lg:col-start-1 xl:col-start-2 rtl:xl:col-start-1 p-3 md:p-4 lg:p-5 xl:p-6 overflow-hidden transition-all duration-300 bg-card backdrop-blur-sm ${
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

    <FloatingQuickActions
        onAddPatient={onAddPatient}
        onAddAppointment={onAddAppointment}
        onAddPayment={onAddPayment}
      />
      {/* Subtle background pattern for visual enhancement */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-transparent to-accent/20" />
      </div>
    </div>
  )
})

export default NewDashboardLayout