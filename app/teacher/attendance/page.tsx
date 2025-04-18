"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon, Check, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Student {
  id: string
  name: string
  rollNo: string
  srNo: string
  classSectionName: string
}

interface AttendanceSession {
  id: string
  date: Date
  presentCount: number
  absentCount: number
}

export default function AttendancePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [date, setDate] = useState<Date>(new Date())
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([])
  const [attendanceDates, setAttendanceDates] = useState<Date[]>([])

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

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

  // Check if attendance already exists for selected date
  const isDateMarked = attendanceDates.some(
    (d) => d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(),
  )

  // Get attendance session for selected date
  const selectedDateSession = attendanceSessions.find(
    (session) =>
      session.date.getDate() === date.getDate() &&
      session.date.getMonth() === date.getMonth() &&
      session.date.getFullYear() === date.getFullYear(),
  )

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Attendance">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Attendance Management</h1>
        <UserNav />
      </div>

      {!user.classSectionId ? (
        <Card>
          <CardHeader>
            <CardTitle>No Class Assigned</CardTitle>
            <CardDescription>You haven't been assigned as a class teacher for any class yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please contact the principal to be assigned as a class teacher.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="mark" className="space-y-6 p-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="history">Attendance History</TabsTrigger>
          </TabsList>

          <TabsContent value="mark" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Your Class</CardTitle>
                  <CardDescription>You are the class teacher for this class</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-medium">{user.classSectionName}</p>
                  <p className="text-sm text-muted-foreground">Total Students: {students.length}</p>
                </CardContent>
              </Card>

              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Mark Attendance</CardTitle>
                  <CardDescription>Select a date to mark or view attendance</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                          {isDateMarked && (
                            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50">
                              Marked
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(date) => date && setDate(date)}
                          initialFocus
                          modifiers={{
                            marked: attendanceDates,
                          }}
                          modifiersClassNames={{
                            marked: "bg-primary/20 text-primary font-bold",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {selectedDateSession ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-green-50 p-2 rounded">
                          <p className="text-xs text-green-700">Present</p>
                          <p className="text-lg font-bold text-green-700">{selectedDateSession.presentCount}</p>
                        </div>
                        <div className="bg-red-50 p-2 rounded">
                          <p className="text-xs text-red-700">Absent</p>
                          <p className="text-lg font-bold text-red-700">{selectedDateSession.absentCount}</p>
                        </div>
                      </div>

                      <Link href={`/teacher/attendance/view/${selectedDateSession.id}`}>
                        <Button className="w-full">View/Edit Attendance</Button>
                      </Link>
                    </div>
                  ) : (
                    <Link href={`/teacher/attendance/mark?date=${date.toISOString()}`}>
                      <Button className="w-full">Mark Attendance for {format(date, "PPP")}</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
                <CardDescription>View and edit previously marked attendance</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {attendanceSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No attendance records found.</p>
                    <p className="text-sm text-muted-foreground mt-1">Start marking attendance to see records here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-md overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted">
                            <th className="p-3 text-left font-medium">Date</th>
                            <th className="p-3 text-center font-medium">Present</th>
                            <th className="p-3 text-center font-medium">Absent</th>
                            <th className="p-3 text-center font-medium">Attendance %</th>
                            <th className="p-3 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceSessions.map((session) => {
                            const total = session.presentCount + session.absentCount
                            const percentage = total > 0 ? Math.round((session.presentCount / total) * 100) : 0

                            return (
                              <tr key={session.id} className="border-t">
                                <td className="p-3">{format(session.date, "PPP")}</td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center gap-1">
                                    <Check className="h-4 w-4 text-green-500" />
                                    {session.presentCount}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center gap-1">
                                    <X className="h-4 w-4 text-red-500" />
                                    {session.absentCount}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center">
                                    <span
                                      className={cn(
                                        "font-medium",
                                        percentage >= 75
                                          ? "text-green-600"
                                          : percentage >= 50
                                            ? "text-amber-600"
                                            : "text-red-600",
                                      )}
                                    >
                                      {percentage}%
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  <Link href={`/teacher/attendance/view/${session.id}`}>
                                    <Button variant="ghost" size="sm">
                                      View
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  )
}

