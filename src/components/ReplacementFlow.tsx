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
      className="fixed inset-0 bg-obsidian/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pt-4 pb-safe overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-bone rounded-lg w-full max-w-md shadow-modal max-h-[90vh] overflow-y-auto overscroll-contain">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-h2 font-medium text-obsidian">
                {confirming ? 'Confirm your choice' : 'Time to decide'}
              </h2>
              <p className="text-body text-ash mt-1">
                {connectionName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-ash hover:text-obsidian transition-all duration-calm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!confirming ? (
            <>
              {/* Status info */}
              <div className="bg-bone-warm rounded-md shadow-card p-4 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-body font-medium text-ember">Status</span>
                  <div>
                    <p className="font-medium text-ember">
                      {STRENGTH_LABELS[currentStrength]}
                    </p>
                    <p className="text-body text-ember">
                      {daysSinceAction} days without connection
                    </p>
                  </div>
                </div>
              </div>

              {/* Philosophy message */}
              <div className="bg-bone-warm rounded-md shadow-card p-4 mb-6">
                <p className="text-body text-obsidian">
                  {INSIGHT_MESSAGES.regret_prevention}
                </p>
                <p className="text-body text-ash mt-2">
                  It&apos;s okay to let go. It&apos;s also okay to recommit. What matters is being intentional.
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {REPLACEMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full p-4 rounded-md shadow-card text-left transition-all duration-calm hover:opacity-90 ${
                      option.value === 'reinvest'
                        ? 'bg-moss/10 ring-1 ring-moss/30'
                        : option.value === 'archive'
                        ? 'bg-ember/10 ring-1 ring-ember/30'
                        : 'bg-bone-warm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-body font-medium">
                        {option.value === 'reinvest' && 'Reinvest'}
                        {option.value === 'downgrade' && 'Move to outer circle'}
                        {option.value === 'replace' && 'Replace'}
                        {option.value === 'archive' && 'Archive'}
                      </span>
                      <div>
                        <p className={`font-medium ${
                          option.value === 'reinvest' ? 'text-moss' :
                          option.value === 'archive' ? 'text-ember' :
                          'text-obsidian'
                        }`}>
                          {option.label}
                        </p>
                        <p className="text-body text-ash">
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
                  <div className="bg-moss/10 ring-1 ring-moss/30 rounded-md shadow-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-body font-medium text-moss">Reinvest</span>
                      <p className="font-medium text-moss">Reinvest in {connectionName}</p>
                    </div>
                    <p className="text-body text-obsidian">
                      You&apos;re committing to rebuild this connection. The relationship will stay in your
                      core focus, and we&apos;ll help you follow through.
                    </p>
                    <p className="text-body text-moss font-medium mt-3">
                      {INSIGHT_MESSAGES.identity}
                    </p>
                  </div>
                )}

                {selectedAction === 'downgrade' && (
                  <div className="bg-bone-warm rounded-md shadow-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-body font-medium text-obsidian">Move</span>
                      <p className="font-medium text-obsidian">Move to outer circle</p>
                    </div>
                    <p className="text-body text-ash">
                      {connectionName} will move to your outer circle with lower expectations.
                      This isn&apos;t giving up—it&apos;s being realistic about your capacity.
                    </p>
                  </div>
                )}

                {selectedAction === 'replace' && (
                  <div className="bg-bone-warm rounded-md shadow-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-body font-medium text-obsidian">Replace</span>
                      <p className="font-medium text-obsidian">Make space for someone new</p>
                    </div>
                    <p className="text-body text-ash">
                      {connectionName} will be archived, freeing up a spot in your core circle
                      for someone you want to invest in.
                    </p>
                  </div>
                )}

                {selectedAction === 'archive' && (
                  <div className="bg-ember/10 ring-1 ring-ember/30 rounded-md shadow-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-body font-medium text-ember">Archive</span>
                      <p className="font-medium text-ember">Archive {connectionName}</p>
                    </div>
                    <p className="text-body text-ember">
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
                  className="flex-1 py-3 px-4 bg-bone-warm hover:bg-ash/10 text-obsidian font-medium rounded-md transition-all duration-calm"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 py-3 px-4 font-medium rounded-md transition-all duration-calm ${
                    selectedAction === 'reinvest'
                      ? 'bg-moss hover:opacity-90 text-bone'
                      : selectedAction === 'archive'
                      ? 'bg-ember hover:opacity-90 text-bone'
                      : 'bg-slate hover:opacity-90 text-bone'
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
