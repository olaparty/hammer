import { SourceFilesModel } from '@crowdin/crowdin-api-client';

export interface FileModel {
    source: string;
    translation: string;
    directory?: string;
    updateOption?: SourceFilesModel.UpdateOption;
    excludedTargetLanguages?: string[];
    labels?: string[];
    scheme?: Scheme;
    languageMapping: {
        two_letters_code: {string: string}
    }
    dest: string;
}

export interface Scheme {
    [key: string]: number;
}