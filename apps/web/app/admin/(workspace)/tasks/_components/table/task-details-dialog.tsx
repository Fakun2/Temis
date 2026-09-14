"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { caseTaskStatusLabels } from "../../../cases/_constants/cases.constants";
import {
  formatCaseDate,
  formatCaseDateTime,
  getTaskStatusClassName
} from "../../../cases/_components/detail/case-detail-format";
import type { GlobalCaseTaskDto } from "../../../cases/_types/cases.types";

const notificationRecipientLabels = {
  members: "Personas específicas",
  practice_area: "Área de trabajo",
  self: "Solo yo",
  tenant: "Todo el equipo"
} as const;

export function TaskDetailsDialog({ task }: { task: GlobalCaseTaskDto }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        aria-label={`Ver detalle de ${task.name}`}
        className="size-8 border-border/50 p-0"
        onClick={() => setOpen(true)}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <Eye className="size-4" aria-hidden="true" />
      </Button>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de tarea</DialogTitle>
          <DialogDescription>{task.name}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 text-sm">
          <section className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Estado">
              <Badge className={getTaskStatusClassName(task.status)}>{caseTaskStatusLabels[task.status]}</Badge>
            </DetailItem>
            <DetailItem label="Asignado a">{task.assignedTo?.fullName ?? "Sin asignar"}</DetailItem>
            <DetailItem label="Inicio">{formatCaseDate(task.startDate)}</DetailItem>
            <DetailItem label="Vencimiento">{formatCaseDate(task.endDate)}</DetailItem>
            <DetailItem label="Expediente">
              {task.case ? (
                <Link className="text-primary hover:underline" href={`/admin/cases/${task.case.id}`}>
                  {task.case.caseNumber} · {task.case.caption}
                </Link>
              ) : "Sin expediente"}
            </DetailItem>
            <DetailItem label="Cliente">{task.client?.displayName ?? "Sin cliente"}</DetailItem>
          </section>

          <section className="grid gap-2 rounded-xl border border-border/50 bg-secondary/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Observaciones</p>
            <p className="whitespace-pre-wrap leading-6 text-foreground">{task.notes?.trim() || "Sin observaciones."}</p>
          </section>

          <section className="grid gap-3 rounded-xl border border-border/50 bg-secondary/20 p-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Recordatorio interno</p>
            <DetailItem label="Configuración">{task.notificationEnabled ? "Activo" : "No configurado"}</DetailItem>
            {task.notificationEnabled ? (
              <>
                <DetailItem label="Fecha">{formatCaseDate(task.notificationDate)}</DetailItem>
                <DetailItem label="Hora">{task.notificationTime || "Sin cargar"}</DetailItem>
                <DetailItem label="Destinatarios">{notificationRecipientLabels[task.notificationRecipientMode]}</DetailItem>
              </>
            ) : null}
          </section>

          <section className="grid gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground sm:grid-cols-2">
            <DetailItem label="Creada">{formatCaseDateTime(task.createdAt)}</DetailItem>
            <DetailItem label="Última actualización">{formatCaseDateTime(task.updatedAt)}</DetailItem>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 text-foreground">{children}</div>
    </div>
  );
}
