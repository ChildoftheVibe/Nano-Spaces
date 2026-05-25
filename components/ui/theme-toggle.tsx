'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/providers/theme-provider'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-white/40 dark:hover:bg-white/[0.07] transition-all duration-300 ${className ?? ''}`}
      style={{ transition: 'all 0.35s cubic-bezier(0.32,0.72,0,1)' }}
    >
      {theme === 'dark' ? (
        <Sun className="h-[15px] w-[15px]" />
      ) : (
        <Moon className="h-[15px] w-[15px]" />
      )}
    </button>
  )
}
