import { FileType, ValidationIssue, Validator } from "@/types";
import { createIssue } from "@/utils";

const FILENAME_REGEX = /[\w-]+\.[a-zA-Z0-9]+/;

const FileNameValidator: Validator = (files) => {
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    if (file.type === FileType.EMOJI && !file.name.toLowerCase().endsWith(".json")) {
      issues.push(createIssue("error", file, "Emoji files must be JSON"));
      continue;
    } else if (file.type === FileType.FONT && !file.name.toLowerCase().endsWith(".json")) {
      issues.push(createIssue("error", file, "Font files must be JSON"));
      continue;
    } else if (file.type === FileType.TEXTURE && !file.name.toLowerCase().endsWith(".png")) {
      issues.push(createIssue("error", file, "Texture files must be PNG"));
      continue;
    }

    if (file.type === FileType.FONT && !file.name.startsWith("emoji_")) {
      issues.push(createIssue("error", file, "Font files must start with emoji_"));
    }

    if (!FILENAME_REGEX.test(file.name)) {
      issues.push(
        createIssue("warning", file, "File names should only contain alphanumeric characters, underscores, and dashes"),
      );
    }
  }

  return { issues };
};

export default FileNameValidator;
