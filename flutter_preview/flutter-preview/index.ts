import fs from "fs-extra";
import glob from "glob";
import tmp from "tmp";
import path from "path";
import { mkdirp } from "mkdirp";
import rimraf from "rimraf";
import mustache from "mustache";
import ast, { DartImport } from "flutter-ast";
import * as pubspec from "./pubspec";
import * as yaml from 'js-yaml';
import {
  AppEventMap,
  FlutterProject,
  IFlutterRunnerClient,
} from "@flutter-daemon/server";
import * as templates from "./templates";
import * as he from 'he';
import { symlink, symlinkSync } from "fs";

interface IFlutterPreviewWidgetClass {
  /**
   * relative path to the widget file, e.g. './src/demo.dart'
   */
  readonly path: string;

  /**
   * the widget class name, e.g. 'Demo'
   */
  readonly identifier: string;

  text: string;

  /**
   * the imported source files, e.g. ['package:flutter/material.dart']
   */
  imports: DartImport[];

  /**
   * the widget class start offset in the file
   */
  offset: number;

  /**
   * the widget class end offset in the file
   */
  end: number;
}

class FlutterPreviewWidgetClass implements IFlutterPreviewWidgetClass {
  // private _cached: IFlutterPreviewWidgetClass;

  get text() {
    const _text = fs.readFileSync(this.path, "utf-8");
    return _text;
  }

  path: string;
  identifier: string;
  constructorName: string;
  param: string;

  get imports(): DartImport[] {
    // TODO: add caching
    return ast.parse(this.text).file.imports;
  }

  get offset() {
    // TODO: add caching
    return ast
      .parse(this.text)
      .file.classes.find((c) => c.name === this.identifier).offset;
  }

  get end() {
    // TODO: add caching
    return ast
      .parse(this.text)
      .file.classes.find((c) => c.name === this.identifier).end;
  }

  get initializationName() {
    return initializationNameOf({
      class: this.identifier,
      constructor: this.constructorName,
    });
  }


  constructor({ path, identifier, constructor, param }: ITargetIdentifier) {
    this.path = path;
    this.identifier = identifier;
    this.constructorName = constructor;
    this.param = param;
  }

  static from(p: ITargetIdentifier) {
    return new FlutterPreviewWidgetClass(p);
  }
}

export class FlutterPreviewProject implements IFlutterRunnerClient {
  /**
   * the origin path of the project, where the pubspec.yaml file is located
   */
  readonly origin: string;

  /**
   * the root path of the project, where the pubspec.yaml file is copied to
   */
  readonly root: string;

  private m_target: FlutterPreviewWidgetClass;

  /**
   * A path to a tmp file used to proxy a origin main.dart file.
   */
  private readonly originMainProxy: string;

  readonly client: FlutterProject;

  private targetProjectPath: string = '/Users/olachat/Downloads/DevSpaces/partying-app';

  // <depName,path>
  // private dependencyMap = new Map<string,string>(); 

  constructor({
    origin,
    target,
  }: {
    origin: string;
    target: ITargetIdentifier;
  }) {
    this.origin = origin;

    this.root = tmp.dirSync({
      keep: false,
      unsafeCleanup: true,
    }).name;

    this.originMainProxy =
      // create new random file (valid dart file) on the same directory as the main.dart
      tmp.tmpNameSync({
        dir: path.dirname(this.main),
      }) + ".dart";

    this.targetProjectPath = this.findMainDart(this.origin);
    console.log('origin project root path', this.targetProjectPath);

    this.target(target);

    // initially clone the files to new virtual project
    this.__initial_clone(); // uses copy -> this may change to symlink in the future
    this.resolve_assets(); // uses symlink

    // target the widget (modifies the lib/main.dart)
    // this.target(target);
    this.override_main_dart();

    this.client = FlutterProject.at(this.root);

    this.logstatus();
  }

  logstatus() {
    console.info({
      origin: this.origin,
      root: this.root,
      main: this.main,
      target: this.m_target,
    });
  }

  private findMainDart(currentPath: string): string | null {
    const mainDartPath = path.join(currentPath, 'lib/main.dart');
    console.log('recursive parent path:', mainDartPath);

    if (fs.existsSync(mainDartPath)) {
      return mainDartPath.replace('lib/main.dart', '');
    }

    const parentDir = path.dirname(currentPath);

    // Check if we've reached the root directory
    if (parentDir === currentPath) {
      return null; // Main.dart not found
    }

    return this.findMainDart(parentDir); // Recursively go up one directory
  }

