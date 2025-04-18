"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TeacherNav } from "@/components/teacher-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { toast } from "sonner" // Replace use-toast with sonner
import { ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface ClassSection {
  id: string
  class: string
  section: string
  name: string
}

export default function NewHomeworkPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    classSectionId: "",
    dueDate: new Date(),
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== "teacher")) {
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

    if (user && user.role === "teacher") {
      fetchClassSections()
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, dueDate: date }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error("Please enter a title for the homework.") // Changed to sonner
      return
    }

    if (!formData.classSectionId) {
      toast.error("Please select a class for the homework.") // Changed to sonner
      return
    }

    if (!formData.subject.trim()) {
      toast.error("Please enter a subject for the homework.") // Changed to sonner
      return
    }

    setIsSubmitting(true)

    try {
      const selectedClassSection = classSections.find((cs) => cs.id === formData.classSectionId)

      await addDoc(collection(db, "homework"), {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        classSectionId: formData.classSectionId,
        classSectionName: selectedClassSection?.name || "",
        dueDate: Timestamp.fromDate(formData.dueDate),
        teacherId: user?.uid,
        teacherName: user?.name || "Teacher",
        createdAt: Timestamp.now(),
      })

      toast.success("Your homework has been assigned successfully.") // Changed to sonner

      router.push("/teacher/homework")
    } catch (error: any) {
      console.error("Error assigning homework:", error)
      toast.error(error.message || "An unexpected error occurred") // Changed to sonner
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Assign Homework">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/teacher/homework">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Assign Homework</h1>
        </div>
        <UserNav />
      </div>

      <Card className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>New Homework Assignment</CardTitle>
            <CardDescription>Create a new homework assignment for any class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter homework title"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Enter subject"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground",
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={handleDateChange}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter homework details, instructions, and requirements"
                rows={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex mt-5 justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/teacher/homework")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Assigning..." : "Assign Homework"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </DashboardShell>
  )
}
