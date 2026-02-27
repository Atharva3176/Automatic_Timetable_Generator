import mongoose, { Schema, Document } from "mongoose";

export interface IPeriod {
  periodNumber: number;
  subject: string;
  teacher?: string | null;
  room?: string | null;
  note?: string | null;
}

export interface IDay {
  day: string;
  periods: IPeriod[];
}

export interface ITimetable extends Document {
  className: string;
  division: string;
  daysPerWeek: number;
  periodsPerDay: number;
  teacherContext: string;
  days: IDay[];
  createdAt: Date;
}

const PeriodSchema = new Schema<IPeriod>(
  {
    periodNumber: { type: Number, required: true },
    subject: { type: String, required: true },
    // Teacher can be null for genuine free periods / self-study slots.
    teacher: { type: String, required: false, default: null },
    room: { type: String, default: null },
    note: { type: String, default: null }
  },
  { _id: false }
);

const DaySchema = new Schema<IDay>(
  {
    day: { type: String, required: true },
    periods: { type: [PeriodSchema], default: [] }
  },
  { _id: false }
);

const TimetableSchema = new Schema<ITimetable>(
  {
    className: { type: String, required: true },
    division: { type: String, required: true },
    daysPerWeek: { type: Number, required: true },
    periodsPerDay: { type: Number, required: true },
    teacherContext: { type: String, required: true },
    days: { type: [DaySchema], required: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Timetable =
  mongoose.models.Timetable ||
  mongoose.model<ITimetable>("Timetable", TimetableSchema);

