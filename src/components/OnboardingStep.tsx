'use client'

import { ReactNode } from 'react'

interface OnboardingStepProps {
  children: ReactNode
  className?: string
}

/**
 * Wrapper component for onboarding step content
 * Provides consistent styling and layout
 */
export default function OnboardingStep({
  children,
  className = '',
}: OnboardingStepProps) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] px-6 text-center ${className}`}>
      {children}
    </div>
  )
}

interface OnboardingTitleProps {
  children: ReactNode
  className?: string
}

export function OnboardingTitle({ children, className = '' }: OnboardingTitleProps) {
  return (
    <h1 className={`text-2xl font-semibold text-gray-900 mb-4 ${className}`}>
      {children}
    </h1>
  )
}

interface OnboardingTextProps {
  children: ReactNode
  className?: string
}

export function OnboardingText({ children, className = '' }: OnboardingTextProps) {
  return (
    <p className={`text-gray-600 text-lg leading-relaxed max-w-sm ${className}`}>
      {children}
    </p>
  )
}

interface OnboardingButtonProps {
  onClick: () => void
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  className?: string
}

export function OnboardingButton({
  onClick,
  children,
  variant = 'primary',
  disabled = false,
  className = '',
}: OnboardingButtonProps) {
  const baseStyles = 'px-8 py-3 rounded-full font-medium transition-all duration-200'

  const variantStyles = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    ghost: 'text-gray-500 hover:text-gray-700',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

interface OnboardingListProps {
  items: Array<{
    icon?: string
    text: string
    positive?: boolean
  }>
  className?: string
}

export function OnboardingList({ items, className = '' }: OnboardingListProps) {
  return (
    <ul className={`space-y-3 text-left ${className}`}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className={`text-lg ${item.positive === false ? 'text-gray-400' : 'text-emerald-600'}`}>
            {item.icon || (item.positive === false ? '\u2717' : '\u2713')}
          </span>
          <span className={item.positive === false ? 'text-gray-500' : 'text-gray-700'}>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  )
}
