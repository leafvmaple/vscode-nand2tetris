"use strict";
import { resolve, join, parse } from "path";
import * as vscode from "vscode";
import * as fs from "fs";

export class Commands implements vscode.Disposable {
    private EXTENSION_NAME = "leafvmaple.nand2tetris";
    private LANGUAGE_NAME  = "Nand2Tetris";
    private zipSource: JSON;
    private outputChannel: vscode.OutputChannel;
    private terminal: vscode.Terminal;
    private config: vscode.WorkspaceConfiguration;
    private document: vscode.TextDocument;
    private platform: string;
    private extensionPath: string;
    private assemblerCmd: string;
    private CPUCmd: string;
    private hardwareCmd: string;
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
        this.extensionPath = this.extensionPath.replace(/ /g, "\" \"").replace(/\\/g, "/");
        this.hardwareCmd = "java -classpath \"${CLASSPATH}" + symbol
                        + this.extensionPath + symbol
                        + this.extensionPath + "/bin/classes" + symbol
                        + this.extensionPath + "/bin/lib/Hack.jar" + symbol
                        + this.extensionPath + "/bin/lib/HackGUI.jar" + symbol
                        + this.extensionPath + "/bin/lib/Simulators.jar" + symbol
                        + this.extensionPath + "/bin/lib/SimulatorsGUI.jar" + symbol
                        + this.extensionPath + "/bin/lib/Compilers.jar\" HardwareSimulatorMain ";

        this.assemblerCmd = "java -classpath \"${CLASSPATH}" + symbol
                    + this.extensionPath + symbol
                    + this.extensionPath + "/bin/classes" + symbol
                    + this.extensionPath + "/bin/lib/Hack.jar" + symbol
                    + this.extensionPath + "/bin/lib/HackGUI.jar" + symbol
                    + this.extensionPath + "/bin/lib/Compilers.jar" + symbol
                    + this.extensionPath + "/bin/lib/AssemblerGUI.jar" + symbol
                    + this.extensionPath + "/bin/lib/TranslatorsGUI.jar\" HackAssemblerMain ";

        this.CPUCmd = "java -classpath \"${CLASSPATH}" + symbol
                    + this.extensionPath + symbol
                    + this.extensionPath + "/bin/classes" + symbol
                    + this.extensionPath + "/bin/lib/Hack.jar" + symbol
                    + this.extensionPath + "/bin/lib/HackGUI.jar" + symbol
                    + this.extensionPath + "/bin/lib/Simulators.jar" + symbol
                    + this.extensionPath + "/bin/lib/SimulatorsGUI.jar" + symbol
                    + this.extensionPath + "/bin/lib/Compilers.jar\" CPUEmulatorMain ";

        this.zipSource = JSON.parse(fs.readFileSync(this.extensionPath + "/assets/zip.json").toString());
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
        const fileName = filePath.name + filePath.ext;
        const execName = join(filePath.dir, filePath.name).replace(/ /g, "\" \"").replace(/\\/g, "/");
        let command: string;
        if (filePath.ext === ".hdl") {
            command = this.hardwareCmd + execName + ".tst";
        } else if (filePath.ext === ".asm") {
            command = this.assemblerCmd + execName + ".asm" + " & " + this.CPUCmd + execName + ".tst";
        }

        this.config = vscode.workspace.getConfiguration("nand2tetris");
        const runInTerminal = this.config.get<boolean>("runInTerminal");
        const clearPreviousOutput = this.config.get<boolean>("clearPreviousOutput");
        const preserveFocus = this.config.get<boolean>("preserveFocus");

