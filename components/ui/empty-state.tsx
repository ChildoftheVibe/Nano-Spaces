import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
      {icon && <div className="text-gray-300">{icon}</div>}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <p className="max-w-xs text-sm text-gray-400">{description}</p>
      </div>
      {action &&
        (action.href ? (
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="mt-2" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  )
}
