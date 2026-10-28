"use client";

import { useState } from "react";
import type { BuilderPanel, MediaBlock, MediaKind } from "../_lib/newsletter-builder-model";

export function useNewsletterEditorState() {
  const [panel, setPanel] = useState<BuilderPanel>("content");
  const [preview, setPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewDark, setPreviewDark] = useState(false);
  const [activeEditor, setActiveEditor] = useState<string | null>(null);
  const [controlsTarget, setControlsTarget] = useState<HTMLDivElement | null>(null);
  const [headerEditing, setHeaderEditing] = useState(false);
  const [footerEditing, setFooterEditing] = useState(false);
  const [headerAutoFocus, setHeaderAutoFocus] = useState(false);
  const [footerAutoFocus, setFooterAutoFocus] = useState(false);
  return {
    panel,
    setPanel,
    preview,
    setPreview,
    previewDevice,
    setPreviewDevice,
    previewDark,
    setPreviewDark,
    activeEditor,
    setActiveEditor,
    controlsTarget,
    setControlsTarget,
    headerEditing,
    setHeaderEditing,
    footerEditing,
    setFooterEditing,
    headerAutoFocus,
    setHeaderAutoFocus,
    footerAutoFocus,
    setFooterAutoFocus
  };
}

export function useNewsletterMediaState() {
  const [placing, setPlacing] = useState<MediaKind | null>(null);
  const [mediaDraft, setMediaDraft] = useState<MediaBlock | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<number | null>(null);
  return { placing, setPlacing, mediaDraft, setMediaDraft, selectedMedia, setSelectedMedia };
}
