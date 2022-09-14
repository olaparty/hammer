import * as child_process from "child_process";
import * as path from "path";
import { CommonUtil } from './commonUtil';
import * as stream from "stream";

export type SpawnedProcess = child_process.ChildProcess & {
	stdin: stream.Writable,
	stdout: stream.Readable,
	stderr: stream.Readable,
};

export function safeSpawn(workingDirectory: string | undefined, binPath: string, args: string[], env: { [key: string]: string | undefined } | undefined): SpawnedProcess {
	const quotedArgs = args.map(quoteAndEscapeArg);
	const customEnv = Object.assign({}, process.env, env);
	return child_process.spawn(`"${binPath}"`, quotedArgs, { cwd: workingDirectory, env: customEnv, shell: true }) as SpawnedProcess;
}

function quoteAndEscapeArg(arg: string) {
	// Spawning processes on Windows with funny symbols in the path requires quoting. However if you quote an
	// executable with a space in its path and an argument also has a space, you have to then quote _all_ of the
	// arguments!
	// https://github.com/nodejs/node/issues/7367
	let escaped = arg.replace(/"/g, `\\"`);
	// Additionally, on Windows escape redirection symbols with ^
	// if (isWin)
	// 	escaped = escaped.replace(/([<>])/g, "^$1");
	return `"${escaped}"`;
}

export class RunProcessResult {
	constructor(public readonly exitCode: number | undefined, public readonly stdout: string, public readonly stderr: string) { }
}

export function runProcess(binPath: string, args: string[], workingDirectory: string | undefined, env: { [key: string]: string | undefined } | undefined, spawn: SpawnFunction): Promise<RunProcessResult> {
	return new Promise((resolve) => {
		// logger.info(`Spawning ${binPath} with args ${JSON.stringify(args)} in ${workingDirectory} with env ${JSON.stringify(env)}`);
		const proc = spawn(workingDirectory, binPath, args, env);

		const out: string[] = [];
		const err: string[] = [];
		proc.stdout.on("data", (data: Buffer) => out.push(data.toString()));
		proc.stderr.on("data", (data: Buffer) => err.push(data.toString()));
		proc.on("exit", (code: any) => {
			resolve(new RunProcessResult(CommonUtil.nullToUndefined(code), out.join(""), err.join("")));
		});
	});
}

type SpawnFunction = (workingDirectory: string | undefined, binPath: string, args: string[], env: { [key: string]: string | undefined } | undefined) => SpawnedProcess;


export interface ExecutionInfo {
	executable: string;
	args: string[];
}
