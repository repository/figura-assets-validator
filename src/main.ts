import fsp from "fs/promises";
import path from "path";
import process from "process";
import { FileType, FileWithContent, ValidationIssue, Validator, ValidatorWithContent } from "./types";
import { removeFiles } from "./utils";
import CorrespondingValidator from "./validators/corresponding";
import DuplicateEmojiValidator from "./validators/duplicate-emoji";
import EmojiReferenceValidator from "./validators/emoji-reference";
import FileNameValidator from "./validators/file-name";
import JSONValidator from "./validators/json";
import SchemaValidator from "./validators/schema";

const BASE_PATH = path.join(process.cwd(), "assets/v2");

const EMOJIS_PATH = path.join(BASE_PATH, "emojis");
const FONTS_PATH = path.join(BASE_PATH, "font");
const TEXTURES_PATH = path.join(BASE_PATH, "textures", "font", "emojis");

const emojiFiles = await fsp.readdir(EMOJIS_PATH);
const fontFiles = await fsp.readdir(FONTS_PATH);
const textureFiles = await fsp.readdir(TEXTURES_PATH);

let files = [
  ...emojiFiles.map((file) => ({ type: FileType.EMOJI, name: file })),
  ...fontFiles.map((file) => ({ type: FileType.FONT, name: file })),
  ...textureFiles.map((file) => ({ type: FileType.TEXTURE, name: file })),
];

const allIssues: ValidationIssue[] = [];

const output = FileNameValidator(files);

allIssues.push(...(output.issues ?? []));
files = removeFiles(files, output);

const getPath = (type: FileType) => {
  if (type === FileType.EMOJI) {
    return EMOJIS_PATH;
  } else if (type === FileType.FONT) {
    return FONTS_PATH;
  } else if (type === FileType.TEXTURE) {
    return TEXTURES_PATH;
  }
  return null;
};

let filesWithContent = await Promise.all(
  files.map(async (file) => {
    const dir = getPath(file.type);

    if (!dir) {
      return null;
    }

    const isJson = file.name.toLowerCase().endsWith(".json");

    const content = await fsp.readFile(path.join(dir, file.name), isJson ? "utf-8" : undefined);

    return { ...file, content };
  }),
).then((files) => files.filter((file) => file !== null) as FileWithContent[]);

const validators: (Validator | ValidatorWithContent)[] = [
  CorrespondingValidator,
  JSONValidator,
  SchemaValidator,
  EmojiReferenceValidator,
  DuplicateEmojiValidator,
];

for (const validator of validators) {
  const output = validator(filesWithContent);

  allIssues.push(...(output.issues ?? []));
  filesWithContent = removeFiles(filesWithContent, output);
}

console.log(allIssues.map(({ type, file, message }) => `${type} ${file.name}: ${message}`).join("\n"));
