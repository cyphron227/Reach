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
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen && achievements.length > 0) {
      setCurrentIndex(0)
      setShowConfetti(true)
      // Hide confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, achievements])

  // Lock body scroll when modal is open
  useScrollLock(isOpen)

  if (!isOpen || achievements.length === 0) return null

  const currentAchievement = achievements[currentIndex]
  const hasMore = currentIndex < achievements.length - 1

  const handleNext = () => {
    if (hasMore) {
      setCurrentIndex(currentIndex + 1)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overscroll-contain">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6'][Math.floor(Math.random() * 5)],
                width: '10px',
                height: '10px',
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl transform animate-bounce-in">
        <div className="p-8 text-center">
          {/* Achievement Icon */}
          <div className="text-6xl mb-4 animate-pulse">
            {currentAchievement.icon}
          </div>

          {/* Title */}
          <div className="text-xs font-medium text-muted-teal-600 uppercase tracking-wider mb-2">
            Achievement Unlocked!
          </div>

          {/* Achievement Name */}
          <h2 className="text-2xl font-bold text-lavender-800 mb-2">
            {currentAchievement.name}
          </h2>

          {/* Description */}
          <p className="text-lavender-600 mb-6">
            {currentAchievement.description}
          </p>

          {/* Category Badge */}
          <div className="inline-block px-3 py-1 bg-lavender-100 text-lavender-600 text-xs font-medium rounded-full mb-6 capitalize">
            {currentAchievement.category}
          </div>

          {/* Progress indicator for multiple achievements */}
          {achievements.length > 1 && (
            <div className="flex justify-center gap-1.5 mb-6">
              {achievements.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex ? 'bg-muted-teal-500' : 'bg-lavender-200'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleNext}
            className="w-full py-3 px-4 bg-muted-teal-500 hover:bg-muted-teal-600 text-white font-medium rounded-xl transition-colors"
          >
            {hasMore ? 'Next Achievement' : 'Awesome!'}
          </button>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        @keyframes bounce-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
