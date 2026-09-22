import { useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppMark } from './AppMark'
import { ChromeContext } from './chrome-context'
import { NAV_ITEMS } from './nav'
import { SyncIndicator } from './SyncIndicator'
import { cn } from '@/core/ui/cn'

function useSectionTitle(): string {
  const { pathname } = useLocation()
  return NAV_ITEMS.find((item) => pathname.startsWith(item.to))?.label ?? 'Lusito Gym'
}

/**
 * Hacia donde se desliza la pantalla nueva: entre secciones, segun su orden en
 * la barra (a la derecha entra desde la derecha); dentro de una seccion, hacia
 * adentro al entrar a un detalle y hacia afuera al volver.
 */
function useScreenMotion(): { key: string; dir: number } {
  const { pathname } = useLocation()
  const previous = useRef<{ pathname: string; key: string; dir: number } | null>(null)
  if (previous.current?.pathname === pathname) return previous.current

  const sectionIndex = (path: string) => NAV_ITEMS.findIndex((item) => path.startsWith(item.to))
  const before = previous.current?.pathname ?? pathname
  const from = sectionIndex(before)
  const to = sectionIndex(pathname)
  let dir = 0
  if (from !== to) dir = to > from ? 1 : -1
  else if (before !== pathname) dir = pathname.length >= before.length ? 1 : -1

  previous.current = { pathname, key: pathname, dir }
  return previous.current
}

/** Navegacion lateral: solo en pantallas anchas (PC). */
function SideNav() {
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col gap-6 border-r border-line surface-glass sticky top-0 h-dvh px-4 py-6">
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
                isActive
                  ? 'bg-accent-soft text-accent-hi font-semibold shadow-[inset_0_0_0_1px_rgb(76_141_255/0.25)]'
                  : 'text-muted hover:text-text hover:bg-elevated',
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

/** Navegacion inferior: solo en celular. Cristal oscuro que deja ver lo de atras. */
function BottomNav() {
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-20 border-t border-line/70 surface-glass pb-safe">
      <div className="flex px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-1 h-16 text-xs transition-colors duration-150',
                isActive ? 'text-accent-hi font-semibold' : 'text-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* La seccion activa lleva una pastilla con brillo detras del icono. */}
                <span
                  className={cn(
                    'grid place-items-center h-8 w-14 rounded-full transition-[background-color,box-shadow] duration-200',
                    isActive && 'bg-accent-soft shadow-[0_0_18px_-4px_rgb(76_141_255/0.6)]',
                  )}
                >
                  <Icon size={21} strokeWidth={isActive ? 2.1 : 1.75} />
                </span>
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
  const motion = useScreenMotion()
  const [hideHeader, setHideHeader] = useState(false)
  const [hideNav, setHideNav] = useState(false)
  const chrome = useMemo(
    () => ({ hideHeader, setHideHeader, hideNav, setHideNav }),
    [hideHeader, hideNav],
  )

  return (
    <ChromeContext.Provider value={chrome}>
      <div className="min-h-full flex">
        <SideNav />

        <div className="flex-1 flex flex-col min-w-0">
          {!hideHeader && (
            <header className="md:hidden sticky top-0 z-10 flex items-center justify-between gap-3 h-14 px-4 border-b border-line/60 surface-glass pt-safe">
              <h1 className="text-lg font-bold tracking-tight truncate">{title}</h1>
              <SyncIndicator />
            </header>
          )}

          <main className={cn('flex-1 min-w-0 md:pb-0', hideNav ? 'pb-0' : 'pb-20')}>
            {/* Cada pantalla entra deslizandose un poco: se nota de donde vienes y a donde vas. */}
            <div key={motion.key} className="animate-screen-in" style={{ '--dir': motion.dir } as React.CSSProperties}>
              <Outlet />
            </div>
          </main>
        </div>

        {!hideNav && <BottomNav />}
      </div>
    </ChromeContext.Provider>
  )
}
