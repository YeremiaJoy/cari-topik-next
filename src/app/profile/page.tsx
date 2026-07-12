import { Suspense } from 'react'
import RequireAuth from '../../components/RequireAuth'
import ProfilePage from '../../views/ProfilePage'

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <ProfilePage />
      </Suspense>
    </RequireAuth>
  )
}
