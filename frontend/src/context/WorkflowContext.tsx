import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface WorkflowValue {
  taggingConfirmed: boolean;
  confirmTaggingStep: () => void;
  resetWorkflow: () => void;
}

const WorkflowContext = createContext<WorkflowValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [taggingConfirmed, setTaggingConfirmed] = useState(false);

  const confirmTaggingStep = useCallback(() => {
    setTaggingConfirmed(true);
  }, []);

  const resetWorkflow = useCallback(() => {
    setTaggingConfirmed(false);
  }, []);

  const value = useMemo(
    () => ({ taggingConfirmed, confirmTaggingStep, resetWorkflow }),
    [taggingConfirmed, confirmTaggingStep, resetWorkflow]
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflow must be used within WorkflowProvider');
  return ctx;
}
