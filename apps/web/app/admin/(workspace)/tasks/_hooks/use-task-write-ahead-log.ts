"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CaseTaskStatus, GlobalCaseTaskDto } from "../../cases/_types/cases.types";
import {
  getTaskMovePatch,
  hasTaskMoveChanges,
  type TaskMovePatch
} from "../_utils/task-kanban";
import { useTaskStatusMutation } from "./use-task-status-mutation";

const maxBufferedChanges = 20;
const flushBatchSize = 5;

export function useTaskWriteAheadLog({
  canUpdate,
  remoteTasks
}: {
  canUpdate: boolean;
  remoteTasks: GlobalCaseTaskDto[];
}) {
  const [buffer, setBuffer] = useState<Record<string, TaskMovePatch>>({});
  const bufferRef = useRef(buffer);
  const flushingPromiseRef = useRef<Promise<void> | null>(null);
  const remoteTasksRef = useRef(remoteTasks);
  const taskStatusMutation = useTaskStatusMutation();
  const saveTaskPatchRef = useRef(taskStatusMutation.saveTaskPatch);
  const tasks = useMemo(
    () => remoteTasks.map((task) => ({ ...task, ...buffer[task.id] })),
    [buffer, remoteTasks]
  );
  const bufferedTaskChangesCount = Object.keys(buffer).length;
  const hasBufferedTaskChanges = bufferedTaskChangesCount > 0;

  useEffect(() => {
    bufferRef.current = buffer;
  }, [buffer]);

  useEffect(() => {
    remoteTasksRef.current = remoteTasks;
  }, [remoteTasks]);

  useEffect(() => {
    saveTaskPatchRef.current = taskStatusMutation.saveTaskPatch;
  }, [taskStatusMutation.saveTaskPatch]);

  useEffect(() => {
    setBuffer((currentBuffer) => {
      const nextBuffer = { ...currentBuffer };
      let changed = false;

      for (const task of remoteTasks) {
        const patch = currentBuffer[task.id];

        if (patch && !hasTaskMoveChanges(task, patch)) {
          delete nextBuffer[task.id];
          changed = true;
        }
      }

      if (changed) {
        bufferRef.current = nextBuffer;
      }

      return changed ? nextBuffer : currentBuffer;
    });
  }, [remoteTasks]);

  function moveTaskInBuffer(task: GlobalCaseTaskDto, status: CaseTaskStatus) {
    if (!canUpdate) {
      return;
    }

    const patch = getTaskMovePatch(task, status);

    if (!hasTaskMoveChanges(task, patch)) {
      return;
    }

    const remoteTask = remoteTasks.find((item) => item.id === task.id);

    if (remoteTask && !hasTaskMoveChanges(remoteTask, patch)) {
      removeBufferedTask(task.id);
      return;
    }

    setBuffer((currentBuffer) => {
      const nextBuffer = { ...currentBuffer, [task.id]: patch };
      bufferRef.current = nextBuffer;

      return nextBuffer;
    });
  }

  const flushTaskBuffer = useCallback(
    async (limit?: number) => {
      if (flushingPromiseRef.current) {
        await flushingPromiseRef.current;

        if (limit === undefined && Object.keys(bufferRef.current).length) {
          await flushTaskBuffer();
        }

        return;
      }

      const flushPromise = (async () => {
        const bufferEntries = Object.entries(bufferRef.current).slice(0, limit);

        if (!bufferEntries.length) {
          return;
        }

        const remoteTaskById = new Map(remoteTasksRef.current.map((task) => [task.id, task]));

        for (const [taskId, patch] of bufferEntries) {
          const task = remoteTaskById.get(taskId);

          if (!task) {
            removeBufferedTask(taskId, patch);
            continue;
          }

          if (!hasTaskMoveChanges(task, patch)) {
            removeBufferedTask(taskId, patch);
            continue;
          }

          try {
            await saveTaskPatchRef.current(task, patch);
            removeBufferedTask(taskId, patch);
          } catch {
            removeBufferedTask(taskId, patch);
          }
        }
      })();

      flushingPromiseRef.current = flushPromise;

      try {
        await flushPromise;
      } finally {
        if (flushingPromiseRef.current === flushPromise) {
          flushingPromiseRef.current = null;
        }
      }
    },
    []
  );

  useEffect(() => {
    if (bufferedTaskChangesCount < maxBufferedChanges || flushingPromiseRef.current) {
      return;
    }

    void flushTaskBuffer(flushBatchSize);
  }, [bufferedTaskChangesCount, flushTaskBuffer]);

  function removeBufferedTask(taskId: string, flushedPatch?: TaskMovePatch) {
    setBuffer((currentBuffer) => {
      if (flushedPatch && !isSameTaskMovePatch(currentBuffer[taskId], flushedPatch)) {
        return currentBuffer;
      }

      const nextBuffer = { ...currentBuffer };
      delete nextBuffer[taskId];
      bufferRef.current = nextBuffer;

      return nextBuffer;
    });
  }

  return {
    bufferedTaskChangesCount,
    flushTaskBuffer,
    flushBatchSize,
    hasBufferedTaskChanges,
    maxBufferedChanges,
    moveTaskInBuffer,
    taskBuffer: buffer,
    taskStatusMutation,
    tasks
  };
}

function isSameTaskMovePatch(
  currentPatch: TaskMovePatch | undefined,
  flushedPatch: TaskMovePatch
) {
  return (
    currentPatch?.endDate === flushedPatch.endDate && currentPatch.status === flushedPatch.status
  );
}