        if (runInTerminal) {
            this.executeCommandInTerminal(command, clearPreviousOutput, preserveFocus);
        } else {
            this.executeCommandInOutputChannel(fileName, command, clearPreviousOutput, preserveFocus);
        }
    }

    public executeHarderwareCommand(): void {
        this.terminal.sendText(`cd "${this.extensionPath}"`);
        this.terminal.sendText(this.hardwareCmd);
    }

    public executeAssemblerCommand(): void {
        this.terminal.sendText(`cd "${this.extensionPath}"`);
        this.terminal.sendText(this.assemblerCmd);
    }

    public executeCPUCommand(): void {
        this.terminal.sendText(`cd "${this.extensionPath}"`);
        this.terminal.sendText(this.CPUCmd);
    }

    public stopCommand() {
        if (this.isRunning) {
            this.isRunning = false;
            const kill = require("tree-kill");
            kill(this.process.pid);
        }
    }

    public async zipCommand() {
        if (this.isCompressing) {
            vscode.window.showInformationMessage("Already Compressing!");
            return;
        }

        let inputName;
        let outputName;
        let zipCmd;
        /*const promptOptions = {
            prompt: 'WakaTime Api Key',
            placeHolder: "Enter your folder name that want to compress.",
            value: "1",
            ignoreFocusOut: true,
            validateInput: function(text){return text;}
        };

        vscode.window.showInputBox(promptOptions).then(val => {
            projectName = val;
        });*/

        this.document = vscode.window.activeTextEditor.document;
        let filePath = parse(this.document.fileName).dir.replace(/ /g, "\" \"").replace(/\\/g, "/");
        const dirArr = filePath.split("/").filter(_ => _).reverse();

        if (this.zipSource[dirArr[0]]) {
            const courseInfo = this.zipSource[dirArr[0]];
            const extension = courseInfo.extension.join("|");
            zipCmd = `java -jar ${this.extensionPath}/bin/lib/Zip.jar -f false -r \".+(?=${extension})\"`;
            if (courseInfo.extrafile) {
                const extraFiles = [];
                for (const extraFile of courseInfo.extrafile) {
                    extraFiles.push(this.extensionPath + "/assets/" + extraFile);
                }
                const extratring = extraFiles.join("|");
                zipCmd = zipCmd + " -a " + extratring;
            }

            const baseName = parseInt(dirArr[0], 10).toString();
            filePath = resolve(filePath, "..");

            outputName = `${filePath}/project${baseName}.zip`;
            inputName = `${filePath}/${dirArr[0]}`;

        } else if (this.zipSource[dirArr[1]]) {
            const courseInfo = this.zipSource[dirArr[1]];
            const extension = courseInfo.extension.join("|");
            zipCmd = `java -jar ${this.extensionPath}/bin/lib/Zip.jar -f false -r \".+(?=${extension})\"`;
            if (courseInfo.extrafile) {
                const extraFiles = [];
                for (const extraFile of courseInfo.extrafile) {
                    extraFiles.push(this.extensionPath + "/assets/" + extraFile);
                }
                const extratring = extraFiles.join("|");
                zipCmd = zipCmd + " -a " + extratring;
            }

            const baseName = parseInt(dirArr[1], 10).toString();
            filePath = resolve(filePath, "../..");

            outputName = `${filePath}/project${baseName}.zip`;
            inputName = `${filePath}/${dirArr[1]}`;
        }
        if (inputName == null) {
            vscode.window.showInformationMessage("Could not found source to compress!");
            return;
        }
        let command = `${zipCmd} -o ${outputName} -i ${inputName}`;
        command = command.replace(/\\/g, "/");

        this.config = vscode.workspace.getConfiguration("nand2tetris");

        const runInTerminal = this.config.get<boolean>("runInTerminal");
        const clearPreviousOutput = this.config.get<boolean>("clearPreviousOutput");
        const preserveFocus = this.config.get<boolean>("preserveFocus");
        if (runInTerminal) {
            this.zipCommandInTerminal(command, clearPreviousOutput, preserveFocus);
        } else {
            this.zipCommandInOutputChannel(command, outputName, clearPreviousOutput, preserveFocus);
        }
    }

    public dispose() {
        this.stopCommand();
    }

    private executeCommandInTerminal(command: string, clearPreviousOutput, preserveFocus): void {
        if (clearPreviousOutput) {
            vscode.commands.executeCommand("workbench.action.terminal.clear");
        }
        this.terminal.show(preserveFocus);
        this.terminal.sendText(`cd "${this.extensionPath}"`);
        this.terminal.sendText(command);
    }

    private executeCommandInOutputChannel(fileName: string,
                                          command: string,
                                          clearPreviousOutput,
                                          preserveFocus): void {
        if (clearPreviousOutput) {
            this.outputChannel.clear();
        }
        this.isRunning = true;
        this.isSuccess = false;
        this.outputChannel.show(preserveFocus);
        this.outputChannel.appendLine(`[Running] ${fileName}`);
        const exec = require("child_process").exec;
        const startTime = new Date();
        this.process = exec(command, { cwd: this.extensionPath });

        this.process.stdout.on("data", (data) => {
            if (data.match("successfully")) {
                this.isSuccess = true;
            }
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

    private zipCommandInTerminal(command: string, clearPreviousOutput, preserveFocus): void {
        if (clearPreviousOutput) {
            vscode.commands.executeCommand("workbench.action.terminal.clear");
        }
        this.terminal.show(preserveFocus);
        this.terminal.sendText(`cd "${this.extensionPath}"`);
        this.terminal.sendText(command);
    }

    private zipCommandInOutputChannel(command: string, outputName: string, clearPreviousOutput, preserveFocus): void {
        if (clearPreviousOutput) {
            this.outputChannel.clear();
        }
        this.isRunning = true;
        this.isSuccess = false;
        this.outputChannel.show(preserveFocus);
        this.outputChannel.appendLine(`[Compressing] ${outputName}`);
        const exec = require("child_process").exec;
        const startTime = new Date();
        this.process = exec(command, { cwd: this.extensionPath });

        this.process.stdout.on("data", (data) => {
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
            this.outputChannel.appendLine(`[Done] End Compress with code=${code} in ${elapsedTime} seconds`);
            this.outputChannel.appendLine(`[Done] Compress to file ${outputName}`);
            this.outputChannel.appendLine("");
        });
    }
}
