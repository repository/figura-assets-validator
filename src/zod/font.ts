import { formatCodepoint } from "@/utils";
import { z } from "zod";
import { UnicodePUARegex, singleCharacter } from "./util";

const SpaceProviderSchema = z.strictObject({
  type: z.literal("space"),
  advances: z.record(singleCharacter, z.number().int().nonnegative()),
});

const BitmapProviderSchema = z.strictObject({
  type: z.literal("bitmap"),
  file: z
    .string()
    .startsWith("figura:", "Font bitmap must be in Figura namespace")
    .endsWith(".png", "Font bitmap must be a PNG"),
  ascent: z.number().int().nonnegative(),
  chars: z
    .string()
    .array()
    .nonempty("Character map must have at least one element")
    .superRefine((val, ctx) => {
      const lengths = val.map((str) => str.length);
      const isNotEqual = lengths.some((len) => len !== lengths[0]);

      if (isNotEqual) {
        ctx.addIssue({
          code: "custom",
          message: "All character map elements must have the same length",
        });
      }

      const characters = val.flatMap((str) => str.split(""));
      const notInPUA = characters.filter((char) => !UnicodePUARegex.test(char));

      if (notInPUA.length > 0) {
        const pretty = notInPUA.map(formatCodepoint).join(", ");
        ctx.addIssue({
          code: "custom",
          message: `warning:Character map contains non-private-use character(s): ${pretty}`,
        });
      }

      const codepoints = characters.map((char) => char.codePointAt(0)!).filter((c) => c !== 0);

      const duplicates = codepoints
        .filter((c, idx) => codepoints.indexOf(c) !== idx)
        .filter((c, idx, arr) => arr.indexOf(c) === idx);

      if (duplicates.length > 0) {
        const pretty = duplicates.map(formatCodepoint).join(", ");
        ctx.addIssue({
          code: "custom",
          message: `Character map contains duplicate character(s): ${pretty}`,
        });
      }

      const isSequential = codepoints.every((codepoint, idx) => {
        const next = codepoints[idx + 1];
        return next === undefined || codepoint <= next;
      });

      if (!isSequential) {
        ctx.addIssue({
          code: "custom",
          message: "warning:Character map is not sequential",
        });
      }
    }),
});

const FontSchema = z.strictObject({
  providers: z
    .array(z.discriminatedUnion("type", [SpaceProviderSchema, BitmapProviderSchema]))
    .nonempty("Font must have at least one provider"),
});

export default FontSchema;
export { SpaceProviderSchema, BitmapProviderSchema };
export type SpaceProvider = z.infer<typeof SpaceProviderSchema>;
export type BitmapProvider = z.infer<typeof BitmapProviderSchema>;
export type FontFile = z.infer<typeof FontSchema>;
