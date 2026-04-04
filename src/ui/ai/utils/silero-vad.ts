/**
 * EXPERIMENTAL: Silero VAD Wrapper (Not Recommended for Browser AudioWorklet)
 *
 * This file was attempted for integration with the avr-vad library (Silero ONNX model).
 * However, avr-vad has several limitations for real-time browser audio:
 *
 * ❌ Issues:
 * 1. **Complex ONNX Setup**: Requires ORT runtime configuration and model fetcher
 * 2. **Async API**: Uses event callbacks and async frame processing (not ideal for AudioWorklet)
 * 3. **Node.js Focused**: Designed primarily for Node.js with onnxruntime-node
 * 4. **Bundle Size**: +1.5MB gzipped with onnxruntime-web
 *
 * ✅ Alternative: LocalVAD
 * - Synchronous energy-based speech detection
 * - ~50ms latency for barge-in detection
 * - Zero external dependencies
 * - Works perfectly with AudioWorklet onmessage
 *
 * If you need Silero VAD accuracy for browser use:
 * - Consider webrtc-vad (lighter weight alternative)
 * - Or use a separate Web Worker with onnxruntime-web completely isolated
 * - Or wait for official Silero browser SDK updates
 */

// Not exported - use LocalVAD instead
export {};
