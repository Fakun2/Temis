"use client";

import { Columns3 } from "lucide-react";
import type { TasksOpenTaskMode } from "../../task-list-types";
import { getOpenTaskInLabel } from "../settings-labels";
import { SettingsRow } from "../settings-primitives";
import type { TasksSettingsScreen } from "../settings-types";

export function OpenTaskDesignSetting({
  openTaskIn,
  onOpenScreen
}: {
  openTaskIn: TasksOpenTaskMode;
  onOpenScreen: (screen: TasksSettingsScreen) => void;
}) {
  return (
    <SettingsRow
      icon={Columns3}
      label="Abrir paginas en"
      value={getOpenTaskInLabel(openTaskIn)}
      onSelect={() => onOpenScreen("open-task")}
    />
  );
}
