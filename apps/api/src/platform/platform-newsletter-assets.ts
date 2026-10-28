import { BadRequestException } from "@nestjs/common";
import sharp from "sharp";

export const maxNewsletterImageBytes = 8 * 1024 * 1024;
const maxNewsletterImagePixels = 16_777_216;
const maxNewsletterAnimationPixels = 40_000_000;
export type NewsletterUpload = { buffer: Buffer; mimetype: string; size: number };

export async function validateNewsletterImage(
  file?: NewsletterUpload
): Promise<{ file: NewsletterUpload; poster: Buffer | null }> {
  if (
    !file ||
    file.size > maxNewsletterImageBytes ||
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)
  )
    throw new BadRequestException("Elegí una imagen JPEG, PNG, WebP o GIF de hasta 8 MB.");
  try {
    const image = sharp(file.buffer, {
      animated: file.mimetype === "image/gif",
      failOn: "warning",
      limitInputPixels:
        file.mimetype === "image/gif" ? maxNewsletterAnimationPixels : maxNewsletterImagePixels
    });
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > 4096 ||
      (metadata.pageHeight ?? metadata.height) > 4096 ||
      metadata.width * (metadata.pageHeight ?? metadata.height) > maxNewsletterImagePixels ||
      (file.mimetype === "image/gif" && (metadata.pages ?? 1) > 120) ||
      `image/${metadata.format === "jpeg" ? "jpeg" : metadata.format}` !== file.mimetype
    )
      throw new Error("invalid image");
    await image.toBuffer();
    const poster =
      file.mimetype === "image/gif"
        ? await sharp(file.buffer, { page: 0, limitInputPixels: maxNewsletterImagePixels })
            .webp()
            .toBuffer()
        : null;
    return { file, poster };
  } catch {
    throw new BadRequestException(
      "La imagen está dañada, excede los límites de dimensiones o el GIF supera los límites de fotogramas o píxeles totales."
    );
  }
}
