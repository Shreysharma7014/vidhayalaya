"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp, doc, setDoc } from "firebase/firestore"
import { DashboardShell } from "@/components/dashboard-shell"
import { TeacherNav } from "@/components/teacher-nav"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { v4 as uuidv4 } from "uuid"

interface ClassSection {
  id: string
  name: string
}

interface Student {
  id: string
  name: string
  rollNo: string
  email: string
  classSectionId: string
  classSectionName: string
}

export default function NewExamPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [selectedClass, setSelectedClass] = useState("")
  const [examName, setExamName] = useState("")
  const [subject, setSubject] = useState("")
  const [maxMarks, setMaxMarks] = useState("100")
  const [studentMarks, setStudentMarks] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchClassSections = async () => {
      if (!user?.uid) return

      try {
        setIsLoading(true)
        const schedulesSnapshot = await getDocs(collection(db, "schedules"))
        const teachingClasses = new Set<string>()
        const classMap = new Map<string, string>()

        schedulesSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.schedule) {
            data.schedule.forEach((day: any) => {
              day.periods.forEach((period: any) => {
                if (period.teacherId === user.uid) {
                  teachingClasses.add(data.classSectionId)
                  classMap.set(data.classSectionId, data.classSectionName)
                }
              })
            })
          }
        })

        const classesData: ClassSection[] = Array.from(teachingClasses).map((id) => ({
          id,
          name: classMap.get(id) || "Unknown Class",
        }))

        setClassSections(classesData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching class sections:", error)
        toast.error("Error", {
          description: "Failed to load classes. Please try again.",
        })
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchClassSections()
    }
  }, [user])

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([])
        setStudentMarks({})
        return
      }

      try {
        setIsLoading(true)
        const studentsQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("classSectionId", "==", selectedClass)
        )

        const snapshot = await getDocs(studentsQuery)
        const studentsData: Student[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          studentsData.push({
            id: doc.id,
            name: data.name || "Unnamed Student",
            rollNo: data.rollNo || "-",
            email: data.email || "",
            classSectionId: data.classSectionId || "",
            classSectionName: data.classSectionName || ""
          })
        })

        studentsData.sort((a, b) => {
          if (!a.rollNo || a.rollNo === "-") return 1
          if (!b.rollNo || b.rollNo === "-") return -1
          return Number.parseInt(a.rollNo) - Number.parseInt(b.rollNo)
        })

        setStudents(studentsData)

        const initialMarks: { [key: string]: string } = {}
        studentsData.forEach((student) => {
          initialMarks[student.id] = ""
        })
        setStudentMarks(initialMarks)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching students:", error)
        toast.error("Error", {
          description: "Failed to load students. Please try again.",
        })
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [selectedClass])

  const handleClassChange = (value: string) => {
    setSelectedClass(value)
  }

  const handleMarkChange = (studentId: string, value: string) => {
    setStudentMarks((prev) => ({
      ...prev,
      [studentId]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClass) {
      toast.error("Please select a class")
      return
    }

    if (!examName.trim()) {
      toast.error("Exam name is required")
      return
    }

    if (!subject.trim()) {
      toast.error("Subject is required")
      return
    }

    if (!maxMarks || isNaN(Number(maxMarks)) || Number(maxMarks) <= 0) {
      toast.error("Maximum marks must be a positive number")
      return
    }

    let hasEmptyMarks = false
    let hasInvalidMarks = false
    const maxMarksNum = Number(maxMarks)

    Object.entries(studentMarks).forEach(([_, mark]) => {
      if (mark === "") {
        hasEmptyMarks = true
      } else if (isNaN(Number(mark)) || Number(mark) < 0 || Number(mark) > maxMarksNum) {
        hasInvalidMarks = true
      }
    })

    if (hasEmptyMarks) {
      toast.error("Missing marks", {
        description: "Please enter marks for all students",
      })
      return
    }

    if (hasInvalidMarks) {
      toast.error("Invalid marks", {
        description: `Marks must be numbers between 0 and ${maxMarks}`,
      })
      return
    }

    try {
      setIsSaving(true)

      const selectedClassData = classSections.find((c) => c.id === selectedClass)
      const examId = uuidv4()

      // Prepare marks data including roll numbers
      const marksData = students.map((student) => ({
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo, // Store roll number explicitly
        marks: Number(studentMarks[student.id]),
      }))

      // Store exam data in Firebase with roll numbers
      await setDoc(doc(db, "exams", examId), {
        id: examId,
        name: examName,
        subject,
        classSectionId: selectedClass,
        classSectionName: selectedClassData?.name || "",
        teacherId: user?.uid,
        teacherName: user?.name,
        maxMarks: Number(maxMarks),
        marks: marksData, // This includes rollNo for each student
        createdAt: Timestamp.now(),
      })

      toast.success("Marks submitted", {
        description: "The marks and roll numbers have been successfully recorded",
      })

      router.push("/teacher/marks")
    } catch (error) {
      console.error("Error submitting marks:", error)
      toast.error("Error", {
        description: "Failed to submit marks. Please try again.",
      })
      setIsSaving(false)
    }
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="New Exam">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="cursor-pointer ml-3 md:ml-1 xl:ml-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Create New Exam</h1>
        </div>
        <UserNav />
      </div>

      <div className="p-3">
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>Enter the details for the new exam</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="examName">Exam Name</Label>
                <Input
                  id="examName"
                  placeholder="Midterm Exam, Quiz 1, etc."
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Mathematics, Science, etc."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select value={selectedClass} onValueChange={handleClassChange}>
                  <SelectTrigger id="class" className="cursor-pointer">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSections.map((classSection) => (
                      <SelectItem key={classSection.id} value={classSection.id} className="cursor-pointer">
                        {classSection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMarks">Maximum Marks</Label>
                <Input
                  id="maxMarks"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student Marks</CardTitle>
            <CardDescription>
              {selectedClass
                ? `Enter marks for students in ${classSections.find((c) => c.id === selectedClass)?.name || selectedClass}`
                : "Select a class to view students"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !selectedClass ? (
              <div className="text-center py-6 text-muted-foreground border rounded-md">
                Please select a class to view students.
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-md">
                No students found in this class.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Marks (out of {maxMarks})</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.rollNo}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={maxMarks}
                          placeholder={`0-${maxMarks}`}
                          value={studentMarks[student.id] || ""}
                          onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          required
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-4">
          <Button variant="outline" type="button" className="cursor-pointer" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" className="cursor-pointer" disabled={isSaving || isLoading || !selectedClass || students.length === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Marks
          </Button>
        </div>
      </form>
      </div>
    </DashboardShell>
  )
}