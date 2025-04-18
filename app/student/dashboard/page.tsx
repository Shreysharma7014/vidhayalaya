"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StudentNav } from "@/components/student-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { ClipboardCheck, BookOpen, FileText, Bell, Calendar } from "lucide-react"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge" // Explicit import with type

interface Announcement {
  id: string
  title: string
  description: string
  imageUrl?: string
  createdAt: Date
  createdBy: string
  createdByName: string
  isNew?: boolean
}

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

interface Homework {
  id: string
  title: string
  description: string
  subject: string
  classSectionId: string
  classSectionName: string
  dueDate: Date
  createdAt: Date
  teacherId: string
  teacherName: string
}

export default function StudentDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    attendance: { present: 0, absent: 0, total: 0 },
    homework: 0,
    exams: 0,
    announcements: 0,
  })
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [classSchedule, setClassSchedule] = useState<ScheduleDay[]>([])

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
        const schedulesQuery = query(collection(db, "schedules"), where("classSectionId", "==", user.classSectionId))
        const snapshot = await getDocs(schedulesQuery)

        if (snapshot.empty) {
          setIsLoading(false)
          return
        }

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

  useEffect(() => {
    const fetchHomework = async () => {
      if (!user?.classSectionId) return

      try {
        setIsLoading(true)
        const homeworkQuery = query(
          collection(db, "homework"),
          where("classSectionId", "==", user.classSectionId),
        )
        const snapshot = await getDocs(homeworkQuery)

        const homeworkList: Homework[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          homeworkList.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            subject: data.subject,
            classSectionId: data.classSectionId,
            classSectionName: data.classSectionName,
            dueDate: data.dueDate.toDate(),
            createdAt: data.createdAt.toDate(),
            teacherId: data.teacherId,
            teacherName: data.teacherName,
          })
        })

        setHomework(homeworkList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching homework:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "student") {
      fetchHomework()
    }
  }, [user])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!user?.uid) return

        const attendanceQuery = query(collection(db, "attendance"), where("studentId", "==", user.uid))
        const homeworkQuery = query(collection(db, "homework"))
        const examQuery = query(collection(db, "exams"))
        const announcementQuery = query(collection(db, "announcements"))

        const [attendanceSnapshot, homeworkSnapshot, examSnapshot, announcementSnapshot] = await Promise.all([
          getDocs(attendanceQuery),
          getDocs(homeworkQuery),
          getDocs(examQuery),
          getDocs(announcementQuery),
        ])

        let present = 0
        let absent = 0
        attendanceSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.status === "present") present++
          else if (data.status === "absent") absent++
        })

        setStats({
          attendance: {
            present,
            absent,
            total: present + absent,
          },
          homework: homeworkSnapshot.size,
          exams: examSnapshot.size,
          announcements: announcementSnapshot.size,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    if (user && user.role === "student") {
      fetchStats()
    }
  }, [user])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setIsLoading(true)
        const announcementsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"))
        const snapshot = await getDocs(announcementsQuery)

        const announcementsList: Announcement[] = []
        const now = new Date()
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        snapshot.forEach((doc) => {
          const data = doc.data()
          const createdAt = data.createdAt.toDate()
          announcementsList.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            imageUrl: data.imageUrl,
            createdAt,
            createdBy: data.createdBy,
            createdByName: data.createdByName || "Principal",
            isNew: createdAt > oneWeekAgo,
          })
        })

        setAnnouncements(announcementsList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching announcements:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "student") {
      fetchAnnouncements()
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
    return classSchedule.find((day) => day.day === today) || null
  }

  const todaySchedule = getTodaySchedule()

  if (loading || !user || user.role !== "student") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<StudentNav />} title="Student Dashboard">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-2 xl:ml-0">Dashboard</h1>
        <UserNav />
      </div>

      <div className="grid gap-4 p-3 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.attendance.total > 0 ? Math.round((stats.attendance.present / stats.attendance.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Present: {stats.attendance.present} | Absent: {stats.attendance.absent}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Homework</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{homework.length}</div>
            <p className="text-xs text-muted-foreground">Pending assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exams</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.exams}</div>
            <p className="text-xs text-muted-foreground">Upcoming exams</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.announcements}</div>
            <p className="text-xs text-muted-foreground">New annoncesments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid p-3 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Timetable</CardTitle>
            <CardDescription>Your classes for today</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-4">Loading schedule...</div>
            ) : !todaySchedule || todaySchedule.periods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No classes scheduled for today</p>
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
                        <Badge variant="outline" asChild>
                          <span>{formatTime(period.startTime)} - {formatTime(period.endTime)}</span>
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

        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
            <CardDescription>Latest updates from school</CardDescription>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent announcements.</p>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{announcement.title}</h4>
                      {announcement.isNew && <Badge className="bg-green-500 hover:bg-green-600">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{announcement.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(announcement.createdAt, "MMM d, yyyy")}
                      </span>
                      <Link href={`/student/announcements/${announcement.id}`}>
                        <Button variant="link" size="sm" className="h-auto p-0">
                          Read More
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href="/student/announcements">
                <Button variant="outline" size="sm">
                  View All Announcements
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}