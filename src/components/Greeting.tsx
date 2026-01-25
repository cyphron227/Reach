'use client'

import { useMemo } from 'react'

interface GreetingProps {
  userName?: string | null
}

function getGreeting(): string {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const encouragements = [
  "Here's someone who might love to hear from you.",
  "A small moment of connection can mean a lot.",
  "Who's on your mind today?",
  "Reaching out doesn't have to be big.",
]

export default function Greeting({ userName }: GreetingProps) {
  const greeting = getGreeting()
  const firstName = userName?.split(' ')[0]

  // Only pick a random encouragement once on mount, not on every render
  const encouragement = useMemo(() => {
    return encouragements[Math.floor(Math.random() * encouragements.length)]
  }, [])

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-lavender-800 mb-1">
        {greeting}{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-lavender-500">{encouragement}</p>
    </div>
  )
}
