"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { BookOpen, Calendar, User } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Homework {
  id: string
  title: string
  description: string
  subject: string
  classSectionId: string
  classSectionName: string
  dueDate: Date
  createdAt: Date
  teacherId: string
  teacherName: string
}

interface ClassSection {
  id: string
  class: string
  section: string
  name: string
}

export default function PrincipalHomeworkPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [homework, setHomework] = useState<Homework[]>([])
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

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
    const fetchHomework = async () => {
      try {
        setIsLoading(true)
        const homeworkQuery = query(collection(db, "homework"), orderBy("createdAt", "desc"))

        const snapshot = await getDocs(homeworkQuery)

        const homeworkList: Homework[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          homeworkList.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            subject: data.subject,
            classSectionId: data.classSectionId,
            classSectionName: data.classSectionName,
            dueDate: data.dueDate.toDate(),
            createdAt: data.createdAt.toDate(),
            teacherId: data.teacherId,
            teacherName: data.teacherName || "Teacher",
          })
        })

        setHomework(homeworkList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching homework:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchHomework()
    }
  }, [user])

  const filteredHomework = selectedClass ? homework.filter((hw) => hw.classSectionId === selectedClass) : homework

  const isPastDue = (date: Date) => {
    return date < new Date()
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Homework">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Homework Management</h1>
        <UserNav />
      </div>

      <div className="flex flex-col p-3 md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-medium">All Homework</h2>
          <p className="text-sm text-muted-foreground">View homework assignments by class</p>
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="cursor-pointer">
              <SelectValue placeholder="Filter by class"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classSections.map((cs) => (
                <SelectItem key={cs.id} value={cs.id} className="cursor-pointer">
                  {cs.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading homework...</div>
      ) : filteredHomework.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="mb-2 text-muted-foreground">No homework assignments found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedClass ? "No homework has been assigned for this class yet." : "No homework has been assigned yet."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 p-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredHomework.map((hw) => (
            <Card key={hw.id} className="overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-1">{hw.title}</CardTitle>
                  {isPastDue(hw.dueDate) ? (
                    <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                      Past Due
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                      Active
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center">
                      <BookOpen className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>{hw.subject}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>Due: {format(hw.dueDate, "PPP")}</span>
                    </div>
                    <div className="flex items-center">
                      <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>By: {hw.teacherName}</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm text-muted-foreground line-clamp-3">{hw.description}</div>
                <div className="mt-3">
                  <Badge variant="secondary" className="mr-2">
                    {hw.classSectionName}
                  </Badge>
                </div>
              </CardContent>
              <div className="flex justify-center border-t p-4">
                <Link href={`/principal/homework/${hw.id}`}>
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    View Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}

