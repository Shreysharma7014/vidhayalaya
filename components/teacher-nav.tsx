"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Users, ClipboardCheck, BookOpen, FileText, Settings, Clock, BadgePercent } from "lucide-react"

export function TeacherNav() {
  const pathname = usePathname()

  return (
    <nav className="grid items-start gap-2">
      <Link href="/teacher/dashboard" className="ml-5">
        <Button variant={pathname === "/teacher/dashboard" ? "secondary" : "ghost"} className="w-full justify-start cursor-pointer">
          <Home className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      <Link href="/teacher/student" className="ml-5">
        <Button
          variant={pathname.includes("/teacher/student") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <Users className="mr-2 h-4 w-4" />
          Students
        </Button>
      </Link>
      <Link href="/teacher/attendance" className="ml-5">
        <Button
          variant={pathname.includes("/teacher/attendance") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Attendance
        </Button>
      </Link>
      <Link href="/teacher/schedule" className="ml-5">
        <Button
          variant={pathname.includes("/teacher/schedule") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <Clock className="mr-2 h-4 w-4" />
          Schedule
        </Button>
      </Link>
      <Link href="/teacher/homework" className="ml-5">
        <Button
          variant={pathname.includes("/teacher/homework") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          Homework
        </Button>
      </Link>
      <Link href="/teacher/exams" className="ml-5">
        <Button
          variant={pathname.includes("/principal/teacher") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <FileText className="mr-2 h-4 w-4" />
          Exams
        </Button>
      </Link>
      <Link href="/teacher/marks" className="ml-5">
        <Button variant={pathname.includes("/teacher/marks") ? "secondary" : "ghost"} className="w-full justify-start cursor-pointer">
          <BadgePercent className="mr-2 h-4 w-4" />
          Marks
        </Button>
      </Link>
      <Link href="/teacher/announcements" className="ml-5">
        <Button variant={pathname.includes("/teacher/announcements") ? "secondary" : "ghost"} className="w-full justify-start cursor-pointer">
          <FileText className="mr-2 h-4 w-4" />
          Announcements
        </Button>
      </Link>
      <Link href="/teacher/settings" className="ml-5">
        <Button
          variant={pathname.includes("/teacher/settings") ? "secondary" : "ghost"}
          className="w-full justify-start cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </Link>
    </nav>
  )
}

