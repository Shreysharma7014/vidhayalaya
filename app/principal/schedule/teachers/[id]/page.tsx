"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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

interface Teacher {
  id: string
  name: string
  email: string
  subject: string
  photoURL?: string
}

export default function TeacherScheduleViewPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const teacherId = params.id as string

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [teacherSchedule, setTeacherSchedule] = useState<
    {
      day: string
      periods: {
        startTime: string
        endTime: string
        subject: string
        className: string
      }[]
    }[]
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchTeacherAndSchedule = async () => {
      if (!teacherId) return

      try {
        setIsLoading(true)

        // Fetch teacher details
        const teacherDoc = await getDoc(doc(db, "users", teacherId))
        if (!teacherDoc.exists()) {
          toast.error("The teacher you're looking for doesn't exist.")
          router.push("/principal/schedule/teachers")
          return
        }

        const teacherData = teacherDoc.data()
        setTeacher({
          id: teacherDoc.id,
          name: teacherData.name || "Unknown",
          email: teacherData.email || "",
          subject: teacherData.subject || "Not specified",
          photoURL: teacherData.photoURL,
        })

        // Fetch all schedules
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

        // Extract teacher's schedule from all schedules
        const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        const teacherScheduleByDay = weekDays.map((day) => ({
          day,
          periods: [] as {
            startTime: string
            endTime: string
            subject: string
            className: string
          }[],
        }))

        // Go through each schedule and find periods assigned to this teacher
        schedules.forEach((schedule) => {
          schedule.schedule.forEach((scheduleDay) => {
            const dayIndex = weekDays.indexOf(scheduleDay.day)
            if (dayIndex !== -1) {
              scheduleDay.periods.forEach((period) => {
                if (period.teacherId === teacherId) {
                  teacherScheduleByDay[dayIndex].periods.push({
                    startTime: period.startTime,
                    endTime: period.endTime,
                    subject: period.subject,
                    className: schedule.classSectionName,
                  })
                }
              })
            }
          })
        })

        // Sort periods by start time
        teacherScheduleByDay.forEach((day) => {
          day.periods.sort((a, b) => {
            return a.startTime.localeCompare(b.startTime)
          })
        })

        setTeacherSchedule(teacherScheduleByDay)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching teacher schedule:", error)
        toast.error("Failed to load teacher schedule. Please try again.")
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchTeacherAndSchedule()
    }
  }, [user, teacherId, router])

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
    <DashboardShell sidebar={<PrincipalNav />} title="Teacher Schedule">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/principal/schedule/teachers">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Teacher Schedule</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading schedule...</div>
      ) : !teacher ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <p className="mb-2 text-muted-foreground">Teacher not found</p>
            <Link href="/principal/schedule/teachers">
              <Button>Back to Teachers</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="p-3">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={teacher.photoURL} alt={teacher.name} />
                  <AvatarFallback>
                    {teacher.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{teacher.name}</CardTitle>
                  <CardDescription>{teacher.subject}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {teacherSchedule.map((day) => (
              <Card key={day.day}>
                <CardHeader>
                  <CardTitle>{day.day}</CardTitle>
                </CardHeader>
                <CardContent>
                  {day.periods.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No classes scheduled for this day.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Class</TableHead>
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
