import { File, FileType, FileWithContent, ValidationIssue, ValidatorWithContent } from "@/types";
import { addCorresponding, createIssue, formatCodepoint, getCorrespondingFontFile, isFileEqual } from "@/utils";
import { EmojiFile } from "@/zod/emoji";
import { BitmapProvider, FontFile } from "@/zod/font";

const EmojiReferenceValidator: ValidatorWithContent = (files) => {
  const issues: ValidationIssue[] = [];
  const remove: File[] = [];

  const emojiFiles = files.filter((file) => file.type === FileType.EMOJI);
  const pairs = emojiFiles
    .map((emoji) => {
      const font = getCorrespondingFontFile(emoji);
      const fontWithContent = files.find((file) => isFileEqual(file, font));

      if (!fontWithContent) {
        return null;
      }

      return [emoji, fontWithContent] as const;
    })
    .filter((pair): pair is [FileWithContent, FileWithContent] => pair !== null);

  for (const [emoji, font] of pairs) {
    const emojiChars = Object.keys((emoji.content as EmojiFile).emojis).filter((c) => c.codePointAt(0) !== 0);

    const fontProviders = (font.content as FontFile).providers.filter((p): p is BitmapProvider => p.type === "bitmap");
    const fontChars = fontProviders
      .flatMap((p) => p.chars.flatMap((l) => l.split("")))
      .filter((c) => c.codePointAt(0) !== 0);

    const missingFontChars = emojiChars.filter((c) => !fontChars.includes(c)).map(formatCodepoint);
    const missingEmojiChars = fontChars.filter((c) => !emojiChars.includes(c)).map(formatCodepoint);

    if (missingFontChars.length > 0) {
      issues.push(
        createIssue("error", emoji, `Emoji file contains emoji(s) not defined in font: ${missingFontChars.join(", ")}`),
      );
      addCorresponding(remove, emoji);
    }

    if (missingEmojiChars.length > 0) {
      issues.push(
        createIssue(
          "error",
          font,
          `Font file contains character(s) not named in emoji: ${missingEmojiChars.join(", ")}`,
        ),
      );
      addCorresponding(remove, font);
    }
  }

  return { issues, remove };
};

export default EmojiReferenceValidator;
