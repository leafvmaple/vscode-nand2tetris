"use strict";
import * as vscode from "vscode";
import { basename } from "path";
import { print } from "util";

export class Commands implements vscode.Disposable {
    private EXTENSION_NAME = "leafvmaple.nand2tetris";
    private LANGUAGE_NAME  = "Nand2Teteris";
    private outputChannel: vscode.OutputChannel;
    private terminal: vscode.Terminal;
    private config: vscode.WorkspaceConfiguration;
    private platform: string;
    private extensionPath: string;
    private n2tComands: string;
    private isRunning: boolean;
    private isSuccess: boolean;
    private process;

    constructor() {
        let symbol;

        this.platform = process.platform;
        switch (this.platform) {
        case "win32":
            symbol = ";";
            break;
        case "linux":
            symbol = ":";
            break;
        case "darwin":
            symbol = ":";
            break;
        }
        this.outputChannel = vscode.window.createOutputChannel(this.LANGUAGE_NAME);
        this.terminal = vscode.window.createTerminal(this.LANGUAGE_NAME);

        this.extensionPath = vscode.extensions.getExtension(this.EXTENSION_NAME).extensionPath;
        this.n2tComands = "java -classpath \"${CLASSPATH}" + symbol
                        + this.extensionPath + symbol
                        + this.extensionPath + "/bin/classes" + symbol
                        + this.extensionPath + "/bin/lib/Hack.jar" + symbol
                        + this.extensionPath + "/bin/lib/HackGUI.jar" + symbol
                        + this.extensionPath + "/bin/lib/Simulators.jar" + symbol
                        + this.extensionPath + "/bin/lib/SimulatorsGUI.jar" + symbol
                        + this.extensionPath + "/bin/lib/Compilers.jar\" HardwareSimulatorMain ";
    }

    public executeCommand(fileName: string): void {
        if (this.isRunning) {
            vscode.window.showInformationMessage("Code is already running!");
            return;
        }
        this.config = vscode.workspace.getConfiguration("nand2tetris");
        if (this.config.get<boolean>("runInTerminal")) {
            this.executeCommandInTerminal(fileName);
        } else {
            this.executeCommandInOutputChannel(fileName);
        }
    }

    public executeCommandInTerminal(fileName: string): void {
        if (this.config.get<boolean>("clearPreviousOutput")) {
            vscode.commands.executeCommand("workbench.action.terminal.clear");
        }
        this.terminal.show(this.config.get<boolean>("preserveFocus"));
        this.terminal.sendText(`cd "${this.extensionPath}"`);
        this.terminal.sendText(this.n2tComands + fileName);
    }

    public executeCommandInOutputChannel(fileName: string): void {
        if (this.config.get<boolean>("clearPreviousOutput")) {
            this.outputChannel.clear();
        }
        this.isRunning = true;
        this.isSuccess = false;
        this.outputChannel.show(this.config.get<boolean>("preserveFocus"));
        this.outputChannel.appendLine(`[Running] ${basename(fileName, `.tst`)}.hdl`);
        const exec = require("childprocess").exec;
        const startTime = new Date();
        this.process = exec(this.n2tComands + fileName, { cwd: this.extensionPath });

        this.process.stdout.on("data", (data) => {
            if (data.match("successfully")) {
                this.isSuccess = true;
            }
            this.outputChannel.append(data);
        });

        this.process.stderr.on("data", (data) => {
            this.outputChannel.append(data);
        });

        this.process.on("close", (code) => {
            this.isRunning = false;
            const endTime = new Date();
            const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
            this.outputChannel.appendLine(`[Done] Comparison ${(this.isSuccess ? `Successfully` : `Failure`)}
                                            with code=${code} in ${elapsedTime} seconds`);
            this.outputChannel.appendLine("");
        });
    }

    public stop() {
        if (this.isRunning) {
            this.isRunning = false;
            const kill = require("tree-kill");
            kill(this.process.pid);
        }
    }

    public dispose() {
    }
}
