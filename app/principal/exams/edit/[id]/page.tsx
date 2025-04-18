"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-provider"
import { DashboardShell } from "@/components/dashboard-shell"
import { PrincipalNav } from "@/components/principal-nav"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, doc, getDoc, getDocs, query, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ArrowLeft, PlusCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useParams } from "next/navigation"

// Types for class and exam entry
interface ClassSection {
  id: string;
  name: string;
  class: string;
  section: string;
}

interface ExamEntry {
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface FormData {
  examName: string;
  classId: string;
  className: string;
  classSectionId: string;
  examEntries: ExamEntry[];
}

export default function EditExamTimetablePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams() // Get params object
  const id = params.id as string // Assert id as string (assuming dynamic route ensures it’s a string)
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    examName: "",
    classId: "",
    className: "",
    classSectionId: "",
    examEntries: [{ subject: "", date: "", startTime: "", endTime: "" }],
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  const fetchClasses = async () => {
    try {
      const classesData: ClassSection[] = []
      const classSectionsQuery = query(collection(db, "classSections"))
      const classSectionsSnapshot = await getDocs(classSectionsQuery)

      classSectionsSnapshot.forEach((doc) => {
        classesData.push({
          id: doc.id,
          name: doc.data().name || doc.data().class || "",
          section: doc.data().section || "",
          class: doc.data().class || "",
          ...doc.data(),
        })
      })

      setClassSections(classesData)

      if (classesData.length === 0) {
        toast.error("No Classes Found - Please create classes before editing exam timetables.")
      }
    } catch (error) {
      console.error("Error fetching class sections:", error)
      toast.error("Failed to load classes. Please try again.")
    }
  }

  const fetchTimetable = async () => {
    try {
      if (!id) {
        router.push("/principal/exams")
        return
      }

      setIsLoading(true)
      const timetableDoc = await getDoc(doc(db, "examTimetables", id))

      if (timetableDoc.exists()) {
        const timetableData = timetableDoc.data()
        setFormData({
          examName: timetableData.examName || "",
          classId: timetableData.classId || "",
          className: timetableData.className || "",
          classSectionId: timetableData.classSectionId || "",
          examEntries:
            timetableData.examEntries && timetableData.examEntries.length > 0
              ? timetableData.examEntries
              : [{ subject: "", date: "", startTime: "", endTime: "" }],
        })
      } else {
        toast.error("The requested exam timetable does not exist.")
        router.push("/principal/exams")
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching exam timetable:", error)
      setIsLoading(false)
      toast.error("Failed to load exam timetable. Please try again.")
    }
  }

  useEffect(() => {
    if (user && user.role === "principal") {
      fetchClasses()
      fetchTimetable()
    }
  }, [user, id, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleClassChange = (value: string) => {
    const selectedClass = classSections.find((c) => c.id === value)
    if (selectedClass) {
      setFormData({
        ...formData,
        classId: value,
        classSectionId: selectedClass.id,
      })
    }
  }

  const handleExamEntryChange = (index: number, field: keyof ExamEntry, value: string) => {
    const updatedEntries = [...formData.examEntries]
    updatedEntries[index] = {
      ...updatedEntries[index],
      [field]: value,
    }

    setFormData({
      ...formData,
      examEntries: updatedEntries,
    })
  }

  const addExamEntry = () => {
    setFormData({
      ...formData,
      examEntries: [...formData.examEntries, { subject: "", date: "", startTime: "", endTime: "" }],
    })
  }

  const removeExamEntry = (index: number) => {
    if (formData.examEntries.length === 1) {
      toast.error("At least one exam entry is required")
      return
    }

    const updatedEntries = formData.examEntries.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      examEntries: updatedEntries,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.examName.trim()) {
      toast.error("Exam name is required")
      return
    }

    if (!formData.classId) {
      toast.error("Please select a class")
      return
    }

    for (let i = 0; i < formData.examEntries.length; i++) {
      const entry = formData.examEntries[i]
      if (!entry.subject.trim() || !entry.date || !entry.startTime || !entry.endTime) {
        toast.error(`Please fill all fields for exam entry #${i + 1}`)
        return
      }
    }

    try {
      setIsSubmitting(true)

      await updateDoc(doc(db, "examTimetables", id), {
        ...formData,
        updatedAt: serverTimestamp(),
      })

      toast.success("Exam timetable updated successfully")
      router.push(`/principal/exams/${id}`)
    } catch (error) {
      console.error("Error updating exam timetable:", error)
      toast.error("Failed to update exam timetable. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (isLoading) {
    return (
      <DashboardShell sidebar={<PrincipalNav />} title="Edit Exam Timetable">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p>Loading exam timetable...</p>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Edit Exam Timetable">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href={`/principal/exams/${id}`}>
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit Exam Timetable</h1>
        </div>
        <UserNav />
      </div>

      <div className="p-3">
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>Update the basic details for this exam timetable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="examName">Exam Name</Label>
                <Input
                  id="examName"
                  name="examName"
                  placeholder="e.g. Midterm Examination 2025"
                  value={formData.examName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classSectionId">Class</Label>
                <Select value={formData.classSectionId} onValueChange={handleClassChange}>
                  <SelectTrigger id="classSectionId" className="cursor-pointer">
                    <SelectValue placeholder="Select a class"/>
                  </SelectTrigger>
                  <SelectContent>
                    {classSections.length > 0 ? (
                      classSections.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id} className="cursor-pointer"> 
                          {cls.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-classes" disabled>
                        No classes available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Exam Schedule</CardTitle>
                <CardDescription>Update subjects, dates, and times for the exam</CardDescription>
              </div>
              <Button type="button" onClick={addExamEntry} variant="ghost" className="gap-2 cursor-pointer">
                <PlusCircle className="h-4 w-4" /> Add Subject
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {formData.examEntries.map((entry, index) => (
              <div key={index} className="mb-4 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`subject-${index}`}>Subject</Label>
                    <Input
                      id={`subject-${index}`}
                      name="subject"
                      placeholder="e.g. Mathematics"
                      value={entry.subject}
                      onChange={(e) => handleExamEntryChange(index, "subject", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`date-${index}`}>Date</Label>
                    <Input
                      id={`date-${index}`}
                      name="date"
                      type="date"
                      value={entry.date}
                      onChange={(e) => handleExamEntryChange(index, "date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`startTime-${index}`}>Start Time</Label>
                    <Input
                      id={`startTime-${index}`}
                      name="startTime"
                      type="time"
                      value={entry.startTime}
                      onChange={(e) => handleExamEntryChange(index, "startTime", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`endTime-${index}`}>End Time</Label>
                    <Input
                      id={`endTime-${index}`}
                      name="endTime"
                      type="time"
                      value={entry.endTime}
                      onChange={(e) => handleExamEntryChange(index, "endTime", e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removeExamEntry(index)}
                  className="mt-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" /> Remove Exam Entry
                </Button>
              </div>
            ))}
          </CardContent>

          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="gap-2 cursor-pointer">
              {isSubmitting ? "Saving..." : "Save Exam Timetable"}
            </Button>
          </CardFooter>
        </Card>
      </form>
      </div>
    </DashboardShell>
  )
}