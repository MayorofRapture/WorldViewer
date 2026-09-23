# OpenSeeFace model-2 horizontal confirmation

This is a separate horizontal-only confirmation of the earlier non-monotonic
model-2 result. It does not overwrite the original 17-segment session and does
not make a production tracker or model-selection decision.

## Procedure and configuration

The user established three repeatable visual lateral marks at approximately
`-150 mm`, `0 mm`, and `+150 mm` relative to display center, kept the
cyclopean eye approximately `600 mm` from the screen plane, and reused those
marks for three left-center-right trials. Each segment settled for 2 seconds
and captured for 5 seconds. No depth, vertical, stationary, or orientation
segments were collected.

The frozen tracker configuration was OpenSeeFace `v1.20.5`, model 2,
`--max-threads 1`, camera 0, 640x360, requested 24 FPS, one face, gaze
disabled, loopback UDP, and `--no-3d-adapt 1`. The selected artifact was
`models/lm_model2_opt.onnx`, SHA-256
`16b33ba7d854a0643875ab3da3a620b4b650f2a7f032dd6f634f881cac108304`.

The accepted pose reconstruction was reused unchanged: wire-point restoration,
midpoint of points 68/69, quaternion normalization and vector conjugation,
conventional rotation matrix, and `R * localCyclopean + rawPnpTranslation`.
Coordinates remain uncalibrated `openseeface-model-units`.

Session artifacts are in `sessions/session-1790124325/`.

## Reconstructed camera-space cyclopean X

| Trial | Left mean / median | Center mean / median | Right mean / median | Monotonic? |
| --- | ---: | ---: | ---: | --- |
| 1 | 1.569245 / 1.484202 | 1.705904 / 1.809166 | 1.429274 / 1.311540 | No |
| 2 | 1.484602 / 1.537942 | 1.721791 / 1.823706 | 1.440750 / 1.322203 | No |
| 3 | 1.456927 / 1.499337 | 1.704883 / 1.803058 | 1.474840 / 1.374086 | No |

## Raw PnP X

| Trial | Left mean / median | Center mean / median | Right mean / median | Monotonic? |
| --- | ---: | ---: | ---: | --- |
| 1 | 1.402210 / 1.319822 | 1.575362 / 1.696485 | 1.272841 / 1.140917 | No |
| 2 | 1.322489 / 1.378096 | 1.597195 / 1.712669 | 1.277837 / 1.144773 | No |
| 3 | 1.280507 / 1.324229 | 1.571087 / 1.688840 | 1.316041 / 1.200034 | No |

Both signals repeat the same non-monotonic pattern: center is highest, left is
usually intermediate, and right is lowest. The medians agree with the means
for every trial.

## Validity, variability, and overlap

All nine segments were valid: 1,260 valid samples, 0 invalid pose samples,
valid rate 100%, and face ID 0. Segment cadence was approximately 22.4 or
30.8 Hz, depending on the captured packet interval. Mean valid PnP error by
segment ranged from 1.918067 to 3.598791.

Within-position reconstructed-X standard deviations were:

| Position across trials | Std-dev range | Mean range |
| --- | ---: | ---: |
| Left | 0.089408–0.156660 | 1.456927–1.569245 |
| Center | 0.144500–0.155122 | 1.704883–1.721791 |
| Right | 0.186747–0.218385 | 1.429274–1.474840 |

The distributions overlap materially. For example, reconstructed-X ranges
were left `1.279415–1.894002`, center `1.471344–1.840176`, and right
`1.285044–1.837834`; raw PnP ranges show the same broad overlap. Despite that
overlap, the direction failure is repeatable across all three sequences and
both signal definitions.

## Classification

**Failed — model-2 horizontal directionality only.**

The repeated, marked left-center-right procedure did not produce a consistent
monotonic sequence. This resolves the targeted question as a reproducible
model-2 limitation under the tested conditions. It does not resolve calibration,
millimeter jitter, overall physical suitability, production selection, or
OpenSeeFace adoption.
