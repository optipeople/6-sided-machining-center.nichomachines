import { z } from "zod";

export const SubmissionSchema = z.object({
  contact: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(160),
    job: z.string().min(1).max(120),
    company: z.string().max(160).optional(),
  }),
  products: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        name: z.string().max(80),
        size: z.string().max(80),
        unitsPerDay: z.number().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(50),
  operators: z.number().min(0).max(1000),
  investment: z.number().min(0).max(100_000_000),
  // honeypot — must be empty
  website: z.string().max(0).optional(),
});

export type Submission = z.infer<typeof SubmissionSchema>;
