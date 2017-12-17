"use strict";
import * as vscode from "vscode";
import { basename } from "path";

export class Commands implements vscode.Disposable {
    private _EXTENSION_NAME = "leafvmaple.nand2tetris"
    private _outputChannel: vscode.OutputChannel
    private _terminal: vscode.Terminal
    private _extensionDir: String
    private _cmdString: String

    constructor() {
        const extension = vscode.extensions.getExtension(this._EXTENSION_NAME)
        this._outputChannel = vscode.window.createOutputChannel("Nand2Tetris")
        this._terminal = null
        this._extensionDir = extension.extensionPath
        this._cmdString = "java -classpath \"${CLASSPATH}:"
                        + this._extensionDir + "/bin/classes:"
                        + this._extensionDir + "/bin/lib/Hack.jar:"
                        + this._extensionDir + "/bin/lib/HackGUI.jar:"
                        + this._extensionDir + "/bin/lib/Simulators.jar:"
                        + this._extensionDir + "/bin/lib/SimulatorsGUI.jar:"
                        + this._extensionDir + "/bin/lib/Compilers.jar\" HardwareSimulatorMain "
    }

    public executeCommandInTerminal(fileName: string): void {
        if (this._terminal === null) {
            this._terminal = vscode.window.createTerminal("Nand2Tetris")
        }
        this._terminal.show(true)
        //this._outputChannel.show(true)
        //vscode.window.showInformationMessage(command)
        this._terminal.sendText(`cd "${this._extensionDir}"`);
        this._terminal.sendText(this._cmdString + fileName)
        this._outputChannel.appendLine("[Running] " + basename(fileName, ".tst") + ".hdl")
    }

    public dispose() {

    }
}