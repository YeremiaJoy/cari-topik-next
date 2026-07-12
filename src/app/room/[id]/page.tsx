import RequireAuth from '../../../components/RequireAuth'
import SessionPage from '../../../views/SessionPage'

export default function Page() {
  return (
    <RequireAuth>
      <SessionPage />
    </RequireAuth>
  )
}
