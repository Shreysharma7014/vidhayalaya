"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Users, GraduationCap, Calendar, Bell } from "lucide-react"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PrincipalDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    events: 0,
    announcements: 0,
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const teacherQuery = query(collection(db, "users"), where("role", "==", "teacher"))
        const studentQuery = query(collection(db, "users"), where("role", "==", "student"))
        const eventQuery = query(collection(db, "events"))
        const announcementQuery = query(collection(db, "announcements"))

        const [teacherSnapshot, studentSnapshot, eventSnapshot, announcementSnapshot] = await Promise.all([
          getDocs(teacherQuery),
          getDocs(studentQuery),
          getDocs(eventQuery),
          getDocs(announcementQuery),
        ])

        setStats({
          teachers: teacherSnapshot.size,
          students: studentSnapshot.size,
          events: eventSnapshot.size,
          announcements: announcementSnapshot.size,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    if (user && user.role === "principal") {
      fetchStats()
    }
  }, [user])

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Principal Dashboard">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-1 xl:ml-0">Dashboard</h1>
        <UserNav />
      </div>

      <Tabs defaultValue="overview" className="space-y-4 p-3">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.teachers}</div>
                <p className="text-xs text-muted-foreground">Faculty members</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.students}</div>
                <p className="text-xs text-muted-foreground">Enrolled students</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.events}</div>
                <p className="text-xs text-muted-foreground">School events</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Announcements</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.announcements}</div>
                <p className="text-xs text-muted-foreground">Active announcements</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>School activities in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No recent activities to display.</p>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your school</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/principal/teachers/new">
                  <Button className="w-full cursor-pointer">Add New Teacher</Button>
                </Link>
                <Link href="/principal/student/new">
                  <Button variant="outline" className="w-full cursor-pointer">
                    Add New Student
                  </Button>
                </Link>
                <Link href="/principal/announcements">
                  <Button variant="outline" className="w-full cursor-pointer">
                    Create Announcement
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Recent changes and updates in the school</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">No recent activities</p>
                    <p className="text-sm text-muted-foreground">Recent activities will be displayed here</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}

