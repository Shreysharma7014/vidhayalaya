"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Edit, Mail, Phone, MapPin, BookOpen, School } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  address: string
  classSectionName?: string
  photoURL?: string
}

export default function TeacherDetailsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const teacherId = params.id as string

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!teacherId) return

      try {
        setIsLoading(true)
        const docRef = doc(db, "users", teacherId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setTeacher({
            id: docSnap.id,
            name: data.name || "Unknown",
            email: data.email || "",
            phone: data.phone || "",
            subject: data.subject || "",
            address: data.address || "",
            classSectionName: data.classSectionName || "Not assigned",
            photoURL: data.photoURL,
          })
        } else {
          router.push("/principal/teachers")
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching teacher:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchTeacher()
    }
  }, [teacherId, user, router])

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Teacher Details">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/principal/teachers">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Teacher Details</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading teacher details...</div>
      ) : !teacher ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <h2 className="text-lg font-medium mb-2">Teacher Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The teacher you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/principal/teachers">
              <Button>Back to Teachers</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 p-3 md:p-0 xl:p-0 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardContent className="pt-6 flex flex-col items-center">
              <Avatar className="h-32 w-32 mb-4">
                <AvatarImage src={teacher.photoURL} alt={teacher.name} />
                <AvatarFallback className="text-2xl">
                  {teacher.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-center">{teacher.name}</h2>
              <p className="text-muted-foreground mb-4">{teacher.subject} Teacher</p>

              <Link href={`/principal/teachers/edit/${teacher.id}`} className="w-full">
                <Button className="w-full cursor-pointer" variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Teacher Information</CardTitle>
              <CardDescription>Detailed information about the teacher</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="flex items-center">
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    {teacher.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="flex items-center">
                    <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                    {teacher.phone}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="flex items-center">
                    <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                    {teacher.subject}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Class Teacher</p>
                  <p className="flex items-center">
                    <School className="mr-2 h-4 w-4 text-muted-foreground" />
                    {teacher.classSectionName}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-1">Address</p>
                <p className="flex items-start">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
                  {teacher.address}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardShell>
  )
}