  private __initial_clone() {
    // copy the files to the root (write files)
    console.log('safe sym lnk target', path.join(this.origin, this.m_target.path));
    safeSymlink(path.join(this.origin, this.m_target.path), this.originMainProxy);
    safeSymlink(path.join(this.targetProjectPath, 'lib'), path.join(this.root, 'lib_main/lib'));
    safeSymlink(path.join(this.targetProjectPath, 'banban_base'), path.join(this.root, 'lib_main/banban_base'));
    safeSymlink('./templates/pubspec_init.yaml', path.join(this.root, 'lib_main/pubspec.yaml'));
    this.initialCloneTargets.forEach((file) => {
      const originfile = path.join(this.origin, file);
      // if file is main.dart connect to a special file.
      if (this.abspath(file) === this.main) {
        // symlink the main.dart to the originMainProxy filedart_tool/package_config.json
        // safeSymlink(originfile, this.originMainProxy);
      } else {
        const target = path.join(this.root, file);
        safeSymlink(originfile, target);
      }
    });

    console.log('pub test view', this.originMainProxy);
    console.log('pub test view', this.origin);
    console.log('pub test view', this.main);

    // analyse the temp dart file to get related import
    // const imports = this.m_target.imports;
    const _text = fs.readFileSync(this.originMainProxy, "utf-8");
    const imports = ast.parse(_text).file.imports;
    const importString = [];
    console.log('pub test', imports);
    imports.forEach((element) => {
      var fullPathUri = this.trackImports(element.uri);
      if (fullPathUri !== '') {
        importString.push(element.uri);
      }
    });
    console.log('pub test importString', importString);



    // make pubspec file with needed imports as external_lib
    const originPubspec = pubspec.parse(fs.readFileSync(path.join(this.origin, 'pubspec.yaml'), "utf-8"));
    // set up the common override dependency
    if (!originPubspec.dependency_overrides) {
      originPubspec.dependency_overrides = {};
    }
    originPubspec.dependency_overrides['path_provider'] = '2.0.14'
    originPubspec.dependency_overrides['permission_handler'] = { path: './lib_main/banban_base/bbcore/.vendors/permission_handler/' }
    originPubspec.dependency_overrides['plugin_platform_interface'] = '2.1.2'
    originPubspec.dependency_overrides['device_info_plus_platform_interface'] = '2.3.0+1'
    originPubspec.dependency_overrides['flame'] = { path: './lib_main/banban_base/bbgame/bbgame_uno/packages/flame-1.1.1/' }
    originPubspec.dependency_overrides['extended_tabs'] = '4.0.1'
    originPubspec.dependency_overrides['image'] = '4.0.15'
    originPubspec.dependency_overrides['flutter_svg'] = { git: { url: 'git@github.com:olaola-chat/flutter_svg.git', ref: '0.0.1' } }
    console.log('pub test resolution', originPubspec.dependencies);
    originPubspec.dependencies = {};
    // for (const dependencyName in originPubspec.dependencies) {
      // console.log('pub test dep name', originPubspec.dependencies[dependencyName]);
      // if ((originPubspec.dependencies[dependencyName] as any).path != null) {
      //   console.log('.. path', (originPubspec.dependencies[dependencyName] as any).path);
      //   (originPubspec.dependencies[dependencyName])['path'] = path.join(this.origin, (originPubspec.dependencies[dependencyName] as any).path);
      //   console.log('.. path final', path.join(this.origin, (originPubspec.dependencies[dependencyName] as any).path));
      //   // originPubspec.dependencies[dependencyName].toString().replace('../','./');
      // }
    // }
    // add main project pubspec ref for init purpose
    originPubspec.dependencies['banban'] = { path: this.targetProjectPath }
    console.log('pub test originPubspec', originPubspec);
    const newpubspecString = yaml.dump(originPubspec);
    const pubspecPath = path.join(this.main, '../../pubspec.yaml');
    console.log('pub test final', pubspecPath);
    fs.writeFileSync(pubspecPath, newpubspecString, 'utf-8');
  }

