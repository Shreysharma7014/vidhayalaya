"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export default function TeacherSchedulePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [teacherSchedule, setTeacherSchedule] = useState<
    {
      day: string
      periods: {
        startTime: string
        endTime: string
        subject: string
        className: string
        classSectionId: string
        scheduleId: string
      }[]
    }[]
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchTeacherSchedule = async () => {
      if (!user?.uid) return

      try {
        setIsLoading(true)

        const schedulesSnapshot = await getDocs(collection(db, "schedules"))
        const schedules: Schedule[] = []

        schedulesSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.schedule) {
            schedules.push({
              id: doc.id,
              classSectionId: data.classSectionId,
              classSectionName: data.classSectionName,
              schedule: data.schedule,
            })
          }
        })

        const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        const teacherScheduleByDay = weekDays.map((day) => ({
          day,
          periods: [] as {
            startTime: string
            endTime: string
            subject: string
            className: string
            classSectionId: string
            scheduleId: string
          }[],
        }))

        schedules.forEach((schedule) => {
          schedule.schedule.forEach((scheduleDay) => {
            const dayIndex = weekDays.indexOf(scheduleDay.day)
            if (dayIndex !== -1) {
              scheduleDay.periods.forEach((period) => {
                if (period.teacherId === user.uid) {
                  teacherScheduleByDay[dayIndex].periods.push({
                    startTime: period.startTime,
                    endTime: period.endTime,
                    subject: period.subject,
                    className: schedule.classSectionName,
                    classSectionId: schedule.classSectionId,
                    scheduleId: schedule.id,
                  })
                }
              })
            }
          })
        })

        teacherScheduleByDay.forEach((day) => {
          day.periods.sort((a, b) => {
            return a.startTime.localeCompare(b.startTime)
          })
        })

        setTeacherSchedule(teacherScheduleByDay)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching teacher schedule:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchTeacherSchedule()
    }
  }, [user])

  const formatTime = (time: string) => {
    if (!time) return ""
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours, 10)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const getTodaySchedule = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const today = days[new Date().getDay()]
    return teacherSchedule.find((day) => day.day === today) || null
  }

  const todaySchedule = getTodaySchedule()

  const handleClassClick = (classSectionId: string, subject: string, className: string) => {
    router.push(`/teacher/class/${classSectionId}?subject=${encodeURIComponent(subject)}&className=${encodeURIComponent(className)}`)
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="My Schedule">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">My Teaching Schedule</h1>
        <UserNav />
      </div>

      <div className="grid gap-6 p-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Classes</CardTitle>
            <CardDescription>Your teaching schedule for today</CardDescription>
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
                    <TableHead>Class</TableHead>
                    <TableHead>Action</TableHead>
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
                      <TableCell>{period.className}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClassClick(period.classSectionId, period.subject, period.className)}
                          className="cursor-pointer"
                        >
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Overview</CardTitle>
            <CardDescription>Summary of your weekly teaching load</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">Loading summary...</div>
            ) : (
              <div className="space-y-4">
                {teacherSchedule.map((day) => {
                  const classCount = day.periods.length
                  return (
                    <div key={day.day} className="flex justify-between items-center">
                      <div className="font-medium">{day.day}</div>
                      <div className="flex items-center">
                        <Badge variant={classCount > 0 ? "default" : "outline"}>
                          {classCount} {classCount === 1 ? "class" : "classes"}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Full Weekly Schedule</CardTitle>
          <CardDescription>Your complete teaching timetable</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">Loading schedule...</div>
          ) : (
            <div className="space-y-6">
              {teacherSchedule.map((day) => (
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
                          <TableHead>Class</TableHead>
                          <TableHead>Action</TableHead>
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
                            <TableCell>{period.className}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClassClick(period.classSectionId, period.subject, period.className)}
                              >
                                Open
                              </Button>
                            </TableCell>
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
    </DashboardShell>
  )
}