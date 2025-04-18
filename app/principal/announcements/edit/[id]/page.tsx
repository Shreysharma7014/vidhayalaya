"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner" // Import Sonner's toast
import { Upload } from "lucide-react"

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  content: z.string().min(10, {
    message: "Content must be at least 10 characters.",
  }),
  image: z.string().optional(),
})

const AnnouncementEditPage = () => {
  const router = useRouter()
  const params = useParams()
  const { id } = params
  const [announcement, setAnnouncement] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      image: "",
    },
  })

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await fetch(`/api/announcements/${id}`)
        if (!response.ok) {
          throw new Error("Failed to fetch announcement")
        }
        const data = await response.json()
        setAnnouncement(data)
        form.reset(data)
      } catch (error: any) {
        toast.error(error.message) // Using Sonner for error
      }
    }

    if (id) {
      fetchAnnouncement()
    }
  }, [id, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (response.ok) {
        toast.success("Announcement updated successfully.") // Using Sonner for success
        router.push("/principal/announcements")
        router.refresh()
      } else {
        toast.error("Failed to update announcement.") // Using Sonner for error
      }
    } catch (error) {
      toast.error("Something went wrong.") // Using Sonner for error
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!announcement) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit Announcement</CardTitle>
          <CardDescription>Edit the announcement details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Announcement Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Announcement Content" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Image URL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    Updating <Upload className="mr-2 h-4 w-4" />
                  </>
                ) : (
                  "Update Announcement"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default AnnouncementEditPage
