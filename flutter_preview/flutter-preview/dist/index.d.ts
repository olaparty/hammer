import { IFlutterRunnerClient, FlutterProject, AppEventMap } from '@flutter-daemon/server';

type PackageVersion = string;
type PackagePath = {
    path: string;
};
type PackageResolution = PackageVersion | PackagePath | GitPath;
type GitPath = {
    git: {
        url: string;
        ref: string;
    };
};
type Dependencies = {
    [key: string]: PackageResolution;
};
type DartEnvironment = {
    sdk: string;
    flutter?: string;
    [key: string]: string;
};
type DartExecutable = {
    [key: string]: string | null;
};
type DartPlatforms = {
    android?: string | null;
    ios?: string | null;
    linux?: string | null;
    macos?: string | null;
    web?: string | null;
    windows?: string | null;
    [key: string]: string | null;
};
type PubPublishTo = "none" | string;
interface Pubspec {
    /**
     * Required for every package. [Learn more.](https://dart.dev/tools/pub/pubspec#name)
     */
    name?: string;
    /**
     * Required for packages that are hosted on the pub.dev site. [Learn more.](https://dart.dev/tools/pub/pubspec#version)
     */
    version?: string;
    /**
     * Required for packages that are hosted on the pub.dev site. [Learn more.](https://dart.dev/tools/pub/pubspec#description)
     */
    description?: string;
    /**
     * Optional. URL pointing to the package’s homepage (or source code repository). [Learn more.](https://dart.dev/tools/pub/pubspec#homepage)
     */
    homepage?: string;
    /**
     * Optional. URL pointing to the package’s source code repository. [Learn more.](https://dart.dev/tools/pub/pubspec#repository)
     */
    repository?: string;
    /**
     * Optional. URL pointing to the package’s issue tracker. [Learn more.](https://dart.dev/tools/pub/pubspec#issue_tracker)
     */
    issue_tracker?: string;
    /**
     * Optional. URL pointing to documentation for the package. [Learn more.](https://dart.dev/tools/pub/pubspec#documentation)
     */
    documentation?: string;
    /**
     * Can be omitted if your package has no dependencies. [Learn more.](https://dart.dev/tools/pub/pubspec#dependencies)
     */
    dependencies?: Dependencies;
    /**
     * Can be omitted if your package has no dev dependencies. [Learn more.](https://dart.dev/tools/pub/pubspec#dependencies)
     */
    dev_dependencies?: Dependencies;
    /**
     * Can be omitted if you do not need to override any dependencies. [Learn more.](https://dart.dev/tools/pub/pubspec#dependencies)
     */
    dependency_overrides?: Dependencies;
    /**
     * Required as of Dart 2. [Learn more.](https://dart.dev/tools/pub/pubspec#sdk-constraints)
     */
    environment?: DartEnvironment;
    /**
     * Optional. Used to put a package’s executables on your PATH.
     */
    executables?: DartExecutable;
    platforms?: DartPlatforms;
    publish_to?: PubPublishTo;
    false_secrets?: Array<string>;
    flutter?: PubspecFlutterSpec;
}
interface PubspecFlutterSpec {
    "uses-material-design": boolean;
    generate: boolean;
    assets: Array<string>;
    fonts: Array<{
        family: string;
        fonts: Array<{
            asset: string;
            weight?: number;
            style?: "normal" | "italic";
        }>;
    }>;
}

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
    private targetProjectPath;
    constructor({ origin, target, }: {
        origin: string;
        target: ITargetIdentifier;
    });
    logstatus(): void;
    private findMainDart;
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
    get pubspec(): Pubspec;
    get initialCloneTargets(): any[];
    get srcfiles(): any[];
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
    restart(): Promise<any>;
    rimraf(): void;
}
interface ITargetIdentifier {
    path: string;
    identifier: string;
    constructor: string;
    param: string;
}

export { FlutterPreviewProject, ITargetIdentifier };
