"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { PrincipalNav } from "@/components/principal-nav"
import { UserNav } from "@/components/user-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Exam {
  id: string
  name: string
  subject: string
  classSectionId: string
  classSectionName: string
  teacherId: string
  teacherName: string
  maxMarks: number
  marks: {
    studentId: string
    studentName: string
    marks: number
    rollNo?: string // Changed from rollNumber to rollNo for consistency
    classSectionId?: string
    classSectionName?: string
  }[]
  createdAt: Timestamp
}

interface ClassData {
  id: string
  name: string
  exams: Exam[]
  averageMarks: {
    subject: string
    average: number
  }[]
}

export default function PrincipalMarksPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [classes, setClasses] = useState<ClassData[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedExam, setSelectedExam] = useState<string>("")
  const [exams, setExams] = useState<Exam[]>([])

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchMarksData = async () => {
      if (!user?.uid) return

      try {
        setIsLoading(true)

        // Fetch all class sections
        const classesSnapshot = await getDocs(collection(db, "classSections"))
        const classesData: { id: string; name: string }[] = []

        classesSnapshot.forEach((doc) => {
          classesData.push({
            id: doc.id,
            name: doc.data().name || "Unnamed Class",
          })
        })

        // Fetch all exams
        const examsQuery = query(collection(db, "exams"))
        const examsSnapshot = await getDocs(examsQuery)
        const examsData: Exam[] = []

        examsSnapshot.forEach((doc) => {
          const data = doc.data()
          examsData.push({
            id: doc.id,
            name: data.name,
            subject: data.subject,
            classSectionId: data.classSectionId,
            classSectionName: data.classSectionName,
            teacherId: data.teacherId,
            teacherName: data.teacherName,
            maxMarks: data.maxMarks,
            marks: data.marks.map((mark: any) => ({
              studentId: mark.studentId,
              studentName: mark.studentName,
              marks: mark.marks,
              rollNo: mark.rollNo || mark.rollNumber || "-", // Fetch rollNo, fallback to rollNumber or "-"
              classSectionId: mark.classSectionId,
              classSectionName: mark.classSectionName,
            })),
            createdAt: data.createdAt as Timestamp,
          })
        })

        // Group exams by class
        const classesWithExams: ClassData[] = classesData.map((classItem) => {
          const classExams = examsData.filter(
            (exam) => 
              exam.classSectionId === classItem.id && 
              exam.classSectionName === classItem.name
          )

          // Calculate average marks by subject for each class
          const subjectAverages: { [key: string]: { total: number; count: number } } = {}

          classExams.forEach((exam) => {
            if (!subjectAverages[exam.subject]) {
              subjectAverages[exam.subject] = { total: 0, count: 0 }
            }

            const totalMarks = exam.marks.reduce((sum, mark) => sum + mark.marks, 0)
            const averageMark = exam.marks.length > 0 ? totalMarks / exam.marks.length : 0
            const normalizedAverage = (averageMark / exam.maxMarks) * 100

            subjectAverages[exam.subject].total += normalizedAverage
            subjectAverages[exam.subject].count += 1
          })

          const averageMarks = Object.entries(subjectAverages).map(([subject, data]) => ({
            subject,
            average: data.count > 0 ? data.total / data.count : 0,
          }))

          return {
            id: classItem.id,
            name: classItem.name,
            exams: classExams,
            averageMarks,
          }
        })

        setClasses(classesWithExams)

        if (classesWithExams.length > 0) {
          setSelectedClass(classesWithExams[0].id)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching marks data:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchMarksData()
    }
  }, [user])

  useEffect(() => {
    if (selectedClass) {
      const classData = classes.find((c) => c.id === selectedClass)
      if (classData) {
        setExams(classData.exams)
        if (classData.exams.length > 0) {
          setSelectedExam(classData.exams[0].id)
        } else {
          setSelectedExam("")
        }
      }
    }
  }, [selectedClass, classes])

  const handleClassChange = (value: string) => {
    setSelectedClass(value)
  }

  const handleExamChange = (value: string) => {
    setSelectedExam(value)
  }

  const getSelectedExam = () => {
    return exams.find((exam) => exam.id === selectedExam)
  }

  const getClassAverageMarks = () => {
    const classData = classes.find((c) => c.id === selectedClass)
    return classData ? classData.averageMarks : []
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Marks Analysis">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Marks Analysis</h1>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 p-5">
          <Card className="w-98">
            <CardHeader>
              <CardTitle>Class Performance Overview</CardTitle>
              <CardDescription>Average marks by subject for each class</CardDescription>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground border rounded-md">
                  No exam data available yet.
                </div>
              ) : (
                <div className="grid gap-6 p-3 md:grid-cols-2 lg:grid-cols-3">
                  {classes.map((classData) => (
                    <Card key={classData.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{classData.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {classData.averageMarks.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No exam data</div>
                        ) : (
                          <div className="space-y-2">
                            {classData.averageMarks.map((subject, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm">{subject.subject}</span>
                                <div className="flex items-center">
                                  <div className="w-32 h-2 bg-gray-200 rounded-full mr-2">
                                    <div
                                      className="h-full bg-green-500 rounded-full"
                                      style={{ width: `${Math.min(100, subject.average)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">{subject.average.toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="w-98">
            <CardHeader>
              <CardTitle>Detailed Exam Results</CardTitle>
              <CardDescription>View detailed marks for specific exams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="class-select">Select Class</Label>
                  <Select value={selectedClass} onValueChange={handleClassChange}>
                    <SelectTrigger id="class-select" className="cursor-pointer">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((classData) => (
                        <SelectItem key={classData.id} value={classData.id} className="cursor-pointer">
                          {classData.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exam-select">Select Exam</Label>
                  <Select value={selectedExam} onValueChange={handleExamChange} disabled={exams.length === 0}>
                    <SelectTrigger id="exam-select" className="cursor-pointer">
                      <SelectValue placeholder="Select an exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id} className="cursor-pointer">
                          {exam.name} - {exam.subject} ({exam.createdAt.toDate().toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedExam && getSelectedExam() ? (
                <div>
                  <div className="flex justify-between mb-4">
                    <div>
                      <h3 className="font-medium">{getSelectedExam()?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Subject: {getSelectedExam()?.subject} | Max Marks: {getSelectedExam()?.maxMarks}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Teacher: {getSelectedExam()?.teacherName}</p>
                      <p className="text-sm text-muted-foreground">
                        Created: {getSelectedExam()?.createdAt.toDate().toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-right">Marks</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSelectedExam()?.marks.map((mark, index) => (
                        <TableRow key={index}>
                          <TableCell>{mark.rollNo || "-"}</TableCell> {/* Display rollNo */}
                          <TableCell>{mark.studentName}</TableCell>
                          <TableCell className="text-right">
                            {mark.marks} / {getSelectedExam()?.maxMarks}
                          </TableCell>
                          <TableCell className="text-right">
                            {((mark.marks / (getSelectedExam()?.maxMarks || 1)) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  {exams.length === 0 ? "No exams available for this class" : "Select an exam to view details"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardShell>
  )
}