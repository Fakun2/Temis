import { z } from "zod";

const trueStringValues = new Set(["1", "true", "yes", "y", "on"]);
const falseStringValues = new Set(["0", "false", "no", "n", "off"]);

export function booleanInputSchema(defaultValue: boolean) {
  return z.preprocess((value) => parseBooleanInput(value, defaultValue), z.boolean());
}

export const optionalBooleanInputSchema = z.preprocess(
  (value) => parseBooleanInput(value, undefined),
  z.boolean().optional()
);

function parseBooleanInput(value: unknown, emptyValue: boolean | undefined) {
  if (value === undefined || value === null || value === "") {
    return emptyValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (trueStringValues.has(normalized)) {
      return true;
    }

    if (falseStringValues.has(normalized)) {
      return false;
    }
  }

  return value;
}
