"use strict";
import * as vscode from "vscode";
import { basename } from "path";

export class Commands implements vscode.Disposable {
    private _EXTENSION_NAME = "leafvmaple.nand2tetris"
    private _outputChannel: vscode.OutputChannel
    private _terminal: vscode.Terminal
    private _platform: String
    private _extensionPath: String
    private _n2tComands: String

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
        this._terminal = null;
        this._extensionPath = vscode.extensions.getExtension(this._EXTENSION_NAME).extensionPath;
        this._n2tComands = "java -classpath \"${CLASSPATH}" + symbol
                        + this._extensionPath + "/bin/classes" + symbol
                        + this._extensionPath + "/bin/lib/Hack.jar" + symbol
                        + this._extensionPath + "/bin/lib/HackGUI.jar" + symbol
                        + this._extensionPath + "/bin/lib/Simulators.jar" + symbol
                        + this._extensionPath + "/bin/lib/SimulatorsGUI.jar" + symbol
                        + this._extensionPath + "/bin/lib/Compilers.jar\" HardwareSimulatorMain "
    }

    public executeCommandInTerminal(fileName: string): void {
        if (this._terminal === null) {
            this._terminal = vscode.window.createTerminal("Nand2Tetris")
        }
        this._terminal.show(true)
        //this._outputChannel.show(true)
        //vscode.window.showInformationMessage(this._n2tComands + fileName);
        this._terminal.sendText(`cd "${this._extensionPath}"`);
        this._terminal.sendText(this._n2tComands + fileName);
        this._outputChannel.appendLine("[Running] " + basename(fileName, ".tst") + ".hdl");
    }

    public dispose() {

    }
}