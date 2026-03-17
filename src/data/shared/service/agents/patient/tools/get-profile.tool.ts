/**
 * Get Profile Tool — Fetch the patient's identity profile from Firestore.
 *
 * Returns name, email, phone, gender, date of birth, city, country.
 * Used when the user asks personal identity questions like "what is my name?".
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { profileRepository } from "@/data/profile/repositories/profile.repository";

export function createGetProfileTool(userId: string) {
  return tool({
    description:
      "Fetch the patient's identity profile (name, email, phone, gender, date of birth, city, country). " +
      "Call this when the user asks about their personal details, name, contact info, or demographic data.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const profile = await profileRepository.get(userId);
      if (!profile) {
        return { found: false, message: "No profile found for this user." };
      }
      return {
        found: true,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        gender: profile.gender,
        dateOfBirth: profile.dateOfBirth,
        city: profile.city,
        country: profile.country,
      };
    },
  });
}
