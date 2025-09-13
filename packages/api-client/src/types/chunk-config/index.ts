export interface ChunkConfig {
  size: number
  concurrent?: number
  delay?: number
  onProgress?: (loaded: number, total: number) => void
}