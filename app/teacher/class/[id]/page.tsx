"use client"

import React from "react"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { TeacherNav } from "@/components/teacher-nav"
import { UserNav } from "@/components/user-nav"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, addDoc, setDoc, Timestamp, doc } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Calendar } from "lucide-react"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface Student {
  id: string
  name: string
  rollNo: string
  email: string
  classSectionId: string
  classSectionName: string
}

export default function ClassDetailsPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise)
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const subject = searchParams.get("subject") || ""
  const className = searchParams.get("className") || "Unknown Class"

  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("homework")

  const [homeworkTitle, setHomeworkTitle] = useState("")
  const [homeworkDescription, setHomeworkDescription] = useState("")
  const [dueDate, setDueDate] = useState<Date>(new Date())
  const [isSubmittingHomework, setIsSubmittingHomework] = useState(false)

  const [examName, setExamName] = useState("")
  const [studentMarks, setStudentMarks] = useState<{ [key: string]: string }>({})
  const [isSubmittingMarks, setIsSubmittingMarks] = useState(false)
  const [maxMarks, setMaxMarks] = useState("100")

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!user?.uid || !params.id || !className) return

      try {
        setIsLoading(true)

        const studentsQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("classSectionId", "==", params.id),
          where("classSectionName", "==", className)
        )

        const studentsSnapshot = await getDocs(studentsQuery)
        const studentsData: Student[] = []

        studentsSnapshot.forEach((doc) => {
          const data = doc.data()
          studentsData.push({
            id: doc.id,
            name: data.name || "Unnamed Student",
            rollNo: data.rollNo || "-", // Fetch rollNo from database
            email: data.email || "",
            classSectionId: data.classSectionId || params.id,
            classSectionName: data.classSectionName || className,
          })
        })

        studentsData.sort((a, b) => {
          if (!a.rollNo || a.rollNo === "-") return 1
          if (!b.rollNo || b.rollNo === "-") return -1
          return a.rollNo.localeCompare(b.rollNo)
        })

        setStudents(studentsData)

        const initialMarks: { [key: string]: string } = {}
        studentsData.forEach((student) => {
          initialMarks[student.id] = ""
        })
        setStudentMarks(initialMarks)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching class details:", error)
        toast.error("Error", {
          description: "Failed to load class details. Please try again.",
        })
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchClassDetails()
    }
  }, [user, params.id, className])

  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!homeworkTitle || !homeworkDescription || !dueDate) {
      toast.error("Missing fields", {
        description: "Please fill in all required fields",
      })
      return
    }

    try {
      setIsSubmittingHomework(true)

      await addDoc(collection(db, "homework"), {
        title: homeworkTitle,
        description: homeworkDescription,
        subject,
        dueDate: Timestamp.fromDate(dueDate),
        classSectionId: params.id,
        classSectionName: className,
        teacherId: user?.uid,
        teacherName: user?.name || "Teacher",
        createdAt: Timestamp.now(),
      })

      toast.success("Homework assigned", {
        description: "The homework has been successfully assigned to the class",
      })

      setHomeworkTitle("")
      setHomeworkDescription("")
      setDueDate(new Date())
      setIsSubmittingHomework(false)
    } catch (error) {
      console.error("Error assigning homework:", error)
      toast.error("Error", {
        description: "Failed to assign homework. Please try again.",
      })
      setIsSubmittingHomework(false)
    }
  }

  const handleMarksSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!examName) {
      toast.error("Missing exam name", {
        description: "Please enter an exam name",
      })
      return
    }

    let hasEmptyMarks = false
    let hasInvalidMarks = false

    Object.entries(studentMarks).forEach(([_, mark]) => {
      if (mark === "") {
        hasEmptyMarks = true
      } else if (isNaN(Number(mark)) || Number(mark) < 0 || Number(mark) > Number(maxMarks)) {
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
      setIsSubmittingMarks(true)

      const examId = uuidv4()
      const marksData = students.map((student) => ({
        studentId: student.id,
        studentName: student.name || "",
        rollNo: student.rollNo || "-", // Explicitly store rollNo in marks data
        classSectionId: student.classSectionId,
        classSectionName: student.classSectionName,
        marks: Number(studentMarks[student.id]),
      }))

      // Store exam data including roll numbers in Firebase
      await setDoc(doc(db, "exams", examId), {
        id: examId,
        name: examName,
        subject,
        classSectionId: params.id,
        classSectionName: className,
        teacherId: user?.uid,
        teacherName: user?.name,
        maxMarks: Number(maxMarks),
        marks: marksData, // This includes rollNo for each student
        createdAt: Timestamp.now(),
      })

      toast.success("Marks submitted", {
        description: "The marks and roll numbers have been successfully recorded",
      })

      setExamName("")
      const resetMarks: { [key: string]: string } = {}
      students.forEach((student) => {
        resetMarks[student.id] = ""
      })
      setStudentMarks(resetMarks)
      setIsSubmittingMarks(false)
    } catch (error) {
      console.error("Error submitting marks:", error)
      toast.error("Error", {
        description: "Failed to submit marks. Please try again.",
      })
      setIsSubmittingMarks(false)
    }
  }

  const handleMarkChange = (studentId: string, value: string) => {
    setStudentMarks((prev) => ({
      ...prev,
      [studentId]: value,
    }))
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title={`Class: ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="cursor-pointer ml-2 md:ml-0 xl:ml-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {className} - {subject}
          </h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="homework" className="p-3" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="homework" className="cursor-pointer">Assign Homework</TabsTrigger>
            <TabsTrigger value="marks" className="cursor-pointer">Enter Marks</TabsTrigger>
          </TabsList>

          <TabsContent value="homework" className="p-3">
            <Card>
              <CardHeader>
                <CardTitle>Assign Homework</CardTitle>
                <CardDescription>
                  Create a new homework assignment for {className} in {subject}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleHomeworkSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Homework title"
                      value={homeworkTitle}
                      onChange={(e) => setHomeworkTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed instructions for the homework"
                      rows={5}
                      value={homeworkDescription}
                      onChange={(e) => setHomeworkDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal cursor-pointer",
                            !dueDate && "text-muted-foreground",
                          )}
                        
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) => date && setDueDate(date)}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button type="submit" className="cursor-pointer" disabled={isSubmittingHomework}>
                    {isSubmittingHomework && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Assign Homework
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marks">
            <Card>
              <CardHeader>
                <CardTitle>Enter Marks</CardTitle>
                <CardDescription>
                  Record exam marks for {className} in {subject}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleMarksSubmit} className="space-y-6">
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

                  <div>
                    <h3 className="text-sm font-medium mb-3">Student Marks</h3>

                    {students.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground border rounded-md">
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
                              <TableCell>{student.rollNo || "-"}</TableCell>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max={maxMarks}
                                  placeholder={`0-${maxMarks}`}
                                  value={studentMarks[student.id]}
                                  onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                  required
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <Button type="submit" className="cursor-pointer" disabled={isSubmittingMarks || students.length === 0}>
                    {isSubmittingMarks && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Marks
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  )
}