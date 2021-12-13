import { ChildProcess, execFile, ExecOptions } from "child_process";

import { Logger } from "./logger";

export const execute = async (
    command: string,
    args: string[],
    options: ExecOptions = {},
    throwError: boolean = false,
): Promise<string> => {
    Logger.write("command", `${command} ${args.join(" ")}`);

    let execution: ChildProcess;

    try {
        execution = execFile(command, args, { ...options, encoding: "utf8" });
    } catch (err) {
        //@ts-ignore
        Logger.error(err);
        if (throwError) {
            throw err;
        }
        return "";
    }

    let data = "";

    for await (const chunk of execution?.stdout ?? []) {
        data += chunk;
    }

    if (throwError) {
        let error = "";
        for await (const chunk of execution?.stderr ?? []) {
            error += chunk;
        }

        throw new Error(error);
    }


    return data.trim();
}
