# ADR-006 — Pose Estimator Selected by Measurement, Not Assumption

Status: Experimental  
Context  
Monocular physical viewer depth is the largest technical uncertainty. MediaPipe provides useful face geometry, but the most reliable mapping to physical screen-relative millimeters must be demonstrated on the reference laptop.  
Decision  
Implement and compare at least two bounded ViewerPoseEstimator implementations during Milestone 0:  
• a MediaPipe facial-transform-based approach  
• a calibrated facial-scale/interocular approach  
Select the production estimator based on measured jitter, depth repeatability, lateral/vertical consistency, latency, calibration burden, and robustness at normal viewing distances.  
OpenCV/solvePnP is an escalation path, not part of the baseline.  
Consequences  
• The TDS does not prematurely commit to one interpretation of MediaPipe output.  
• Instrumentation and repeatable fixtures are required.  
• The estimator interface must remain stable across experiments.  
Superseding condition  
After Milestone 0 comparison, create a new ADR selecting the production estimator and superseding this experimental record.  
