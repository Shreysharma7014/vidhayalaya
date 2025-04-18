"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { DashboardShell } from "@/components/dashboard-shell"
import { TeacherNav } from "@/components/teacher-nav"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ArrowLeft, Clock } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useParams } from "next/navigation"

// Define the Timetable type
interface Timetable {
  id: string;
  examName: string;
  classSectionName: string;
  examEntries: { subject: string; date: string; startTime: string; endTime: string }[];
}

export default function TeacherExamTimetableDetailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [timetable, setTimetable] = useState<Timetable | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const params = useParams()  // Access params dynamically

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchTimetable = async () => {
      if (params?.id) {  // Check if the params.id exists
        try {
          setIsLoading(true)
          const timetableDoc = await getDoc(doc(db, "examTimetables", Array.isArray(params.id) ? params.id[0] : params.id))

          if (timetableDoc.exists()) {
            const data = timetableDoc.data()
            setTimetable({
              id: timetableDoc.id,
              examName: data.examName,
              classSectionName: data.classSectionName,
              examEntries: data.examEntries || [],
            })
          } else {
            toast.error("The requested exam timetable does not exist.", {
              description: "Exam timetable not found."
            })
            router.push("/teacher/exams")
          }

          setIsLoading(false)
        } catch (error) {
          console.error("Error fetching exam timetable:", error)
          setIsLoading(false)
          toast.error("Failed to load exam timetable. Please try again.", {
            description: "There was an issue loading the exam timetable."
          })
        }
      }
    }

    if (user && user.role === "teacher") {
      fetchTimetable()
    }
  }, [user, params?.id, router])  // Watch for changes in params.id

  // Calculate duration between start and end time
  const calculateDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return "N/A"

    const [startHour, startMinute] = startTime.split(":").map(Number)
    const [endHour, endMinute] = endTime.split(":").map(Number)

    let durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)

    if (durationMinutes < 0) {
      durationMinutes += 24 * 60 // Add a day if end time is on the next day
    }

    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60

    return `${hours}h ${minutes}m`
  }

  // Format date from YYYY-MM-DD to readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return format(parseISO(dateString), "EEEE, MMMM d, yyyy")
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (isLoading) {
    return (
      <DashboardShell sidebar={<TeacherNav />} title="Exam Timetable Details">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading exam timetable...</p>
        </div>
      </DashboardShell>
    )
  }

  if (!timetable) {
    return (
      <DashboardShell sidebar={<TeacherNav />} title="Exam Timetable Not Found">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold mb-2">Exam Timetable Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested exam timetable could not be found.</p>
          <Link href="/teacher/exams">
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
    <DashboardShell sidebar={<TeacherNav />} title="Exam Timetable Details">
        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/teacher/exams">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Exam Timetable Details</h1>
        </div>
        <UserNav />
      </div>

      <div className="p-3">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{timetable?.examName}</h2>
        <p className="text-muted-foreground">Class: {timetable?.classSectionName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Schedule</CardTitle>
          <CardDescription>Complete schedule for {timetable?.examName}</CardDescription>
        </CardHeader>
        <CardContent>
          {!timetable?.examEntries || timetable.examEntries.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-muted-foreground">No exam entries found</p>
            </div>
          ) : (
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
                {timetable.examEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{entry.subject}</TableCell>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.startTime}</TableCell>
                    <TableCell>{entry.endTime}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {calculateDuration(entry.startTime, entry.endTime)}
                      </Badge>
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
