import { useEffect, useRef } from 'react'

/**
 * Hook to lock body scroll when a modal is open.
 * Properly preserves and restores the original overflow value.
 */
export function useScrollLock(isLocked: boolean) {
  const originalOverflowRef = useRef<string>('')

  useEffect(() => {
    if (isLocked) {
      // Save the original overflow value before changing it
      originalOverflowRef.current = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    return () => {
      // Restore the original overflow value on cleanup
      if (isLocked) {
        document.body.style.overflow = originalOverflowRef.current
      }
    }
  }, [isLocked])
}
