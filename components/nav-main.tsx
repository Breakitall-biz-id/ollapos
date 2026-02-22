"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="sr-only">Menu</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col items-center gap-4">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                asChild
                className={cn(
                  "size-10 justify-center rounded-lg p-0",
                  pathname === item.url
                    ? "bg-[#396fe4]/10 text-[#396fe4]"
                    : "text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#396fe4]"
                )}
              >
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span className="sr-only">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
