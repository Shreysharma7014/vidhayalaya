"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { format, subDays } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X, CalendarIcon, BarChart } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ClassSection {
  id: string
  class: string
  section: string
  name: string
}

interface AttendanceSession {
  id: string
  date: Date
  classSectionId: string
  classSectionName: string
  teacherId: string
  teacherName?: string
  presentCount: number
  absentCount: number
}

interface AttendanceStats {
  classSectionId: string
  classSectionName: string
  totalSessions: number
  averageAttendance: number
  lastUpdated: Date | null
}

export default function PrincipalAttendancePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<AttendanceSession[]>([])
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats[]>([])
  const [date, setDate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchClassSections = async () => {
      try {
        const snapshot = await getDocs(collection(db, "classSections"))
        const sections: ClassSection[] = []
        snapshot.forEach((doc) => {
          sections.push({
            id: doc.id,
            ...(doc.data() as Omit<ClassSection, "id">),
          })
        })
        setClassSections(sections)
      } catch (error) {
        console.error("Error fetching class sections:", error)
      }
    }

    if (user && user.role === "principal") {
      fetchClassSections()
    }
  }, [user])

  useEffect(() => {
    const fetchAttendanceSessions = async () => {
      try {
        setIsLoading(true)
        const sessionsQuery = query(collection(db, "attendanceSessions"))
        const snapshot = await getDocs(sessionsQuery)

        const sessions: AttendanceSession[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          sessions.push({
            id: doc.id,
            date: data.date.toDate(),
            classSectionId: data.classSectionId,
            classSectionName: data.classSectionName,
            teacherId: data.teacherId,
            teacherName: data.teacherName,
            presentCount: data.presentCount,
            absentCount: data.absentCount,
          })
        })

        // Sort by date (newest first)
        sessions.sort((a, b) => b.date.getTime() - a.date.getTime())

        setAttendanceSessions(sessions)

        // Calculate attendance stats by class
        const stats: Record<string, AttendanceStats> = {}

        sessions.forEach((session) => {
          if (!stats[session.classSectionId]) {
            stats[session.classSectionId] = {
              classSectionId: session.classSectionId,
              classSectionName: session.classSectionName,
              totalSessions: 0,
              averageAttendance: 0,
              lastUpdated: null,
            }
          }

          const classStats = stats[session.classSectionId]
          classStats.totalSessions += 1

          const total = session.presentCount + session.absentCount
          const percentage = total > 0 ? (session.presentCount / total) * 100 : 0

          // Running average calculation
          classStats.averageAttendance =
            (classStats.averageAttendance * (classStats.totalSessions - 1) + percentage) / classStats.totalSessions

          // Track last updated
          if (!classStats.lastUpdated || session.date > classStats.lastUpdated) {
            classStats.lastUpdated = session.date
          }
        })

        setAttendanceStats(Object.values(stats))
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching attendance sessions:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchAttendanceSessions()
    }
  }, [user])

  useEffect(() => {
    // Filter sessions based on selected class and date
    let filtered = [...attendanceSessions]

    if (selectedClass) {
      filtered = filtered.filter((session) => session.classSectionId === selectedClass)
    }

    setFilteredSessions(filtered)
  }, [selectedClass, attendanceSessions])

  // Get sessions for the selected date
  const selectedDateSessions = filteredSessions.filter(
    (session) =>
      session.date.getDate() === date.getDate() &&
      session.date.getMonth() === date.getMonth() &&
      session.date.getFullYear() === date.getFullYear(),
  )

  // Get dates with attendance for the calendar
  const attendanceDates = filteredSessions.map((session) => session.date)

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Attendance">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Attendance Management</h1>
        <UserNav />
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="cursor-pointer">Overview</TabsTrigger>
          <TabsTrigger value="details" className="cursor-pointer">Class Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 p-3 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <Card className="col-span-full">
                <CardContent className="flex justify-center p-6">
                  <p>Loading attendance statistics...</p>
                </CardContent>
              </Card>
            ) : attendanceStats.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <BarChart className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Attendance Data</h3>
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    No attendance has been marked yet. Data will appear here once teachers start marking attendance.
                  </p>
                </CardContent>
              </Card>
            ) : (
              attendanceStats.map((stat) => (
                <Card key={stat.classSectionId}>
                  <CardHeader>
                    <CardTitle>{stat.classSectionName}</CardTitle>
                    <CardDescription>{stat.totalSessions} attendance sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Average Attendance</p>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full",
                                stat.averageAttendance >= 90
                                  ? "bg-green-500"
                                  : stat.averageAttendance >= 75
                                    ? "bg-amber-500"
                                    : "bg-red-500",
                              )}
                              style={{ width: `${stat.averageAttendance}%` }}
                            />
                          </div>
                          <span className="font-medium">{Math.round(stat.averageAttendance)}%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Last Updated:</span>
                        <span>{stat.lastUpdated ? format(stat.lastUpdated, "PPP") : "Never"}</span>
                      </div>
                                
                      <Button
                        variant="outline"
                        className="w-full cursor-pointer"
                        onClick={() => setSelectedClass(stat.classSectionId)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="grid p-3 gap-6 md:grid-cols-3">
            <Card className="md:col-span-1 w-98 md:w-full xl:w-full">
              <CardHeader>
                <CardTitle>Filter Attendance</CardTitle>
                <CardDescription>Select a class to view attendance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class & Section</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classSections.map((cs) => (
                        <SelectItem key={cs.id} value={cs.id} className="cursor-pointer">
                          {cs.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal cursor-pointer", !date && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
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

                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-2">Statistics</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Sessions:</span>
                      <span className="font-medium">{filteredSessions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last 7 Days:</span>
                      <span className="font-medium">
                        {filteredSessions.filter((s) => s.date >= subDays(new Date(), 7)).length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 w-98 md:w-full xl:w-full">
              <CardHeader>
                <CardTitle>
                  {selectedClass
                    ? `Attendance for ${classSections.find((cs) => cs.id === selectedClass)?.name || "Selected Class"}`
                    : "All Classes Attendance"}
                </CardTitle>
                <CardDescription>
                  {selectedDateSessions.length > 0
                    ? `Showing attendance for ${format(date, "PPP")}`
                    : `No attendance records for ${format(date, "PPP")}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-6">
                    <p>Loading attendance data...</p>
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6">
                    <BarChart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Attendance Data</h3>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      {selectedClass
                        ? "No attendance has been marked for this class yet."
                        : "Please select a class to view attendance details."}
                    </p>
                  </div>
                ) : selectedDateSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Records for This Date</h3>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      No attendance was marked for {format(date, "PPP")}. Please select a different date or class.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted">
                          <th className="p-3 text-left font-medium">Class</th>
                          <th className="p-3 text-center font-medium">Present</th>
                          <th className="p-3 text-center font-medium">Absent</th>
                          <th className="p-3 text-center font-medium">Attendance %</th>
                          <th className="p-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDateSessions.map((session) => {
                          const total = session.presentCount + session.absentCount
                          const percentage = total > 0 ? Math.round((session.presentCount / total) * 100) : 0

                          return (
                            <tr key={session.id} className="border-t">
                              <td className="p-3">{session.classSectionName}</td>
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
                                <Link href={`/principal/attendance/view/${session.id}`}>
                                  <Button variant="ghost" size="sm" className="cursor-pointer">
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
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}

