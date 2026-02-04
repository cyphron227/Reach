import { CatchupFrequency } from '@/types/database'

/**
 * Number of days between catch-ups for each frequency
 */
export const frequencyToDays: Record<CatchupFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  biannually: 180,
  annually: 365,
}

/**
 * Human-readable labels for each frequency
 */
export const frequencyLabels: Record<CatchupFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Every 3 months',
  biannually: 'Every 6 months',
  annually: 'Annually',
}

/**
 * Frequency options for form selects
 */
export const frequencyOptions: { value: CatchupFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'biannually', label: 'Every 6 months' },
  { value: 'annually', label: 'Annually' },
]
