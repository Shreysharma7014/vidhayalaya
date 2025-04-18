"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TeacherNav } from "@/components/teacher-nav"

interface Student {
  id: string
  name: string
  email: string
  rollNo: string
  srNo: string
  class: string
  section: string
  classSectionName: string
  fatherName: string
  phone: string
  photoURL?: string
}



interface ClassSection {
  id: string
  class: string
  section: string
  name: string
}

export default function StudentsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClass, setSelectedClass] = useState("")
  const [isLoading, setIsLoading] = useState(true)

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
      } catch (error) {
        console.error("Error fetching class sections:", error)
      }
    }

    if (user && user.role === "teacher") {
      fetchClassSections()
    }
  }, [user])

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user?.classSectionId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const studentQuery = query(
          collection(db, "users"),
          where("role", "==", "student"),
          where("classSectionId", "==", user.classSectionId),
        )

        const snapshot = await getDocs(studentQuery)

        const studentsList: Student[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          studentsList.push({
            id: doc.id,

            name: data.name || "",
            email: data.email || "",
            rollNo: data.rollNo || "",
            srNo: data.srNo || "",
            class: data.class || "",
            section: data.section || "",
            classSectionName: data.classSectionName,
            fatherName: data.fatherName || "",
            phone: data.phone || "",
            photoURL: data.photoURL,

          })
        })

        // Sort by roll number
        studentsList.sort((a, b) => {
          return Number.parseInt(a.rollNo) - Number.parseInt(b.rollNo)
        })

        setStudents(studentsList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching students:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "teacher") {
      fetchStudents()
    }
  }, [user])

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.srNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.fatherName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading || !user || user.role !== "teacher") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<TeacherNav />} title="Students">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Students</h1>
        <UserNav />
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col p-3 md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search students..."
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
        </div>

      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading students...</div>
      ) : filteredStudents.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <p className="mb-2 text-muted-foreground">No students found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery || selectedClass ? "Try different search criteria" : "Add a student to get started"}
          </p>

        </Card>
      ) : (
        <div className="overflow-x-auto p-3">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left font-medium">Name</th>
                <th className="p-2 text-left font-medium">SR No.</th>
                <th className="p-2 text-left font-medium">Roll No.</th>
                <th className="p-2 text-left font-medium">Class</th>
                <th className="p-2 text-left font-medium">Father's Name</th>
                <th className="p-2 text-left font-medium">Contact</th>
                <th className="p-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b">
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={student.photoURL} alt={student.name} />
                        <AvatarFallback>
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{student.name}</span>
                    </div>
                  </td>
                  <td className="p-2">{student.srNo}</td>
                  <td className="p-2">{student.rollNo}</td>
                  <td className="p-2">{student.classSectionName}</td>
                  <td className="p-2">{student.fatherName}</td>
                  <td className="p-2">{student.phone}</td>
                  <td className="p-2">
                    <Link href={`/principal/student/${student.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}

