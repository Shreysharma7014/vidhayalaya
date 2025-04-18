"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Users, GraduationCap, Calendar, FileText, Bell, Settings, BookOpen, UserRoundPen, Clock, BadgePercent } from "lucide-react"

export function PrincipalNav() {
  const pathname = usePathname()

  return (
    <nav className="grid items-start xl:ml-5 gap-2 w-[5%] xl:w-[65%]">
      <Link href="/principal/dashboard">
        <Button variant={pathname === "/principal/dashboard" ? "secondary" : "ghost"} className="w-full justify-start cursor-pointer">
          <Home className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/principal/teachers">
        <Button
          variant={pathname.includes("/principal/teachers") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <GraduationCap className="mr-2 h-4 w-4" />
          Teachers
        </Button>
      </Link>
      <Link href="/principal/student">
        <Button
          variant={pathname.includes("/principal/student") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <Users className="mr-2 h-4 w-4" />
          Students
        </Button>
      </Link>
      <Link href="/principal/attendance">
        <Button
          variant={pathname.includes("/principal/attendance") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <UserRoundPen className="mr-2 h-4 w-4" />
          Attendance
        </Button>
      </Link>
      <Link href="/principal/schedule">
        <Button
          variant={pathname.includes("/principal/schedule") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <Clock className="mr-2 h-4 w-4" />
          Schedule
        </Button>
      </Link>
      <Link href="/principal/homework">
        <Button
          variant={pathname.includes("/principal/homework") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Homework
        </Button>
      </Link>
      <Link href="/principal/events">
        <Button
          variant={pathname.includes("/principal/events") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Events
        </Button>
      </Link>
      <Link href="/principal/exams">
        <Button
          variant={pathname.includes("/principal/exams") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4" />
          Exams
        </Button>
      </Link>
      <Link href="/principal/marks">
        <Button variant={pathname.includes("/principal/marks") ? "secondary" : "ghost"} className="w-full justify-start cursor-pointer">
          <BadgePercent className="mr-2 h-4 w-4" />
          Marks
        </Button>
      </Link>
      <Link href="/principal/announcements">
        <Button
          variant={pathname.includes("/principal/announcements") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <Bell className="mr-2 h-4 w-4" />
          Announcements
        </Button>
      </Link>
      <Link href="/principal/settings">
        <Button
          variant={pathname.includes("/principal/settings") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </Link>
    </nav>
  )
}

