import { SupabaseClient } from '@supabase/supabase-js'
import { CommunicationIntent, Connection, CommunicationMethod } from '@/types/database'

export interface PendingIntent {
  intent: CommunicationIntent
  connection: Connection
}

/**
 * Check for communication intents that haven't been followed up with a recorded interaction.
 * Returns intents from the last 48 hours that don't have a corresponding interaction.
 */
export async function checkPendingIntents(
  supabase: SupabaseClient,
  userId: string
): Promise<PendingIntent[]> {
  // Get intents from the last 48 hours
  const cutoffDate = new Date()
  cutoffDate.setHours(cutoffDate.getHours() - 48)
  const cutoffIso = cutoffDate.toISOString()

  // Fetch recent intents
  const { data: intents, error: intentsError } = await supabase
    .from('communication_intents')
    .select('*')
    .eq('user_id', userId)
    .gte('initiated_at', cutoffIso)
    .order('initiated_at', { ascending: false })

  if (intentsError || !intents || intents.length === 0) {
    return []
  }

  // Get unique connection IDs
  const connectionIds = Array.from(new Set(intents.map(i => i.connection_id)))

  // Fetch connections for these intents
  const { data: connections, error: connectionsError } = await supabase
    .from('connections')
    .select('*')
    .in('id', connectionIds)

  if (connectionsError || !connections) {
    return []
  }

  const connectionMap = new Map(connections.map(c => [c.id, c]))

  // Check each intent to see if there's a follow-up interaction
  const pendingIntents: PendingIntent[] = []

  for (const intent of intents) {
    // Check if there's an interaction for this connection after the intent was created
    const { data: followUpInteraction } = await supabase
      .from('interactions')
      .select('id')
      .eq('connection_id', intent.connection_id)
      .eq('user_id', userId)
      .gte('created_at', intent.initiated_at)
      .limit(1)
      .single()

    // If no follow-up interaction exists, this is a pending intent
    if (!followUpInteraction) {
      const connection = connectionMap.get(intent.connection_id)
      if (connection) {
        // Only add if we haven't already added an intent for this connection
        // (to avoid multiple prompts for the same person)
        const alreadyHasPending = pendingIntents.some(p => p.connection.id === connection.id)
        if (!alreadyHasPending) {
          pendingIntents.push({
            intent: intent as CommunicationIntent,
            connection: connection as Connection,
          })
        }
      }
    }
  }

  return pendingIntents
}

/**
 * Get a human-readable label for the communication method
 */
export function getMethodLabel(method: CommunicationMethod): string {
  switch (method) {
    case 'call':
      return 'called'
    case 'text':
      return 'texted'
    case 'whatsapp':
      return 'messaged on WhatsApp'
    case 'email':
      return 'emailed'
    default:
      return 'contacted'
  }
}

/**
 * Get the interaction type that corresponds to a communication method
 */
export function methodToInteractionType(method: CommunicationMethod): 'call' | 'text' | 'in_person' | 'other' {
  switch (method) {
    case 'call':
      return 'call'
    case 'text':
    case 'whatsapp':
      return 'text'
    case 'email':
      return 'other'
    default:
      return 'other'
  }
}

/**
 * Dismiss a pending intent by deleting it from the database
 */
export async function dismissPendingIntent(
  supabase: SupabaseClient,
  intentId: string
): Promise<void> {
  await supabase
    .from('communication_intents')
    .delete()
    .eq('id', intentId)
}
