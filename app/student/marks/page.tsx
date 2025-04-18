"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { StudentNav } from "@/components/student-nav"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { collection, getDocs, Timestamp } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface ExamMark {
  id: string
  name: string
  subject: string
  className: string
  teacherName: string
  maxMarks: number
  marks: number
  percentage: number
  createdAt: Timestamp
}

export default function StudentMarksPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [examMarks, setExamMarks] = useState<ExamMark[]>([])
  const [subjectAverages, setSubjectAverages] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    if (!loading && (!user || user.role !== "student")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchStudentMarks = async () => {
      if (!user?.uid) return

      try {
        setIsLoading(true)

        const examsSnapshot = await getDocs(collection(db, "exams"))
        const studentMarks: ExamMark[] = []
        const subjectTotals: { [key: string]: { total: number; count: number } } = {}

        examsSnapshot.forEach((doc) => {
          const examData = doc.data()
          const studentMark = examData.marks.find((mark: any) => mark.studentId === user.uid)

          if (studentMark) {
            const percentage = (studentMark.marks / examData.maxMarks) * 100

            studentMarks.push({
              id: examData.id,
              name: examData.name,
              subject: examData.subject,
              className: examData.className,
              teacherName: examData.teacherName,
              maxMarks: examData.maxMarks,
              marks: studentMark.marks,
              percentage,
              createdAt: examData.createdAt as Timestamp,
            })

            if (!subjectTotals[examData.subject]) {
              subjectTotals[examData.subject] = { total: 0, count: 0 }
            }

            subjectTotals[examData.subject].total += percentage
            subjectTotals[examData.subject].count += 1
          }
        })

        studentMarks.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())

        const averages: { [key: string]: number } = {}
        Object.entries(subjectTotals).forEach(([subject, data]) => {
          averages[subject] = data.count > 0 ? data.total / data.count : 0
        })

        setExamMarks(studentMarks)
        setSubjectAverages(averages)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching student marks:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "student") {
      fetchStudentMarks()
    }
  }, [user])

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 85) return "bg-green-500"
    if (percentage >= 70) return "bg-blue-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getPerformanceLabel = (percentage: number) => {
    if (percentage >= 85) return "Excellent"
    if (percentage >= 70) return "Good"
    if (percentage >= 50) return "Average"
    return "Needs Improvement"
  }

  if (loading || !user || user.role !== "student") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<StudentNav />} title="My Marks">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">My Academic Performance</h1>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        
        <div className="p-3 flex flex-col md:flex-1/2 xl:flex-1/3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
              <CardDescription>Your average performance in each subject</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(subjectAverages).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded-md">
                  No exam data available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(subjectAverages).map(([subject, average], index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{subject}</span>
                        <span className="text-sm">{average.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full">
                        <div
                          className={`h-full ${getPerformanceColor(average)} rounded-full`}
                          style={{ width: `${Math.min(100, average)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
         
          
          <Card>
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
              <CardDescription>Detailed view of all your exam results</CardDescription>
            </CardHeader>
            <CardContent>
              {examMarks.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded-md">
                  No exam results available yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{examMarks.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell><div className="font-medium">{exam.name}</div></TableCell>
                      <TableCell>{exam.subject}</TableCell>
                      <TableCell>{exam.marks} / {exam.maxMarks}</TableCell>
                      <TableCell>{exam.percentage.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge className={getPerformanceColor(exam.percentage).replace("bg-", "bg-opacity-20 text-")}>
                          {getPerformanceLabel(exam.percentage)}
                        </Badge>
                      </TableCell>
                      <TableCell>{exam.createdAt.toDate().toLocaleString()}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          </div>
        
      )}
    </DashboardShell>
  )
}