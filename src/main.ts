import { getInput, setFailed, setOutput } from "@actions/core";
import { context } from "@actions/github";
import fsp from "fs/promises";
import markdownEscape from "markdown-escape";
import { markdownTable } from "markdown-table";
import path from "path";
import { File, FileType, FileWithContent, ValidationIssue, Validator, ValidatorWithContent } from "./types";
import { removeFiles } from "./utils";
import CorrespondingValidator from "./validators/corresponding";
import DuplicateEmojiValidator from "./validators/duplicate-emoji";
import EmojiReferenceValidator from "./validators/emoji-reference";
import FileNameValidator from "./validators/file-name";
import JSONValidator from "./validators/json";
import SchemaValidator from "./validators/schema";

async function main() {
  const BASE_PATH = getInput("path", { required: true });

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
    throw new Error(`Unknown file type: ${type}`);
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

  const getBlobLink = () => {
    if (process.env["GITHUB_REPOSITORY"] && context.repo && context.sha) {
      return `https://github.com/${context.repo.owner}/${context.repo.repo}/blob/${context.sha}`;
    } else {
      return null;
    }
  };

  const formatPath = (file: File) => {
    const typePath = getPath(file.type);

    const withBasePath = path.join(typePath, file.name).split(path.sep).join("/");
    const withoutBasePath = withBasePath.replace(BASE_PATH, "");

    const blobLink = getBlobLink();

    if (blobLink) {
      return `[\`${withoutBasePath}\`](${blobLink}/${withBasePath})`;
    } else {
      return `\`${withoutBasePath}\``;
    }
  };

  const fileTypeOrder = [FileType.EMOJI, FileType.FONT, FileType.TEXTURE];
  allIssues.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "error" ? -1 : 1;
    } else if (a.file.type !== b.file.type) {
      return fileTypeOrder.indexOf(a.file.type) - fileTypeOrder.indexOf(b.file.type);
    } else {
      return a.file.name.localeCompare(b.file.name);
    }
  });

  const table = markdownTable([
    ["", "File", "Message"],
    ...allIssues.map(({ type, file, message }) => [
      type === "warning" ? "⚠️" : "❌",
      formatPath(file),
      markdownEscape(message),
    ]),
  ]);

  setOutput("issues_table", table);
  setOutput("has_issues", allIssues.length > 0);

  for (const issue of allIssues) {
    console.log(`[${issue.type}] [${issue.file.type}] ${issue.file.name}: ${issue.message}`);
  }
}

main().catch((error) => {
  setFailed(error instanceof Error ? error.message : String(error));
});
