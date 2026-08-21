import { motion } from 'framer-motion';
import { FalconsLogo, GoaHindiLogo, HackerHouseLogo } from './BrandLogos';

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="border-t border-border px-6 py-12 md:px-10 bg-bg-secondary/40"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 sm:flex-row">
        {/* Left branding */}
        <div className="flex items-center gap-3.5">
          <HackerHouseLogo className="h-4 w-auto text-accent/80" />
          <GoaHindiLogo className="h-5 w-auto text-text-secondary opacity-70" />
          <span className="h-3 w-px bg-border" />
          <span className="text-[10px] font-mono tracking-[0.2em] text-text-secondary">
            BUILT AT HH GOA 2026
          </span>
        </div>

        {/* Right Falcons brand */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono tracking-[0.15em] text-text-tertiary">
            TASK 02 ·
          </span>
          <div className="flex items-center gap-1.5 text-accent">
            <FalconsLogo className="h-4 w-auto text-accent" />
            <span className="text-[10px] font-mono tracking-[0.2em] font-semibold text-accent">
              TEAM FALCONS
            </span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
