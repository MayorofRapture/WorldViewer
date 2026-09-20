# ADR-002 — Imperative Three.js Engine; React for Application UI

Status: Accepted  
Context  
The head-tracked projection camera, render loop, world lifecycle, and viewer-state pipeline operate at frame cadence. React is useful for settings, calibration, diagnostics, and application chrome but should not own the real-time rendering architecture.  
Decision  
Use imperative Three.js with one engine-owned WebGLRenderer and projection camera. Use React for non-frame-critical application UI. Do not use React Three Fiber in the baseline architecture.  
Consequences  
• The render loop remains explicit and deterministic.  
• Projection updates do not depend on React render cycles.  
• World modules work directly with Three.js scene primitives through host-defined boundaries.  
• React state remains coarse-grained.  
Alternatives considered  
• React Three Fiber — useful for many scene-centric applications, but adds an additional rendering abstraction that is not needed for the core virtual-window pipeline.  
• Custom renderer — rejected because Three.js already solves the required rendering infrastructure.  
