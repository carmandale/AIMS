import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  position: { x: number; y: number };
}

export const Tooltip: React.FC<TooltipProps> = ({ content, position }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 px-3 py-2 text-sm text-white bg-slate-800 rounded-lg shadow-xl border border-slate-700"
        style={{
          left: position.x + 10,
          top: position.y - 40,
        }}
      >
        {content}
        <div
          className="absolute w-2 h-2 bg-slate-800 border-l border-b border-slate-700 transform rotate-45"
          style={{
            bottom: -5,
            left: '50%',
            marginLeft: -4,
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};