  private fileExists(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.F_OK); // Check if the file exists
      return true;
    } catch (error) {
      return false;
    }
  }


  private trackImports(imp: string): string {
    console.log('pub error', imp);
    var libName = '';
    if (imp.includes('package')) {
      libName = imp.split('package:')[1].split('/')[0];
    }
    const packageConfigPath = path.join(this.targetProjectPath, '.dart_tool/package_config.json');
    // const packageConfigPath = path.join(this.origin, '.dart_tool/package_config.json');
    console.log('pub test packageConfigPath', packageConfigPath);
    const packageConfigContent = fs.readFileSync(packageConfigPath, "utf-8");
    const packageConfigJson = JSON.parse(packageConfigContent);
    const packages = packageConfigJson.packages;
    if (packages != null && Array.isArray(packages)) {
      for (const pack of packages) {
        const packageName = pack.name;
        const packageUri = pack.rootUri;
        if (packageName === libName) {
          const atFile = path.join(this.originMainProxy, path.join('../', packageName));
          console.log('pub test safesymlink target path', packageUri);
          console.log('pub test safesymlink atpath', atFile);
          if (!this.fileExists(atFile) && packageName != 'flutter') {
            safeSymlink(packageUri, atFile);
          }
          return packageUri;
        }
      }
    }
    return '';
  }

  private abspath(p: string) {
    if (path.isAbsolute(p)) {
      return p;
    }
    return path.join(this.root, p);
  }

  private decodeHtmlEntities(encodedString: string): string {
    return he.decode(encodedString);
  }

  /**
   * override the main.dart file since we cannot customize the entry file for the daemon proc
   */
  private override_main_dart() {
    // if - the target is inside the main.dart file, we need to copy the main.dart content to X, remove the `void main() {}`, re-import the X from the newly seeded main.dart file.
    // else - the target is elsewhere from the main.dart file (normal case)

    // const mainsrc = fs.readFileSync(this.originMainProxy, "utf-8");
    // const { imports } = ast.parse(mainsrc).file;

    const _seed_imports = new Set([
      // default imports
      "package:flutter/material.dart",
      // TODO: add main imports later... (disabling it to test the speed of initial compilation)
      // ...imports,
    ]);

    const target = this.m_target.path;

    if (
      // if the target is the main.dart file
      target == "main.dart" ||
      target == "lib/main.dart"
    ) {
      // add the copied main file as import
      // make it relative to lib/main.dart -> e.g. 'xxx_tmp_xxx.dart'
      _seed_imports.add(
        path.relative(
          path.join(this.root, "./lib"),
          path.join(this.originMainProxy)
        )
      );
    } else {
      // read & analyze the main entry file

      // add the target node as import
      // make it relative to lib/main.dart -> e.g. './src/demo.dart'
      console.log('mustache render Path:', path.relative(path.join(this.root, "./lib"), this.abspath(target)));
      // var realPpathath =  fs.realpath(path.relative(path.join(this.root, "./lib"), this.abspath(target)));
      // console.log('mustache render realPath:', realPath);
      _seed_imports.add(
        path.relative(path.join(this.root, "./lib"), this.abspath(target))
      );
    }

    // render the template
    console.log('mustache render imports:', _seed_imports);
    const main_dart_src = mustache.render(templates.main_dart_mustache, {
      imports: Array.from(_seed_imports),
      title: "Preview - " + this.m_target.identifier,
      widget: this.m_target.initializationName,
      param: this.m_target.param,
    });

    console.log('mustache render whole template:', this.decodeHtmlEntities(main_dart_src).replace('&#39;', '"'));

    // write the file
    fs.writeFileSync(this.main, this.decodeHtmlEntities(main_dart_src).replace('&#39;', '"'));
  }

  private symLinkFolderRecursiveSync(source: string, target: string) {
    if (!fs.existsSync(target)) {
      mkdirp.sync(target);
    }

    const files = fs.readdirSync(source);

    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);

      const isDirectory = fs.lstatSync(sourcePath).isDirectory();

      if (isDirectory) {
        fs.mkdirSync(target);
        this.symLinkFolderRecursiveSync(sourcePath, targetPath);
      } else {
        safeSymlink(sourcePath, targetPath);
      }
    }
  }

  private resolve_assets() {

    const origin = path.join(this.targetProjectPath, 'assets');
    const target = path.join(this.root, 'lib_main/assets');
    symlinkSync(origin, target);
    // if the pubspec.yaml file has assets, copy them to the root (in this case, we can use symlinks)
    // Learn more about the spec - https://docs.flutter.dev/development/tools/pubspec
    //
    // e.g.
    //
    // flutter:
    //    assets:
    //      - assets/<file>
    //    fonts:
    //      - family: NotoSans
    //        fonts:
    //          - asset: assets/fonts/NotoSans-Regular.ttf
    //  ....

    const files = [...this.assets, ...this.fontFiles];
    // console.log('files listed', files);

    files.forEach((asset) => {
      const origin = path.join(this.origin, asset);
      const target = path.join(this.root, asset);

      // create a symlink
      this.symLinkFolderRecursiveSync(origin, target);
      // safeSymlink(origin, target);
    });
  }

  /**
   * the main entry file, e.g. '~/root/lib/main.dart'
   *
   * @default path.join(this.root, './lib/main.dart')
   */
  get main(): string {
    return mainDartFileOf(this.root);
  }

  get pubspecFile(): string {
    return path.join(this.root, "./pubspec.yaml");
  }

  get pubspec(): pubspec.Pubspec {
    return pubspec.parse(fs.readFileSync(this.pubspecFile, "utf-8"));
  }

  get initialCloneTargets() {
    return [
      ...this.srcfiles,
      // web
      ...glob.sync("web/**/*", { cwd: this.origin, nodir: true }),
      // artifacts - .dart_tool
      ...glob.sync(".dart_tool/**/*", { cwd: this.origin, nodir: true }),
      // artifacts - build/web
      ...glob.sync("build/web/**/*", { cwd: this.origin, nodir: true }),
    ];
  }

  get srcfiles() {
    return [
      // pubspec.yaml
      // ...glob.sync("pubspec.yaml", { cwd: this.origin }),
      // lib files
      ...glob.sync("lib/**/*", { cwd: this.origin, nodir: true }),
    ];
  }

  get assets(): string[] {
    return this.pubspec.flutter?.assets ?? [];
  }

  get fontFiles() {
    return (
      this.pubspec.flutter?.fonts
        ?.map((font) => font.fonts)
        ?.flat()
        ?.map((font) => font.asset) ?? []
    );
  }

  /**
   * sync the project to the target widget using symlink
   */
  sync() {
    console.log(this.srcfiles);

    // fs.symlinkSync(this.origin, this.root, "dir");
  }

  target({ path: _path, ...others }: ITargetIdentifier) {
    let relative: string;
    // if target is main.dart
    if (
      path.isAbsolute(_path)
        ? // if absolute path, check if the target is main.dart under the <origin>/lib/main.dart
        mainDartFileOf(this.origin) === _path
        : // if relative path, check if the target is "main.dart" or "./main.dart"
        _path === "main.dart" || _path === "./main.dart"
    ) {
      relative = "main.dart";
    } else {
      // if the target is a absolute path under origin project
      if (_path.startsWith(this.origin)) {
        relative = path.relative(path.join(this.origin, "./lib"), _path);
      }
      // if the target is a absolute path under this project
      else if (_path.startsWith(this.root)) {
        relative = path.relative(this.abspath("./lib"), this.abspath(_path));
      }
      // if the target is a relative path
      else {
        relative = path.relative(this.abspath("./lib"), this.abspath(_path));
      }
    }

    this.m_target = FlutterPreviewWidgetClass.from({
      // if the path is absolute, then use make it relative to the origin
      path: path.isAbsolute(_path) ? path.relative(this.origin, _path) : _path,
      ...others,
    });

  }

  // #region IFlutterRunnerClient
  run(): Promise<unknown> {
    return this.client.run();
  }
  appId(): Promise<string> {
    return this.client.appId();
  }
  webLaunchUrl(): Promise<string> {
    return this.client.webLaunchUrl();
  }
  save(): Promise<unknown> {
    return this.client.save();
  }
  stop(): void {
    return this.client.stop();
  }
  on<K extends keyof AppEventMap>(
    type: K,
    callback: (e: AppEventMap[K]) => void
  ) {
    return this.client.on(type, callback);
  }
  onEvent(cb: (type: any, event: any) => void): void {
    return this.client.onEvent(cb);
  }
  kill(): void {
    return this.client.kill();
  }
  async restart() {
    await this.override_main_dart();
    return this.client.restart();
  }
  // #endregion IFlutterRunnerClient

  rimraf() {
    // remove the root directory (recursively)
    rimraf.sync(this.root);
  }
}

function initializationNameOf({
  class: _class,
  constructor: _constructor,
}: {
  class: string;
  constructor: string;
}) {
  if (_class === _constructor) {
    return _constructor;
  } else {
    return `${_class}.${_constructor}`;
  }
}

function mainDartFileOf(project: string) {
  return path.join(project, "./lib/main.dart");
}

function safeSymlink(target: string, at: string) {
  // handle ENOENT: no such file or directory
  // handle ENOENT: no such file or directory, mkdir
  // the above error can happen if the target file is nested inside a folder
  try {
    mkdirp.sync(path.dirname(at));
    fs.symlinkSync(target, at);
  } catch (e) {
    console.log('mkdir err', e);
  }

}

function removeMainMethod(src: string) {
  // while copying the content, remove the `void main() {}` part
  const main_method = ast
    .parse(src)
    .file.methods.find((m) => m.name === "main");

  const { offset, end } = main_method;

  const newsrc = src.slice(0, offset) + src.slice(end);

  return newsrc;
}

export interface ITargetIdentifier {
  path: string;
  identifier: string;
  constructor: string;
  param: string;
}
