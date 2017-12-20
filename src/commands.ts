"use strict";
import * as vscode from "vscode";
import { basename } from "path";
import { print } from "util";

export class Commands implements vscode.Disposable {
    private _EXTENSION_NAME = "leafvmaple.nand2tetris";
    
    private _outputChannel: vscode.OutputChannel;
    private _terminal: vscode.Terminal;
    private _config: vscode.WorkspaceConfiguration;
    private _platform: String;
    private _extensionPath: String;
    private _n2tComands: String;
    private _isRunning: boolean;
    private _isSuccess: boolean;
    private _process;

    constructor() {
        let symbol;

        this._platform = process.platform;
        switch (this._platform) {
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
        
        this._outputChannel = vscode.window.createOutputChannel("Nand2Tetris");
        this._terminal = vscode.window.createTerminal("Nand2Tetris");

        this._extensionPath = vscode.extensions.getExtension(this._EXTENSION_NAME).extensionPath;
        this._n2tComands = "java -classpath \"${CLASSPATH}" + symbol
                        + this._extensionPath + symbol
                        + this._extensionPath + "/bin/classes" + symbol
                        + this._extensionPath + "/bin/lib/Hack.jar" + symbol
                        + this._extensionPath + "/bin/lib/HackGUI.jar" + symbol
                        + this._extensionPath + "/bin/lib/Simulators.jar" + symbol
                        + this._extensionPath + "/bin/lib/SimulatorsGUI.jar" + symbol
                        + this._extensionPath + "/bin/lib/Compilers.jar\" HardwareSimulatorMain ";
    }

    public executeCommand(fileName: string): void {
        if (this._isRunning) {
            vscode.window.showInformationMessage("Code is already running!");
            return;
        }
        this._config = vscode.workspace.getConfiguration("nand2tetris");
        if (this._config.get<boolean>("runInTerminal")) {
            this.executeCommandInTerminal(fileName);
        } else {
            this.executeCommandInOutputChannel(fileName);
        }
    }

    public executeCommandInTerminal(fileName: string): void {
        if (this._config.get<boolean>("clearPreviousOutput")) {
            vscode.commands.executeCommand("workbench.action.terminal.clear");
        }
        this._terminal.show(this._config.get<boolean>("preserveFocus"));
        this._terminal.sendText(`cd "${this._extensionPath}"`);
        this._terminal.sendText(this._n2tComands + fileName);
        
    }

    public executeCommandInOutputChannel(fileName: string): void {
        if (this._config.get<boolean>("clearPreviousOutput")) {
            this._outputChannel.clear();
        }
        this._isRunning = true;
        this._isSuccess = false;
        this._outputChannel.show(this._config.get<boolean>("preserveFocus"));
        this._outputChannel.appendLine(`[Running] ${basename(fileName, `.tst`)}.hdl`);
        const exec = require("child_process").exec;
        const startTime = new Date();
        this._process = exec(this._n2tComands + fileName, { cwd: this._extensionPath });

        this._process.stdout.on("data", (data) => {
            if (data.match("successfully")) {
                this._isSuccess = true;
            }
            this._outputChannel.append(data);
        });

        this._process.stderr.on("data", (data) => {
            this._outputChannel.append(data);
        });

        this._process.on("close", (code) => {
            this._isRunning = false;
            const endTime = new Date();
            const elapsedTime = (endTime.getTime() - startTime.getTime()) / 1000;
            this._outputChannel.appendLine(`[Done] Comparison ${(this._isSuccess?`Successfully`:`Failure`)} with code=${code} in ${elapsedTime} seconds`);
            this._outputChannel.appendLine("");
        });
    }

    public dispose() {

    }
}