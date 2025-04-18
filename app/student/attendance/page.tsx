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
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Check, X } from "lucide-react"

interface AttendanceRecord {
  id: string
  date: Date
  status: "present" | "absent"
  sessionId: string
}

export default function StudentAttendancePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0,
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== "student")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?.uid) return

      try {
        setIsLoading(true)
        const attendanceQuery = query(collection(db, "attendance"), where("studentId", "==", user.uid))

        const snapshot = await getDocs(attendanceQuery)

        const records: AttendanceRecord[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          records.push({
            id: doc.id,
            date: data.date.toDate(),
            status: data.status,
            sessionId: data.sessionId,
          })
        })

        // Sort by date (newest first)
        records.sort((a, b) => b.date.getTime() - a.date.getTime())

        setAttendanceRecords(records)

        // Calculate stats
        const present = records.filter((r) => r.status === "present").length
        const absent = records.filter((r) => r.status === "absent").length
        const total = present + absent
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0

        setStats({
          present,
          absent,
          total,
          percentage,
        })

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching attendance:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "student") {
      fetchAttendance()
    }
  }, [user])

  // Get attendance dates for the calendar
  const attendanceDates = attendanceRecords.map((record) => {
    const date = new Date(record.date)
    return {
      date,
      status: record.status,
    }
  })

  // Get selected day's attendance
  const selectedDayAttendance = selectedDate
    ? attendanceRecords.find((record) => {
        const recordDate = new Date(record.date)
        return recordDate.toDateString() === selectedDate.toDateString()
      })
    : null

  if (loading || !user || user.role !== "student") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<StudentNav />} title="Attendance">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-2 xl:ml-0">My Attendance</h1>
        <UserNav />
      </div>

      <div className="grid gap-6 p-3 md:grid-cols-2">
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
              <CardDescription>Your attendance statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Attendance Rate:</span>
                  <span className="text-2xl font-bold">{stats.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${stats.percentage}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Present</p>
                    <p className="text-2xl font-bold text-green-500">{stats.present}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Absent</p>
                    <p className="text-2xl font-bold text-red-500">{stats.absent}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>Your last 10 attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-4">Loading attendance...</div>
              ) : attendanceRecords.length === 0 ? (
                <p className="text-center text-muted-foreground">No attendance records found.</p>
              ) : (
                <div className="space-y-2">
                  {attendanceRecords.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-2 border-b">
                      <span>{format(record.date, "PPP")}</span>
                      <div className="flex items-center gap-1">
                        {record.status === "present" ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-green-500">Present</span>
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 text-red-500" />
                            <span className="text-red-500">Absent</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
            <CardDescription>View your attendance by date</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                present: attendanceDates.filter((d) => d.status === "present").map((d) => d.date),
                absent: attendanceDates.filter((d) => d.status === "absent").map((d) => d.date),
              }}
              modifiersClassNames={{
                present: "bg-green-100 text-green-700",
                absent: "bg-red-100 text-red-700",
              }}
            />

            {selectedDate && (
              <div className="mt-4 p-4 border rounded-md">
                <h3 className="font-medium">{format(selectedDate, "PPP")}</h3>
                {selectedDayAttendance ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span>Status:</span>
                    {selectedDayAttendance.status === "present" ? (
                      <span className="flex items-center gap-1 text-green-500">
                        <Check className="h-4 w-4" />
                        Present
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <X className="h-4 w-4" />
                        Absent
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No attendance record for this date</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

