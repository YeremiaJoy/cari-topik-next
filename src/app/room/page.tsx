import RequireAuth from '../../components/RequireAuth'
import DashboardPage from '../../views/DashboardPage'

export default function Page() {
  return (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  )
}
