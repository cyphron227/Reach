'use client'

import { useState } from 'react'
import {
  ReplacementAction,
  REPLACEMENT_OPTIONS,
  RelationshipStrength,
  STRENGTH_LABELS,
  INSIGHT_MESSAGES,
} from '@/types/habitEngine'
import { useScrollLock } from '@/lib/useScrollLock'

interface ReplacementFlowProps {
  isOpen: boolean
  connectionName: string
  connectionId: string
  daysSinceAction: number
  currentStrength: RelationshipStrength
  onSelect: (action: ReplacementAction) => void
  onClose: () => void
}

/**
 * Modal for handling connections that have been decaying for 30+ days
 * Offers: Reinvest, Downgrade, Replace, Archive
 *
 * Tone: Honest, supportive, no guilt, no forced churn
 */
export default function ReplacementFlow({
  isOpen,
  connectionName,
  connectionId: _connectionId,
  daysSinceAction,
  currentStrength,
  onSelect,
  onClose,
}: ReplacementFlowProps) {
  void _connectionId // Reserved for API call when implementing backend
  const [selectedAction, setSelectedAction] = useState<ReplacementAction | null>(null)
  const [confirming, setConfirming] = useState(false)

  useScrollLock(isOpen)

  if (!isOpen) return null

  const handleSelect = (action: ReplacementAction) => {
    setSelectedAction(action)
    setConfirming(true)
  }

  const handleConfirm = () => {
    if (selectedAction) {
      onSelect(selectedAction)
      onClose()
    }
  }

  const handleBack = () => {
    setSelectedAction(null)
    setConfirming(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-lavender-800">
                {confirming ? 'Confirm your choice' : 'Time to decide'}
              </h2>
              <p className="text-sm text-lavender-500 mt-1">
                {connectionName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-lavender-400 hover:text-lavender-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!confirming ? (
            <>
              {/* Status info */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🆘</span>
                  <div>
                    <p className="font-medium text-red-700">
                      {STRENGTH_LABELS[currentStrength]}
                    </p>
                    <p className="text-sm text-red-600">
                      {daysSinceAction} days without connection
                    </p>
                  </div>
                </div>
              </div>

              {/* Philosophy message */}
              <div className="bg-lavender-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-lavender-700">
                  {INSIGHT_MESSAGES.regret_prevention}
                </p>
                <p className="text-sm text-lavender-600 mt-2">
                  It&apos;s okay to let go. It&apos;s also okay to recommit. What matters is being intentional.
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {REPLACEMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:border-muted-teal-300 ${
                      option.value === 'reinvest'
                        ? 'border-muted-teal-200 bg-muted-teal-50'
                        : option.value === 'archive'
                        ? 'border-red-200 bg-red-50'
                        : 'border-lavender-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {option.value === 'reinvest' && '💪'}
                        {option.value === 'downgrade' && '↘️'}
                        {option.value === 'replace' && '🔄'}
                        {option.value === 'archive' && '📦'}
                      </span>
                      <div>
                        <p className={`font-medium ${
                          option.value === 'reinvest' ? 'text-muted-teal-700' :
                          option.value === 'archive' ? 'text-red-700' :
                          'text-lavender-800'
                        }`}>
                          {option.label}
                        </p>
                        <p className="text-sm text-lavender-500">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Confirmation view */}
              <div className="mb-6">
                {selectedAction === 'reinvest' && (
                  <div className="bg-muted-teal-50 border border-muted-teal-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">💪</span>
                      <p className="font-medium text-muted-teal-700">Reinvest in {connectionName}</p>
                    </div>
                    <p className="text-sm text-muted-teal-600">
                      You&apos;re committing to rebuild this connection. The relationship will stay in your
                      core focus, and we&apos;ll help you follow through.
                    </p>
                    <p className="text-sm text-muted-teal-700 font-medium mt-3">
                      {INSIGHT_MESSAGES.identity}
                    </p>
                  </div>
                )}

                {selectedAction === 'downgrade' && (
                  <div className="bg-lavender-50 border border-lavender-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">↘️</span>
                      <p className="font-medium text-lavender-700">Move to outer circle</p>
                    </div>
                    <p className="text-sm text-lavender-600">
                      {connectionName} will move to your outer circle with lower expectations.
                      This isn&apos;t giving up—it&apos;s being realistic about your capacity.
                    </p>
                  </div>
                )}

                {selectedAction === 'replace' && (
                  <div className="bg-lavender-50 border border-lavender-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🔄</span>
                      <p className="font-medium text-lavender-700">Make space for someone new</p>
                    </div>
                    <p className="text-sm text-lavender-600">
                      {connectionName} will be archived, freeing up a spot in your core circle
                      for someone you want to invest in.
                    </p>
                  </div>
                )}

                {selectedAction === 'archive' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">📦</span>
                      <p className="font-medium text-red-700">Archive {connectionName}</p>
                    </div>
                    <p className="text-sm text-red-600">
                      This connection will be removed from active tracking. You can always
                      re-add them later if things change.
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmation buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 px-4 bg-lavender-100 hover:bg-lavender-200 text-lavender-700 font-medium rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 py-3 px-4 font-medium rounded-xl transition-colors ${
                    selectedAction === 'reinvest'
                      ? 'bg-muted-teal-500 hover:bg-muted-teal-600 text-white'
                      : selectedAction === 'archive'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-lavender-600 hover:bg-lavender-700 text-white'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
