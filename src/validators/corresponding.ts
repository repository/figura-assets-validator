import { File, FileType, ValidationIssue, Validator } from "@/types";
import { createIssue, getCorrespondingEmojiFile, getCorrespondingFontFile, isFileEqual } from "@/utils";

const CorrespondingValidator: Validator = (files) => {
  const emojis = files.filter((file) => file.type === FileType.EMOJI);
  const fonts = files.filter((file) => file.type === FileType.FONT);

  let emojiCorresponding = emojis.map((f) => [f, getCorrespondingFontFile(f)] as const);
  let fontCorresponding = fonts.map((f) => [f, getCorrespondingEmojiFile(f)] as const);

  emojiCorresponding = emojiCorresponding.filter(
    ([, corresponding]) => !files.find((f) => isFileEqual(f, corresponding)),
  );

  fontCorresponding = fontCorresponding.filter(
    ([, corresponding]) => !files.find((f) => isFileEqual(f, corresponding)),
  );

  const issues: ValidationIssue[] = [];
  const remove: File[] = [];

  for (const [emoji, corresponding] of emojiCorresponding) {
    issues.push(createIssue("error", emoji, `Corresponding font file not found for ${corresponding.name}`));
    remove.push(corresponding);
  }

  for (const [font, corresponding] of fontCorresponding) {
    issues.push(createIssue("error", font, `Corresponding emoji file not found for ${corresponding.name}`));
    remove.push(corresponding);
  }

  return { issues, remove };
};

export default CorrespondingValidator;
