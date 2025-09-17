'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Redirect to dashboard after successful login
        window.location.href = '/dashboard'
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        view="sign_in"
        redirectTo="/dashboard"
        providers={[]}
      />
    </div>
  )
}
