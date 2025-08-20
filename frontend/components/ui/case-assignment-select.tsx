"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { User, Loader2 } from "lucide-react"

interface AssignableUser {
  id: string
  username: string
  full_name: string
  role: string
}

interface CaseAssignmentSelectProps {
  value?: string
  onValueChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
}

export function CaseAssignmentSelect({
  value,
  onValueChange,
  placeholder = "Select assignee...",
  disabled = false,
}: CaseAssignmentSelectProps) {
  const [users, setUsers] = useState<AssignableUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchAssignableUsers = async () => {
      try {
        setError(null)
        const response = await api.get("/cases/assignment/users")
        setUsers(response)
      } catch (error: any) {
        console.error("[v0] Failed to load assignable users:", error)
        if (error.status === 403) {
          // User doesn't have permission to assign cases - this is expected for some roles
          setError("Not authorized to assign cases")
        } else {
          setError("Failed to load users")
          toast({
            title: "Error",
            description: "Failed to load assignable users",
            variant: "destructive",
          })
        }
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    fetchAssignableUsers()
  }, [toast])

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
          <div className="flex items-center">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <SelectValue placeholder="Loading users..." />
          </div>
        </SelectTrigger>
      </Select>
    )
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
          <SelectValue placeholder={error} />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select
      value={value || "unassigned"}
      onValueChange={(val) => onValueChange(val === "unassigned" ? undefined : val)}
      disabled={disabled}
    >
      <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700">
        <SelectItem value="unassigned" className="text-gray-400">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Unassigned</span>
          </div>
        </SelectItem>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id} className="text-white">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <div className="flex flex-col">
                <span>{user.full_name || user.username}</span>
                <span className="text-xs text-gray-400">{user.role.replace("_", " ")}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
