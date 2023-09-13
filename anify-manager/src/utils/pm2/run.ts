import { runCommands } from "../../config";
import { promisify } from "util";
import fs from "fs";
import { runningProcesses } from ".";
import { spawn } from "node:child_process";

interface BuildDetail {
    error?: string;
    data?: string;
}

const run = async (folderName: string): Promise<BuildDetail[]> => {
    const builds = (await promisify(fs.readdir)("./builds")) as any[];
    const buildStats = await Promise.all(builds.map((build) => promisify(fs.stat)(`./builds/${build}`)));
    const latestBuild = folderName ?? builds[buildStats.filter((stat: any) => stat.isDirectory()).length - 1];

    const keys = Object.keys(runCommands);
    const buildDetails: BuildDetail[] = [];

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = runCommands[key];

        await new Promise<void>((resolve, reject) => {
            // Startup process
            const childProcess = spawn("pnpm", value.split(" "), {
                cwd: `./builds/${latestBuild}/${key}`,
                detached: true
            });

            childProcess.unref();

            runningProcesses.set(latestBuild + "-" + key, childProcess);

            childProcess.stdout.on("data", (data) => {
                buildDetails.push({ data: data.toString() });
            });

            childProcess.on("error", (err) => {
                console.error(err);
                buildDetails.push({ error: err.message });
            });

            buildDetails.push({ data: `running ${latestBuild}, ${key}` });

            resolve()
        });
    }

    return buildDetails;
};

export default run;