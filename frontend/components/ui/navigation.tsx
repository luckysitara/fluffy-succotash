"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Shield,
  Home,
  Search,
  FileText,
  Users,
  Settings,
  LogOut,
  Plus,
  Eye,
  Globe,
  HardDrive,
  Wifi,
  UserCheck,
  FolderOpen,
  BarChart3,
} from "lucide-react"
import { Button } from "./button"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Overview and statistics",
  },
  {
    title: "Intelligence",
    icon: Search,
    description: "Investigation tools",
    children: [
      {
        title: "PII Intelligence",
        href: "/pii-intelligence",
        icon: UserCheck,
        description: "Personal information analysis",
      },
      {
        title: "Domain Intelligence",
        href: "/domain-intel",
        icon: Globe,
        description: "Domain and subdomain analysis",
      },
      {
        title: "IP Analysis",
        href: "/ip-analysis",
        icon: Wifi,
        description: "IP address investigation",
      },
      {
        title: "File Analysis",
        href: "/file-analysis",
        icon: HardDrive,
        description: "File and malware analysis",
      },
      {
        title: "Dark Web Monitor",
        href: "/dark-web",
        icon: Eye,
        description: "Dark web monitoring",
      },
    ],
  },
  {
    title: "Cases",
    href: "/cases",
    icon: FolderOpen,
    description: "Case management",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Generate reports",
  },
  {
    title: "Scan Results",
    href: "/scan-results",
    icon: FileText,
    description: "View scan results",
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    description: "User management",
    adminOnly: true,
  },
]

export function Navigation() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [expandedItems, setExpandedItems] = React.useState<string[]>(["Intelligence"])

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]))
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/")
  }

  const isParentActive = (children: any[]) => {
    return children.some((child) => isActive(child.href))
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">OSINT Platform</h1>
              <p className="text-xs text-gray-500">Intelligence & Investigation</p>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200">
          <Link href="/cases/new">
            <Button className="w-full justify-start" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            if (item.adminOnly && user?.role !== "admin") {
              return null
            }

            if (item.children) {
              const isExpanded = expandedItems.includes(item.title)
              const hasActiveChild = isParentActive(item.children)

              return (
                <div key={item.title}>
                  <button
                    onClick={() => toggleExpanded(item.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      hasActiveChild ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.title}
                    </div>
                    <div className={cn("transition-transform", isExpanded ? "rotate-90" : "")}>▶</div>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center px-3 py-2 text-sm rounded-lg transition-colors",
                            isActive(child.href)
                              ? "bg-blue-100 text-blue-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50",
                          )}
                        >
                          <child.icon className="w-4 h-4 mr-3" />
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive(item.href!) ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.title}
              </Link>
            )
          })}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>

          <div className="space-y-1">
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
