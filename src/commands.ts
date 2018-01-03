"use strict";
import { basename, join, parse } from "path";
import { print } from "util";
import * as vscode from "vscode";

export class Commands implements vscode.Disposable {
    private EXTENSION_NAME = "leafvmaple.nand2tetris";
    private LANGUAGE_NAME  = "Nand2Teteris";
    private outputChannel: vscode.OutputChannel;
    private terminal: vscode.Terminal;
    private config: vscode.WorkspaceConfiguration;
    private document: vscode.TextDocument;
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

    public async executeCommand(fileUri: vscode.Uri) {
        if (this.isRunning) {
            vscode.window.showInformationMessage("Code is already running!");
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (fileUri && editor && fileUri.fsPath !== editor.document.uri.fsPath) {
            this.document = await vscode.workspace.openTextDocument(fileUri);
        } else if (editor) {
            this.document = editor.document;
        } else {
            vscode.window.showInformationMessage("No code found or selected.");
            return;
        }

        const filePath = parse(this.document.fileName);
        const fileName = join(filePath.dir, filePath.name + ".tst");
        this.config = vscode.workspace.getConfiguration("nand2tetris");

        const runInTerminal = this.config.get<boolean>("runInTerminal");
        const clearPreviousOutput = this.config.get<boolean>("clearPreviousOutput");
        const preserveFocus = this.config.get<boolean>("preserveFocus");
        if (runInTerminal) {
            this.executeCommandInTerminal(fileName, clearPreviousOutput, preserveFocus);
        } else {
            this.executeCommandInOutputChannel(fileName, clearPreviousOutput, preserveFocus);
        }
    }

    public executeOpenCommand(): void {
        this.terminal.sendText(`cd "${this.extensionPath}"`);
        this.terminal.sendText(this.n2tComands);
    }

    public executeCommandInTerminal(fileName: string, clearPreviousOutput, preserveFocus): void {
        if (clearPreviousOutput) {
            vscode.commands.executeCommand("workbench.action.terminal.clear");
        }
        this.terminal.show(preserveFocus);
        this.terminal.sendText(`cd "${this.extensionPath}"`);
        this.terminal.sendText(this.n2tComands + fileName);
    }

    public executeCommandInOutputChannel(fileName: string, clearPreviousOutput, preserveFocus): void {
        if (clearPreviousOutput) {
            this.outputChannel.clear();
        }
        this.isRunning = true;
        this.isSuccess = false;
        this.outputChannel.show(preserveFocus);
        this.outputChannel.appendLine(`[Running] ${basename(fileName, `.tst`)}.hdl`);
        const exec = require("child_process").exec;
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
            this.outputChannel.appendLine(`[Done] Comparison ${(this.isSuccess ?
                                          `Successfully` : `Failure`)} with code=${code} in ${elapsedTime} seconds`);
            this.outputChannel.appendLine("");
        });
    }

    public stopCommand() {
        if (this.isRunning) {
            this.isRunning = false;
            const kill = require("tree-kill");
            kill(this.process.pid);
        }
    }

    public dispose() {
        this.stopCommand();
    }
}
