"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, type Case } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"

interface CaseSelectorProps {
  onCaseSelect: (caseId: string) => void
  disabled?: boolean
}

export function CaseSelector({ onCaseSelect, disabled = false }: CaseSelectorProps) {
  const [cases, setCases] = useState<Case[]>([])
  const [selectedCase, setSelectedCase] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await api.getCases()
        // Filter to only open cases
        const openCases = response.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS")
        setCases(openCases)
      } catch (error) {
        console.error("Failed to fetch cases:", error)
      }
    }

    fetchCases()
  }, [])

  const handleAddToCase = async () => {
    if (!selectedCase) {
      toast({
        title: "No Case Selected",
        description: "Please select a case to add evidence to",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await onCaseSelect(selectedCase)
      setSelectedCase("")
    } catch (error) {
      console.error("Failed to add to case:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <Select value={selectedCase} onValueChange={setSelectedCase} disabled={disabled}>
        <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
          <SelectValue placeholder="Select existing case..." />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {cases.map((case_) => (
            <SelectItem key={case_.id} value={case_.id} className="text-white">
              <div className="flex flex-col">
                <span className="font-medium">{case_.title}</span>
                <span className="text-xs text-slate-400">#{case_.case_number}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleAddToCase}
        disabled={!selectedCase || loading || disabled}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
        ) : (
          <Plus className="w-4 h-4 mr-2" />
        )}
        Add to Case
      </Button>
    </div>
  )
}
