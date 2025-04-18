"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Teacher {
  id: string
  name: string
  subject: string
}

interface Period {
  id: string
  startTime: string
  endTime: string
  subject: string
  teacherId: string
  teacherName: string
  [key: string]: string
}

interface ScheduleDay {
  day: string
  periods: Period[]
}

export default function EditSchedulePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const scheduleId = params.id as string

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classSectionName, setClassSectionName] = useState<string>("")
  const [classSectionId, setClassSectionId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  const [schedule, setSchedule] = useState<ScheduleDay[]>(weekDays.map((day) => ({
    day,
    periods: [],
  })))

  useEffect(() => {
    if (!loading && (!user || user.role !== "principal")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!scheduleId) return
      try {
        setIsLoading(true)
        const scheduleDoc = await getDoc(doc(db, "schedules", scheduleId))

        if (!scheduleDoc.exists()) {
          toast.error("The schedule you're trying to edit doesn't exist.")
          router.push("/principal/schedule")
          return
        }

        const data = scheduleDoc.data()
        setClassSectionName(data.classSectionName || "")
        setClassSectionId(data.classSectionId || "")
        if (data.schedule) {
          setSchedule(data.schedule)
        }
      } catch (error) {
        console.error("Error fetching schedule:", error)
        toast.error("Failed to load schedule. Please try again.")
      }
    }

    const fetchTeachers = async () => {
      try {
        const teachersQuery = query(collection(db, "users"), where("role", "==", "teacher"))
        const snapshot = await getDocs(teachersQuery)

        const teachersList: Teacher[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          teachersList.push({
            id: doc.id,
            name: data.name || "Unknown",
            subject: data.subject || "Not specified",
          })
        })

        setTeachers(teachersList)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching teachers:", error)
        setIsLoading(false)
      }
    }

    if (user && user.role === "principal") {
      fetchSchedule()
      fetchTeachers()
    }
  }, [user, scheduleId, router])

  const handlePeriodChange = (dayIndex: number, periodIndex: number, field: keyof Period, value: string) => {
    const updatedSchedule = [...schedule]

    if (field === "teacherId" && value) {
      const selectedTeacher = teachers.find((t) => t.id === value)
      updatedSchedule[dayIndex].periods[periodIndex].teacherName = selectedTeacher?.name || ""
    }

    updatedSchedule[dayIndex].periods[periodIndex][field] = value
    setSchedule(updatedSchedule)
  }

  const addPeriod = (dayIndex: number) => {
    const updatedSchedule = [...schedule]
    const lastPeriod = updatedSchedule[dayIndex].periods.length > 0
      ? updatedSchedule[dayIndex].periods[updatedSchedule[dayIndex].periods.length - 1]
      : null

    updatedSchedule[dayIndex].periods.push({
      id: `${updatedSchedule[dayIndex].day}-${updatedSchedule[dayIndex].periods.length}`,
      startTime: lastPeriod ? lastPeriod.endTime : "08:00",
      endTime: lastPeriod
        ? `${Number.parseInt(lastPeriod.endTime.split(":")[0]) + 1}:${lastPeriod.endTime.split(":")[1]}`
        : "08:45",
      subject: "",
      teacherId: "",
      teacherName: "",
    })

    setSchedule(updatedSchedule)
  }

  const removePeriod = (dayIndex: number, periodIndex: number) => {
    const updatedSchedule = [...schedule]
    updatedSchedule[dayIndex].periods.splice(periodIndex, 1)
    setSchedule(updatedSchedule)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      await updateDoc(doc(db, "schedules", scheduleId), {
        schedule: schedule,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
      })

      toast.success(`Schedule for ${classSectionName} has been updated successfully`)
      router.push("/principal/schedule")
    } catch (error) {
      console.error("Error updating schedule:", error)
      toast.error("Failed to update schedule. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Edit Schedule">
      <div className="flex flex-row md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Link href="/principal/schedule">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">Edit Class Schedule</h1>
        </div>
        <UserNav />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading schedule...</div>
      ) : (
        <div className="p-3 md:p-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Class Information</CardTitle>
              <CardDescription>Schedule for {classSectionName}</CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {schedule.map((day, dayIndex) => (
              <Card key={day.day}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>{day.day}</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => addPeriod(dayIndex)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Period
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {day.periods.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No periods added. Click "Add Period" to create a schedule for this day.
                    </div>
                  ) : (
                    <div className="space-y-4 min-w-[300px] md:min-w-full">
                      {day.periods.map((period, periodIndex) => (
                        <div key={period.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b pb-4">
                          <div className="col-span-12 md:col-span-2">
                            <Label htmlFor={`${period.id}-start`}>Start Time</Label>
                            <Input
                              id={`${period.id}-start`}
                              type="time"
                              value={period.startTime}
                              onChange={(e) => handlePeriodChange(dayIndex, periodIndex, "startTime", e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div className="col-span-12 md:col-span-2">
                            <Label htmlFor={`${period.id}-end`}>End Time</Label>
                            <Input
                              id={`${period.id}-end`}
                              type="time"
                              value={period.endTime}
                              onChange={(e) => handlePeriodChange(dayIndex, periodIndex, "endTime", e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div className="col-span-12 md:col-span-3">
                            <Label htmlFor={`${period.id}-subject`}>Subject</Label>
                            <Input
                              id={`${period.id}-subject`}
                              value={period.subject}
                              onChange={(e) => handlePeriodChange(dayIndex, periodIndex, "subject", e.target.value)}
                              placeholder="Subject name"
                              className="w-full"
                            />
                          </div>
                          <div className="col-span-12 md:col-span-4">
                            <Label htmlFor={`${period.id}-teacher`}>Teacher</Label>
                            <Select
                              value={period.teacherId}
                              onValueChange={(value) => handlePeriodChange(dayIndex, periodIndex, "teacherId", value)}
                            >
                              <SelectTrigger id={`${period.id}-teacher`} className="w-full">
                                <SelectValue placeholder="Select a teacher" />
                              </SelectTrigger>
                              <SelectContent>
                                {teachers.map((teacher) => (
                                  <SelectItem key={teacher.id} value={teacher.id}>
                                    {teacher.name} ({teacher.subject})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12 md:col-span-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removePeriod(dayIndex, periodIndex)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => router.push("/principal/schedule")}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Schedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
