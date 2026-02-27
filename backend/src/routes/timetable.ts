import { Router } from "express";
import { Timetable } from "../models/Timetable";
import {
  generateTimetableWithGemini,
  GenerateTimetableInput
} from "../services/gemini";

const router = Router();

router.post("/generate-timetable", async (req, res) => {
  try {
    const body = req.body as Partial<GenerateTimetableInput>;

    if (
      !body.className ||
      !body.division ||
      !body.daysPerWeek ||
      !body.periodsPerDay ||
      !body.teacherContext
    ) {
      return res.status(400).json({
        error: "Missing required fields in request body."
      });
    }

    let generated;
    try {
      generated = await generateTimetableWithGemini(body as GenerateTimetableInput);
    } catch (err: any) {
      if (err && err.raw) {
        return res.status(200).json({
          error: "Model did not return valid JSON.",
          raw: err.raw
        });
      }
      console.error("Gemini error:", err);
      return res.status(500).json({
        error: "Failed to generate timetable from Gemini."
      });
    }

    const timetableDoc = await Timetable.create({
      className: body.className,
      division: body.division,
      daysPerWeek: body.daysPerWeek,
      periodsPerDay: body.periodsPerDay,
      teacherContext: body.teacherContext,
      days: generated.days
    });

    return res.status(201).json({
      timetable: {
        className: timetableDoc.className,
        division: timetableDoc.division,
        days: timetableDoc.days
      }
    });
  } catch (err) {
    console.error("Timetable generation route error:", err);
    return res.status(500).json({
      error: "Unexpected server error."
    });
  }
});

router.get("/timetables", async (_req, res) => {
  try {
    const timetables = await Timetable.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return res.json({ timetables });
  } catch (err) {
    console.error("Fetch timetables error:", err);
    return res.status(500).json({
      error: "Failed to fetch timetables."
    });
  }
});

export default router;

