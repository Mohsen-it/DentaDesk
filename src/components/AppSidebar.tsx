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
    <Sidebar collapsible="offcanvas" side="right" className="border-l border-border/50 dark:border-border shadow-xl rtl-layout bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900" {...props}>
      <SidebarHeader className="border-b border-border/50 dark:border-border dark:bg-slate-900">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild >
              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 dark:hover:bg-accent/20 transition-all duration-300 flex-rtl shadow-sm hover:shadow-md ">
                <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg overflow-hidden ring-2 ring-primary/20">
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
                <div className="grid flex-1 text-right leading-tight ">
                  <span className="truncate font-bold text-l text-foreground dark:text-foreground">
                    {clinicName}
                  </span>
                  <span className="truncate text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                    نظام إدارة العيادة
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6  dark:bg-slate-900/20">
        <SidebarGroup className="space-y-2">
          <SidebarGroupLabel className="text-sm font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider px-3 py-2 text-right border-r-2 border-primary">
            القائمة الرئيسية
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2 nav-rtl">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={activeTab === item.url}
                    onClick={() => onTabChange(item.url)}
                    className="flex items-center gap-4 w-full text-right justify-start hover:bg-gradient-to-r hover:from-accent/50 hover:to-accent/30 dark:hover:from-accent/20 dark:hover:to-accent/10 transition-all duration-300 py-3 px-4 text-base nav-item rounded-xl shadow-sm hover:shadow-md border border-transparent hover:border-primary/30 dark:hover:border-primary/20 group"
                  >
                    <item.icon className={`size-5 nav-icon transition-all duration-300 ${
                      activeTab === item.url
                        ? 'text-primary dark:text-primary scale-110'
                        : 'text-muted-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary'
                    }`} />
                    <span className={`font-medium text-sm transition-all duration-300 ${
                      activeTab === item.url
                        ? 'text-foreground dark:text-foreground font-semibold'
                        : 'text-muted-foreground dark:text-muted-foreground'
                    }`}>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 dark:border-border dark:bg-slate-900">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-accent/50 to-accent/30 dark:from-accent/20 dark:to-accent/10 hover:from-accent/60 hover:to-accent/40 dark:hover:from-accent/30 dark:hover:to-accent/20 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-purple-700 text-primary-foreground overflow-hidden ring-2 ring-primary/20 shadow-md">
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
                <span className="truncate font-bold text-foreground dark:text-foreground text-sm">د. {doctorName}</span>
                <span className="truncate text-xs text-muted-foreground dark:text-muted-foreground font-medium">
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
