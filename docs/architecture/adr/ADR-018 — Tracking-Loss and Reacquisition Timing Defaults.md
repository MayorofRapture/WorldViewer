# ADR-018 — Tracking-Loss and Reacquisition Timing Defaults

Status: Accepted, tune in Milestone 0  
Context  
Transient tracking instability should not immediately pull the view to neutral, while prolonged loss must fail gracefully. Reacquisition must not snap.  
Decision  
Initial timing:  
• 350 ms tracking-loss confirmation grace  
• 5 second smooth transition to neutral after loss is confirmed  
• 300 ms provisional reacquisition blend toward the newly tracked pose  
Consequences  
• Timing behavior is centralized in ViewerStateController.  
• Worlds do not manage tracking-loss behavior.  
• The 5-second neutral return is a product requirement; grace/reacquisition values are tuning defaults.  
Revisit condition  
Milestone 0 perceptual testing may tune the 350 ms and 300 ms values without changing the higher-level contract.  
