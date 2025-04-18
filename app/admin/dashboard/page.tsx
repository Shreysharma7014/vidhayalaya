"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminNav } from "@/components/admin-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { Users, GraduationCap, School } from "lucide-react"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    principals: 0,
    teachers: 0,
    students: 0,
  })

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const principalQuery = query(collection(db, "users"), where("role", "==", "principal"))
        const teacherQuery = query(collection(db, "users"), where("role", "==", "teacher"))
        const studentQuery = query(collection(db, "users"), where("role", "==", "student"))

        const [principalSnapshot, teacherSnapshot, studentSnapshot] = await Promise.all([
          getDocs(principalQuery),
          getDocs(teacherQuery),
          getDocs(studentQuery),
        ])

        setStats({
          principals: principalSnapshot.size,
          teachers: teacherSnapshot.size,
          students: studentSnapshot.size,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      }
    }

    if (user && user.role === "admin") {
      fetchStats()
    }
  }, [user])

  if (loading || !user || user.role !== "admin") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<AdminNav />} title="Admin Dashboard">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold ml-3 md:ml-2 xl:ml-0">Dashboard</h1>
        <UserNav />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="ml-3 md:ml-2 xl:ml-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 p-3 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Principals</CardTitle>
                <School className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.principals}</div>
                <p className="text-xs text-muted-foreground">School administrators</p>
              </CardContent>
            </Card>
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
          </div>
          <div className="grid gap-4 p-3 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>System activities in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No recent activities to display.</p>
              </CardContent>
            </Card>
          
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your school system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/admin/principals/new">
                  <Button className="w-full">Add New Principal</Button>
                </Link>
                <Link href="/admin/principals">
                  <Button variant="outline" className="w-full">
                    View All Principals
                  </Button>
                </Link>
                <Link href="/admin/users">
                  <Button variant="outline" className="w-full">
                    Manage Users
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Analytics</CardTitle>
              <CardDescription>User growth and system usage statistics</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Analytics data will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}

