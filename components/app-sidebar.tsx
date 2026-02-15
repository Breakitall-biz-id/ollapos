"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "@/lib/auth-client"
import {
  IconShoppingBag,
  IconPackage,
  IconUsers,
  IconTag,
  IconSettings,
  IconHelp,
  IconSearch,
  IconChartBar,
  IconTruckDelivery,
  IconReceipt,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const staticData = {
  navMain: [
    {
      title: "POS",
      url: "/dashboard",
      icon: IconShoppingBag,
    },
    {
      title: "Produk",
      url: "/dashboard/products",
      icon: IconPackage,
    },
    {
      title: "Barang Masuk",
      url: "/dashboard/inventory",
      icon: IconTruckDelivery,
    },
    {
      title: "Pelanggan",
      url: "/dashboard/customers",
      icon: IconUsers,
    },
    {
      title: "Harga",
      url: "/dashboard/pricing",
      icon: IconTag,
    },
    {
      title: "Pengeluaran",
      url: "/dashboard/expenses",
      icon: IconReceipt,
    },
    {
      title: "Laporan",
      url: "/dashboard/reports",
      icon: IconChartBar,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
   
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  
  const userData = session?.user
    ? {
        name: session.user.name || "User",
        email: session.user.email,
        avatar: session.user.image || "/codeguide-logo.png",
      }
    : {
        name: "Guest",
        email: "guest@example.com",
        avatar: "/codeguide-logo.png",
      }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <IconShoppingBag className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold tracking-wide">Ollapos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={staticData.navMain} />
        <NavSecondary items={staticData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
