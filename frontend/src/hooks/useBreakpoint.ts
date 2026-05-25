import { useEffect, useState } from 'react'

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface BreakpointState {
  breakpoint: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
}

function resolveBreakpoint(width: number): Breakpoint {
  if (width >= 1280) return 'xl'
  if (width >= 1024) return 'lg'
  if (width >= 768)  return 'md'
  if (width >= 640)  return 'sm'
  return 'xs'
}

function buildState(width: number): BreakpointState {
  return {
    breakpoint: resolveBreakpoint(width),
    isMobile:   width < 640,
    isTablet:   width >= 640 && width <= 1024,
    isDesktop:  width > 1024,
    width,
  }
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(() =>
    buildState(typeof window !== 'undefined' ? window.innerWidth : 1280)
  )

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const handleResize = () => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        setState(buildState(window.innerWidth))
      }, 100)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
      }
    }
  }, [])

  return state
}
