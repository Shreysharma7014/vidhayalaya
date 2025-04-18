"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrincipalNav } from "@/components/principal-nav"
import { DashboardShell } from "@/components/dashboard-shell"
import { UserNav } from "@/components/user-nav"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/lib/auth-provider"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface ClassSection {
  id: string
  name: string
  class: string
  section: string
}

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
}

interface ScheduleDay {
  day: string
  periods: Period[]
}

export default function NewSchedulePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [classSections, setClassSections] = useState<ClassSection[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedClassName, setSelectedClassName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultPeriodTimes = [
    { startTime: "08:00", endTime: "08:45" },
    { startTime: "08:45", endTime: "09:30" },
    { startTime: "09:45", endTime: "10:30" },
    { startTime: "10:30", endTime: "11:15" },
    { startTime: "11:30", endTime: "12:15" },
    { startTime: "12:15", endTime: "13:00" },
    { startTime: "13:30", endTime: "14:15" },
    { startTime: "14:15", endTime: "15:00" },
  ]

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  const [schedule, setSchedule] = useState<ScheduleDay[]>( 
    weekDays.map((day) => ({
      day,
      periods: defaultPeriodTimes.map((period, index) => ({
        id: `${day}-${index}`,
        startTime: period.startTime,
        endTime: period.endTime,
        subject: "",
        teacherId: "",
        teacherName: "",
      })),
    })),
  )

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
      fetchClassSections()
      fetchTeachers()
    }
  }, [user])

  const handleClassChange = (value: string) => {
    setSelectedClass(value)
    const classSection = classSections.find((cs) => cs.id === value)
    setSelectedClassName(classSection?.name || "")
  }

  const handlePeriodChange = (dayIndex: number, periodIndex: number, field: string, value: string) => {
    const updatedSchedule = [...schedule]
    if (field === "teacherId" && value) {
      const selectedTeacher = teachers.find((t) => t.id === value)
      updatedSchedule[dayIndex].periods[periodIndex].teacherName = selectedTeacher?.name || ""
    }
    // @ts-ignore
    updatedSchedule[dayIndex].periods[periodIndex][field] = value
    setSchedule(updatedSchedule)
  }

  const addPeriod = (dayIndex: number) => {
    const updatedSchedule = [...schedule]
    const lastPeriod = updatedSchedule[dayIndex].periods[updatedSchedule[dayIndex].periods.length - 1]
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
    if (!selectedClass) {
      toast.error("Please select a class for this schedule")
      return
    }
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "schedules"), {
        classSectionId: selectedClass,
        classSectionName: selectedClassName,
        schedule: schedule,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid,
      })
      toast.success(`Schedule for ${selectedClassName} has been created successfully`)
      router.push("/principal/schedule")
    } catch (error) {
      console.error("Error creating schedule:", error)
      toast.error("Failed to create schedule. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user || user.role !== "principal") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <DashboardShell sidebar={<PrincipalNav />} title="Create Schedule">
      <div className="flex flex-row sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <Link href="/principal/schedule">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg sm:text-2xl font-bold">Create Class Schedule</h1>
        </div>
        <div className="mt-2 sm:mt-0">
          <UserNav />
        </div>
      </div>

      <div className="p-3 sm:p-0">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Class Information</CardTitle>
            <CardDescription>Select the class for this schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classSection">Class & Section</Label>
                <Select value={selectedClass} onValueChange={handleClassChange}>
                  <SelectTrigger id="classSection" className="cursor-pointer">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classSections.map((cs) => (
                      <SelectItem key={cs.id} value={cs.id} className="cursor-pointer">
                        {cs.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedClass && (
        <div className="space-y-6 px-4 sm:px-0">
          {schedule.map((day, dayIndex) => (
            <Card key={day.day}>
              <CardHeader>
                <div className="flex flex-row sm:flex-row justify-between items-start sm:items-center">
                  <CardTitle className="text-lg sm:text-xl mb-2 sm:mb-0">{day.day}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    
                    onClick={() => addPeriod(dayIndex)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Period
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {day.periods.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No periods added. Click "Add Period" to create a schedule for this day.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {day.periods.map((period, periodIndex) => (
                      <div
                        key={period.id}
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-end border-b pb-4"
                      >
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor={`${period.id}-start`} className="text-sm">
                            Start
                          </Label>
                          <Input
                            id={`${period.id}-start`}
                            type="time"
                            value={period.startTime}
                            onChange={(e) => handlePeriodChange(dayIndex, periodIndex, "startTime", e.target.value)}
                            className="cursor-pointer h-10"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor={`${period.id}-end`} className="text-sm">
                            End
                          </Label>
                          <Input
                            id={`${period.id}-end`}
                            type="time"
                            value={period.endTime}
                            onChange={(e) => handlePeriodChange(dayIndex, periodIndex, "endTime", e.target.value)}
                            className="cursor-pointer h-10"
                          />
                        </div>
                        <div className="md:col-span-3 space-y-2">
                          <Label htmlFor={`${period.id}-subject`} className="text-sm">
                            Subject
                          </Label>
                          <Input
                            id={`${period.id}-subject`}
                            value={period.subject}
                            onChange={(e) => handlePeriodChange(dayIndex, periodIndex, "subject", e.target.value)}
                            placeholder="Subject name"
                            className="h-10"
                          />
                        </div>
                        <div className="md:col-span-4 space-y-2">
                          <Label htmlFor={`${period.id}-teacher`} className="text-sm">
                            Teacher
                          </Label>
                          <Select
                            value={period.teacherId}
                            onValueChange={(value) => handlePeriodChange(dayIndex, periodIndex, "teacherId", value)}
                          >
                            <SelectTrigger id={`${period.id}-teacher`} className="cursor-pointer w-full">
                              <SelectValue placeholder="Select a teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id} className="cursor-pointer">
                                  {teacher.name} ({teacher.subject})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePeriod(dayIndex, periodIndex)}
                            className="text-destructive cursor-pointer h-10 w-10"
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

          <div className="flex flex-col sm:flex-row justify-end mt-6 gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto cursor-pointer"
              onClick={() => router.push("/principal/schedule")}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="w-full sm:w-auto cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Schedule"}
            </Button>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}