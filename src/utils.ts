import { File, FileType, FileWithContent, ValidatorReturn } from "./types";

export const withoutContent = ({ name, type }: File | FileWithContent): File => {
  return { name, type };
};

export const createIssue = (type: "warning" | "error", file: File, message: string) => {
  return { type, file: withoutContent(file), message };
};

export const getCorrespondingFontFile = (emojiFile: File): File => {
  return { type: FileType.FONT, name: "emoji_" + emojiFile.name };
};

export const getCorrespondingEmojiFile = (fontFile: File): File => {
  return { type: FileType.EMOJI, name: fontFile.name.replace(/^emoji_/, "") };
};

export const getCorresponding = (file: File): File | null => {
  if (file.type === FileType.EMOJI) {
    return getCorrespondingFontFile(file);
  } else if (file.type === FileType.FONT) {
    return getCorrespondingEmojiFile(file);
  }

  return null;
};

export const addCorresponding = (remove: File[], file: File): void => {
  const corresponding = getCorresponding(file);
  if (corresponding) {
    remove.push(corresponding);
  }
};

export const isFileEqual = (file1: File, file2: File): boolean => {
  return file1.name === file2.name && file1.type === file2.type;
};

export const removeFiles = <T extends File>(files: T[], output: ValidatorReturn): (FileWithContent | T)[] => {
  const filtered = files.filter(
    (fileA) =>
      // prettier-ignore
      !(
        output.remove?.some((fileB) => isFileEqual(fileA, fileB) ||
        output.issues?.some(({ type: issueType, file: fileB }) => issueType === "error" && isFileEqual(fileA, fileB))
      )
    ),
  );

  const updated = filtered.map((original) => {
    const updated = output.update?.find((file) => isFileEqual(file, original));
    return updated ?? original;
  });

  return updated;
};

export const formatCodepoint = (input: string | number): string => {
  const codepoint = typeof input === "string" ? input.codePointAt(0) ?? "" : input;

  return "U+" + (codepoint.toString(16).toUpperCase() ?? "").padStart(4, "0");
};
