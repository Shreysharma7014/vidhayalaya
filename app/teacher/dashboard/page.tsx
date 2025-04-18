"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Users, ClipboardCheck, BookOpen, FileText, Calendar } from "lucide-react"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function TeacherDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [homework, setHomework] = useState<Homework[]>([])
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([])
  const [attendanceDates, setAttendanceDates] = useState<Date[]>([])
  const [timetables, setTimetables] = useState<Timetable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    students: 0,
    attendance: 0,
    homework: 0,
    exams: 0,
  })
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
  

  interface Student {
    id: string
    name: string
    rollNo: string
    srNo: string
    classSectionName: string
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
  }

  interface AttendanceSession {
    id: string
    date: Date
    presentCount: number
    absentCount: number
  }
  interface Timetable {
    id: string
    examName: string
    classSectionName: string
    examEntries: any[]  // Change `any` to the specific type of exam entries if available
    createdAt: Date
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
  
  interface Schedule {
    id: string
    classSectionId: string
    classSectionName: string
    schedule: ScheduleDay[]
  }
  

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In a real app, you would filter these by the teacher's assigned classes
        const studentQuery = query(collection(db, "users"), where("role", "==", "student"))
        const attendanceQuery = query(collection(db, "attendance"))
        const homeworkQuery = query(collection(db, "homework"))
        const examQuery = query(collection(db, "exams"))

        const [studentSnapshot, attendanceSnapshot, homeworkSnapshot, examSnapshot] = await Promise.all([
          getDocs(studentQuery),
          getDocs(attendanceQuery),
          getDocs(homeworkQuery),
          getDocs(examQuery),
        ]) 

        setStats({
          students: studentSnapshot.size,
          attendance: attendanceSnapshot.size,
          homework: homeworkSnapshot.size,
          exams: examSnapshot.size,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    if (user && user.role === "teacher") {
      fetchStats()
    }
  }, [user])

   useEffect(() => {
      const fetchStudents = async () => {
        if (!user?.classSectionId) {
          setIsLoading(false)
          return
        }
  
        try {
          setIsLoading(true)
          const studentQuery = query(
            collection(db, "users"),
            where("role", "==", "student"),
            where("classSectionId", "==", user.classSectionId),
          )
  
          const snapshot = await getDocs(studentQuery)
  
          const studentsList: Student[] = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            studentsList.push({
              id: doc.id,
              name: data.name || "Unknown",
              rollNo: data.rollNo || "",
              srNo: data.srNo || "",
              classSectionName: data.classSectionName || "",
            })
          })
  
          // Sort by roll number
          studentsList.sort((a, b) => {
            return Number.parseInt(a.rollNo) - Number.parseInt(b.rollNo)
          })
  
          setStudents(studentsList)
          setIsLoading(false)
        } catch (error) {
          console.error("Error fetching students:", error)
          setIsLoading(false)
        }
      }
  
      if (user && user.role === "teacher") {
        fetchStudents()
      }
    }, [user])

  useEffect(() => {
      const fetchHomework = async () => {
        if (!user?.uid) return
  
        try {
          setIsLoading(true)
          // Remove the orderBy clause to avoid requiring a composite index
          const homeworkQuery = query(collection(db, "homework"), where("teacherId", "==", user.uid))
  
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
            })
          })
  
          // Sort the homework list by createdAt in memory
          homeworkList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  
          setHomework(homeworkList)
          setIsLoading(false)
        } catch (error) {
          console.error("Error fetching homework:", error)
          setIsLoading(false)
        }
      }
  
      if (user && user.role === "teacher") {
        fetchHomework()
      }
    }, [user])

    useEffect(() => {
        const fetchAttendanceSessions = async () => {
          if (!user?.uid) return
    
          try {
            const sessionsQuery = query(collection(db, "attendanceSessions"), where("teacherId", "==", user.uid))
    
            const snapshot = await getDocs(sessionsQuery)
    
            const sessions: AttendanceSession[] = []
            const dates: Date[] = []
    
            snapshot.forEach((doc) => {
              const data = doc.data()
              const date = data.date.toDate()
    
              sessions.push({
                id: doc.id,
                date,
                presentCount: data.presentCount,
                absentCount: data.absentCount,
              })
    
              dates.push(date)
            })
    
            // Sort by date (newest first)
            sessions.sort((a, b) => b.date.getTime() - a.date.getTime())
    
            setAttendanceSessions(sessions)
            setAttendanceDates(dates)
          } catch (error) {
            console.error("Error fetching attendance sessions:", error)
          }
        }
    
        if (user && user.role === "teacher") {
          fetchAttendanceSessions()
        }
      }, [user])

      useEffect(() => {
          const fetchTimetables = async () => {
            try {
              setIsLoading(true)
              const timetablesQuery = query(collection(db, "examTimetables"),)
              const snapshot = await getDocs(timetablesQuery)
      
              const timetablesData: Timetable[] = snapshot.docs.map((doc) => {
                const data = doc.data()
                return {
                  id: doc.id,
                  examName: data.examName || "",  // Ensure examName is a string
                  classSectionName: data.classSectionName || "",  // Ensure classSectionName is a string
                  examEntries: data.examEntries || [],  // Ensure examEntries is an array
                  createdAt: data.createdAt?.toDate() || new Date(),  // Ensure createdAt is a Date
                }
              })
      
              setTimetables(timetablesData)
              setIsLoading(false)
            } catch (error) {
              console.error("Error fetching exam timetables:", error)
              toast.error("Failed to load exam timetables. Please try again.")
              setIsLoading(false)
            }
          }
      
          if (user && user.role === "teacher") {
            fetchTimetables()
          }
        }, [user])

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
    <DashboardShell sidebar={<TeacherNav />} title="Teacher Dashboard">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Dashboard</h1>
        <UserNav />
      </div>

      <div className="grid gap-4 p-3 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">In your classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Records</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceSessions.length}</div>
            <p className="text-xs text-muted-foreground">Attendance sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Homework Assigned</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />  
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{homework.length}</div>
            <p className="text-xs text-muted-foreground">Active assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exams</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timetables.length}</div>
            <p className="text-xs text-muted-foreground">Upcoming exams</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 p-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for teachers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/teacher/attendance">
              <Button className="w-full">Mark Attendance</Button>
            </Link>
            <Link href="/teacher/homework/new">
              <Button variant="outline" className="w-full">
                Assign Homework
              </Button>
            </Link>
            <Link href="/teacher/marks/new">
              <Button variant="outline" className="w-full">
                Upload Marks
              </Button>
            </Link>
          </CardContent>
        </Card>
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
      </div>
    </DashboardShell>
  )
}

