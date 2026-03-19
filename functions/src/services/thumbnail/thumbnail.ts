import { isImage, generate as generateImage } from "./image.js";
import { isDocument, generate as generateDoc } from "./docs.js";

/**
 * Download a file from the given URL and generate a WebP thumbnail.
 * Routes to the image or document generator based on MIME type.
 * Returns `null` for unsupported types.
 */
export async function generate(
  url: string,
  type: string,
): Promise<Buffer | null> {
  if (!isImage(type) && !isDocument(type)) return null;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  if (isImage(type)) return generateImage(buffer);
  return generateDoc(buffer, type);
}
