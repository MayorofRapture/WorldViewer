# ADR-016 — Fully Offline Runtime with Restrictive CSP

Status: Accepted  
Context  
Fully offline operation is a product requirement, and local executable world packages increase the importance of a clear trust boundary.  
Decision  
Package all required host runtime assets locally, including MediaPipe model/WASM assets. Permit only the local resource mechanisms required by the product. Maintain a restrictive production Content Security Policy.  
No normal runtime feature may require:  
• CDN scripts/models/fonts  
• cloud APIs  
• remote world modules  
• telemetry services  
Consequences  
• Offline smoke testing becomes a release requirement.  
• Tauri/WebView2 CSP, WASM, worker, camera, and local-module behavior must be tested in packaged builds.  
• Optional future network features must remain separable from the offline core.  
