"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { DashboardShell } from "@/components/dashboard-shell"
import { StudentNav } from "@/components/student-nav"
import { UserNav } from "@/components/user-nav"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format } from "date-fns"
import { CalendarIcon, Clock, Eye } from "lucide-react"

import { Badge } from "@/components/ui/badge"


// Type for ExamEntry
interface ExamEntry {
  subject: string
  date: string
  startTime: string
  endTime: string
}

// Type for ExamTimetable
interface ExamTimetable {
  id: string
  examName: string
  className: string
  classSectionName?: string
  examEntries: ExamEntry[]
  createdAt: Date
}

export default function StudentExamsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [examTimetables, setExamTimetables] = useState<ExamTimetable[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [studentClass, setStudentClass] = useState<string | null>(null)
  const [studentSection, setStudentSection] = useState<string | null>(null)

  // Ensure only students can access the page
  useEffect(() => {
    if (!loading && (!user || user.role !== "student")) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Fetch student information and exam timetables
  useEffect(() => {
    const fetchExamTimetables = async () => {
      if (!user?.classSectionId) return

      try {
        setIsLoading(true)
        const examtimetablesQuery = query(
          collection(db, "examTimetables"),
          where("classSectionId", "==", user.classSectionId),
        )

        const snapshot = await getDocs(examtimetablesQuery)

        const homeworkList: ExamTimetable[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          homeworkList.push({
            id: doc.id,
            examName: data.examName,
            className: data.className,
            classSectionName: data.classSectionName,
            examEntries: data.examEntries,
            createdAt: data.createdAt.toDate(),
          })
        })

        setExamTimetables(homeworkList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching homework:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "student") {
      fetchExamTimetables()
    }
  }, [user])

  // Format Date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "PPP")
    } catch (error) {
      return dateString
    }
  }

  // Format Time
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":")
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? "PM" : "AM"
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    } catch (error) {
      return timeString
    }
  }

  // Render Loading State or Timetable List
  if (loading || !user || user.role !== "student") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<StudentNav />} title="Exam Timetables">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-2 xl:ml-0">My Exam Timetables</h1>
        <UserNav />
      </div>

      <div className="p-3">
      <div className="mb-6 p-3">
        <p className="text-sm text-muted-foreground">
          View your upcoming exams and schedules
          {studentClass && ` for ${studentClass}${studentSection ? ` - Section ${studentSection}` : ""}`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <p>Loading exam timetables...</p>
        </div>
      ) : examTimetables.length === 0 ? (
        <div className="p-3">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No exam timetables found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {studentClass
                ? "No exams have been scheduled for your class yet."
                : "You are not assigned to any class. Please contact your administrator."}
            </p>
          </CardContent>
        </Card>
        </div>
      ) : (
        examTimetables.map((timetable) => (
          <Card key={timetable.id} className="mb-6">
            <CardHeader>
              <CardTitle>{timetable.examName}</CardTitle>
              <CardDescription>
                Class: {timetable.className}
                {timetable.classSectionName ? `-- ${timetable.classSectionName}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell>Subject</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Start Time</TableCell>
                      <TableCell>End Time</TableCell>
                      <TableCell>Duration</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timetable.examEntries.length > 0 ? (
                      timetable.examEntries.map((entry, index) => {
                        // Calculate duration
                        let duration = "N/A"
                        try {
                          if (entry.startTime && entry.endTime) {
                            const [startHours, startMinutes] = entry.startTime.split(":").map(Number)
                            const [endHours, endMinutes] = entry.endTime.split(":").map(Number)

                            let durationMinutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes)
                            if (durationMinutes < 0) durationMinutes += 24 * 60 // Handle next day

                            const hours = Math.floor(durationMinutes / 60)
                            const minutes = durationMinutes % 60

                            duration = `${hours > 0 ? `${hours}h ` : ""}${minutes > 0 ? `${minutes}m` : ""}`
                          }
                        } catch (error) {
                          console.error("Error calculating duration:", error)
                        }

                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{entry.subject}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {formatDate(entry.date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                {formatTime(entry.startTime)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                {formatTime(entry.endTime)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{duration}</Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          No exam entries found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
            </CardContent>
          </Card>
        ))
      )}
      </div>
    </DashboardShell>
  )
}
