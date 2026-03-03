"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const AnimatedBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div 
      className="fixed inset-[-5%] w-[110%] h-[110%] z-0 bg-cover bg-center pointer-events-none"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1618172193622-ae2d025f4032?q=80&w=2564&auto=format&fit=crop')", // Abstract space/particle-like image
      }}
      animate={{
        x: mousePosition.x * -1.5,
        y: mousePosition.y * -1.5,
      }}
      transition={{ type: "spring", stiffness: 50, damping: 30 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    </motion.div>
  );
};
