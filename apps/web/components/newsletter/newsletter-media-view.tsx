"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { NewsletterBlock, NewsletterBlockV2, MediaLayout } from "./newsletter-types";

type BackgroundMedia = Extract<NewsletterBlockV2, { type: "image" | "gif" | "video" }>;

export function BackgroundSection({
  block,
  assetPrefix,
  children,
  editor = false
}: {
  block: BackgroundMedia;
  assetPrefix: string;
  children: ReactNode;
  editor?: boolean;
}) {
  const [reduced, setReduced] = useState(true);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(media.matches);
      setPlaying(!media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const image = block.type !== "video";
  return (
    <section className="relative isolate min-h-40 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {block.type !== "video" ? (
          <img
            src={`${assetPrefix}/${block.assetId}${block.type === "gif" && reduced && !playing ? "?variant=poster" : ""}`}
            alt={block.alt}
            className="h-full w-full object-cover"
          />
        ) : editor ? (
          <div className="grid h-full place-items-center bg-black/20 text-sm">
            Video: {block.title}
          </div>
        ) : (
          <Video block={block} background />
        )}
      </div>
      <div
        className={`relative p-4 ${!editor && !image ? "pointer-events-none [&_a]:pointer-events-auto" : ""}`}
      >
        {children}
      </div>
      {block.type !== "video" && block.caption ? (
        <p className="relative px-4 pb-2 text-xs">{block.caption}</p>
      ) : null}
      {!editor && block.type === "gif" && reduced ? (
        <button
          type="button"
          className="relative m-2 rounded bg-background/90 px-2 py-1 text-xs text-foreground"
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? "Pausar animación" : "Reproducir animación"}
        </button>
      ) : null}
    </section>
  );
}
export function MediaImage({
  block,
  assetPrefix
}: {
  block: Extract<NewsletterBlock, { type: "image" | "gif" }>;
  assetPrefix: string;
}) {
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(media.matches);
      setPlaying(!media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const isGif = block.type === "gif";
  const src = `${assetPrefix}/${block.assetId}${isGif && reduced && !playing ? "?variant=poster" : ""}`;
  return (
    <figure className={`${"width" in block ? mediaClass(block) : "w-full"} space-y-2`}>
      <img src={src} alt={block.alt} className="max-h-[560px] w-full rounded-2xl object-contain" />
      {block.caption ? (
        <figcaption className="text-center text-xs opacity-65">{block.caption}</figcaption>
      ) : null}
      {isGif && reduced ? (
        <button
          type="button"
          className="mx-auto block text-xs underline"
          onClick={() => setPlaying((value) => !value)}
        >
          {playing ? "Pausar animación" : "Reproducir animación"}
        </button>
      ) : null}
    </figure>
  );
}
export function Chart({ block }: { block: Extract<NewsletterBlock, { type: "chart" }> }) {
  const detailed = "showLabels" in block;
  const showLabels = detailed ? block.showLabels : false;
  const showLegend = detailed ? block.showLegend : true;
  return (
    <figure className="rounded-2xl border border-current/15 bg-current/[0.03] p-4">
      <figcaption className={`mb-4 font-medium ${detailed ? textAlignClass(block.align) : ""}`}>
        {block.title}
      </figcaption>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          {block.chartType === "donut" ? (
            <PieChart>
              <Pie
                data={block.data}
                dataKey="value"
                nameKey="label"
                innerRadius="55%"
                outerRadius="80%"
              >
                {block.data.map((point, i) => (
                  <Cell key={i} fill={point.color ?? colors[i % colors.length]} />
                ))}
                {showLabels ? <LabelList dataKey="label" /> : null}
              </Pie>
              <Tooltip />
            </PieChart>
          ) : block.chartType === "line" ? (
            <LineChart data={block.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line dataKey="value" stroke={block.data[0]?.color ?? "#7c3aed"} strokeWidth={3}>
                {showLabels ? <LabelList dataKey="value" /> : null}
              </Line>
            </LineChart>
          ) : (
            <BarChart data={block.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {block.data.map((point, i) => (
                  <Cell key={i} fill={point.color ?? colors[i % colors.length]} />
                ))}
                {showLabels ? <LabelList dataKey="value" position="top" /> : null}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {showLegend ? (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-70">
          {block.data.map((point, i) => (
            <li key={i}>
              {point.label}: {point.value}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
export function DrawingCanvas({
  drawing
}: {
  drawing: Extract<NewsletterBlockV2, { type: "drawing" }>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = drawing.width * ratio;
    canvas.height = drawing.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = drawing.backgroundColor;
    ctx.fillRect(0, 0, drawing.width, drawing.height);
    drawing.strokes.forEach((stroke) => {
      if (!stroke.points.length) return;
      ctx.save();
      ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
      ctx.globalAlpha = stroke.tool === "highlighter" ? 0.35 : 1;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      stroke.points.forEach((point, i) => {
        const x = point.x * drawing.width;
        const y = point.y * drawing.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.restore();
    });
  }, [drawing]);
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={drawing.alt}
      className="h-auto w-full rounded-2xl border border-current/15"
      style={{ aspectRatio: `${drawing.width}/${drawing.height}` }}
    />
  );
}
export function Video({
  block,
  background = false
}: {
  block: Extract<NewsletterBlock, { type: "video" }>;
  background?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const valid =
    block.provider === "youtube"
      ? /^[\w-]{11}$/.test(block.videoId)
      : block.provider === "vimeo" && /^\d+$/.test(block.videoId);
  if (!valid) return <p className="text-sm opacity-70">Video no disponible.</p>;
  const src =
    block.provider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${block.videoId}`
      : `https://player.vimeo.com/video/${block.videoId}`;
  return (
    <div
      className={
        background
          ? "h-full w-full overflow-hidden bg-black/30"
          : "aspect-video overflow-hidden rounded-2xl bg-black/10"
      }
    >
      {loaded ? (
        <iframe
          src={src}
          title={block.title}
          className="h-full w-full"
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="grid h-full w-full place-items-center p-6 text-center font-medium"
          onClick={() => setLoaded(true)}
        >
          ▶ Ver video: {block.title}
        </button>
      )}
    </div>
  );
}
function textAlignClass(align: "left" | "center" | "right") {
  return align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
}
export function mediaClass(block: MediaLayout) {
  const width =
    block.width === "small" ? "max-w-sm" : block.width === "medium" ? "max-w-2xl" : "w-full";
  const align =
    block.align === "left" ? "mr-auto" : block.align === "right" ? "ml-auto" : "mx-auto";
  return `${width} ${align}`;
}
const colors = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#6366f1"];
