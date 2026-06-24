/**
 * Log Vital Tool — Global tool for all agents
 *
 * Logs a new vital sign measurement for the patient (e.g. temperature, blood pressure, pulse, SpO2, weight, height, glucose, respiratory rate).
 * Persists the vital reading directly to the patient's health records in Firestore.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { CreateVitalUseCase } from "@/data/vitals";

export function createLogVitalTool(userId: string) {
  return tool({
    description:
      "Log a new vital sign measurement for the patient (e.g. temperature, blood pressure, pulse, SpO2, weight, height, glucose, respiratory rate). " +
      "Persists the vital reading directly to the patient's health records in Firestore.",
    inputSchema: zodSchema(
      z.object({
        vitalType: z
          .string()
          .describe(
            "Type of vital sign, e.g. temperature, pulse, bloodPressure, spO2, weight, height, glucose, respiratory rate",
          ),
        value: z
          .string()
          .describe("Measured value as a string (e.g. '37.2', '120/80', '98')"),
        unit: z
          .string()
          .optional()
          .describe("Unit of measurement, e.g. °C, mmHg, bpm, kg, cm, %"),
        timestamp: z
          .string()
          .optional()
          .describe("ISO timestamp of the measurement"),
      }),
    ),
    execute: async ({ vitalType, value, unit, timestamp }) => {
      const typeLower = vitalType.toLowerCase();
      const valNum = parseFloat(value);

      const payload: any = {
        userId,
        measuredAt: timestamp || new Date().toISOString(),
      };

      if (typeLower.includes("temp")) {
        payload.temperatureC = valNum;
      } else if (
        typeLower.includes("pulse") ||
        typeLower.includes("heart") ||
        typeLower === "hr" ||
        typeLower.includes("restinghr")
      ) {
        payload.restingHr = Math.round(valNum);
      } else if (
        typeLower.includes("pressure") ||
        typeLower === "bp" ||
        typeLower.includes("bloodpressure")
      ) {
        const parts = value.split("/");
        if (parts.length === 2) {
          payload.systolicBp = parseInt(parts[0], 10);
          payload.diastolicBp = parseInt(parts[1], 10);
        } else {
          payload.systolicBp = Math.round(valNum);
        }
      } else if (typeLower.includes("spo2") || typeLower.includes("oxygen")) {
        payload.spo2 = valNum;
      } else if (typeLower.includes("glucose")) {
        payload.glucoseMgdl = valNum;
      } else if (typeLower.includes("weight")) {
        payload.weightKg = valNum;
      } else if (typeLower.includes("height")) {
        payload.heightCm = valNum;
      } else if (typeLower.includes("respiratory") || typeLower === "rr") {
        payload.respiratoryRate = Math.round(valNum);
      } else {
        return {
          status: "rejected",
          message: `Unknown or unmapped vital type: ${vitalType}. Please specify one of: temperature, blood pressure, pulse, spO2, weight, height, glucose, respiratory rate.`,
        };
      }

      try {
        const useCase = new CreateVitalUseCase();
        const saved = await useCase.execute(payload);
        return {
          status: "accepted",
          vitalId: saved.id,
          vitalType,
          value,
          unit,
        };
      } catch (err: any) {
        console.error("[log-vital.tool] Failed to persist vital:", err);
        return {
          status: "failed",
          message: err?.message || "Failed to persist vital sign to database.",
        };
      }
    },
  });
}

