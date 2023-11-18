import { File, FileType, ValidationIssue, ValidatorWithContent } from "@/types";
import { addCorresponding, createIssue } from "@/utils";
import { EmojiFile } from "@/zod/emoji";

const DuplicateEmojiValidator: ValidatorWithContent = (files) => {
  const issues: ValidationIssue[] = [];
  const remove: File[] = [];

  const emojiFiles = files.filter((file) => file.type === FileType.EMOJI);

  const emojis: { origin: string; names: string[] }[] = emojiFiles.map((file) => ({
    origin: file.name,
    names: Object.values((file.content as EmojiFile).emojis).flatMap((e) => (Array.isArray(e) ? e : e.names)),
  }));

  const emojiNames = emojis.flatMap((n) => n.names);
  const duplicateEmojiNames = emojiNames
    .filter((n, i) => emojiNames.indexOf(n) !== i)
    .filter((n, i, arr) => arr.indexOf(n) === i);

  const containingDuplicates: Record<string, string[]> = {};
  for (const duplicate of duplicateEmojiNames) {
    const filesContaining = emojis.filter((n) => n.names.includes(duplicate)).map((n) => n.origin);

    for (const file of filesContaining) {
      if (!containingDuplicates[file]) {
        containingDuplicates[file] = [duplicate];
      } else {
        containingDuplicates[file]!.push(duplicate);
      }
    }
  }

  for (const [file, duplicates] of Object.entries(containingDuplicates)) {
    issues.push(
      createIssue(
        "error",
        files.find((f) => f.name === file)!,
        `Emoji file contains duplicate emoji name(s): ${duplicates.join(", ")}`,
      ),
    );
    addCorresponding(remove, files.find((f) => f.name === file)!);
  }

  return { issues, remove };
};

export default DuplicateEmojiValidator;
