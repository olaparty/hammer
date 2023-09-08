import * as pubspec from 'pubspec';
import { IFlutterRunnerClient, FlutterProject, AppEventMap } from '@flutter-daemon/server';

declare class FlutterPreviewProject implements IFlutterRunnerClient {
    /**
     * the origin path of the project, where the pubspec.yaml file is located
     */
    readonly origin: string;
    /**
     * the root path of the project, where the pubspec.yaml file is copied to
     */
    readonly root: string;
    private m_target;
    /**
     * A path to a tmp file used to proxy a origin main.dart file.
     */
    private readonly originMainProxy;
    readonly client: FlutterProject;
    constructor({ origin, target, }: {
        origin: string;
        target: ITargetIdentifier;
    });
    logstatus(): void;
    private __initial_clone;
    private fileExists;
    private trackImports;
    private abspath;
    private decodeHtmlEntities;
    /**
     * override the main.dart file since we cannot customize the entry file for the daemon proc
     */
    private override_main_dart;
    private symLinkFolderRecursiveSync;
    private resolve_assets;
    /**
     * the main entry file, e.g. '~/root/lib/main.dart'
     *
     * @default path.join(this.root, './lib/main.dart')
     */
    get main(): string;
    get pubspecFile(): string;
    get pubspec(): pubspec.Pubspec;
    get initialCloneTargets(): string[];
    get srcfiles(): string[];
    get assets(): string[];
    get fontFiles(): string[];
    /**
     * sync the project to the target widget using symlink
     */
    sync(): void;
    target({ path: _path, ...others }: ITargetIdentifier): void;
    run(): Promise<unknown>;
    appId(): Promise<string>;
    webLaunchUrl(): Promise<string>;
    save(): Promise<unknown>;
    stop(): void;
    on<K extends keyof AppEventMap>(type: K, callback: (e: AppEventMap[K]) => void): any;
    onEvent(cb: (type: any, event: any) => void): void;
    kill(): void;
    restart(): any;
    rimraf(): void;
}
interface ITargetIdentifier {
    path: string;
    identifier: string;
    constructor: string;
    param: string;
}

export { FlutterPreviewProject, ITargetIdentifier };
