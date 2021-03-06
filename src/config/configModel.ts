import { FileModel } from './fileModel';

export interface ConfigModel {
    configPath: string;
    organization?: string;
    projectId: number;
    directoryId: number;
    apiKey: string;
    branch?: string;
    basePath?: string;
    files: FileModel[];
}