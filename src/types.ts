export enum FileType {
  EMOJI = "emoji",
  FONT = "font",
  TEXTURE = "texture",
}

export interface File {
  type: FileType;
  name: string;
}

export interface FileWithContent extends File {
  content: unknown;
}

export interface ValidationIssue {
  type: "warning" | "error";
  file: File;
  message: string;
}

export interface ValidatorReturn {
  issues?: ValidationIssue[];
  remove?: File[];
  update?: FileWithContent[];
}

export type Validator = (files: File[]) => ValidatorReturn;
export type ValidatorWithContent = (files: FileWithContent[]) => ValidatorReturn;
