"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Edit } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Period {
  id: string
  startTime: string
  endTime: string
  subject: string
  teacherId: string
  teacherName: string
}

interface ScheduleDay {
  day: string
  periods: Period[]
}

export default function ViewSchedulePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const scheduleId = params.id as string

  const [classSectionName, setClassSectionName] = useState<string>("")
  const [schedule, setSchedule] = useState<ScheduleDay[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!scheduleId) return

      try {
        setIsLoading(true)
        const scheduleDoc = await getDoc(doc(db, "schedules", scheduleId))

        if (!scheduleDoc.exists()) {
          toast.error("The schedule you're trying to view doesn't exist.")
          router.push("/principal/schedule")
          return
        }

        const data = scheduleDoc.data()
        setClassSectionName(data.classSectionName || "")

        // Set schedule data
        if (data.schedule) {
          setSchedule(data.schedule)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching schedule:", error)
        toast.error("Failed to load schedule. Please try again.")
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchSchedule()
    }
  }, [user, scheduleId, router])

  // Format time to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return ""

    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12

    return `${hour12}:${minutes} ${ampm}`
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="View Schedule">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/principal/schedule">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Class Schedule</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading schedule...</div>
      ) : (
        <>
        <div className="p-3">
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{classSectionName}</CardTitle>
                <CardDescription>Weekly Class Schedule</CardDescription>
              </div>
              <Link href={`/principal/schedule/edit/${scheduleId}`}>
                <Button variant="outline" size="sm" className="cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Schedule
                </Button>
              </Link>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {schedule.map((day) => (
              <Card key={day.day}>
                <CardHeader>
                  <CardTitle>{day.day}</CardTitle>
                </CardHeader>
                <CardContent>
                  {day.periods.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No periods scheduled for this day.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {day.periods.map((period) => (
                          <TableRow key={period.id}>
                            <TableCell>
                              <Badge variant="outline">
                                {formatTime(period.startTime)} - {formatTime(period.endTime)}
                              </Badge>
                            </TableCell>
                            <TableCell>{period.subject}</TableCell>
                            <TableCell>{period.teacherName || "Not assigned"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          </div>
        </>
      )}
    </DashboardShell>
  )
}
