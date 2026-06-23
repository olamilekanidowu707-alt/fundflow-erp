'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, CheckCircle, Banknote, Users, Building2, Bell, LogOut, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials } from '@/lib/utils'
import type { Profile } from '@/types'

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  roles: string[]
  badge?: number
}

interface SidebarProps {
  profile: Profile
  notificationCount?: number
}

export function Sidebar({ profile, notificationCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const navItems: NavItem[] = [
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard',    href: '/dashboard',  roles: ['staff','manager','finance','admin'] },
    { icon: <FileText size={16} />,       label: 'My requests',   href: '/requests',   roles: ['staff'] },
    { icon: <CheckCircle size={16} />,    label: 'Approvals',     href: '/approvals',  roles: ['manager','finance'] },
    { icon: <Banknote size={16} />,       label: 'Payments',      href: '/payments',   roles: ['finance'] },
    { icon: <Building2 size={16} />,      label: 'Departments',   href: '/admin/departments', roles: ['admin'] },
    { icon: <Users size={16} />,          label: 'Staff',         href: '/admin/staff',      roles: ['admin'] },
    { icon: <FileText size={16} />,       label: 'All requests',  href: '/admin/requests',   roles: ['admin'] },
  ]

  const visible = navItems.filter(item => item.roles.includes(profile.role))

  async function logout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const roleColors: Record<string, string> = {
    staff:   'bg-green-100 text-green-800',
    manager: 'bg-blue-100 text-blue-800',
    finance: 'bg-amber-100 text-amber-800',
    admin:   'bg-purple-100 text-purple-800',
  }
  const roleLabels: Record<string, string> = {
    staff: 'Staff', manager: 'Manager', finance: 'Finance Director', admin: 'Admin'
  }

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Banknote size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">FundFlow</div>
            <div className="text-[10px] text-gray-400 leading-none">ERP System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visible.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('sidebar-link', pathname.startsWith(item.href) && 'active')}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="ml-auto bg-brand-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}

        <div className="pt-2 mt-2 border-t border-gray-100">
          <Link href="/notifications" className={cn('sidebar-link', pathname === '/notifications' && 'active')}>
            <Bell size={16} />
            <span className="flex-1">Notifications</span>
            {notificationCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {notificationCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* User area */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 group">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {getInitials(profile.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">{profile.full_name}</div>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', roleColors[profile.role])}>
              {roleLabels[profile.role]}
            </span>
          </div>
          <button onClick={logout} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
