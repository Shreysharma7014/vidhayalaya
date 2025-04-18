"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { DashboardShell } from "@/components/dashboard-shell"
import { TeacherNav } from "@/components/teacher-nav"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Pencil, FileBarChart } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import React from "react"

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
  averageMarks?: number
  highestMarks?: number
  lowestMarks?: number
  passPercentage?: number
}

async function fetchStudentRollNumbers(classSectionName: string, marks: Mark[]): Promise<Mark[]> {
  try {
    const studentsQuery = query(
      collection(db, "students"),
      where("classSectionName", "==", classSectionName)
    )
    const studentsSnapshot = await getDocs(studentsQuery)
    
    const studentMap = new Map<string, string>()
    studentsSnapshot.forEach((doc) => {
      const data = doc.data()
      studentMap.set(data.studentName, data.rollNo)
    })

    return marks.map(mark => ({
      ...mark,
      rollNumber: studentMap.get(mark.studentName) || mark.rollNo || "-"
    }))
  } catch (error) {
    console.error("Error fetching roll numbers:", error)
    return marks.map(mark => ({
      ...mark,
      rollNumber: mark.rollNo || "-"
    }))
  }
}

export default function ExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const resolvedParams = React.use(params)

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchExamData = async () => {
      if (!user?.uid || !resolvedParams.id) return

      try {
        setIsLoading(true)
        const examDoc = await getDoc(doc(db, "exams", resolvedParams.id))

        if (!examDoc.exists() || examDoc.data().teacherId !== user.uid) {
          router.push("/teacher/marks")
          return
        }

        const data = examDoc.data()
        let marks = data.marks || []

        // Fetch and update roll numbers
        marks = await fetchStudentRollNumbers(data.classSectionName, marks)

        // Calculate statistics
        const totalMarks = marks.reduce((sum: number, mark: Mark) => sum + (mark.marks || 0), 0)
        const averageMarks = marks.length > 0 ? totalMarks / marks.length : 0
        const highestMarks = marks.length > 0 ? Math.max(...marks.map((m: Mark) => m.marks || 0)) : 0
        const lowestMarks = marks.length > 0 ? Math.min(...marks.map((m: Mark) => m.marks || 0)) : 0
        const passCount = marks.filter((m: Mark) => (m.marks / data.maxMarks) * 100 >= 33).length
        const passPercentage = marks.length > 0 ? (passCount / marks.length) * 100 : 0

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
            if (a.rollNo && b.rollNo && a.rollNo !== "-" && b.rollNo !== "-") {
              return Number.parseInt(a.rollNo) - Number.parseInt(b.rollNo)
            }
            return a.studentName.localeCompare(b.studentName)
          }),
          createdAt: data.createdAt?.toDate() || new Date(),
          averageMarks: Number.parseFloat(averageMarks.toFixed(2)),
          highestMarks,
          lowestMarks,
          passPercentage: Number.parseFloat(passPercentage.toFixed(2)),
        })

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching exam:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchExamData()
    }
  }, [user, resolvedParams.id, router, loading])

  const getMarkColor = (marks: number, maxMarks: number) => {
    const percentage = (marks / maxMarks) * 100
    if (percentage >= 75) return "text-green-600"
    if (percentage >= 50) return "text-yellow-600"
    if (percentage >= 33) return "text-orange-600"
    return "text-red-600"
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (isLoading) {
    return (
      <DashboardShell sidebar={<TeacherNav />} title="Exam Details">
        <div className="flex justify-center p-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading exam details...</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (!exam) {
    return (
      <DashboardShell sidebar={<TeacherNav />} title="Exam Details">
        <div className="flex flex-col items-center justify-center p-12">
          <FileBarChart className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Exam not found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The exam you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button className="mt-4 cursor-pointer" onClick={() => router.push("/teacher/marks")}>
            Back to Marks
          </Button>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title={`Exam: ${exam.name}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 ml-2 xl:ml-0">
          <Button variant="outline" size="icon" className="cursor-pointer" onClick={() => router.push("/teacher/marks")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {exam.name}
              <Badge>{exam.subject}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {exam.classSectionName} • Created on {format(exam.createdAt, "PPP")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/teacher/marks/edit/${exam.id}`}>
            <Button variant="outline" size="sm" className="cursor-pointer">
              <Pencil className="mr-1 h-4 w-4" />
              Edit Marks
            </Button>
          </Link>
          <UserNav />
        </div>
      </div>

      <div className="grid gap-6 p-3 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exam.averageMarks} <span className="text-sm font-normal text-muted-foreground">/ {exam.maxMarks}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(((exam.averageMarks || 0) / exam.maxMarks) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {exam.highestMarks} <span className="text-sm font-normal text-muted-foreground">/ {exam.maxMarks}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(((exam.highestMarks || 0) / exam.maxMarks) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lowest Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getMarkColor(exam.lowestMarks || 0, exam.maxMarks)}`}>
              {exam.lowestMarks} <span className="text-sm font-normal text-muted-foreground">/ {exam.maxMarks}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(((exam.lowestMarks || 0) / exam.maxMarks) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pass Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exam.passPercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {exam.marks.filter((m) => (m.marks / exam.maxMarks) * 100 >= 33).length} out of {exam.marks.length}{" "}
              students
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="p-3">
      <Card>
        <CardHeader>
          <CardTitle>Student Marks</CardTitle>
          <CardDescription>
            Marks for {exam.marks.length} students in {exam.classSectionName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exam.marks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No marks recorded for this exam.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exam.marks.map((mark) => {
                  const percentage = (mark.marks / exam.maxMarks) * 100
                  const isPassed = percentage >= 33
                  return (
                    <TableRow key={mark.studentId}>
                      <TableCell className="font-medium">{mark.rollNo}</TableCell>
                      <TableCell>{mark.studentName}</TableCell>
                      <TableCell className={`text-right font-medium ${getMarkColor(mark.marks, exam.maxMarks)}`}>
                        {mark.marks} / {exam.maxMarks}
                      </TableCell>
                      <TableCell className={`text-right ${getMarkColor(mark.marks, exam.maxMarks)}`}>
                        {percentage.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={isPassed ? "default" : "destructive"}>{isPassed ? "Pass" : "Fail"}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardShell>
  )
}