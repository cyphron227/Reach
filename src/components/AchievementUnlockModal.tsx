'use client'

import { useEffect, useState } from 'react'
import { AchievementDefinition } from '@/types/database'
import { useScrollLock } from '@/lib/useScrollLock'

interface AchievementUnlockModalProps {
  achievements: AchievementDefinition[]
  isOpen: boolean
  onClose: () => void
}

export default function AchievementUnlockModal({
  achievements,
  isOpen,
  onClose
}: AchievementUnlockModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen && achievements.length > 0) {
      setCurrentIndex(0)
      setIsVisible(true)

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        handleNext()
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [isOpen, achievements])

  // Handle showing next achievement with 1.5s delay
  useEffect(() => {
    if (isVisible && currentIndex > 0) {
      const timer = setTimeout(() => {
        // Auto-dismiss after 4 seconds
        const dismissTimer = setTimeout(() => {
          handleNext()
        }, 4000)

        return () => clearTimeout(dismissTimer)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [currentIndex, isVisible])

  // Lock body scroll when modal is open
  useScrollLock(isOpen)

  if (!isOpen || achievements.length === 0) return null

  const currentAchievement = achievements[currentIndex]
  const hasMore = currentIndex < achievements.length - 1

  const handleNext = () => {
    if (hasMore) {
      setIsVisible(false)
      // Wait for fade out, then show next achievement
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1)
        setIsVisible(true)
      }, 500)
    } else {
      setIsVisible(false)
      setTimeout(() => {
        onClose()
      }, 500)
    }
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-safe transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`w-full max-w-[400px] bg-slate text-bone rounded-lg shadow-elevated px-6 py-4 flex items-center gap-4 ${isVisible ? 'animate-fade-slide-up' : ''}`}>
        {/* Moss dot indicator */}
        <div className="w-2 h-2 rounded-full bg-moss flex-shrink-0" />

        {/* Achievement content */}
        <div className="flex-1 min-w-0">
          <div className="text-body-medium font-medium mb-0.5">
            {currentAchievement.name}
          </div>
          <div className="text-micro text-bone/70">
            {currentAchievement.description}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleNext}
          className="text-bone opacity-70 hover:opacity-100 transition-opacity text-sm font-medium whitespace-nowrap flex-shrink-0"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
