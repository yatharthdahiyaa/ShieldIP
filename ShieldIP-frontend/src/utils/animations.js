export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

export const slideRight = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit:    { opacity: 0, x: 100, transition: { duration: 0.2 } },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, y: 20, transition: { duration: 0.15 } },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const expandHeight = {
  initial: { height: 0, opacity: 0, overflow: 'hidden' },
  animate: { height: 'auto', opacity: 1, overflow: 'hidden', transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { height: 0, opacity: 0, overflow: 'hidden', transition: { duration: 0.2 } },
};

export const toastVariants = {
  initial: { opacity: 0, x: 80, scale: 0.9 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 30 } },
  exit:    { opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } },
};
