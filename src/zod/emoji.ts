import { formatCodepoint } from "@/utils";
import { z } from "zod";
import { UnicodePUARegex, singleCharacterRefine } from "./util";

// const EmojiNameSchema = z.string().regex(/^[\w@-]+$/, "warning:Emoji name contains invalid characters");
const EmojiNameSchema = z.string();
// .superRefine((val, ctx) => {
//   if (!/^[\w@\-!?+<]+$/.test(val)) {
//     ctx.addIssue({
//       code: "custom",
//       message: `warning:Emoji name "${val}" contains invalid characters`,
//     });
//   }
// });

const EmojiFileSchema = z
  .strictObject({
    blacklist: z.string(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    emojis: z.record(
      z
        .string()
        .regex(UnicodePUARegex, "warning:Emoji character is not in private-use area")
        .superRefine(singleCharacterRefine),
      z.union([
        EmojiNameSchema.array(),
        z.strictObject({
          names: EmojiNameSchema.array(),
          shortcuts: z.string().array().optional(),
        }),
        z.strictObject({
          names: EmojiNameSchema.array(),
          shortcuts: z.string().array().optional(),
          frames: z.number().int().positive(),
          frametime: z.number().int().positive(),
        }),
      ]),
    ),
  })
  .superRefine((val, ctx) => {
    const blacklist = val.blacklist.split("");
    const emojis = Object.keys(val.emojis);

    const notDefined = blacklist.filter((emoji) => !emojis.includes(emoji));

    if (notDefined.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: `warning:Blacklist contains undefined emoji(s): ${notDefined.map(formatCodepoint).join(", ")}`,
        path: ["blacklist"],
      });
    }

    const emptyEmoji = val.emojis["\u0000"];

    if (emptyEmoji !== undefined && Array.isArray(emptyEmoji) && emptyEmoji.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "warning:Emoji character U+0000 should not have any names",
        path: ["emojis", "\u0000"],
      });
    }
  });

export default EmojiFileSchema;
export type EmojiFile = z.infer<typeof EmojiFileSchema>;
