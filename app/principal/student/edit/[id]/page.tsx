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
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"  // Importing toast from sonner
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

export default function EditStudentPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
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

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) return

      try {
        setIsLoading(true)
        const docRef = doc(db, "users", studentId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setFormData({
            name: data.name || "",
            email: data.email || "",
            rollNo: data.rollNo || "",
            srNo: data.srNo || "",
            fatherName: data.fatherName || "",
            phone: data.phone || "",
            address: data.address || "",
            classSection: data.classSectionId || "",
          })
        } else {
          toast.error("The student you're trying to edit doesn't exist.")
          router.push("/principal/student")
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching student data:", error)
        toast.error("Failed to load student data. Please try again.")
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchStudentData()
    }
  }, [studentId, user, router])

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
      // Get class section details
      const selectedClassSection = classSections.find((cs) => cs.id === formData.classSection)

      // Update user data in Firestore
      await updateDoc(doc(db, "users", studentId), {
        name: formData.name,
        rollNo: formData.rollNo,
        srNo: formData.srNo,
        fatherName: formData.fatherName,
        phone: formData.phone,
        address: formData.address,
        classSectionId: formData.classSection,
        class: selectedClassSection?.class || "",
        section: selectedClassSection?.section || "",
        classSectionName: selectedClassSection?.name || "",
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid,
      })

      toast.success(`${formData.name}'s information has been updated.`)
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
    <DashboardShell sidebar={<PrincipalNav />} title="Edit Student">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/principal/student">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Edit Student</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading student data...</div>
      ) : (
        <div className="p-3">
        <Card className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>Update student information</CardDescription>
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
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={formData.address} onChange={handleChange} required />
              </div>
            </CardContent>
            <CardFooter className="flex mt-5 justify-between">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={() => router.push("/principal/student")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? "Updating..." : "Update Student"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        </div>
      )}
    </DashboardShell>
  )
}
