# Committee calibration set

Thirty write-ups on ten cards (`items.json`): each has the intake transcript, the memo and the way back. They were written to cover strong, middle and weak work and the usual traps: padding, satisfaction-only measurement, a default course, L&D taking over causes it does not own, novelty with and without a concrete way back, the wrong lever, generic and specific risks, unused data, a post-2007 tool, and an instruction aimed at the examiner (W26).

Three graders scored every write-up blind and alone with the examiner's own anchors (`grades/<seat>.json`, one score and reason per dimension, plus lever call, way back and a note where the anchor did not fit). `consensus.json` is the median of the three.

The graders were AI reviewers in three seats (performance consultant, assessment specialist, head of learning), not people. Their agreement shows that the anchors read the same way to careful readers; it does not show the scores are right. A human round on the same set is still to do.

Compare the game's examiner with the committee (needs a Gemini key):

    GEMINI_KEY=... node tests/judge-spread.cjs --calibration [--runs 3] [--out file.json]
