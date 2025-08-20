"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { LayoutDashboard, Globe, Shield, FileText, Eye, BarChart3, FolderOpen, Users, Plus, Settings, LogOut, ChevronDown, Activity, Zap, Server, UserCheck, Building2 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { type UserRole } from "@/lib/api"

const intelligenceItems = [
  {
    name: "PII Intelligence",
    href: "/pii-intelligence",
    icon: UserCheck,
    description: "Personal information analysis",
  },
  { name: "Domain Intel", href: "/domain-intel", icon: Globe, description: "Domain reconnaissance" },
  { name: "IP Analysis", href: "/ip-analysis", icon: Server, description: "IP investigation" },
  { name: "File Analysis", href: "/file-analysis", icon: FileText, description: "File forensics" },
  { name: "Dark Web Monitor", href: "/dark-web", icon: Eye, description: "Dark web monitoring" },
]

const mainNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, description: "Overview and analytics" },
  { name: "Cases", href: "/cases", icon: FolderOpen, description: "Case management" },
  { name: "Reports", href: "/reports", icon: BarChart3, description: "Generate reports" },
  { name: "Users", href: "/users", icon: Users, description: "User management", requiredRoles: ["SUPER_ADMIN", "ORG_ADMIN"] as UserRole[] },
  { name: "Organizations", href: "/organizations", icon: Building2, description: "Organization management", requiredRoles: ["SUPER_ADMIN"] as UserRole[] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isIntelligenceOpen, setIsIntelligenceOpen] = React.useState(true)

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/")
  }

  const isIntelligenceActive = intelligenceItems.some((item) => isActive(item.href))

  return (
    <TooltipProvider>
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-sm border-r border-slate-800">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-slate-800">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">OSINT Platform</h1>
              <p className="text-xs text-slate-400">Intelligence Suite</p>
            </div>
          </div>

          {/* New Case Button */}
          <div className="p-4 border-b border-slate-800">
            <Link href="/cases/new">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl">
                <Plus className="w-4 h-4 mr-2" />
                New Case
              </Button>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {/* Main Navigation */}
            {mainNavigation.map((item) => {
              if (item.requiredRoles && (!user || !item.requiredRoles.includes(user.role))) {
                return null
              }

              const active = isActive(item.href)
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                        active
                          ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30"
                          : "text-slate-300 hover:bg-slate-800/50 hover:text-white",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5 mr-3 transition-colors",
                          active ? "text-blue-400" : "text-slate-400 group-hover:text-white",
                        )}
                      />
                      {item.name}
                      {active && <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse" />}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}

            {/* Intelligence Section */}
            <Collapsible open={isIntelligenceOpen} onOpenChange={setIsIntelligenceOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                    isIntelligenceActive
                      ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 border border-purple-500/30"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white",
                  )}
                >
                  <div className="flex items-center">
                    <Zap
                      className={cn(
                        "w-5 h-5 mr-3 transition-colors",
                        isIntelligenceActive ? "text-purple-400" : "text-slate-400",
                      )}
                    />
                    Intelligence
                  </div>
                  <ChevronDown
                    className={cn("w-4 h-4 transition-transform duration-200", isIntelligenceOpen ? "rotate-180" : "")}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-2">
                {intelligenceItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center px-6 py-2 text-sm rounded-lg transition-all duration-200 group ml-3",
                            active
                              ? "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 border border-purple-500/30"
                              : "text-slate-400 hover:bg-slate-800/30 hover:text-white",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "w-4 h-4 mr-3 transition-colors",
                              active ? "text-purple-400" : "text-slate-500 group-hover:text-white",
                            )}
                          />
                          {item.name}
                          {active && <div className="ml-auto w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          </nav>

          {/* User Info & Actions */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center mb-4 p-3 bg-slate-800/50 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-medium">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name || user?.username}</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                    {user?.role.replace("_", " ")}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Activity className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400">Online</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Link href="/settings">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-200"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all duration-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
