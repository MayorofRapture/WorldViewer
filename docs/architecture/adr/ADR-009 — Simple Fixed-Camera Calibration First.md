# ADR-009 — Simple Fixed-Camera Calibration First

Status: Accepted  
Context  
The sole initial user uses a Lenovo ThinkPad E590 with a fixed integrated webcam above the display. Calibration should not become a computer-vision project unless measurements require it.  
Decision  
Initial calibration is limited to:  
• physical display dimensions  
• integrated camera identity  
• any required camera-to-screen offset  
• neutral cyclopean-eye pose  
• minimal estimator-specific calibration data  
Do not require full checkerboard lens/intrinsic calibration in the baseline.  
Consequences  
• Calibration remains understandable and quick.  
• Camera FOV/intrinsics stay optional unless the selected estimator requires them.  
• Arbitrary external camera placement remains future scope.  
Revisit condition  
If both simple estimators fail acceptance because of unmodeled camera geometry, create a new ADR before introducing full camera calibration or OpenCV.  
