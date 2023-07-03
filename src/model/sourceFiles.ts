export interface SourceFiles {
    sourcePattern: string;
    translationPattern: string;
    directoryPattern?: string;
    files: string[];
    languageMapping: {
        two_letters_code: {string: string}
    }
    dest: string;
}