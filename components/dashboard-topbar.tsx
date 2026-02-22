"use client"

import { Bell, Moon } from "lucide-react"
import { usePathname } from "next/navigation"

import { useSession } from "@/lib/auth-client"
import { CustomerGroupIcon } from "@/components/icons/customer-group-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function DashboardTopbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (pathname === "/dashboard") return null

  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar-inner justify-end">
        <div className="dashboard-topbar-right">
          <button type="button" className="dashboard-icon-btn" aria-label="Theme">
            <Moon className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className="dashboard-icon-btn dashboard-icon-btn-notification" aria-label="Notifikasi">
            <Bell className="h-4 w-4" aria-hidden />
          </button>

          <div className="dashboard-user-chip">
            <Avatar className="h-9 w-9 border border-[#e4e7ec]">
              {session?.user?.image ? <AvatarImage src={session.user.image} alt={session.user.name ?? "User"} /> : null}
              <AvatarFallback className="bg-[#eef4ff] text-[#2f62d8]">
                <CustomerGroupIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <span className="dashboard-user-name">{session?.user?.name ?? "Kasir"}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
