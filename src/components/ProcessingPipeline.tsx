import { motion } from 'framer-motion';
import { AppState, PipelineStage } from '../types/index';
import type { StageStatus } from '../types/index';

interface ProcessingPipelineProps {
  state: AppState;
}

const STAGES: { stage: PipelineStage; label: string }[] = [
  { stage: PipelineStage.SPEECH, label: 'SPEECH' },
  { stage: PipelineStage.RETRIEVE, label: 'RETRIEVE' },
  { stage: PipelineStage.GENERATE, label: 'GENERATE' },
  { stage: PipelineStage.VERIFY, label: 'VERIFY' },
];

function getStageStatus(pipelineStage: PipelineStage, appState: AppState): StageStatus {
  const stageOrder: Record<PipelineStage, number> = {
    [PipelineStage.SPEECH]: 0,
    [PipelineStage.RETRIEVE]: 1,
    [PipelineStage.GENERATE]: 2,
    [PipelineStage.VERIFY]: 3,
  };

  const stateToActiveStage: Partial<Record<AppState, number>> = {
    [AppState.LISTENING]: 0,
    [AppState.TRANSCRIBING]: 0,
    [AppState.RETRIEVING]: 1,
    [AppState.GENERATING]: 2,
    [AppState.VERIFYING]: 3,
    [AppState.ANSWER]: 4, // All done
  };

  const activeIndex = stateToActiveStage[appState];
  if (activeIndex === undefined) return 'pending';

  const myIndex = stageOrder[pipelineStage];
  if (myIndex < activeIndex) return 'done';
  if (myIndex === activeIndex) return 'active';
  return 'pending';
}

function StageIndicator({ status }: { status: StageStatus }) {
  if (status === 'done') {
    return <span className="text-accent text-xs">✓</span>;
  }
  if (status === 'active') {
    return (
      <motion.span
        className="inline-block h-2 w-2 rounded-full bg-accent"
        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    );
  }
  return <span className="inline-block h-1.5 w-1.5 rounded-full border border-text-tertiary opacity-40" />;
}

export function ProcessingPipeline({ state }: ProcessingPipelineProps) {
  const isVisible =
    state === AppState.LISTENING ||
    state === AppState.TRANSCRIBING ||
    state === AppState.RETRIEVING ||
    state === AppState.GENERATING ||
    state === AppState.VERIFYING ||
    state === AppState.ANSWER;

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10 flex items-center justify-center gap-2 sm:gap-3"
    >
      {STAGES.map((s, i) => {
        const status = getStageStatus(s.stage, state);
        return (
          <div key={s.stage} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <StageIndicator status={status} />
              <span
                className={`text-[10px] font-mono tracking-[0.15em] transition-colors duration-300 ${
                  status === 'done'
                    ? 'text-accent'
                    : status === 'active'
                      ? 'text-text-primary'
                      : 'text-text-tertiary'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <span className="text-text-tertiary text-[10px] opacity-30">→</span>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
