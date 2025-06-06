
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [windowWidth, setWindowWidth] = React.useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  )

  React.useEffect(() => {
    const updateSize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    // Add event listener
    window.addEventListener('resize', updateSize)
    
    // Initialize on mount
    updateSize()
    
    // Clean up
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return windowWidth < MOBILE_BREAKPOINT
}

export function useBreakpoint() {
  const [windowWidth, setWindowWidth] = React.useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  )

  React.useEffect(() => {
    const updateSize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    // Add event listener
    window.addEventListener('resize', updateSize)
    
    // Initialize on mount
    updateSize()
    
    // Clean up
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return {
    isMobile: windowWidth < 768,
    isTablet: windowWidth >= 768 && windowWidth < 1024,
    isDesktop: windowWidth >= 1024,
    windowWidth
  }
}
