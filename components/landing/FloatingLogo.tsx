'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export function FloatingLogo() {
  return (
    <div className="relative flex justify-end items-center w-full">
      <motion.div
        animate={{
          y: [0, -12, 0, 12, 0],
          x: [0, 6, 0, -6, 0],
          rotateX: [0, -5, 0, 5, 0],
          rotateY: [0, 5, 0, -5, 0],
        }}
        transition={{
          duration: 7,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop",
        }}
        className="relative z-10"
        style={{ perspective: 1000 }}
      >
        <Image
          src="/logo.png"
          alt="Soldoway Logo"
          width={580}
          height={580}
          priority
          className="drop-shadow-xl"
        />
      </motion.div>
    </div>
  )
}
