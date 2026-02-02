import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// CORS headers for Capacitor app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function DELETE(request: NextRequest) {
  try {
    let userId: string | undefined

    // Check for Authorization header (from Capacitor app)
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)

      // Create admin client to verify the token
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      // Verify the token and get the user
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (error || !user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders })
      }
      userId = user.id
    } else {
      // Fall back to cookie-based auth (for web)
      const supabase = await createServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: corsHeaders })
    }

    const user = { id: userId }

    // Create admin client to delete auth user (reuse if already created for token verification)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Delete all user data in order (respecting foreign key constraints)
    // 1. Delete communication intents
    await supabaseAdmin
      .from('communication_intents')
      .delete()
      .eq('user_id', user.id)

    // 2. Delete interactions
    await supabaseAdmin
      .from('interactions')
      .delete()
      .eq('user_id', user.id)

    // 3. Delete weekly reflections
    await supabaseAdmin
      .from('weekly_reflections')
      .delete()
      .eq('user_id', user.id)

    // 4. Delete connections
    await supabaseAdmin
      .from('connections')
      .delete()
      .eq('user_id', user.id)

    // 5. Delete user settings
    await supabaseAdmin
      .from('user_settings')
      .delete()
      .eq('user_id', user.id)

    // 6. Delete user profile
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id)

    // 7. Delete the auth user (requires admin privileges)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500, headers: corsHeaders })
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500, headers: corsHeaders })
  }
}
