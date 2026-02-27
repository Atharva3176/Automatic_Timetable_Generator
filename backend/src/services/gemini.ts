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

