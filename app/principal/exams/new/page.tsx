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
import { collection, addDoc, getDocs, query, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { PlusCircle, Trash2 } from "lucide-react"
import { toast } from "sonner" // Changed to sonner toast
import { Separator } from "@/components/ui/separator"

export default function NewExamTimetablePage() {
  interface ClassSection {
    id: string
    class: string
    section: string
    name: string
  }

  const { user, loading } = useAuth()
  const router = useRouter()
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    examName: "",
    classSectionId: "",
    examEntries: [{ subject: "", date: "", startTime: "", endTime: "" }],
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchClassSections = async () => {
      try {
        const snapshot = await getDocs(collection(db, "classSections"))
        const sections: ClassSection[] = []
        snapshot.forEach((doc) => {
          sections.push({
            id: doc.id,
            ...(doc.data() as Omit<ClassSection, "id">),
          })
        })
        setClassSections(sections)

        if (user?.classSectionId) {
          const teacherClass = sections.find((section) => section.id === user.classSectionId)
          if (teacherClass) {
            setFormData((prev) => ({
              ...prev,
              classSectionId: teacherClass.id,
            }))
          }
        }
      } catch (error) {
        console.error("Error fetching class sections:", error)
      }
    }

    if (user && user.role === "principal") {
      fetchClassSections()
    }
  }, [user])

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }




  const handleExamEntryChange = (
    index: number,
    field: string,
    value: string
  ) => {
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
      examEntries: [
        ...formData.examEntries,
        { subject: "", date: "", startTime: "", endTime: "" },
      ],
    })
  }

  const removeExamEntry = (index: number) => {
    if (formData.examEntries.length === 1) {
      toast.error("At least one exam entry is required.")
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

    // Validation
    if (!formData.examName.trim()) {
      toast.error("Exam name is required.")
      return
    }

    if (!formData.classSectionId) {
      toast.error("Please select a class.")
      return
    }

    // Validate exam entries
    for (let i = 0; i < formData.examEntries.length; i++) {
      const entry = formData.examEntries[i]
      if (!entry.subject.trim() || !entry.date || !entry.startTime || !entry.endTime) {
        toast.error(`Please fill all fields for exam entry #${i + 1}.`)
        return
      }
    }

    try {
      setIsSubmitting(true)
      // Get class section details
      const selectedClassSection = classSections.find(
        (cs) => cs.id === formData.classSectionId
      )

      // Add to Firestore
      await addDoc(collection(db, "examTimetables"), {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        classSectionName: selectedClassSection?.name || "",

      })

      toast.success("Exam timetable created successfully.")

      router.push("/principal/exams")
    } catch (error) {
      console.error("Error creating exam timetable:", error)
      toast.error("Failed to create exam timetable. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Create Exam Timetable">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Create Exam Timetable</h1>
        <UserNav />
      </div>

      <div className="p-3">
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>Enter the basic details for this exam timetable</CardDescription>
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
                <Select
                  value={formData.classSectionId}
                  onValueChange={(value) => handleSelectChange("classSectionId", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSections.map((cs) => (
                      <SelectItem key={cs.id} value={cs.id}>
                        {cs.name}
                      </SelectItem>
                    ))}
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
                <CardDescription>Add subjects, dates and times for the exam</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addExamEntry}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Subject
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.examEntries.map((entry, index) => (
              <div key={index}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Subject #{index + 1}</h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeExamEntry(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`subject-${index}`}>Subject</Label>
                    <Input
                      id={`subject-${index}`}
                      value={entry.subject}
                      onChange={(e) => handleExamEntryChange(index, "subject", e.target.value)}
                      placeholder="e.g. Mathematics"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`date-${index}`}>Date</Label>
                    <Input
                      id={`date-${index}`}
                      type="date"
                      value={entry.date}
                      onChange={(e) => handleExamEntryChange(index, "date", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`startTime-${index}`}>Start Time</Label>
                    <Input
                      id={`startTime-${index}`}
                      type="time"
                      value={entry.startTime}
                      onChange={(e) => handleExamEntryChange(index, "startTime", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`endTime-${index}`}>End Time</Label>
                    <Input
                      id={`endTime-${index}`}
                      type="time"
                      value={entry.endTime}
                      onChange={(e) => handleExamEntryChange(index, "endTime", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/principal/exams")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Timetable"}
            </Button>
          </CardFooter>
        </Card>
      </form>
      </div>
    </DashboardShell>
  )
}
