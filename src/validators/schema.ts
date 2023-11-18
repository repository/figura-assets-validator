import { File, FileType, FileWithContent, ValidationIssue, ValidatorWithContent } from "@/types";
import { addCorresponding, createIssue, formatCodepoint } from "@/utils";
import EmojiFileSchema from "@/zod/emoji";
import FontSchema from "@/zod/font";
import { UnicodePUARegex } from "@/zod/util";

const getZodResult = (file: FileWithContent) => {
  if (typeof file.content !== "object") {
    throw new Error(`Error: ${file.name} content is not an object`);
  }

  if (file.type === FileType.EMOJI) {
    return EmojiFileSchema.safeParse(file.content);
  } else if (file.type === FileType.FONT) {
    return FontSchema.safeParse(file.content);
  }

  return null;
};

const SchemaValidator: ValidatorWithContent = (files) => {
  const issues: ValidationIssue[] = [];
  const toIgnore: File[] = [];

  const jsonFiles = files.filter((file) => file.type === FileType.EMOJI || file.type === FileType.FONT);

  for (const file of jsonFiles) {
    if (typeof file.content !== "object") {
      throw new Error(`Error: ${file.name} content is not an object`);
    }

    const zodResult = getZodResult(file);

    if (zodResult && !zodResult.success) {
      const fileIssues: ValidationIssue[] = [];

      for (const issue of zodResult.error.issues) {
        const path = issue.path.reduce((acc, cur, idx, arr) => {
          if (idx === arr.length) {
            return acc;
          }

          if (typeof cur === "number") {
            return acc + `[${cur}]`;
          }

          if ((cur.length === 1, UnicodePUARegex.test(cur))) {
            return acc + `["${formatCodepoint(cur)}"]`;
          }

          return acc + (idx === 0 ? "" : ".") + cur;
        }, "");
        const warning = issue.message.startsWith("warning:") || issue.code === "unrecognized_keys";

        fileIssues.push(
          createIssue(
            warning ? "warning" : "error",
            file,
            issue.message.replace(/^warning:/, "") + (path ? ` (${path})` : ""),
          ),
        );
      }

      if (fileIssues.some((issue) => issue.type === "error")) {
        addCorresponding(toIgnore, file);
      }

      issues.push(...fileIssues);
    }
  }

  return { issues, toIgnore };
};

export default SchemaValidator;
