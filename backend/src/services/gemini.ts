import { GoogleGenerativeAI } from "@google/generative-ai";

// Use Gemini 2.5 Pro as requested
const MODEL_NAME = "gemini-2.5-flash";

export interface GenerateTimetableInput {
  className: string;
  division: string;
  daysPerWeek: number;
  periodsPerDay: number;
  teacherContext: string;
}

export async function generateTimetableWithGemini(
  input: GenerateTimetableInput
): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  const systemInstructions = `
You are an expert school timetable generator.
You must generate a weekly timetable for ONE specific class and division.

HARD CONSTRAINTS (DO NOT VIOLATE):
- A teacher cannot be in more than one class at the same time.
- Respect each teacher's availability and subject expertise given in the context.
- Only assign a teacher in a period if they are available in that slot.
- If something is impossible, leave the slot empty with a note, don't invent availability.

OUTPUT FORMAT:
Return ONLY a single JSON object, no explanations, no markdown.
Use exactly this TypeScript-like structure:
{
  "className": string,
  "division": string,
  "days": [
    {
      "day": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday",
      "periods": [
        {
          "periodNumber": number,
          "subject": string,
          "teacher": string,
          "room": string | null,
          "note": string | null
        }
      ]
    }
  ]
}

Number of days = daysPerWeek from the user.
Number of periods in each day = periodsPerDay from the user.
`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemInstructions
  });

  const userPrompt = `
Generate a conflict-free timetable for the following:

Class: ${input.className}
Division: ${input.division}
Days per week: ${input.daysPerWeek}
Periods per day: ${input.periodsPerDay}

Teacher and availability context (subjects, free slots, constraints):
${input.teacherContext}

Remember: respond with ONLY valid JSON that matches the specified structure. Do not add markdown or explanations.
`;

  // With the current SDK, pass a simple text prompt instead of
  // low-level contents/parts objects to avoid JSON payload errors.
  const result = await model.generateContent(userPrompt);

  let text = result.response.text().trim();

  // Clean up common formatting the model might add (markdown fences, labels)
  // so that we can still parse valid JSON.
  // Remove leading/trailing markdown code fences like ```json ... ```.
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z0-9]*\s*/, "").replace(/```$/, "").trim();
  }

  // If there is extra explanation around the JSON, try to extract the
  // first top-level JSON object.
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const possibleJson = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(possibleJson);
    } catch {
      // fall through to final error handling below
    }
  }

  const error = new Error("Gemini did not return valid JSON");
  (error as any).raw = text;
  throw error;
}

// --- Class 6 & 7 (all divisions) batch generator ---

const CLASS6_7_SYSTEM = `You are an expert school timetable generator. You generate weekly timetables for Class 6 and Class 7, each with 4 divisions (A, B, C, D). Teachers are common across divisions; no teacher may be in two classes at the same time.

SCHOOL SCHEDULE:
- Six working days: Monday to Saturday.
- School timing: 8:00 AM to 2:30 PM.
- Nine periods per day. Period 1 is 30 minutes; Periods 2–9 are 40 minutes each.
- Long recess: 25 minutes at 10:30 AM (after Period 4).
- Short recess: 15 minutes at 12:55 PM (after Period 7).

PERIOD TIMING (for reference):
- P1: 8:00–8:30 (30 min)
- P2: 8:30–9:10, P3: 9:10–9:50, P4: 9:50–10:30
- [Long recess 10:30–10:55]
- P5: 10:55–11:35, P6: 11:35–12:15, P7: 12:15–12:55
- [Short recess 12:55–1:10]
- P8: 1:10–1:50, P9: 1:50–2:30

SUBJECTS AND LECTURES PER WEEK (per division):
- English: 5
- Science: 6
- Social Science: 7
- Marathi: 5
- Mathematics: 6 (MUST be two consecutive periods as first two periods of the day on 3 days—i.e. double/couple lecture P1–P2)
- Hindi: 5
- Music: 1
- Dance: 1
- Computer: 1
- Art: 1
- Value Education: 2 (MUST be Period 1 on exactly 2 days for that class)
- Foundation (English): 1 per week
- Foundation (Mathematics): 1 per week
- Foundation (Science): 1 per week
- Skill subject: 1
- Tech Club: 1
- Sports: 3
- Weekly Test / Class test: 3 periods—MUST be Wednesday Periods 1, 2, 3 (first three consecutive)
- Assembly: Period 1 only on Tuesday, Friday, Saturday (once per week on each of these days)
- Activity club: Exactly 2 periods per week per division. Both MUST be Period 9 (last period)—Monday P9 and Tuesday P9, for ALL divisions of Class 6 and Class 7 (6A, 6B, 6C, 6D, 7A, 7B, 7C, 7D). One activity club period on Monday P9, one on Tuesday P9 (e.g. Tech Club, Skill subject, or similar).

SPECIAL RULES:
1. Assembly: P1 on Tuesday, Friday, Saturday for all divisions.
2. Value Education: Taken by class teacher. Must be P1 on the same 2 days for all 4 divisions of the same class (e.g. 6A, 6B, 6C, 6D all have Value Education P1 on the same two days; same for 7A–7D).
3. Mathematics: Two consecutive lectures (double period) as the first two periods of the day on 3 days per week. No other subject should use P1–P2 double slot except Maths on those days.
4. Weekly Test: Wednesday P1, P2, P3 only for all divisions.
5. Activity club: Exactly 2 periods per week—Monday Period 9 and Tuesday Period 9 only. This applies to every division (6A, 6B, 6C, 6D, 7A, 7B, 7C, 7D). So on Monday P9 and Tuesday P9, every division has an activity club period (e.g. Tech Club on one day, Skill subject on the other, or as per school). No other day or period may be used for these 2 activity club slots.
6. Sports: Same time slot for 2 divisions (e.g. 6A and 6B same slot, 6C and 6D same slot, or similar). On Thursday, Friday, Saturday all four divisions have Sports, one period each day.
7. Use the teacher list and availability provided by the user. Avoid any teacher clash across divisions (same teacher cannot be in two divisions at the same period).

OUTPUT FORMAT:
Return ONLY a single JSON object, no markdown, no explanation:
{
  "timetables": [
    {
      "className": "6",
      "division": "A",
      "days": [
        {
          "day": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday",
          "periods": [
            {
              "periodNumber": 1 to 9,
              "subject": string,
              "teacher": string or null,
              "room": string or null,
              "note": string or null
            }
          ]
        }
      ]
    }
  ]
}
Include exactly 8 timetables: 6A, 6B, 6C, 6D, 7A, 7B, 7C, 7D. Each timetable has 6 days (Monday–Saturday), each day has exactly 9 periods.`;

export interface GenerateClass6And7Input {
  teacherContext: string;
}

export async function generateClass6And7Timetables(
  input: GenerateClass6And7Input
): Promise<{ timetables: any[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: CLASS6_7_SYSTEM
  });

  const userPrompt = `
Prepare the class timetable for Class 6 and Class 7 with the following:

- Four divisions per class: A, B, C, D (8 timetables total: 6A, 6B, 6C, 6D, 7A, 7B, 7C, 7D).
- Six days working (Monday–Saturday), 8 AM to 2:30 PM, nine lectures per day (P1 = 30 min, P2–P9 = 40 min). Long recess 25 min at 10:30 AM, short recess 15 min at 12:55 PM.
- Subject counts and rules as in the system instructions (English 5, Science 6, Social Science 7, Marathi 5, Mathematics 6 with double P1–P2 on 3 days, Hindi 5, Music 1, Dance 1, Computer 1, Art 1, Value Education 2 as P1 on 2 same days per class, Foundation 3, Skill 1, Tech Club 1, Sports 3, Weekly Test Wed P1–P3, Assembly Tue/Fri/Sat P1). Activity club: exactly 2 periods per week—Monday P9 and Tuesday P9 only, for all divisions of Class 6 and Class 7.
- Value education same days for all divisions of the same class; Sports same time for 2 divisions and Thu/Fri/Sat all divisions; Activity club Monday P9 and Tuesday P9 for every division (6A–6D, 7A–7D); no teacher clashes.

Teacher and availability context (common subject teachers for 6th and 7th):
${input.teacherContext}

Respond with ONLY the JSON object containing "timetables" array with 8 timetables. No markdown or extra text.
`;

  const result = await model.generateContent(userPrompt);
  let text = result.response.text().trim();

  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z0-9]*\s*/, "").replace(/```$/, "").trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
      if (parsed && Array.isArray(parsed.timetables)) return parsed;
    } catch {
      // fall through
    }
  }

  const err = new Error("Gemini did not return valid JSON for Class 6 & 7 timetables");
  (err as any).raw = text;
  throw err;
}

