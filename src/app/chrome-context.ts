import { createContext, useContext } from 'react'

export type ChromeValue = {
  /** Oculta la cabecera general para que la sesion activa ocupe toda la pantalla. */
  hideHeader: boolean
  setHideHeader: (hide: boolean) => void
}

export const ChromeContext = createContext<ChromeValue>({
  hideHeader: false,
  setHideHeader: () => undefined,
})

export function useChrome(): ChromeValue {
  return useContext(ChromeContext)
}
