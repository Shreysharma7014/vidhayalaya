"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, addDoc, Timestamp, doc, updateDoc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useSearchParams } from "next/navigation"
import { format, parseISO } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner" // Updated import
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
  studentId: string
  status: "present" | "absent"
}

export default function MarkAttendancePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get("date")
  const date = dateParam ? parseISO(dateParam) : new Date()

  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

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
            photoURL: data.photoURL,
          })
        })

        // Sort by roll number
        studentsList.sort((a, b) => {
          return Number.parseInt(a.rollNo) - Number.parseInt(b.rollNo)
        })

        setStudents(studentsList)

        // Initialize all students as present by default
        const initialAttendance: Record<string, "present" | "absent"> = {}
        studentsList.forEach((student) => {
          initialAttendance[student.id] = "present"
        })
        setAttendance(initialAttendance)

        // Check if attendance already exists for this date
        await checkExistingAttendance(date)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching students:", error)
        setIsLoading(false)
      }
    }

    const checkExistingAttendance = async (date: Date) => {
      if (!user?.uid) return

      try {
        // Format date to start and end of day for query
        const startDate = new Date(date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(date)
        endDate.setHours(23, 59, 59, 999)

        const sessionsQuery = query(
          collection(db, "attendanceSessions"),
          where("teacherId", "==", user.uid),
          where("date", ">=", Timestamp.fromDate(startDate)),
          where("date", "<=", Timestamp.fromDate(endDate)),
        )

        const snapshot = await getDocs(sessionsQuery)

        if (!snapshot.empty) {
          const sessionDoc = snapshot.docs[0]
          setExistingSessionId(sessionDoc.id)

          // Fetch attendance records for this session
          const recordsQuery = query(collection(db, "attendance"), where("sessionId", "==", sessionDoc.id))

          const recordsSnapshot = await getDocs(recordsQuery)

          const existingAttendance: Record<string, "present" | "absent"> = {}
          recordsSnapshot.forEach((doc) => {
            const data = doc.data()
            existingAttendance[data.studentId] = data.status
          })

          setAttendance(existingAttendance)
        }
      } catch (error) {
        console.error("Error checking existing attendance:", error)
      }
    }

    if (user && user.role === "teacher") {
      fetchStudents()
    }
  }, [user, date])

  const handleAttendanceChange = (studentId: string, status: "present" | "absent") => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }))
  }

  const handleSubmit = async () => {
    if (!user?.uid || !user?.classSectionId) return

    setIsSubmitting(true)

    try {
      // Count present and absent students
      let presentCount = 0
      let absentCount = 0

      Object.values(attendance).forEach((status) => {
        if (status === "present") presentCount++
        else absentCount++
      })

      if (existingSessionId) {
        // Update existing session
        await updateDoc(doc(db, "attendanceSessions", existingSessionId), {
          presentCount,
          absentCount,
          updatedAt: Timestamp.now(),
        })

        // Delete existing attendance records
        const recordsQuery = query(collection(db, "attendance"), where("sessionId", "==", existingSessionId))

        const recordsSnapshot = await getDocs(recordsQuery)

        // Create new attendance records in batch
        const attendanceRecords: AttendanceRecord[] = []

        for (const studentId in attendance) {
          attendanceRecords.push({
            studentId,
            status: attendance[studentId],
          })

          // Add attendance record
          await addDoc(collection(db, "attendance"), {
            sessionId: existingSessionId,
            studentId,
            status: attendance[studentId],
            date: Timestamp.fromDate(date),
            classSectionId: user.classSectionId,
            teacherId: user.uid,
            createdAt: Timestamp.now(),
          })
        }

        toast.success(`Attendance updated for ${format(date, "PPP")}`)
      } else {
        // Create new attendance session
        const sessionRef = await addDoc(collection(db, "attendanceSessions"), {
          teacherId: user.uid,
          classSectionId: user.classSectionId,
          classSectionName: user.classSectionName,
          date: Timestamp.fromDate(date),
          presentCount,
          absentCount,
          createdAt: Timestamp.now(),
        })

        // Create attendance records
        for (const studentId in attendance) {
          await addDoc(collection(db, "attendance"), {
            sessionId: sessionRef.id,
            studentId,
            status: attendance[studentId],
            date: Timestamp.fromDate(date),
            classSectionId: user.classSectionId,
            teacherId: user.uid,
            createdAt: Timestamp.now(),
          })
        }

        toast.success(`Attendance marked for ${format(date, "PPP")}`)
      }

      router.push("/teacher/attendance")
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Mark Attendance">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/teacher/attendance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Mark Attendance</h1>
        </div>
        <UserNav />
      </div>

      <div className="p-3">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attendance for {format(date, "PPP")}</CardTitle>
          <CardDescription>
            {user.classSectionName} - {students.length} students
            {existingSessionId && " (Editing existing attendance)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">Loading students...</div>
          ) : students.length === 0 ? (
            <p className="text-center text-muted-foreground">No students found in this class.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const allPresent: Record<string, "present" | "absent"> = {}
                    students.forEach((student) => {
                      allPresent[student.id] = "present"
                    })
                    setAttendance(allPresent)
                  }}
                >
                  Mark All Present
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const allAbsent: Record<string, "present" | "absent"> = {}
                    students.forEach((student) => {
                      allAbsent[student.id] = "absent"
                    })
                    setAttendance(allAbsent)
                  }}
                >
                  Mark All Absent
                </Button>
              </div>

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
                          <RadioGroup
                            value={attendance[student.id] || "present"}
                            onValueChange={(value) => handleAttendanceChange(student.id, value as "present" | "absent")}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="present"
                                id={`present-${student.id}`}
                                className="text-green-500 border-green-500"
                              />
                              <Label
                                htmlFor={`present-${student.id}`}
                                className="flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="h-4 w-4 text-green-500" />
                                Present
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="absent"
                                id={`absent-${student.id}`}
                                className="text-red-500 border-red-500"
                              />
                              <Label
                                htmlFor={`absent-${student.id}`}
                                className="flex items-center gap-1 cursor-pointer"
                              >
                                <X className="h-4 w-4 text-red-500" />
                                Absent
                              </Label>
                            </div>
                          </RadioGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Link href="/teacher/attendance">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={isSubmitting || students.length === 0}>
            {isSubmitting ? "Saving..." : existingSessionId ? "Update Attendance" : "Save Attendance"}
          </Button>
        </CardFooter>
      </Card>
      </div>
    </DashboardShell>
  )
}
