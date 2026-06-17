export const MAX_EVENT_MATERIALS = 10;
export const MAX_EVENT_MATERIAL_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    return `${Number((sizeBytes / (1024 * 1024)).toFixed(1))} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${Number((sizeBytes / 1024).toFixed(1))} KB`;
  }
  return `${sizeBytes} B`;
}
