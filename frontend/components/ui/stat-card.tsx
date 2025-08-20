"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
  iconColor: string
  gradient: string
  delay?: number
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor,
  gradient,
  delay = 0,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-slate-800 bg-slate-800/50 backdrop-blur-sm animate-fade-in-up cyber-border",
        "hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300",
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {change && (
              <p
                className={cn(
                  "text-sm font-medium",
                  changeType === "positive" && "text-green-400",
                  changeType === "negative" && "text-red-400",
                  changeType === "neutral" && "text-slate-400",
                )}
              >
                {change}
              </p>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", gradient)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
        </div>

        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent -translate-x-full animate-pulse" />
      </CardContent>
    </Card>
  )
}
