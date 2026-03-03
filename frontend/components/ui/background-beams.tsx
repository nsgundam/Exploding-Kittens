"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden bg-zinc-950 flex items-center justify-center",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,theme(colors.zinc.900)_0%,theme(colors.zinc.950)_70%)]" />
      <div className="absolute inset-x-0 w-full h-full [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-orange-500/20 shadow-[0_0_20px_theme(colors.orange.500)]"
            style={{
              width: Math.random() * 200 + 50,
              height: Math.random() * 200 + 50,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
            }}
            animate={{
              y: [0, Math.random() * 100 - 50],
              x: [0, Math.random() * 100 - 50],
              scale: [1, Math.random() * 0.5 + 1],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};
