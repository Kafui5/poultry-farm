import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

const nav = [
  { to: '/', label: '📊 Dashboard' },
  { to: '/accounts', label: '📒 Accounts' },
  { to: '/journal', label: '📝 Journal' },
  { to: '/customers', label: '👥 Customers' },
  { to: '/vendors', label: '🏭 Vendors' },
  { to: '/invoices', label: '🧾 Invoices' },
  { to: '/bills', label: '📄 Bills' },
  { to: '/inventory', label: '📦 Inventory' },
  { to: '/flocks', label: '🐔 Flocks' },
  { to: '/reports', label: '📈 Reports' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-green-800 text-white flex flex-col">
        <div className="p-4 border-b border-green-700">
          <div className="text-xl font-bold">🐔 PoultryBooks</div>
          <div className="text-xs text-green-300 mt-1">{user?.name}</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm hover:bg-green-700 transition-colors ${isActive ? 'bg-green-700 font-semibold' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} className="p-4 text-sm text-green-300 hover:text-white border-t border-green-700 text-left">
          🚪 Logout
        </button>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
