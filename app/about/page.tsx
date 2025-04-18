// app/about/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion"; // For animations
import { Users, BookOpen, Calendar, School } from "lucide-react"; // Icons
import { useAuth } from "@/lib/auth-provider"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { toast } from "sonner"

export default function AboutPage() {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
  
    const { user } = useAuth()
  
    const handleSignOut = async () => {
      try {
        await signOut(auth)
        toast.success("Signed out successfully")
      } catch (error: any) {
        toast.error("Error signing out", {
          description: error.message,
        })
      }
    }

  return (
    <div className="min-h-screen bg-gray-100 overflow-hidden">
         <nav className="bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-white text-2xl font-bold">
                Vidhayalaya
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Home
                </Link>
                <Link href="#features" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Features
                </Link>
                <Link href="#pricing" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Pricing
                </Link>
                <Link href="/about" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  About
                </Link>
                {user ? (
                  <>
                    <Link
                      href={`/${user.role}/dashboard`}
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md"
                    >
                      Dashboard
                    </Link>
                    <button onClick={handleSignOut} className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                    Login
                  </Link>
                )}
              </div>
            </div>
            <div className="md:hidden">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white focus:outline-none">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link href="/" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Home
              </Link>
              <Link href="#features" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Features
              </Link>
              <Link href="#pricing" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Pricing
              </Link>
              <Link href="/about" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                About
              </Link>
              {user ? (
                <>
                  <Link
                    href={`/${user.role}/dashboard`}
                    className="block text-gray-300 hover:text-white px-3 py-2 rounded-md"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block text-gray-300 hover:text-white px-3 py-2 rounded-md w-full text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" className="block text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Header Section */}
      <header className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="absolute inset-0 overflow-hidden">
          <svg
            className="absolute bottom-0 w-full text-gray-100"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 320"
          >
            <path
              fill="currentColor"
              fillOpacity="1"
              d="M0,224L80,213.3C160,203,320,181,480,181.3C640,181,800,203,960,192C1120,181,1280,139,1360,117.3L1440,96L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
            ></path>
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent"
          >
            About Vidhayala
          </motion.h1>
          <motion.p
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="mt-4 text-lg md:text-xl max-w-2xl mx-auto"
          >
            Empowering schools with a seamless, innovative management solution.
          </motion.p>
        </div>
      </header>

      {/* Mission Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeIn} initial="hidden" animate="visible">
              <h2 className="text-4xl font-bold text-gray-900">Our Mission</h2>
              <p className="mt-4 text-gray-600 text-lg">
                At Vidhayala, we strive to revolutionize school management by providing an intuitive, all-in-one platform that connects students, teachers, and administrators. Our goal is to simplify daily operations, enhance communication, and foster a thriving educational environment.
              </p>
            </motion.div>
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              <div className="absolute inset-0 bg-blue-200 rounded-full transform rotate-6 scale-105 opacity-50"></div>
              <img
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
                alt="School environment"
                className="relative rounded-lg shadow-lg"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Story Timeline */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="text-4xl font-bold text-gray-900 mb-12"
          >
            Our Story
          </motion.h2>
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-indigo-300"></div>
            {/* Timeline Items */}
            <div className="space-y-16">
              <motion.div variants={fadeIn} initial="hidden" animate="visible" className="relative flex justify-center">
                <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-left">
                  <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-indigo-600 rounded-full"></div>
                  <h3 className="text-xl font-semibold text-indigo-600">2023 - The Idea</h3>
                  <p className="mt-2 text-gray-600">
                    EduManage was born out of a vision to streamline school operations using cutting-edge technology.
                  </p>
                </div>
              </motion.div>
              <motion.div variants={fadeIn} initial="hidden" animate="visible" className="relative flex justify-center">
                <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-left">
                  <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-indigo-600 rounded-full"></div>
                  <h3 className="text-xl font-semibold text-indigo-600">2024 - Launch</h3>
                  <p className="mt-2 text-gray-600">
                    We launched our first version, bringing schools a unified platform for management and communication.
                  </p>
                </div>
              </motion.div>
              <motion.div variants={fadeIn} initial="hidden" animate="visible" className="relative flex justify-center">
                <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-left">
                  <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-indigo-600 rounded-full"></div>
                  <h3 className="text-xl font-semibold text-indigo-600">2025 - Today</h3>
                  <p className="mt-2 text-gray-600">
                    Serving hundreds of schools worldwide, continuously evolving to meet educational needs.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="text-4xl font-bold text-gray-900 mb-12"
          >
            Meet Our Team
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "Jane Doe", role: "Founder", img: "https://randomuser.me/api/portraits/women/1.jpg" },
              { name: "John Smith", role: "Lead Developer", img: "https://randomuser.me/api/portraits/men/1.jpg" },
              { name: "Emily Brown", role: "UX Designer", img: "https://randomuser.me/api/portraits/women/2.jpg" },
              { name: "Mike Wilson", role: "Support Lead", img: "https://randomuser.me/api/portraits/men/2.jpg" },
            ].map((member, index) => (
              <motion.div
                key={index}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                whileHover={{ scale: 1.05 }}
                className="bg-gray-50 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                <img
                  src={member.img}
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                <p className="text-gray-600">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-indigo-700 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 EduManage. All rights reserved.</p>
          <div className="mt-4 flex justify-center space-x-6">
            <Link href="/" className="hover:text-yellow-400">Home</Link>
            <Link href="/contact" className="hover:text-yellow-400">Contact</Link>
            <Link href="/privacy" className="hover:text-yellow-400">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}