import { File, FileWithContent, ValidationIssue, ValidatorWithContent } from "@/types";
import { addCorresponding, createIssue } from "@/utils";

const JSONValidator: ValidatorWithContent = (files) => {
  const issues: ValidationIssue[] = [];
  const remove: File[] = [];
  const update: FileWithContent[] = [];

  const jsonFiles = files.filter((file) => file.name.toLowerCase().endsWith(".json"));

  for (const file of jsonFiles) {
    if (typeof file.content !== "string") {
      throw new Error(`Error: ${file.name} content is not a string`);
    }

    try {
      update.push({ ...file, content: JSON.parse(file.content) });
    } catch (e) {
      issues.push(createIssue("error", file, e instanceof Error ? e.message : "Invalid JSON"));

      addCorresponding(remove, file);
    }
  }

  return { issues, remove, update };
};

export default JSONValidator;
