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
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner" // Import from sonner
import { ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
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

export default function EditHomeworkPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const homeworkId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
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
    const fetchHomeworkData = async () => {
      if (!homeworkId) return

      try {
        setIsLoading(true)
        const docRef = doc(db, "homework", homeworkId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()

          // Verify this homework belongs to the current teacher
          if (data.teacherId !== user?.uid) {
            toast.error("You don't have permission to edit this homework.") // Using sonner for error notification
            router.push("/teacher/homework")
            return
          }

          setFormData({
            title: data.title || "",
            description: data.description || "",
            subject: data.subject || "",
            classSectionId: data.classSectionId || "",
            dueDate: data.dueDate.toDate(),
          })

          // Fetch the class section
          const classRef = doc(db, "classSections", data.classSectionId)
          const classSnap = await getDoc(classRef)

          if (classSnap.exists()) {
            const classData = classSnap.data()
            setClassSections([
              {
                id: data.classSectionId,
                class: classData.class,
                section: classData.section,
                name: classData.name,
              },
            ])
          }
        } else {
          toast.error("The homework you're trying to edit doesn't exist.") // Using sonner for error notification
          router.push("/teacher/homework")
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching homework data:", error)
        toast.error("Failed to load homework data. Please try again.") // Using sonner for error notification
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchHomeworkData()
    }
  }, [homeworkId, user, router])

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
      toast.error("Please enter a title for the homework.") // Using sonner for error notification
      return
    }

    if (!formData.subject.trim()) {
      toast.error("Please enter a subject for the homework.") // Using sonner for error notification
      return
    }

    setIsSubmitting(true)

    try {
      // Get class section details
      const selectedClassSection = classSections.find((cs) => cs.id === formData.classSectionId)

      // Update homework in Firestore
      await updateDoc(doc(db, "homework", homeworkId), {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        dueDate: Timestamp.fromDate(formData.dueDate),
        updatedAt: Timestamp.now(),
      })

      toast.success("Your homework has been updated successfully.") // Using sonner for success notification
      router.push("/teacher/homework")
    } catch (error: any) {
      console.error("Error updating homework:", error)
      toast.error(error.message || "An unexpected error occurred") // Using sonner for error notification
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Edit Homework">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/teacher/homework">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit Homework</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading homework data...</div>
      ) : (
        <Card className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Edit Homework Assignment</CardTitle>
              <CardDescription>Update the homework assignment details</CardDescription>
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
                  <Input value={classSections[0]?.name || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Class cannot be changed</p>
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
                {isSubmitting ? "Updating..." : "Update Homework"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </DashboardShell>
  )
}
