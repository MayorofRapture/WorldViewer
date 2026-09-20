# ADR-020 — Prove Core Geometry and Packaged Infrastructure Before Content

Status: Accepted  
Context  
Live tracking, off-axis projection, Tauri packaging, local world loading, and content simulation could each create failures that look similar. Building a fishtank first would make diagnosis unnecessarily difficult.  
Decision  
Implementation order prioritizes:  
1\. foundation/contracts, including the generic packaged-launch smoke harness  
2\. deterministic screen geometry and off-axis projection  
3\. diagnostic world driven by synthetic ViewerPoseSource  
4\. packaged synthetic smoke behavior by extending the already-established launch harness  
5\. live MediaPipe tracking  
6\. pose-estimator comparison and calibration  
7\. local world-package loading

8\. settings/diagnostics/performance validation  
9\. only then the first real content world  
Clarification  
The generic packaged-launch harness is established during the foundation stage so later packaged tests do not need to redesign process launch, readiness reporting, timeout handling, or deterministic exit behavior. Step 4 extends that existing harness with the synthetic ViewerPoseSource and diagnostic-room path before live camera integration. Full offline/static-asset verification remains a later Milestone 0 concern once the complete runtime asset set exists.

Consequences  
• Projection errors are separated from tracking errors.  
• Packaged WebView constraints are discovered early.  
• The diagnostic room becomes the reference implementation for world packages.  
• Real content is delayed until the engine illusion is credible.  
