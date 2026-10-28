"use client";

import type { Dispatch, SetStateAction } from "react";
import type { NewsletterBlockV2 } from "@/components/newsletter/newsletter-types";
import {
  clearSectionBackgrounds,
  moveNewsletterBlock,
  newBlock,
  type Draft
} from "../_lib/newsletter-builder-model";

export function useNewsletterBlocks(setDraft: Dispatch<SetStateAction<Draft | null>>) {
  function updateBlock(index: number, block: NewsletterBlockV2) {
    setDraft((current) =>
      current
        ? {
            ...current,
            content: {
              ...current.content,
              blocks: clearSectionBackgrounds(current.content.blocks, block).map((old, position) =>
                position === index ? block : old
              )
            }
          }
        : current
    );
  }
  function addBlock(type: NewsletterBlockV2["type"]) {
    const block = newBlock(type);
    setDraft((current) =>
      current
        ? {
            ...current,
            content: { ...current.content, blocks: [...current.content.blocks, block] }
          }
        : current
    );
  }
  function removeBlock(index: number) {
    setDraft((current) =>
      current
        ? {
            ...current,
            content: {
              ...current.content,
              blocks: current.content.blocks.filter((_, position) => position !== index)
            }
          }
        : current
    );
  }
  function moveBlock(index: number, offset: number) {
    setDraft((current) => {
      if (!current) return current;
      const blocks = moveNewsletterBlock(current.content.blocks, index, offset);
      return { ...current, content: { ...current.content, blocks } };
    });
  }

  return { updateBlock, addBlock, removeBlock, moveBlock };
}
