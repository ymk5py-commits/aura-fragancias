'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Retraso en ms para escalonar (stagger). */
  delay?: number;
  as?: 'div' | 'section' | 'li';
}

/** Revela su contenido una vez al entrar en pantalla. */
const Reveal: React.FC<RevealProps> = ({ children, className = '', delay = 0, as = 'div' }) => {
  const reducirMovimiento = useReducedMotion();
  const Tag = as === 'section' ? motion.section : as === 'li' ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={reducirMovimiento ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.72, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
};

export default Reveal;