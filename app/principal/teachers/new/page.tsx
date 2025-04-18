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
import { useRouter } from "next/navigation"
import { toast } from "sonner" // <-- import toast from sonner
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, collection, getDocs } from "firebase/firestore"

interface ClassSection {
  id: string
  class: string
  section: string
  name: string
}

export default function NewTeacherPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    subject: "",
    address: "",
    isClassTeacher: "no",
    classSection: "",
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      // If the user is not authenticated or not a principal, redirect to login
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

        // If no class sections exist, create some default ones
        if (sections.length === 0) {
          const defaultSections = [
            { class: "1", section: "A", name: "Class 1 - Section A" },
            { class: "1", section: "B", name: "Class 1 - Section B" },
            { class: "2", section: "A", name: "Class 2 - Section A" },
            { class: "2", section: "B", name: "Class 2 - Section B" },
            { class: "3", section: "A", name: "Class 3 - Section A" },
            { class: "3", section: "B", name: "Class 3 - Section B" },
            { class: "4", section: "A", name: "Class 4 - Section A" },
            { class: "4", section: "B", name: "Class 4 - Section B" },
            { class: "5", section: "A", name: "Class 5 - Section A" },
            { class: "5", section: "B", name: "Class 5 - Section B" },
          ]

          for (const section of defaultSections) {
            const docRef = await setDoc(doc(collection(db, "classSections")), section)
          }

          // Fetch again after creating
          const newSnapshot = await getDocs(collection(db, "classSections"))
          newSnapshot.forEach((doc) => {
            sections.push({
              id: doc.id,
              ...(doc.data() as Omit<ClassSection, "id">),
            })
          })
        }

        setClassSections(sections)
      } catch (error) {
        console.error("Error fetching class sections:", error)
      }
    }

    if (user && user.role === "principal") {
      fetchClassSections()
    }
  }, [user])

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
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)

      // Get class section details if assigned as class teacher
      let selectedClassSection = null
      if (formData.isClassTeacher === "yes" && formData.classSection) {
        selectedClassSection = classSections.find((cs) => cs.id === formData.classSection)
      }

      // Add user data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        address: formData.address,
        role: "teacher",
        isClassTeacher: formData.isClassTeacher === "yes",
        classSectionId: formData.isClassTeacher === "yes" ? formData.classSection : "",
        class: selectedClassSection?.class || "",
        section: selectedClassSection?.section || "",
        classSectionName: selectedClassSection?.name || "",
        createdAt: new Date().toISOString(),
        createdBy: user?.uid,
      })

      toast.success(`${formData.name} has been added as a teacher${selectedClassSection ? ` for ${selectedClassSection.name}` : ""}`)

      // Redirect to teachers list page after successful creation
      router.push("/principal/teachers")
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "principal") {
    // Show a loading screen or handle unauthorized user
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Add Teacher">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Add New Teacher</h1>
        <UserNav />
      </div>

      <div className="p-3 md:p-1 xl:p-0">
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Teacher Information</CardTitle>
            <CardDescription>
              Add a new teacher to the system. They will receive an email with login instructions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
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
              {isSubmitting ? "Creating..." : "Create Teacher"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      </div>
    </DashboardShell>
  )
}
