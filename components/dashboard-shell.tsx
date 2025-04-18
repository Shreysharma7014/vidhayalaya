import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { GraduationCap, Menu } from "lucide-react"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DialogTitle } from "@radix-ui/react-dialog" // Import DialogTitle
import { VisuallyHidden } from "@radix-ui/react-visually-hidden" // Import VisuallyHidden for hiding the title visually

interface DashboardShellProps {
  children: ReactNode
  sidebar: ReactNode
  title: string
}

export function DashboardShell({ children, sidebar, title }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4 md:ml-5 xl:ml-5">
          <div className="flex items-center gap-2 md:gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden ml-3">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 pr-0">
                {/* Adding DialogTitle here */}
                <DialogTitle>
                  <VisuallyHidden>Sheet Menu</VisuallyHidden>
                </DialogTitle>
                <div className="flex items-center gap-2 px-2 py-4">
                  <GraduationCap className="h-6 w-6 ml-3" />
                  <Link href="/" className="font-bold">
                    Vidhayalaya
                  </Link>
                </div>
                <div className="px-2">{sidebar}</div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              <span className="hidden font-bold md:inline-block">Vidhayalaya</span>
            </Link>
            <div className="ml-2 font-semibold md:text-lg md:ml-18 xl:ml-20">{title}</div>
          </div>
        </div>
      </header>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="fixed top-16 z-20 -ml-2 hidden h-[calc(100vh-4rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <div className="py-6 pr-2">{sidebar}</div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden py-6">{children}</main>
      </div>
    </div>
  )
}
