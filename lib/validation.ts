import { z } from "zod";
import { MAX_COMMENT_LENGTH, MAX_IDEA_LENGTH, MIN_PASSWORD_LENGTH, ROLES } from "./constants";

export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter a name." })
  .max(60, { message: "Keep the name under 60 characters." });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Enter a valid email address." }));

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` })
  .max(200, { message: "That password is too long." });

export const roleSchema = z.enum(ROLES, { message: "Pick a role." });

export const memberSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema,
});

export const memberUpdateSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: roleSchema,
});

export const ideaSchema = z
  .string()
  .trim()
  .min(3, { message: "Write a short idea — what should the team do with this reel?" })
  .max(MAX_IDEA_LENGTH, { message: `Keep the idea under ${MAX_IDEA_LENGTH} characters.` });

export const commentSchema = z
  .string()
  .trim()
  .min(1, { message: "Write something first." })
  .max(MAX_COMMENT_LENGTH, { message: `Keep comments under ${MAX_COMMENT_LENGTH} characters.` });

/** YYYY-MM-DD that is a real calendar date, or empty for "no due date". */
export const dueDateSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (value === "") return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
    },
    { message: "Pick a valid date." },
  );
