"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StudentNav } from "@/components/student-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"

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

interface Schedule {
  id: string
  classSectionId: string
  classSectionName: string
  schedule: ScheduleDay[]
}

export default function StudentSchedulePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [classSchedule, setClassSchedule] = useState<ScheduleDay[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "student")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchClassSchedule = async () => {
      if (!user?.classSectionId) return

      try {
        setIsLoading(true)

        // Fetch schedule for student's class
        const schedulesQuery = query(collection(db, "schedules"), where("classSectionId", "==", user.classSectionId))

        const snapshot = await getDocs(schedulesQuery)

        if (snapshot.empty) {
          setIsLoading(false)
          return
        }

        // Get the first matching schedule
        const scheduleData = snapshot.docs[0].data()

        if (scheduleData.schedule) {
          setClassSchedule(scheduleData.schedule)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching class schedule:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "student") {
      fetchClassSchedule()
    }
  }, [user])

  // Format time to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return ""

    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12

    return `${hour12}:${minutes} ${ampm}`
  }

  // Get today's schedule
  const getTodaySchedule = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const today = days[new Date().getDay()]
    return classSchedule.find((day) => day.day === today) || null
  }

  const todaySchedule = getTodaySchedule()

  if (loading || !user || user.role !== "student") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<StudentNav />} title="Class Schedule">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-2 xl:ml-0">My Class Schedule</h1>
        <UserNav />
      </div>

      <div className="mb-6 p-3">
        <Card>
          <CardHeader>
            <CardTitle>Today's Classes</CardTitle>
            <CardDescription>Your class schedule for today</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">Loading schedule...</div>
            ) : !todaySchedule || todaySchedule.periods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No classes scheduled for today</p>
              </div>
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
                  {todaySchedule.periods.map((period, index) => (
                    <TableRow key={index}>
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
      </div>

      <div className="p-3">
      <Card>
        <CardHeader>
          <CardTitle>Full Weekly Schedule</CardTitle>
          <CardDescription>Your complete class timetable</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">Loading schedule...</div>
          ) : classSchedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="mb-2 text-muted-foreground">No schedule available</p>
              <p className="text-sm text-muted-foreground">
                Your class schedule has not been created yet. Please check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {classSchedule.map((day) => (
                <div key={day.day}>
                  <h3 className="font-semibold text-lg mb-2">{day.day}</h3>
                  {day.periods.length === 0 ? (
                    <div className="text-center py-2 text-muted-foreground border rounded-md">
                      No classes scheduled for this day.
                    </div>
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
                        {day.periods.map((period, index) => (
                          <TableRow key={index}>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardShell>
  )
}
