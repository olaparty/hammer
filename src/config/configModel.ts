import { FileModel } from './fileModel';

export interface ConfigModel {
    configPath: string;
    modulePath: string;
    organization?: string;
    protoPackagePath?: string;
    projectId: number;
    directoryId: number;
    apiKey: string;
    branch?: string;
    basePath?: string;
    files: FileModel[];
}