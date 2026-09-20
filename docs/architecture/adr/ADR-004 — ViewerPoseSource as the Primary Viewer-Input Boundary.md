# ADR-004 — ViewerPoseSource as the Primary Viewer-Input Boundary

Status: Accepted  
Context  
Most engine development should be possible without live webcam access. Tracking technology and pose-estimation algorithms may also change independently from downstream viewer-state and projection logic.  
Decision  
ViewerPoseSource is the primary production boundary consumed by ViewerStateController.  
Live path:  
TrackingSource → ViewerPoseEstimator → LiveViewerPoseSource  
Alternative paths:  
SyntheticViewerPoseSource  
RecordedViewerPoseSource  
Consequences  
• Projection, world behavior, lost-tracking handling, and tests can run deterministically.  
• MediaPipe details remain upstream of the canonical pose boundary.  
• Pose-estimator experiments do not require changes to projection/world contracts.  
• Synthetic test paths are first-class rather than test-only hacks.  
Alternatives considered  
• Expose MediaPipe observations directly to downstream engine code — rejected because it couples most of the engine to one tracker.  
• Make the live camera pipeline the only production path and bolt on mocks later — rejected because deterministic development is a core project requirement.  
