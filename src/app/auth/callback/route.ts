import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/app'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${origin}/signin?error=auth_error`)
      }

      // Get the user after successful auth
      const { data: { user } } = await supabase.auth.getUser()
      
      // Check if profile exists, if not create it (fallback for any edge cases)
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // If profile doesn't exist, create it
        if (profileError && profileError.code === 'PGRST116') {
          const userMetadata = user.user_metadata || {}
          let firstName = ''
          let lastName = ''

          // Extract name from metadata
          if (userMetadata.full_name) {
            const nameParts = userMetadata.full_name.split(' ')
            firstName = nameParts[0] || ''
            lastName = nameParts.slice(1).join(' ') || ''
          } else if (userMetadata.name) {
            const nameParts = userMetadata.name.split(' ')
            firstName = nameParts[0] || ''
            lastName = nameParts.slice(1).join(' ') || ''
          } else {
            // Fallback to email username
            firstName = user.email?.split('@')[0] || ''
          }

          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              first_name: firstName,
              last_name: lastName,
              avatar_url: userMetadata.avatar_url || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
        }
      }
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${origin}/signin?error=auth_error`)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}${next}`)
}
