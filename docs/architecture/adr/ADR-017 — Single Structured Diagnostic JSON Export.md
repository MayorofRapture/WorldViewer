# ADR-017 — Single Structured Diagnostic JSON Export

Status: Accepted  
Context  
Diagnostic data must be easy for the user to provide directly to an AI/agent. Multiple files or huge log dumps add friction.  
Decision  
Export one versioned UTF-8 JSON document containing structured application, environment, world, display/calibration, camera, tracking, viewer, performance, error, settings-summary, and recent-log data.  
Recent structured logs are bounded by:  
• 200 entries  
• or 256 KiB serialized log content  
whichever limit is reached first.  
Per-frame telemetry is summarized separately and is not stored as ordinary log entries. Raw webcam imagery is excluded by default.  
Consequences  
• Support context is portable and AI-friendly.  
• Export size remains bounded.  
• Diagnostic schema requires versioning and tests.  
• Full historical logging, if retained locally later, remains separate from the standard support export.  
