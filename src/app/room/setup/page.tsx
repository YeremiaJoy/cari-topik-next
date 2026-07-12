import RequireAuth from '../../../components/RequireAuth'
import RoomSetupPage from '../../../views/RoomSetupPage'

export default function Page() {
  return (
    <RequireAuth>
      <RoomSetupPage />
    </RequireAuth>
  )
}
