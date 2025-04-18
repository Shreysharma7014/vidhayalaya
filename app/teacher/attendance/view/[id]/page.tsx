"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner" // Direct import of toast from sonner
import { ArrowLeft, Check, X, AlertTriangle } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Student {
  id: string
  name: string
  rollNo: string
  srNo: string
  classSectionName: string
  photoURL?: string
}

interface AttendanceRecord {
  id: string
  studentId: string
  status: "present" | "absent"
}

interface AttendanceSession {
  id: string
  date: Date
  classSectionId: string
  classSectionName: string
  presentCount: number
  absentCount: number
}

export default function ViewAttendancePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!sessionId || !user?.uid) return

      try {
        setIsLoading(true)

        // Fetch session details
        const sessionDoc = await getDoc(doc(db, "attendanceSessions", sessionId))

        if (!sessionDoc.exists()) {
          toast.error("Session not found: The attendance session you're looking for doesn't exist.") // Updated toast
          router.push("/teacher/attendance")
          return
        }

        const sessionData = sessionDoc.data()

        // Verify this session belongs to the current teacher
        if (sessionData.teacherId !== user.uid) {
          toast.error("Unauthorized: You don't have permission to view this attendance session.") // Updated toast
          router.push("/teacher/attendance")
          return
        }

        setSession({
          id: sessionDoc.id,
          date: sessionData.date.toDate(),
          classSectionId: sessionData.classSectionId,
          classSectionName: sessionData.classSectionName,
          presentCount: sessionData.presentCount,
          absentCount: sessionData.absentCount,
        })

        // Fetch students in this class
        const studentQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("classSectionId", "==", sessionData.classSectionId),
        )

        const studentSnapshot = await getDocs(studentQuery)

        const studentsList: Student[] = []
        studentSnapshot.forEach((doc) => {
          const data = doc.data()
          studentsList.push({
            id: doc.id,
            name: data.name || "Unknown",
            rollNo: data.rollNo || "",
            srNo: data.srNo || "",
            classSectionName: data.classSectionName || "",
            photoURL: data.photoURL,
          })
        })

        // Sort by roll number
        studentsList.sort((a, b) => {
          return Number.parseInt(a.rollNo) - Number.parseInt(b.rollNo)
        })

        setStudents(studentsList)

        // Fetch attendance records
        const recordsQuery = query(collection(db, "attendance"), where("sessionId", "==", sessionId))

        const recordsSnapshot = await getDocs(recordsQuery)

        const records: AttendanceRecord[] = []
        const attendanceMap: Record<string, "present" | "absent"> = {}

        recordsSnapshot.forEach((doc) => {
          const data = doc.data()
          records.push({
            id: doc.id,
            studentId: data.studentId,
            status: data.status,
          })

          attendanceMap[data.studentId] = data.status
        })

        setAttendanceRecords(records)
        setAttendance(attendanceMap)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching attendance data:", error)
        toast.error("Failed to load attendance data. Please try again.") // Updated toast
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchAttendanceData()
    }
  }, [sessionId, user, router])

  const handleAttendanceChange = (studentId: string, status: "present" | "absent") => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleSaveChanges = async () => {
    if (!session || !user?.uid) return

    setIsSubmitting(true)

    try {
      // Count present and absent students
      let presentCount = 0
      let absentCount = 0

      Object.values(attendance).forEach((status) => {
        if (status === "present") presentCount++
        else absentCount++
      })

      // Update session counts
      await updateDoc(doc(db, "attendanceSessions", session.id), {
        presentCount,
        absentCount,
        updatedAt: Timestamp.now(),
      })

      // Delete existing attendance records
      for (const record of attendanceRecords) {
        await deleteDoc(doc(db, "attendance", record.id))
      }

      // Create new attendance records
      const newRecords: AttendanceRecord[] = []

      for (const studentId in attendance) {
        const docRef = await addDoc(collection(db, "attendance"), {
          sessionId: session.id,
          studentId,
          status: attendance[studentId],
          date: Timestamp.fromDate(session.date),
          classSectionId: session.classSectionId,
          teacherId: user.uid,
          createdAt: Timestamp.now(),
        })

        newRecords.push({
          id: docRef.id,
          studentId,
          status: attendance[studentId],
        })
      }

      setAttendanceRecords(newRecords)
      setSession({
        ...session,
        presentCount,
        absentCount,
      })

      toast.success(`Attendance updated for ${format(session.date, "PPP")}`) // Updated toast

      setIsEditing(false)
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred") // Updated toast
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSession = async () => {
    if (!session) return

    setIsSubmitting(true)

    try {
      // Delete all attendance records
      for (const record of attendanceRecords) {
        await deleteDoc(doc(db, "attendance", record.id))
      }

      // Delete the session
      await deleteDoc(doc(db, "attendanceSessions", session.id))

      toast.success(`Attendance deleted for ${format(session.date, "PPP")}`) // Updated toast

      router.push("/teacher/attendance")
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred") // Updated toast
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="View Attendance">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/teacher/attendance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Attendance Details</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading attendance data...</div>
      ) : !session ? (
        <div className="p-3">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Session Not Found</CardTitle>
            <CardDescription>
              The attendance session you're looking for doesn't exist or you don't have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/teacher/attendance">
              <Button>Back to Attendance</Button>
            </Link>
          </CardContent>
        </Card>
        </div>
      ) : (
        <div className="p-3">
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Attendance for {format(session.date, "PPP")}</CardTitle>
              <CardDescription>
                {session.classSectionName} - {students.length} students
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Attendance</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the attendance for {format(session.date, "PPP")}? This action
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSession} disabled={isSubmitting}>
                          {isSubmitting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{session.presentCount}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{session.absentCount}</p>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="text-center p-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-medium">No students found</h3>
                <p className="text-muted-foreground mt-2">There are no students assigned to this class.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Avatar className="mr-4">
                        <AvatarImage src={student.photoURL} />
                        <AvatarFallback>{student.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{student.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.rollNo} - {student.srNo}
                        </p>
                      </div>
                    </div>
                    <RadioGroup
                      value={attendance[student.id] || "absent"}
                      onValueChange={(value) => handleAttendanceChange(student.id, value as "present" | "absent")}
                      disabled={!isEditing}
                    >
                      <div className="flex gap-2">
                        <RadioGroupItem value="present" id={`present-${student.id}`} />
                        <RadioGroupItem value="absent" id={`absent-${student.id}`} />
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}
    </DashboardShell>
  )
}
