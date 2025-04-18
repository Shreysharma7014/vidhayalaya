"use client"

import React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { DashboardShell } from "@/components/dashboard-shell"
import { TeacherNav } from "@/components/teacher-nav"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Mark {
  studentId: string
  studentName: string
  rollNo: string
  marks: number
}

interface Exam {
  id: string
  name: string
  subject: string
  classSectionId: string
  classSectionName: string
  teacherId: string
  teacherName: string
  maxMarks: number
  marks: Mark[]
  createdAt: Date
}

export default function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [examName, setExamName] = useState("")
  const [maxMarks, setMaxMarks] = useState("100")
  const [studentMarks, setStudentMarks] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Unwrap the params Promise
  const resolvedParams = React.use(params)

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchExam = async () => {
      if (!user?.uid || !resolvedParams.id) return

      try {
        setIsLoading(true)
        const examDoc = await getDoc(doc(db, "exams", resolvedParams.id))

        if (!examDoc.exists() || examDoc.data().teacherId !== user.uid) {
          router.push("/teacher/marks")
          return
        }

        const data = examDoc.data()
        const marks = data.marks || []

        setExam({
          id: examDoc.id,
          name: data.name || "Untitled Exam",
          subject: data.subject || "Unknown Subject",
          classSectionId: data.classSectionId || "",
          classSectionName: data.classSectionName || "Unknown Class",
          teacherId: data.teacherId || user.uid,
          teacherName: data.teacherName || user.displayName || "Teacher",
          maxMarks: data.maxMarks || 100,
          marks: marks.sort((a: Mark, b: Mark) => {
            if (a.rollNo && b.rollNo) {
              return Number.parseInt(a.rollNo) - Number.parseInt(b.rollNo)
            }
            return a.studentName.localeCompare(b.studentName)
          }),
          createdAt: data.createdAt?.toDate() || new Date(),
        })

        setExamName(data.name || "")
        setMaxMarks(data.maxMarks?.toString() || "100")

        const initialMarks: { [key: string]: string } = {}
        marks.forEach((mark: Mark) => {
          initialMarks[mark.studentId] = mark.marks?.toString() || ""
        })
        setStudentMarks(initialMarks)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching exam:", error)
        toast.error("Error loading exam", {
          description: "Could not load exam details. Please try again.",
        })
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchExam()
    }
  }, [user, resolvedParams.id, router, loading])

  const handleMarkChange = (studentId: string, value: string) => {
    setStudentMarks((prev) => ({
      ...prev,
      [studentId]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!exam) return

    if (!examName.trim()) {
      toast.error("Exam name is required")
      return
    }

    if (!maxMarks || isNaN(Number(maxMarks)) || Number(maxMarks) <= 0) {
      toast.error("Maximum marks must be a positive number")
      return
    }

    let hasEmptyMarks = false
    let hasInvalidMarks = false
    const maxMarksNum = Number(maxMarks)

    const updatedMarks = exam.marks.map((mark) => {
      const markValue = studentMarks[mark.studentId]
      if (!markValue) {
        hasEmptyMarks = true
      } else if (isNaN(Number(markValue)) || Number(markValue) < 0 || Number(markValue) > maxMarksNum) {
        hasInvalidMarks = true
      }

      return {
        ...mark,
        marks: markValue ? Number(markValue) : 0,
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

      await updateDoc(doc(db, "exams", exam.id), {
        name: examName,
        maxMarks: Number(maxMarks),
        marks: updatedMarks,
      })

      toast.success("Marks updated", {
        description: "The exam marks have been successfully updated",
      })

      router.push(`/teacher/marks/${exam.id}`)
    } catch (error) {
      console.error("Error updating exam:", error)
      toast.error("Error", {
        description: "Failed to update marks. Please try again.",
      })
      setIsSaving(false)
    }
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (isLoading || !exam) {
    return (
      <DashboardShell sidebar={<TeacherNav />} title="Edit Exam">
        <div className="flex justify-center p-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading exam details...</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Edit Exam">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="cursor-pointer ml-3 xl:ml-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Exam Marks</h1>
        </div>
        <UserNav />
      </div>

      <div className="p-3">
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>Edit the exam information for {exam.classSectionName}</CardDescription>
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
              Edit marks for {exam.marks.length} students in {exam.classSectionName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exam.marks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">No students found for this exam.</div>
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
                  {exam.marks.map((mark) => (
                    <TableRow key={mark.studentId}>
                      <TableCell>{mark.rollNo || "-"}</TableCell>
                      <TableCell>{mark.studentName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={maxMarks}
                          placeholder={`0-${maxMarks}`}
                          value={studentMarks[mark.studentId] || ""}
                          onChange={(e) => handleMarkChange(mark.studentId, e.target.value)}
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
          <Button type="submit" className="cursor-pointer" disabled={isSaving || exam.marks.length === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
      </div>
    </DashboardShell>
  )
}