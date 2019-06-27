"use strict";
import { basename, join, parse } from "path";
import * as vscode from "vscode";
import { zip } from "compressing";

export class Commands implements vscode.Disposable {
    private EXTENSION_NAME = "leafvmaple.nand2tetris";
    private LANGUAGE_NAME  = "Nand2Teteris";
    private PROJECT_DIR = ["1", "2", "3"];
    private outputChannel: vscode.OutputChannel;
    private terminal: vscode.Terminal;
    private config: vscode.WorkspaceConfiguration;
    private document: vscode.TextDocument;
    private platform: string;
    private extensionPath: string;
    private n2tComands: string;
    private isRunning: boolean;
    private isCompressing: boolean;
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
            this.outputChannel.appendLine(data);
        });

        this.process.stderr.on("data", (data) => {
            if (data.match("java")) {
                data = "You need to install [Java Runtime Environment] First.";
            }
            this.outputChannel.appendLine(data);
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

    public async zipCommand() {
        if (this.isCompressing) {
            vscode.window.showInformationMessage("Already Compressing!");
            return;
        }

        const promptOptions = {
            prompt: 'WakaTime Api Key',
            placeHolder: "Enter your folder name that want to compress.",
            value: "1",
            ignoreFocusOut: true,
            validateInput: function(text){return text;}
        };

        let projectName;
        vscode.window.showInputBox(promptOptions).then(val => {
            projectName = val;
        });

        this.document = vscode.window.activeTextEditor.document;
        const filePath = parse(this.document.fileName).dir;
        const dirArr = filePath.split('/').filter(_=> _).reverse();

        if (this.PROJECT_DIR.find(s => s === dirArr[0])) {
            projectName = dirArr[0];
        } else if ((dirArr[0] === "a" || dirArr[0] === "b") && this.PROJECT_DIR.find(s => s === dirArr[1])) {
            projectName = dirArr[1];
        }

        this.config = vscode.workspace.getConfiguration("nand2tetris");

        const runInTerminal = this.config.get<boolean>("runInTerminal");
        const clearPreviousOutput = this.config.get<boolean>("clearPreviousOutput");
        const preserveFocus = this.config.get<boolean>("preserveFocus");
        if (runInTerminal) {
            this.zipCommandInTerminal(filePath, projectName, clearPreviousOutput, preserveFocus);
        } else {
            this.zipCommandInOutputChannel(filePath, projectName, clearPreviousOutput, preserveFocus);
        }
    }

    public zipCommandInTerminal(filePath: string, projectName: string, clearPreviousOutput, preserveFocus): void {
        if (clearPreviousOutput) {
            vscode.commands.executeCommand("workbench.action.terminal.clear");
        }

        this.terminal.show(preserveFocus);

        new zip.UncompressStream({ source: join(filePath, `project"${projectName}".zip`) })
        .on("error", () => {
            //this.outputChannel.appendLine("[Error] Compress Error!");
        })
        .on("finish", () => {
            this.isRunning = false;
            //this.outputChannel.appendLine("[Done] Compress successfully");
        })
        .on("entry", (header, stream, next) => {
            stream.on("end", next);

            if (header.type === "file") {
                const fs = require("fs");
                stream.pipe(fs.createWriteStream(join(filePath, header.name)));
            }
        });
    }

    public zipCommandInOutputChannel(filePath: string, projectName: string, clearPreviousOutput, preserveFocus): void {
        if (clearPreviousOutput) {
            this.outputChannel.clear();
        }
        this.isRunning = true;
        this.isSuccess = false;
        this.outputChannel.show(preserveFocus);
        this.outputChannel.appendLine(`[Compressing] ${filePath}`);
        const exec = require("child_process").exec;
        const startTime = new Date();
        this.process = exec({ cwd: this.extensionPath });

        new zip.UncompressStream({ source: join(filePath, `project"${projectName}".zip`) })
        .on("error", () => {
            this.outputChannel.appendLine("[Error] Compress Error!");
        })
        .on("finish", () => {
            this.isRunning = false;
            this.outputChannel.appendLine("[Done] Compress successfully");
        })
        .on("entry", (header, stream, next) => {
            stream.on("end", next);

            if (header.type === "file") {
                const fs = require("fs");
                stream.pipe(fs.createWriteStream(join(filePath, header.name)));
            }
        });
    }
}
