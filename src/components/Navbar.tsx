import { motion } from 'framer-motion';
import { FalconsLogo, GoaHindiLogo, HackerHouseLogo } from './BrandLogos';

export function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-10 md:py-5 border-b border-border/50"
      style={{ backgroundColor: 'rgba(5, 5, 5, 0.75)', backdropFilter: 'blur(16px)' }}
    >
      {/* Left */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <HackerHouseLogo className="h-4 w-auto text-accent opacity-90" />
          <GoaHindiLogo className="h-5 w-auto text-text-primary opacity-80" />
        </div>
        <span className="h-3 w-px bg-border" />
        <span className="text-xs md:text-sm font-semibold tracking-[0.2em] text-text-primary">
          GO GOA HACK
        </span>
        <span className="hidden sm:inline text-[10px] font-mono tracking-[0.15em] text-text-tertiary">
          HH GOA 2026
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-mono tracking-[0.15em] text-text-secondary">
          TASK 02
        </span>
        <span className="h-3 w-px bg-border" />
        <div className="flex items-center gap-2">
          <FalconsLogo className="h-3.5 md:h-4 w-auto text-accent hover:opacity-100 transition-opacity" />
          <span className="hidden md:inline text-[10px] font-mono tracking-[0.2em] text-accent font-semibold">
            FALCONS
          </span>
        </div>
      </div>
    </motion.nav>
  );
}
