"use client"

import { useEffect, useState } from "react"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { FileText, Search, Eye, Pencil } from "lucide-react"
import Link from "next/link"

interface Mark {
  studentId: string
  studentName: string
  rollNumber: string
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
}

export default function TeacherMarksPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [filteredExams, setFilteredExams] = useState<Exam[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchExams = async () => {
      if (!user?.uid) return

      try {
        setIsLoading(true)
        const examsQuery = query(collection(db, "exams"), where("teacherId", "==", user.uid))

        const snapshot = await getDocs(examsQuery)
        const examsList: Exam[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          const marks = data.marks || []

          // Calculate average marks
          const totalMarks = marks.reduce((sum: number, mark: Mark) => sum + (mark.marks || 0), 0)
          const averageMarks = marks.length > 0 ? totalMarks / marks.length : 0

          examsList.push({
            id: doc.id,
            name: data.name || "Untitled Exam",
            subject: data.subject || "Unknown Subject",
            classSectionId: data.classSectionId || "",
            classSectionName: data.classSectionName || "Unknown Class",
            teacherId: data.teacherId || user.uid,
            teacherName: data.teacherName || user.displayName || "Teacher",
            maxMarks: data.maxMarks || 100,
            marks: marks,
            createdAt: data.createdAt?.toDate() || new Date(),
            averageMarks: Number.parseFloat(averageMarks.toFixed(2)),
          })
        })

        // After the snapshot.forEach loop and before setting the state
        examsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        setExams(examsList)
        setFilteredExams(examsList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching exams:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchExams()
    }
  }, [user, loading])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredExams(exams)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = exams.filter(
        (exam) =>
          exam.name.toLowerCase().includes(query) ||
          exam.subject.toLowerCase().includes(query) ||
          exam.classSectionName.toLowerCase().includes(query),
      )
      setFilteredExams(filtered)
    }
  }, [searchQuery, exams])

  const getPerformanceColor = (average: number, max: number) => {
    const percentage = (average / max) * 100
    if (percentage >= 75) return "bg-green-500"
    if (percentage >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Marks">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Exam Marks</h1>
        <UserNav />
      </div>

      <div className="flex items-center justify-between p-3 mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exams..."
            className="pl-8 w-48 md:w-80 xl:w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Link href="/teacher/marks/new">
          <Button className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            New Exam
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading exams...</p>
          </div>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No exams found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery ? "Try a different search term" : "You haven't created any exams yet"}
          </p>
          {!searchQuery && (
            <Link href="/teacher/marks/new">
              <Button className="mt-4 cursor-pointer">Create your first exam</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 p-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <Card key={exam.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <CardTitle className="line-clamp-1">{exam.name}</CardTitle>
                  <Badge>{exam.subject}</Badge>
                </div>
                <CardDescription>{exam.classSectionName}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="mb-4">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>
                      Average: {exam.averageMarks} / {exam.maxMarks}
                    </span>
                    <span className="text-xs">{Math.round(((exam.averageMarks || 0) / exam.maxMarks) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${getPerformanceColor(exam.averageMarks || 0, exam.maxMarks)}`}
                      style={{
                        width: `${Math.min(100, Math.round(((exam.averageMarks || 0) / exam.maxMarks) * 100))}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{exam.marks.length} students</span>
                  <span>{format(exam.createdAt, "MMM d, yyyy")}</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Link href={`/teacher/marks/${exam.id}`}>
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    <Eye className="mr-1 h-4 w-4" />
                    View
                  </Button>
                </Link>
                <Link href={`/teacher/marks/edit/${exam.id}`}>
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
          
        </div>
        
      )}
    </DashboardShell>
  )
}
