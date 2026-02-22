"use client"

import * as React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "@/lib/auth-client"
import {
  IconChevronLeft,
  IconChartBar,
  IconCurrencyDollar,
  IconDroplet,
  IconHome,
  IconLogout,
  IconPackage,
  IconReceipt,
  IconSettings,
  IconTruckDelivery,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { CustomerGroupIcon } from "@/components/icons/customer-group-icon"
import { UiScaleToggle } from "@/components/ui-scale-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  matchPrefixes?: string[]
}

const MAIN_ITEMS: NavItem[] = [
  { title: "POS", url: "/dashboard", icon: IconHome },
  {
    title: "Produk",
    url: "/dashboard/products",
    icon: IconPackage,
    matchPrefixes: ["/dashboard/products"],
  },
  {
    title: "Barang Masuk",
    url: "/dashboard/inventory",
    icon: IconTruckDelivery,
    matchPrefixes: ["/dashboard/inventory"],
  },
  {
    title: "Pelanggan",
    url: "/dashboard/customers",
    icon: CustomerGroupIcon,
    matchPrefixes: ["/dashboard/customers"],
  },
  {
    title: "Harga",
    url: "/dashboard/pricing",
    icon: IconCurrencyDollar,
    matchPrefixes: ["/dashboard/pricing"],
  },
  {
    title: "Pengeluaran",
    url: "/dashboard/expenses",
    icon: IconReceipt,
    matchPrefixes: ["/dashboard/expenses", "/dashboard/expense-categories"],
  },
  {
    title: "Laporan",
    url: "/dashboard/reports",
    icon: IconChartBar,
    matchPrefixes: ["/dashboard/reports"],
  },
]

function isItemActive(pathname: string, item: NavItem) {
  if (pathname === item.url) return true
  if (!item.matchPrefixes?.length) return false
  return item.matchPrefixes.some((prefix) => pathname.startsWith(prefix))
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = isItemActive(pathname, item)

  return (
    <Link
      href={item.url}
      className={cn(
        "app-sidebar-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
        isActive
          ? "border border-[#d7e4ff] bg-[#eef4ff] text-[#2f62d8] shadow-[inset_0_0_0_1px_rgba(70,95,255,0.08)]"
          : "border border-transparent text-[#667085] hover:bg-[#f8fafc] hover:text-[#1f2937]"
      )}
      title={item.title}
    >
      <item.icon className="size-[18px]" />
      <span className="app-sidebar-link-label">{item.title}</span>
    </Link>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { setOpen, state, toggleSidebar } = useSidebar()

  useEffect(() => {
    setOpen(pathname !== "/dashboard")
  }, [pathname, setOpen])

  const handleLogout = async () => {
    await signOut()
    router.push("/")
  }

  return (
    <Sidebar collapsible="icon" className="app-sidebar border-r border-[#e5e7eb] bg-white" {...props}>
      <SidebarHeader className="app-sidebar-header border-b border-[#eef2f7] px-4 pb-4 pt-5">
        <div className="app-sidebar-header-row flex items-center justify-between gap-2">
          <div className="app-sidebar-logo-group flex items-center gap-3">
            <div className="app-sidebar-logo-badge flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#396fe4] text-white shadow-[0_10px_24px_-14px_rgba(57,111,228,0.8)]">
            <IconDroplet className="size-5" />
            </div>
            <div className="app-sidebar-brand-text">
              <h1 className="text-[15px] font-semibold tracking-tight text-[#0f172a]">AquaGas Pro</h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">Authorized Agent</p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="app-sidebar-toggle-btn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d7dfe9] bg-white text-[#667085] shadow-sm transition hover:bg-[#f8fafc] hover:text-[#1f2937]"
            aria-label="Toggle sidebar"
          >
            <IconChevronLeft className="size-4 transition-transform group-data-[collapsible=icon]:rotate-180" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 px-3 pb-4">
        <p className="app-sidebar-section-label px-2 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">
          Menu
        </p>
        <div className="space-y-1">
          {MAIN_ITEMS.map((item) => (
            <SidebarLink key={item.title} item={item} pathname={pathname} />
          ))}
        </div>
      </SidebarContent>

      <SidebarFooter className="space-y-1 border-t border-[#e5e7eb] p-3">
        <UiScaleToggle collapsed={state === "collapsed"} />
        <p className="app-sidebar-section-label px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">
          Akun
        </p>
        <SidebarLink
          item={{ title: "Settings", url: "/dashboard/settings", icon: IconSettings }}
          pathname={pathname}
        />
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-rose-500 transition-colors hover:bg-rose-50 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          title="Log out"
        >
          <IconLogout className="size-[18px]" />
          <span className="app-sidebar-link-label">Log out</span>
        </button>
        <div className="app-sidebar-user-box app-sidebar-collapsible-block rounded-lg bg-[#f8fafc] px-3 py-2 text-xs text-[#98a2b3]">
          <p>{session?.user?.name ?? "Kasir"}</p>
          <p>{session?.user?.email ?? "admin@ollapos.local"}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
