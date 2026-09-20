# ADR-005 — Worker-Based MediaPipe Tracking with Latest-Frame Backpressure

Status: Accepted, validate in Milestone 0  
Context  
Face inference is computationally expensive and must not block the render/UI thread. Processing every camera frame is less important than minimizing stale-data latency.  
Decision  
Run MediaPipe Face Landmarker in a dedicated module Web Worker. Use latest-frame backpressure:  
• one frame may be actively processed  
• at most one newer waiting frame is retained  
• newer frames may replace older waiting frames  
• unbounded FIFO queues are prohibited  
Consequences  
• Tracking cadence can be lower than render cadence without building latency.  
• Frame-transfer cost becomes an important packaged-WebView experiment.  
• Tracking results are normalized before entering pose-estimation code.  
• Worker protocol requires versioned structured messages.  
Validation  
Milestone 0 must benchmark the packaged Tauri path and choose the practical frame-transfer representation supported by WebView2.  
Alternatives considered  
• Main-thread MediaPipe inference — rejected due to latency/UI/render risk.  
• Process every captured frame in sequence — rejected because backlog would increase motion latency under load.  
