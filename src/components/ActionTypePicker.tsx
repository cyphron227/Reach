'use client'

import { useState } from 'react'
import {
  ActionTypeV2,
  ACTION_WEIGHTS,
  ACTION_LABELS,
  ACTION_DESCRIPTIONS,
} from '@/types/habitEngine'

interface ActionTypePickerProps {
  value: ActionTypeV2
  onChange: (value: ActionTypeV2) => void
  showWeights?: boolean
  showDescriptions?: boolean
  disabled?: boolean
  className?: string
}

const ACTION_ICONS: Record<ActionTypeV2, string> = {
  self_reflection: '💭',
  text: '💬',
  social_planning: '📅',
  call: '📞',
  group_activity: '👥',
  in_person_1on1: '🤝',
}

const ACTION_ORDER: ActionTypeV2[] = [
  'text',
  'call',
  'in_person_1on1',
  'group_activity',
  'social_planning',
  'self_reflection',
]

/**
 * Action type picker for selecting the type of social investment
 * Shows weights and descriptions to help users understand the value of each action
 */
export default function ActionTypePicker({
  value,
  onChange,
  showWeights = true,
  showDescriptions = false,
  disabled = false,
  className = '',
}: ActionTypePickerProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Selected value display (compact mode) */}
      {!expanded && (
        <button
          type="button"
          onClick={() => !disabled && setExpanded(true)}
          disabled={disabled}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-lavender-200 rounded-xl text-left hover:border-muted-teal-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{ACTION_ICONS[value]}</span>
            <div>
              <span className="font-medium text-lavender-800">{ACTION_LABELS[value]}</span>
              {showWeights && (
                <span className="ml-2 text-xs text-muted-teal-600 bg-muted-teal-50 px-2 py-0.5 rounded-full">
                  +{ACTION_WEIGHTS[value]} weight
                </span>
              )}
            </div>
          </div>
          <svg
            className="w-5 h-5 text-lavender-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Expanded options */}
      {expanded && (
        <div className="bg-white border border-lavender-200 rounded-xl overflow-hidden shadow-lg">
          <div className="p-3 border-b border-lavender-100 flex items-center justify-between">
            <span className="text-sm font-medium text-lavender-700">Select action type</span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-lavender-400 hover:text-lavender-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="divide-y divide-lavender-100">
            {ACTION_ORDER.map((actionType) => {
              const isSelected = value === actionType
              return (
                <button
                  key={actionType}
                  type="button"
                  onClick={() => {
                    onChange(actionType)
                    setExpanded(false)
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-muted-teal-50'
                      : 'hover:bg-lavender-50'
                  }`}
                >
                  <span className="text-xl mt-0.5">{ACTION_ICONS[actionType]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          isSelected ? 'text-muted-teal-700' : 'text-lavender-800'
                        }`}
                      >
                        {ACTION_LABELS[actionType]}
                      </span>
                      {showWeights && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-muted-teal-100 text-muted-teal-700'
                              : 'bg-lavender-100 text-lavender-600'
                          }`}
                        >
                          +{ACTION_WEIGHTS[actionType]}
                        </span>
                      )}
                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-muted-teal-500 ml-auto"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    {showDescriptions && (
                      <p className="text-xs text-lavender-500 mt-0.5">
                        {ACTION_DESCRIPTIONS[actionType]}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Weight explanation */}
          <div className="p-3 bg-lavender-50 border-t border-lavender-100">
            <p className="text-xs text-lavender-600">
              Higher weights = deeper connection. Text keeps contact, calls build connection, in-person creates bonds.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact inline version for use in forms
 */
export function ActionTypeSelect({
  value,
  onChange,
  disabled = false,
  className = '',
}: Omit<ActionTypePickerProps, 'showWeights' | 'showDescriptions'>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ActionTypeV2)}
      disabled={disabled}
      className={`w-full px-4 py-3 rounded-xl border border-lavender-200 bg-white text-lavender-800 focus:outline-none focus:ring-2 focus:ring-muted-teal-400 focus:border-transparent transition-all disabled:opacity-50 ${className}`}
    >
      {ACTION_ORDER.map((actionType) => (
        <option key={actionType} value={actionType}>
          {ACTION_ICONS[actionType]} {ACTION_LABELS[actionType]} (+{ACTION_WEIGHTS[actionType]})
        </option>
      ))}
    </select>
  )
}
