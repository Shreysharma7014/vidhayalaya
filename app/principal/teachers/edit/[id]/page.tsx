"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner" // Importing toast from sonner
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ClassSection {
  id: string
  class: string
  section: string
  name: string
}

export default function EditTeacherPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const teacherId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    address: "",
    isClassTeacher: "no",
    classSection: "",
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
      } catch (error) {
        console.error("Error fetching class sections:", error)
      }
    }

    if (user && user.role === "principal") {
      fetchClassSections()
    }
  }, [user])

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!teacherId) return

      try {
        setIsLoading(true)
        const docRef = doc(db, "users", teacherId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            subject: data.subject || "",
            address: data.address || "",
            isClassTeacher: data.isClassTeacher === true ? "yes" : "no",
            classSection: data.classSectionId || "",
          })
        } else {
          toast.error("Teacher not found: The teacher you're trying to edit doesn't exist.")
          router.push("/principal/teachers")
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching teacher data:", error)
        toast.error("Error fetching teacher data. Please try again.")
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchTeacherData()
    }
  }, [teacherId, user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Get class section details if assigned as class teacher
      let selectedClassSection = null
      if (formData.isClassTeacher === "yes" && formData.classSection) {
        selectedClassSection = classSections.find((cs) => cs.id === formData.classSection)
      }

      // Update user data in Firestore
      await updateDoc(doc(db, "users", teacherId), {
        name: formData.name,
        phone: formData.phone,
        subject: formData.subject,
        address: formData.address,
        isClassTeacher: formData.isClassTeacher === "yes",
        classSectionId: formData.isClassTeacher === "yes" ? formData.classSection : "",
        class: selectedClassSection?.class || "",
        section: selectedClassSection?.section || "",
        classSectionName: selectedClassSection?.name || "",
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid,
      })

      toast.success(`${formData.name}'s information has been updated.`)
      router.push("/principal/teachers")
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Edit Teacher">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/principal/teachers">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit Teacher</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading teacher data...</div>
      ) : (
        <div className="p-3 md:p-1 xl:p-0">
        <Card className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Teacher Information</CardTitle>
              <CardDescription>Update teacher information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Assign as Class Teacher</Label>
                <RadioGroup
                  value={formData.isClassTeacher}
                  onValueChange={(value) => handleSelectChange("isClassTeacher", value)}
                  className="flex flex-row space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="class-teacher-yes" className="cursor-pointer" />
                    <Label htmlFor="class-teacher-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="class-teacher-no" className="cursor-pointer" />
                    <Label htmlFor="class-teacher-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.isClassTeacher === "yes" && (
                <div className="space-y-2">
                  <Label htmlFor="classSection">Assign Class</Label>
                  <Select
                    value={formData.classSection}
                    onValueChange={(value) => handleSelectChange("classSection", value)}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classSections.map((cs) => (
                        <SelectItem key={cs.id} value={cs.id} className="cursor-pointer">
                          {cs.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This teacher will be the class teacher for this class and can mark attendance
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleChange} required />
              </div>
            </CardContent>
            <CardFooter className="flex mt-5 justify-between">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => router.push("/principal/teachers")}>
                Cancel
              </Button>
              <Button type="submit" className="cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Teacher"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        </div>
      )}
    </DashboardShell>
  )
}
