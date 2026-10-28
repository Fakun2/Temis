"use client";

import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DrawingStroke, NewsletterBlockV2 } from "@/components/newsletter/newsletter-types";
import { ColorField, Field } from "./newsletter-fields";

export function DrawingEditor({
  drawing,
  onChange
}: {
  drawing: Extract<NewsletterBlockV2, { type: "drawing" }>;
  onChange: (drawing: NewsletterBlockV2) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<DrawingStroke["tool"]>("pencil");
  const [color, setColor] = useState("#073061");
  const [width, setWidth] = useState(5);
  const active = useRef<DrawingStroke | null>(null);
  useEffect(() => drawCanvas(canvas.current, drawing), [drawing]);
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={tool}
          onChange={(event) => setTool(event.target.value as typeof tool)}
        >
          <option value="pencil">Lápiz</option>
          <option value="highlighter">Resaltador</option>
          <option value="eraser">Borrador</option>
        </select>
        <input
          type="color"
          aria-label="Color del trazo"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
        <Input
          className="w-24"
          type="number"
          min={1}
          max={48}
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange({ ...drawing, strokes: drawing.strokes.slice(0, -1) })}
        >
          <Undo2 /> Deshacer
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChange({ ...drawing, strokes: [] })}>
          Limpiar
        </Button>
      </div>
      <canvas
        ref={canvas}
        className="w-full touch-none rounded-xl border"
        style={{ aspectRatio: `${drawing.width}/${drawing.height}` }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          active.current = { tool, color, width, points: [point(event)] };
        }}
        onPointerMove={(event) => {
          if (!active.current) return;
          active.current.points.push(point(event));
          drawCanvas(canvas.current, { ...drawing, strokes: [...drawing.strokes, active.current] });
        }}
        onPointerUp={() => {
          if (!active.current) return;
          onChange({ ...drawing, strokes: [...drawing.strokes, active.current] });
          active.current = null;
        }}
      />
      <Field label="Descripción alternativa">
        <Input
          value={drawing.alt}
          maxLength={300}
          onChange={(event) => onChange({ ...drawing, alt: event.target.value })}
        />
      </Field>
      <ColorField
        label="Fondo"
        value={drawing.backgroundColor}
        onChange={(backgroundColor) => onChange({ ...drawing, backgroundColor })}
      />
    </div>
  );
}
function drawCanvas(
  canvas: HTMLCanvasElement | null,
  drawing: Extract<NewsletterBlockV2, { type: "drawing" }>
) {
  if (!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  const width = drawing.width;
  const height = drawing.height;
  if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
    canvas.width = width * ratio;
    canvas.height = height * ratio;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = drawing.backgroundColor;
  context.fillRect(0, 0, width, height);
  drawing.strokes.forEach((stroke) => {
    context.save();
    context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.globalAlpha = stroke.tool === "highlighter" ? 0.35 : 1;
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    stroke.points.forEach((item, index) =>
      index
        ? context.lineTo(item.x * width, item.y * height)
        : context.moveTo(item.x * width, item.y * height)
    );
    context.stroke();
    context.restore();
  });
}
