import { getExpenseCategoryIcon } from "@/lib/expense-category-icons"

export const DEFAULT_EXPENSE_CATEGORY_COLOR = "#6B7280"

type ExpenseCategoryLike = {
  name: string
  icon?: string | null
  color?: string | null
}

export function getExpenseCategoryPresentation(category: ExpenseCategoryLike) {
  return {
    name: category.name,
    color: category.color?.trim() || DEFAULT_EXPENSE_CATEGORY_COLOR,
    Icon: getExpenseCategoryIcon(category.icon),
  }
}
