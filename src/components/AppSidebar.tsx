import * as React from "react"
import {
  Calendar,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
  User2,
  Package,
  BarChart3,
  Microscope,
  Pill,
  Heart,
  Stethoscope,
  ClipboardList,
  Receipt,
  FileText,
  Activity,
  Clock,
  DollarSign,
  Shield,
  TrendingUp,
  UserCheck,
  CalendarDays,
  FileBarChart,
  Building2,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import { useSettingsStore } from "@/store/settingsStore"
import { useStableClinicName, useStableDoctorName, useStableClinicLogo } from "@/hooks/useStableSettings"

// Navigation items data
const navigationItems = [
  {
    title: "لوحة التحكم",
    url: "dashboard",
    icon: Activity,
  },
  {
    title: "المرضى",
    url: "patients",
    icon: UserCheck,
  },
  {
    title: "المواعيد",
    url: "appointments",
    icon: CalendarDays,
  },
  {
    title: "المدفوعات",
    url: "payments",
    icon: DollarSign,
  },
  // {
  //   title: "المخزون",
  //   url: "inventory",
  //   icon: Package,
  // },
  {
    title: "المختبرات",
    url: "labs",
    icon: Microscope,
  },
  // {
  //   title: "الأدوية والوصفات",
  //   url: "medications",
  //   icon: Pill,
  // },
  {
    title: "العلاجات السنية",
    url: "dental-treatments",
    icon: Stethoscope,
  },
  // {
  //   title: "احتياجات العيادة",
  //   url: "clinic-needs",
  //   icon: ClipboardList,
  // },
  {
    title: "مصروفات العيادة",
    url: "expenses",
    icon: Receipt,
  },
  {
    title: "التقارير",
    url: "reports",
    icon: FileBarChart,
  },
  // {
  //   title: "فاتورة تقديرية ",
  //   url: "external-estimate",
  //   icon: FileText,
  // },
  {
    title: "الإعدادات",
    url: "settings",
    icon: Shield,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AppSidebar({ activeTab, onTabChange, ...props }: AppSidebarProps) {
  const { settings } = useSettingsStore()
  const clinicName = useStableClinicName()
  const doctorName = useStableDoctorName()
  const clinicLogo = useStableClinicLogo()

  return (
    <Sidebar collapsible="offcanvas" side="right" className="border-l border-border/50 shadow-xl rtl-layout bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800" {...props}>
      <SidebarHeader className="border-b border-border/50 bg-gradient-to-l from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-sm">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 flex-rtl shadow-sm hover:shadow-md">
                <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg overflow-hidden ring-2 ring-blue-500/20">
                  {clinicLogo && clinicLogo.trim() !== '' ? (
                    <img
                      src={clinicLogo}
                      alt="شعار العيادة"
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        console.error('Sidebar header logo failed to load:', clinicLogo)
                        // Fallback to default icon
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          const fallbackIcon = document.createElement('div')
                          fallbackIcon.innerHTML = '<svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
                          parent.appendChild(fallbackIcon)
                        }
                      }}
                    />
                  ) : (
                    <Stethoscope className="size-6" />
                  )}
                </div>
                <div className="grid flex-1 text-right leading-tight">
                  <span className="truncate font-bold text-l text-slate-800 dark:text-slate-100">
                    {clinicName}
                  </span>
                  <span className="truncate text-sm text-slate-600 dark:text-slate-400 font-medium">
                    نظام إدارة العيادة
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup className="space-y-2">
          <SidebarGroupLabel className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 text-right border-r-2 border-blue-500">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 nav-rtl">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={activeTab === item.url}
                    onClick={() => onTabChange(item.url)}
                    className="flex items-center gap-4 w-full text-right justify-start hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-300 py-3 px-4 text-base nav-item rounded-xl shadow-sm hover:shadow-md border border-transparent hover:border-blue-200 dark:hover:border-blue-700/50 group"
                  >
                    <item.icon className={`size-5 nav-icon transition-all duration-300 ${
                      activeTab === item.url
                        ? 'text-blue-600 dark:text-blue-400 scale-110'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`} />
                    <span className={`font-medium text-sm transition-all duration-300 ${
                      activeTab === item.url
                        ? 'text-slate-900 dark:text-slate-100 font-semibold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-inner">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-sm">
              <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden ring-2 ring-indigo-500/20 shadow-md">
                {clinicLogo && clinicLogo.trim() !== '' ? (
                  <img
                    src={clinicLogo}
                    alt="شعار العيادة"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      console.error('Sidebar footer logo failed to load:', clinicLogo)
                      // Fallback to default icon
                      e.currentTarget.style.display = 'none'
                      const parent = e.currentTarget.parentElement
                      if (parent) {
                        const fallbackIcon = document.createElement('div')
                        fallbackIcon.innerHTML = '<svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>'
                        parent.appendChild(fallbackIcon)
                      }
                    }}
                  />
                ) : (
                  <User2 className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-right leading-tight">
                <span className="truncate font-bold text-slate-800 dark:text-slate-200 text-sm">د. {doctorName}</span>
                <span className="truncate text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {clinicName}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
