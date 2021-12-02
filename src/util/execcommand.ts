import { ChildProcess, execFile, ExecOptions } from "child_process";

import { Logger } from "./logger";

export const execute = async (
    command: string,
    args: string[],
    options: ExecOptions = {},
): Promise<string> => {
    Logger.write("command", `${command} ${args.join(" ")}`);

    let execution: ChildProcess;

    try {
        execution = execFile(command, args, { ...options, encoding: "utf8" });
    } catch (err) {
        //@ts-ignore
        Logger.error(err);
        return "";
    }

    let data = "";

    for await (const chunk of execution?.stdout ?? []) {
        data += chunk;
    }

    return data.trim();
}
