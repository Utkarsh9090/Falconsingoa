import { motion } from 'framer-motion';
import { GoaHindiLogo } from './BrandLogos';

const PIPELINE_STEPS = [
  { label: 'VOICE', description: 'User speaks a question' },
  { label: 'SPEECH TO TEXT', description: 'Audio transcription via STT' },
  { label: 'QUERY', description: 'Natural language understanding' },
  { label: 'HYBRID RETRIEVAL', description: 'BM25 + dense vector search' },
  { label: 'RERANKING', description: 'Cross-encoder relevance scoring' },
  { label: 'GENERATION', description: 'LLM conditioned on context' },
  { label: 'GROUNDING', description: 'Factual verification & citation' },
];

export function ArchitectureSection() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.8 }}
      className="mx-auto max-w-5xl px-6 py-20 md:px-10"
    >
      {/* Section title */}
      <div className="mb-12 text-center flex flex-col items-center gap-2">
        <GoaHindiLogo className="h-5 w-auto text-accent/60 mb-1" />
        <h2 className="text-[10px] font-mono tracking-[0.4em] text-text-secondary">
          UNDER THE HOOD
        </h2>
      </div>

      {/* Vertical pipeline */}
      <div className="mx-auto max-w-md">
        {PIPELINE_STEPS.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {/* Step */}
            <div className="flex items-start gap-5 py-4">
              {/* Line & dot */}
              <div className="flex flex-col items-center pt-1">
                <div
                  className={`h-2 w-2 rounded-full border ${
                    index === 0 || index === PIPELINE_STEPS.length - 1
                      ? 'border-accent bg-accent/30'
                      : 'border-text-tertiary bg-transparent'
                  }`}
                />
                {index < PIPELINE_STEPS.length - 1 && (
                  <div className="mt-1 h-10 w-px bg-border" />
                )}
              </div>

              {/* Label & description */}
              <div className="flex-1 -mt-0.5">
                <div className="text-xs font-semibold tracking-[0.2em] text-text-primary">
                  {step.label}
                </div>
                <div className="mt-1 text-[11px] text-text-tertiary leading-relaxed">
                  {step.description}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
