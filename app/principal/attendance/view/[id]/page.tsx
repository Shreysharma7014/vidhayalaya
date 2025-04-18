"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner" // Import toast from sonner
import { ArrowLeft, Check, X } from "lucide-react"
import Link from "next/link"

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
  studentName?: string
  studentRollNo?: string
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
  const [teacherName, setTeacherName] = useState<string>("")

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
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
          toast.error("The attendance session you're looking for doesn't exist.") // Update to use sonner toast
          router.push("/principal/attendance")
          return
        }

        const sessionData = sessionDoc.data()

        setSession({
          id: sessionDoc.id,
          date: sessionData.date.toDate(),
          classSectionId: sessionData.classSectionId,
          classSectionName: sessionData.classSectionName,
          teacherId: sessionData.teacherId,
          teacherName: sessionData.teacherName,
          presentCount: sessionData.presentCount,
          absentCount: sessionData.absentCount,
        })

        // Fetch teacher name if not in session data
        if (sessionData.teacherId && !sessionData.teacherName) {
          const teacherDoc = await getDoc(doc(db, "users", sessionData.teacherId))
          if (teacherDoc.exists()) {
            setTeacherName(teacherDoc.data().name || "Unknown Teacher")
          }
        } else if (sessionData.teacherName) {
          setTeacherName(sessionData.teacherName)
        }

        // Fetch students in this class
        const studentQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("classSectionId", "==", sessionData.classSectionId),
        )

        const studentSnapshot = await getDocs(studentQuery)

        const studentsList: Student[] = []
        const studentsMap: Record<string, Student> = {}

        studentSnapshot.forEach((doc) => {
          const data = doc.data()
          const student = {
            id: doc.id,
            name: data.name || "Unknown",
            rollNo: data.rollNo || "",
            srNo: data.srNo || "",
            classSectionName: data.classSectionName || "",
            photoURL: data.photoURL,
          }
          studentsList.push(student)
          studentsMap[doc.id] = student
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
          const student = studentsMap[data.studentId]

          records.push({
            id: doc.id,
            studentId: data.studentId,
            status: data.status,
            studentName: student?.name,
            studentRollNo: student?.rollNo,
          })

          attendanceMap[data.studentId] = data.status
        })

        setAttendanceRecords(records)
        setAttendance(attendanceMap)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching attendance data:", error)
        toast.error("Failed to load attendance data. Please try again.") // Update to use sonner toast
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchAttendanceData()
    }
  }, [sessionId, user, router])

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="View Attendance">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/principal/attendance">
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
        <Card>
          <CardHeader>
            <CardTitle>Attendance Session Not Found</CardTitle>
            <CardDescription>
              The attendance session you're looking for doesn't exist or you don't have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/principal/attendance">
              <Button>Back to Attendance</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="p-3">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Attendance for {format(session.date, "PPP")}</CardTitle>
            <CardDescription>
              {session.classSectionName} - Marked by {teacherName || "Unknown Teacher"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{session.presentCount + session.absentCount}</p>
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
                <h3 className="text-lg font-medium">No students found</h3>
                <p className="text-muted-foreground mt-2">There are no students assigned to this class.</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left font-medium">Roll No.</th>
                      <th className="p-3 text-left font-medium">Name</th>
                      <th className="p-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-t">
                        <td className="p-3">{student.rollNo}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.photoURL} alt={student.name} />
                              <AvatarFallback>
                                {student.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{student.name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {attendance[student.id] === "present" ? (
                              <>
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="text-green-500">Present</span>
                              </>
                            ) : attendance[student.id] === "absent" ? (
                              <>
                                <X className="h-4 w-4 text-red-500" />
                                <span className="text-red-500">Absent</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">Not marked</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}
    </DashboardShell>
  )
}
