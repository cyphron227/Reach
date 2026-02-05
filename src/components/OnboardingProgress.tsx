'use client'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
  className?: string
}

/**
 * Progress indicator for onboarding flow
 * Shows dots representing each step, with current step highlighted
 */
export default function OnboardingProgress({
  currentStep,
  totalSteps,
  className = '',
}: OnboardingProgressProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep

        return (
          <div
            key={stepNumber}
            className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${isActive ? 'w-6 bg-emerald-600' : ''}
              ${isCompleted ? 'bg-emerald-600' : ''}
              ${!isActive && !isCompleted ? 'bg-gray-300' : ''}
            `}
            aria-label={`Step ${stepNumber} of ${totalSteps}${isActive ? ' (current)' : ''}${isCompleted ? ' (completed)' : ''}`}
          />
        )
      })}
    </div>
  )
}
