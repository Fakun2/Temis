"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject
} from "react";
import type { ImportStage } from "../_constants/court-import-systems";

const previewReadyProgress = 64;
const searchingProgressCap = 62;
const importingProgressCap = 96;
const longProgressDurationMs = 5000;
const finishProgressDurationMs = 500;
const collapseFormDelayMs = 320;

const stageTargetProgress: Record<ImportStage, number> = {
  done: 100,
  error: 0,
  idle: 0,
  importing: importingProgressCap,
  preview: previewReadyProgress,
  searching: searchingProgressCap
};

export function useCourtImportVisualState({
  hasPreview,
  hasResult,
  stage
}: {
  hasPreview: boolean;
  hasResult: boolean;
  stage: ImportStage;
}) {
  const [displayedProgress, setDisplayedProgress] = useState(stageTargetProgress[stage]);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const formCollapseTimeoutRef = useRef<number | null>(null);
  const progressRef = useRef(displayedProgress);
  const importStartedAtRef = useRef<number | null>(null);
  const searchStartedAtRef = useRef<number | null>(null);

  const setProgress = useCallback((progress: number) => {
    progressRef.current = progress;
    setDisplayedProgress(progress);
  }, []);

  useEffect(() => {
    const cancelProgressAnimation = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
    const cancelFormCollapse = () => {
      if (formCollapseTimeoutRef.current !== null) {
        window.clearTimeout(formCollapseTimeoutRef.current);
        formCollapseTimeoutRef.current = null;
      }
    };

    cancelProgressAnimation();
    cancelFormCollapse();

    if (stage === "idle" || stage === "error") {
      importStartedAtRef.current = null;
      searchStartedAtRef.current = null;
      setFormCollapsed(false);
      setPreviewVisible(false);
      setProgress(stageTargetProgress[stage]);
      return () => {
        cancelProgressAnimation();
        cancelFormCollapse();
      };
    }

    if (stage === "searching") {
      searchStartedAtRef.current = performance.now();
      importStartedAtRef.current = null;
      setPreviewVisible(false);
      formCollapseTimeoutRef.current = window.setTimeout(() => {
        setFormCollapsed(true);
        formCollapseTimeoutRef.current = null;
      }, collapseFormDelayMs);
      animateProgressTo({
        duration: longProgressDurationMs,
        onFrame: setProgress,
        start: progressRef.current,
        target: searchingProgressCap,
        animationFrameRef
      });
      return () => {
        cancelProgressAnimation();
        cancelFormCollapse();
      };
    }

    if (stage === "preview") {
      const elapsedSearchTime = searchStartedAtRef.current
        ? performance.now() - searchStartedAtRef.current
        : longProgressDurationMs;
      const remainingSearchTime = Math.max(longProgressDurationMs - elapsedSearchTime, finishProgressDurationMs);

      animateProgressTo({
        duration: remainingSearchTime,
        onComplete: () => {
          searchStartedAtRef.current = null;
          setFormCollapsed(true);
          setPreviewVisible(hasPreview);
        },
        onFrame: setProgress,
        start: progressRef.current,
        target: previewReadyProgress,
        animationFrameRef
      });
      return () => {
        cancelProgressAnimation();
        cancelFormCollapse();
      };
    }

    if (stage === "importing") {
      importStartedAtRef.current = performance.now();
      setFormCollapsed(true);
      setPreviewVisible(hasPreview);
      animateProgressTo({
        duration: longProgressDurationMs,
        onFrame: setProgress,
        start: progressRef.current,
        target: importingProgressCap,
        animationFrameRef
      });
      return () => {
        cancelProgressAnimation();
        cancelFormCollapse();
      };
    }

    setFormCollapsed(hasPreview || hasResult);
    setPreviewVisible(hasPreview);
    const elapsedImportTime = importStartedAtRef.current
      ? performance.now() - importStartedAtRef.current
      : longProgressDurationMs;
    const duration =
      stage === "done"
        ? Math.max(longProgressDurationMs - elapsedImportTime, finishProgressDurationMs)
        : finishProgressDurationMs;

    animateProgressTo({
      duration,
      onComplete: () => {
        if (stage === "done") {
          importStartedAtRef.current = null;
        }
      },
      onFrame: setProgress,
      start: progressRef.current,
      target: stageTargetProgress[stage],
      animationFrameRef
    });

    return () => {
      cancelProgressAnimation();
      cancelFormCollapse();
    };
  }, [hasPreview, hasResult, setProgress, stage]);

  return useMemo(
    () => ({
      formCollapsed,
      modalCompact: stage === "searching",
      modalExpanded: previewVisible || hasResult,
      progress: Math.round(displayedProgress),
      previewVisible
    }),
    [displayedProgress, formCollapsed, hasResult, previewVisible, stage]
  );
}

function animateProgressTo({
  animationFrameRef,
  duration,
  onComplete,
  onFrame,
  start,
  target
}: {
  animationFrameRef: MutableRefObject<number | null>;
  duration: number;
  onComplete?: () => void;
  onFrame: (progress: number) => void;
  start: number;
  target: number;
}) {
  const startedAt = performance.now();
  const distance = target - start;

  if (Math.abs(distance) < 0.5) {
    onFrame(target);
    onComplete?.();
    return;
  }

  function tick(now: number) {
    const elapsed = now - startedAt;
    const progress = Math.min(elapsed / duration, 1);

    onFrame(start + distance * progress);

    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(tick);
      return;
    }

    animationFrameRef.current = null;
    onComplete?.();
  }

  animationFrameRef.current = requestAnimationFrame(tick);
}
