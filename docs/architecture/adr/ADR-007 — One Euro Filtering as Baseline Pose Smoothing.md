# ADR-007 — One Euro Filtering as Baseline Pose Smoothing

Status: Accepted, tune in Milestone 0  
Context  
Raw monocular pose data is expected to contain jitter, while excessive smoothing produces visible lag.  
Decision  
Use the One Euro filtering approach as the baseline for X/Y/Z viewer-position smoothing. Prefer a mature compatible implementation when practical; otherwise use a small well-proven implementation based directly on the published algorithm.  
Consequences  
• Filter tuning becomes part of the latency/jitter experiment.  
• Raw and filtered traces should both be instrumented.  
• Filter parameters are engineering settings, not automatically user-facing controls.  
• Tracking state remains separate from filter state.  
Alternatives considered  
• No filter — unlikely to meet stability requirements.  
• Kalman filter — remains available if measurements show a clear advantage, but adds model/tuning complexity not yet justified.  
