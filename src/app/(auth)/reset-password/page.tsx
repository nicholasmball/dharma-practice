import { redirect } from 'next/navigation'

// Password reset is retired along with password sign-in (Mini Move 4).
// Google now owns account recovery, so this screen has nothing to do.
export default function ResetPasswordPage() {
  redirect('/login')
}
