import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Card className="w-full max-w-md border-slate-800 bg-slate-800/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-orange-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Page Not Found</CardTitle>
          <CardDescription className="text-slate-400">The page you're looking for doesn't exist.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/dashboard">
            <Button className="bg-blue-600 hover:bg-blue-700">Return to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
