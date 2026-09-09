import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { useAccessMatrix, visibleWorkspaces } from '../lib/access'
import { signOut } from '../lib/auth'
import type { Profile } from '../lib/types'
import type { Workspace } from '../lib/constants'
import Sidebar from './Sidebar'
import Toast from './Toast'
import ManageUsersModal from '../screens/auth/ManageUsersModal'
import CeoOverview from '../screens/CeoOverview'
import Providers from '../screens/Providers'
import PipelineBoard from '../screens/PipelineBoard'
import Finance from '../screens/Finance'
import Hr from '../screens/Hr'
import Documents from '../screens/Documents'
import ManageAccess from '../screens/ManageAccess'
import Faq from '../screens/Faq'
import AddClinicModal from '../modals/AddClinicModal'

interface AppShellProps {
  profile: Profile
}

export default function AppShell({ profile }: AppShellProps) {
  const workspace = useAppStore((s) => s.workspace)
  const setWorkspace = useAppStore((s) => s.setWorkspace)
  const ceoPersona = useAppStore((s) => s.ceoPersona)
  const market = useAppStore((s) => s.market)
  const setMarket = useAppStore((s) => s.setMarket)
  const { matrix, reload } = useAccessMatrix()
  const [manageUsers, setManageUsers] = useState(false)
  const [addClinic, setAddClinic] = useState(false)

  // A Sales / Trainer login pinned to a market is locked to it everywhere.
  const lockedMarket = profile.market ?? null
  useEffect(() => {
    if (lockedMarket && market !== lockedMarket) setMarket(lockedMarket)
  }, [lockedMarket, market, setMarket])

  const effectiveRole = profile.role === 'CEO' && !ceoPersona ? 'Sales' : profile.role
  const visible = useMemo<Set<Workspace>>(
    () => visibleWorkspaces(effectiveRole, matrix),
    [effectiveRole, matrix],
  )

  const active: Workspace = visible.has(workspace) ? workspace : (([...visible][0] as Workspace) || 'faq')
  if (active !== workspace) setWorkspace(active)

  const [navOpen, setNavOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--canvas)' }}>
      <div
        className="ml-shell-scrim"
        data-open={navOpen ? 'true' : 'false'}
        onClick={() => setNavOpen(false)}
      />
      <div
        className="ml-shell-sidebar"
        data-open={navOpen ? 'true' : 'false'}
        style={{ display: 'flex' }}
        onClick={() => setNavOpen(false)}
      >
        <Sidebar
          profile={profile}
          visibleWorkspaces={visible}
          lockedMarket={lockedMarket}
          onManageUsers={() => setManageUsers(true)}
          onAddClinic={() => setAddClinic(true)}
          onSignOut={signOut}
        />
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <button
          className="ml-shell-menu-btn"
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 90,
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: '#fff',
            boxShadow: '0 2px 10px rgba(12,25,32,.14)',
            cursor: 'pointer',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
            color: 'var(--ink)',
          }}
        >
          ☰
        </button>
        {active === 'ceo' && <CeoOverview profile={profile} />}
        {active === 'providers' && <Providers profile={profile} onAddClinic={() => setAddClinic(true)} />}
        {active === 'closer' && (
          <PipelineBoard key="closer" profile={profile} boardType="closer" onAddClinic={() => setAddClinic(true)} />
        )}
        {active === 'trainer' && (
          <PipelineBoard key="trainer" profile={profile} boardType="trainer" onAddClinic={() => setAddClinic(true)} />
        )}
        {active === 'finance' && <Finance profile={profile} />}
        {active === 'documents' && <Documents profile={profile} />}
        {active === 'hr' && <Hr profile={profile} />}
        {active === 'faq' && <Faq profile={profile} />}
        {active === 'access' && <ManageAccess profile={profile} matrix={matrix} onChange={reload} />}
      </main>

      <Toast />
      {manageUsers && <ManageUsersModal me={profile} onClose={() => setManageUsers(false)} />}
      {addClinic && <AddClinicModal onClose={() => setAddClinic(false)} />}
    </div>
  )
}
