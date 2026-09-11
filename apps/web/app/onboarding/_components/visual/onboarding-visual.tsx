import { Check, Scale } from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { onboardingSteps } from "../../_constants/onboarding.constants";
import type { StepIndex } from "../../_types/onboarding.types";

type OnboardingVisualProps = {
  currentStep: number;
  progress: number;
  setStep: (step: StepIndex) => void;
  submitting: boolean;
};

export function OnboardingVisual({
  currentStep,
  progress,
  setStep,
  submitting
}: OnboardingVisualProps) {
  return (
    <aside className="hidden min-h-0 rounded-2xl bg-[var(--onboarding-panel-bg)] text-[var(--onboarding-panel-foreground)] lg:block">
      <div className="flex h-full min-h-0 flex-col gap-10 overflow-y-auto overscroll-contain p-8 xl:gap-16">
        <div>
          <Badge
            variant="outline"
            className="mb-8 rounded-full border-[var(--onboarding-panel-border)] bg-[var(--onboarding-panel-surface)] px-3 py-1 text-[var(--onboarding-panel-surface-foreground)]"
          >
            <Scale className="h-4 w-4" />
            TEMIS
          </Badge>
          <h2 className="max-w-md text-balance text-4xl font-semibold leading-tight">
            Configuremos tu estudio juridico.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--onboarding-panel-muted)]">
            Tu cuenta ya esta lista. Ahora creamos el tenant, el owner y las areas base del
            workspace.
          </p>
        </div>

        <div className="grid gap-3">
          <Progress
            className="h-2"
            value={progress}
            style={{
              "--progress-fill": "var(--onboarding-panel-progress)",
              "--progress-track": "var(--onboarding-panel-progress-track)"
            } as CSSProperties}
          />
          {onboardingSteps.map((item, index) => {
            const Icon = item.icon;
            const active = index === currentStep;
            const done = index < currentStep;

            return (
              <button
                key={item.title}
                type="button"
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors",
                  active
                    ? "border-[var(--onboarding-panel-item-active-border)] bg-[var(--onboarding-panel-item-active)] text-[var(--onboarding-panel-item-active-foreground)]"
                    : "border-[var(--onboarding-panel-border)] bg-[var(--onboarding-panel-item)] text-[var(--onboarding-panel-item-foreground)]"
                )}
                onClick={() => setStep(index as StepIndex)}
                disabled={submitting}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border",
                    done
                      ? "border-[var(--onboarding-panel-progress)] bg-[var(--onboarding-panel-progress)] text-[var(--onboarding-panel-check-foreground)]"
                      : "border-[var(--onboarding-panel-border)] bg-[var(--onboarding-panel-icon)] text-[var(--onboarding-panel-icon-foreground)]"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span>
                  <span
                    className={cn(
                      "block text-xs",
                      active
                        ? "text-[var(--onboarding-panel-item-active-muted)]"
                        : "text-[var(--onboarding-panel-item-muted)]"
                    )}
                  >
                    {item.eyebrow}
                  </span>
                  <span className="block text-sm font-medium">{item.title}</span>
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </aside>
  );
}
