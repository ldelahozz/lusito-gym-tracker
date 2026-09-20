import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppMark } from './AppMark'
import { NAV_ITEMS } from './nav'
import { SyncIndicator } from './SyncIndicator'
import { cn } from '@/core/ui/cn'

function useSectionTitle(): string {
  const { pathname } = useLocation()
  return NAV_ITEMS.find((item) => pathname.startsWith(item.to))?.label ?? 'Lusito Gym'
}

/** Navegacion lateral: solo en pantallas anchas (PC). */
function SideNav() {
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-6">
      <div className="flex items-center gap-3 px-2">
        <AppMark size={36} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">Lusito Gym</p>
          <p className="text-xs text-muted leading-tight">Tracker</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 h-12 px-3 rounded-control text-[15px] transition-colors duration-150',
                isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:text-text hover:bg-elevated',
              )
            }
          >
            <Icon size={20} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3">
        <SyncIndicator withLabel />
      </div>
    </aside>
  )
}

/** Navegacion inferior: solo en celular. */
function BottomNav() {
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-20 border-t border-line bg-elevated pb-safe">
      <div className="flex">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-1 h-16 text-[11px] transition-colors duration-150',
                isActive ? 'text-accent' : 'text-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2 : 1.75} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function AppShell() {
  const title = useSectionTitle()

  return (
    <div className="min-h-full flex bg-canvas">
      <SideNav />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-10 flex items-center justify-between gap-3 h-14 px-4 border-b border-line bg-canvas/95 backdrop-blur pt-safe">
          <h1 className="text-base font-semibold truncate">{title}</h1>
          <SyncIndicator />
        </header>

        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
