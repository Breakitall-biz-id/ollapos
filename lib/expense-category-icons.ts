import type { ComponentType } from "react"
import {
  FileText,
  Home,
  HomeIcon,
  Megaphone,
  MoreHorizontal,
  Package,
  Settings,
  Tag,
  User,
  Users,
  Wrench,
  Zap,
} from "lucide-react"

type IconProps = {
  className?: string
  "aria-hidden"?: boolean
}

const categoryIconMap: Record<string, ComponentType<IconProps>> = {
  Settings,
  Zap,
  Wrench,
  Users,
  User,
  Megaphone,
  Package,
  Home,
  HomeIcon,
  FileText,
  MoreHorizontal,
}

export function getExpenseCategoryIcon(iconName?: string | null): ComponentType<IconProps> {
  if (!iconName) return Tag
  return categoryIconMap[iconName] || Tag
}
