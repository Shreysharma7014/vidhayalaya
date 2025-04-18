"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Teacher {
  id: string
  name: string
  email: string
  subject: string
  photoURL?: string
}

export default function TeacherSchedulesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true)
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"))
        const snapshot = await getDocs(teachersQuery)

        const teachersList: Teacher[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          teachersList.push({
            id: doc.id,
            name: data.name || "Unknown",
            email: data.email || "",
            subject: data.subject || "Not specified",
            photoURL: data.photoURL,
          })
        })

        setTeachers(teachersList)
        setFilteredTeachers(teachersList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching teachers:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchTeachers()
    }
  }, [user])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTeachers(teachers)
    } else {
      const filtered = teachers.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.subject.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredTeachers(filtered)
    }
  }, [searchQuery, teachers])

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Teacher Schedules">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/principal/schedule">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Teacher Schedules</h1>
        </div>
        <UserNav />
      </div>

      <div className="mb-6 p-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search teachers..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading teachers...</div>
      ) : filteredTeachers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <p className="mb-2 text-muted-foreground">No teachers found</p>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "Try a different search term" : "Add teachers to view their schedules"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 p-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeachers.map((teacher) => (
            <Card key={teacher.id}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={teacher.photoURL} alt={teacher.name} />
                    <AvatarFallback>
                      {teacher.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{teacher.name}</CardTitle>
                    <CardDescription>{teacher.subject}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={`/principal/schedule/teachers/${teacher.id}`}>
                  <Button variant="outline" className="w-full cursor-pointer">
                    View Schedule
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
