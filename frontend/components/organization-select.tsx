"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api, type Organization } from "@/lib/api"

interface OrganizationSelectProps {
  value?: string
  onValueChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  allowEmpty?: boolean
  className?: string
}

export function OrganizationSelect({
  value,
  onValueChange,
  placeholder = "Select organization...",
  disabled = false,
  allowEmpty = false,
  className,
}: OrganizationSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch organizations on component mount
  React.useEffect(() => {
    const fetchOrganizations = async () => {
      setLoading(true)
      setError(null)
      try {
        const orgs = await api.listOrganizations()
        setOrganizations(orgs.filter((org) => org.is_active))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load organizations")
        console.error("Failed to fetch organizations:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizations()
  }, [])

  const selectedOrganization = organizations.find((org) => org.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled || loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading organizations...
            </div>
          ) : selectedOrganization ? (
            <div className="flex flex-col items-start">
              <span className="font-medium">{selectedOrganization.name}</span>
              <span className="text-xs text-muted-foreground">
                {selectedOrganization.plan} • {selectedOrganization.max_users} users
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search organizations..." />
          <CommandList>
            <CommandEmpty>
              {error ? <div className="text-destructive text-sm p-2">{error}</div> : "No organizations found."}
            </CommandEmpty>
            <CommandGroup>
              {allowEmpty && (
                <CommandItem
                  value=""
                  onSelect={() => {
                    onValueChange(undefined)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  <span className="text-muted-foreground">No organization</span>
                </CommandItem>
              )}
              {organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  value={`${org.name} ${org.id}`}
                  onSelect={() => {
                    onValueChange(org.id === value ? undefined : org.id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === org.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-medium">{org.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{org.plan}</span>
                      <span>•</span>
                      <span>{org.max_users} users</span>
                      <span>•</span>
                      <span>{org.max_cases} cases</span>
                    </div>
                    {org.description && <span className="text-xs text-muted-foreground mt-1">{org.description}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
