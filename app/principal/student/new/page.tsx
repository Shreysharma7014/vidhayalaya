"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { toast } from "sonner"  // Import sonner
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, collection, getDocs } from "firebase/firestore"

interface ClassSection {
  id: string
  class: string
  section: string
  name: string
}

export default function NewStudentPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    rollNo: "",
    srNo: "",
    fatherName: "",
    phone: "",
    address: "",
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

      // Get class section details
      const selectedClassSection = classSections.find((cs) => cs.id === formData.classSection)

      // Add user data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: formData.name,
        email: formData.email,
        rollNo: formData.rollNo,
        srNo: formData.srNo,
        fatherName: formData.fatherName,
        phone: formData.phone,
        address: formData.address,
        role: "student",
        classSectionId: formData.classSection,
        class: selectedClassSection?.class || "",
        section: selectedClassSection?.section || "",
        classSectionName: selectedClassSection?.name || "",
        createdAt: new Date().toISOString(),
        createdBy: user?.uid,
      })

      toast.success(`Student ${formData.name} created successfully in ${selectedClassSection?.name || ""}`)
      router.push("/principal/student")
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
    <DashboardShell sidebar={<PrincipalNav />} title="Add Student">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3">Add New Student</h1>
        <UserNav />
      </div>

      <div className="p-3">
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
            <CardDescription>Add a new student to the system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="srNo">SR No.</Label>
                <Input id="srNo" name="srNo" value={formData.srNo} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rollNo">Roll No.</Label>
                <Input id="rollNo" name="rollNo" value={formData.rollNo} onChange={handleChange} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="classSection">Class & Section</Label>
              <Select
                value={formData.classSection}
                onValueChange={(value) => handleSelectChange("classSection", value)}
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
              <Label htmlFor="fatherName">Father's Name</Label>
              <Input id="fatherName" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile No.</Label>
              <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
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
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={formData.address} onChange={handleChange} required />
            </div>
          </CardContent>
          <CardFooter className="flex mt-5 justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/principal/student")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Student"}
            </Button>
          </CardFooter>
        </form>
      </Card>
      </div>
    </DashboardShell>
  )
}
