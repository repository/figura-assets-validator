import { z } from "zod";

export const singleCharacterRefine = (val: string, ctx: z.RefinementCtx) => {
  if (val.length !== 1) {
    ctx.addIssue({
      code: "custom",
      message: "String is not a single character",
    });
  }
};

export const singleCharacter = z.string().superRefine(singleCharacterRefine);
// eslint-disable-next-line no-control-regex
export const UnicodePUARegex = /^[\u0000\uE000-\uF8FF]$/;
