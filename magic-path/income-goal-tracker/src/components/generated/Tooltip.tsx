import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
interface TooltipProps {
  content: string;
  position: {
    x: number;
    y: number;
  };
}
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position
}) => {
  return <AnimatePresence>
      <motion.div initial={{
      opacity: 0,
      scale: 0.8,
      y: 10
    }} animate={{
      opacity: 1,
      scale: 1,
      y: 0
    }} exit={{
      opacity: 0,
      scale: 0.8,
      y: 10
    }} transition={{
      duration: 0.15,
      ease: 'easeOut'
    }} className="fixed z-50 pointer-events-none" style={{
      left: position.x + 10,
      top: position.y - 40
    }}>
        <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-white text-sm font-medium whitespace-nowrap">
            {content}
          </p>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-700" />
            <div className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-slate-900 absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-px" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>;
};