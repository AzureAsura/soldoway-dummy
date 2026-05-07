'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

// Pastikan Anda sudah menginstall framer-motion:
// npm install framer-motion

export function FloatingLogo() {
  return (
    <div className="relative flex justify-end items-center w-full">
      <motion.div
        animate={{
          y: [0, -15, 0, 15, 0], // Melayang vertikal
          x: [0, 8, 0, -8, 0],    // Melayang horizontal sedikit
          rotateX: [0, -7, 0, 7, 0], // Rotasi 3D halus
          rotateY: [0, 7, 0, -7, 0], // Rotasi 3D halus
        }}
        transition={{
          duration: 6, // Durasi 1 siklus lengkap
          ease: "easeInOut",
          repeat: Infinity, // Mengulang selamanya
          repeatType: "loop"
        }}
        className="relative z-10"
        style={{ perspective: 1000 }} // Penting untuk efek rotateX/Y 3D
      >
        <Image
          src="/logo.png" 
          alt="Soldoway Logo"
          width={620} // Sesuaikan ukuran
          height={620}
          priority
          className="drop-shadow-2xl" // Efek bayangan di bawah logo
        />
      </motion.div>

    </div>
  )
}