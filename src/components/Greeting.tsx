'use client'

interface GreetingProps {
  userName?: string | null
}

function getGreeting(): string {
  const hour = new Date().getHours()

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getEncouragement(hasConnection: boolean): string {
  if (!hasConnection) {
    return "Add someone you'd like to stay in touch with."
  }

  const encouragements = [
    "Here's someone who might love to hear from you.",
    "A small moment of connection can mean a lot.",
    "Who's on your mind today?",
    "Reaching out doesn't have to be big.",
  ]

  return encouragements[Math.floor(Math.random() * encouragements.length)]
}

export default function Greeting({ userName }: GreetingProps) {
  const greeting = getGreeting()
  const firstName = userName?.split(' ')[0]

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-lavender-800 mb-1">
        {greeting}{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-lavender-500">{getEncouragement(true)}</p>
    </div>
  )
}
