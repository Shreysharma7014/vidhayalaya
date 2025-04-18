"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StudentNav } from "@/components/student-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { BookOpen, Calendar, User } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

export default function StudentHomeworkPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && (!user || user.role !== "student")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchHomework = async () => {
      if (!user?.classSectionId) return

      try {
        setIsLoading(true)
        const homeworkQuery = query(
          collection(db, "homework"),
          where("classSectionId", "==", user.classSectionId),
          orderBy("createdAt", "desc"),
        )

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
            teacherName: data.teacherName,
          })
        })

        setHomework(homeworkList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching homework:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "student") {
      fetchHomework()
    }
  }, [user])

  const isPastDue = (date: Date) => {
    return date < new Date()
  }

  const activeHomework = homework.filter((hw) => !isPastDue(hw.dueDate))
  const pastHomework = homework.filter((hw) => isPastDue(hw.dueDate))

  if (loading || !user || user.role !== "student") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<StudentNav />} title="Homework">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-2 xl:ml-0">My Homework</h1>
        <UserNav />
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="ml-3 md:ml-2 xl:ml-0">
          <TabsTrigger value="active">Active Homework</TabsTrigger>
          <TabsTrigger value="past">Past Homework</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {isLoading ? (
            <div className="flex justify-center p-8">Loading homework...</div>
          ) : activeHomework.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="mb-2 text-muted-foreground">No active homework</p>
              <p className="text-sm text-muted-foreground">
                You don't have any active homework assignments at the moment.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 p-3 md:grid-cols-2 lg:grid-cols-3">
              {activeHomework.map((hw) => (
                <Card key={hw.id} className="overflow-hidden flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="line-clamp-1">{hw.title}</CardTitle>
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                        Active
                      </Badge>
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
                  </CardContent>
                  <div className="flex justify-center border-t p-4">
                    <Link href={`/student/homework/${hw.id}`}>
                      <Button>View Details</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {isLoading ? (
            <div className="flex justify-center p-8">Loading homework...</div>
          ) : pastHomework.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="mb-2 text-muted-foreground">No past homework</p>
              <p className="text-sm text-muted-foreground">You don't have any past homework assignments.</p>
            </Card>
          ) : (
            <div className="grid gap-6 p-3 md:grid-cols-2 lg:grid-cols-3">
              {pastHomework.map((hw) => (
                <Card key={hw.id} className="overflow-hidden flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="line-clamp-1">{hw.title}</CardTitle>
                      <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
                        Past Due
                      </Badge>
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
                  </CardContent>
                  <div className="flex justify-center border-t p-4">
                    <Link href={`/student/homework/${hw.id}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}

