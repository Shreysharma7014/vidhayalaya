"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { DashboardShell } from "@/components/dashboard-shell"
import { PrincipalNav } from "@/components/principal-nav"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format } from "date-fns"
import { ArrowLeft, CalendarIcon, Clock, Edit, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useParams } from 'next/navigation'

// Define the Timetable type
interface Timetable {
  id: string;
  examName: string;
  classSectionName: string;
  examEntries: {
    subject: string;
    date: string;
    startTime: string;
    endTime: string;
  }[];
}

export default function ExamTimetableDetailsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams() // Get params object
  const id = params.id as string // Assert id as string (assuming route ensures it’s a string)
  const [timetable, setTimetable] = useState<Timetable | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        setIsLoading(true)
        if (!id) {
          router.push("/principal/exams")
          return
        }

        const timetableDoc = await getDoc(doc(db, "examTimetables", id))

        if (timetableDoc.exists()) {
          const timetableData = timetableDoc.data()

          // Set state with all required properties
          setTimetable({
            id: timetableDoc.id,
            examName: timetableData.examName,
            classSectionName: timetableData.classSectionName,
            examEntries: timetableData.examEntries || [],
          })
        } else {
          router.push("/principal/exams")
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching exam timetable:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchTimetable()
    }
  }, [user, id, router]) // Add id as a dependency

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "PPP")
    } catch (error) {
      return dateString
    }
  }

  const formatTime = (timeString: string) => {
    try {
      // Convert 24-hour time format to 12-hour format
      const [hours, minutes] = timeString.split(":")
      const hour = Number.parseInt(hours, 10)
      const ampm = hour >= 12 ? "PM" : "AM"
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    } catch (error) {
      return timeString
    }
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (isLoading) {
    return (
      <DashboardShell sidebar={<PrincipalNav />} title="Exam Timetable Details">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading exam timetable...</p>
        </div>
      </DashboardShell>
    )
  }

  if (!timetable) {
    return (
      <DashboardShell sidebar={<PrincipalNav />} title="Exam Timetable Not Found">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold mb-2">Exam Timetable Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested exam timetable could not be found.</p>
          <Link href="/principal/exams">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Exam Timetables
            </Button>
          </Link>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Exam Timetable Details">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/principal/exams">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Exam Timetable Details</h1>
        </div>
        <UserNav />
      </div>

      <div className="flex justify-between items-center p-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold">{timetable.examName}</h2>
          <p className="text-sm text-muted-foreground">Class: {timetable.classSectionName}</p>
        </div>
        <Link href={`/principal/exams/edit/${timetable.id}`}>
        <Button className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            Edit Timetable
          </Button>
        </Link>
      </div>

      <div className="p-3">
      <Card>
        <CardHeader>
          <CardTitle>Exam Schedule</CardTitle>
          <CardDescription>Complete schedule for {timetable.examName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timetable.examEntries && timetable.examEntries.length > 0 ? (
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
      </div>
    </DashboardShell>
  )
}