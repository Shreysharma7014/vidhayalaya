"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Users, School, BarChart, Settings, Home } from "lucide-react"

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="grid items-start gap-2">
      <Link href="/admin/dashboard">
        <Button variant={pathname === "/admin/dashboard" ? "secondary" : "ghost"} className="w-full justify-start">
          <Home className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/admin/principals">
        <Button
          variant={pathname.includes("/admin/principals") ? "secondary" : "ghost"}
          className="w-full justify-start"
        >
          <School className="mr-2 h-4 w-4" />
          Principals
        </Button>
      </Link>
      <Link href="/admin/users">
        <Button variant={pathname.includes("/admin/users") ? "secondary" : "ghost"} className="w-full justify-start">
          <Users className="mr-2 h-4 w-4" />
          Users
        </Button>
      </Link>
      <Link href="/admin/analytics">
        <Button
          variant={pathname.includes("/admin/analytics") ? "secondary" : "ghost"}
          className="w-full justify-start"
        >
          <BarChart className="mr-2 h-4 w-4" />
          Analytics
        </Button>
      </Link>
      <Link href="/admin/settings">
        <Button variant={pathname.includes("/admin/settings") ? "secondary" : "ghost"} className="w-full justify-start">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </Link>
    </nav>
  )
}

