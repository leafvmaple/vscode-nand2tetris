"use strict";
import * as vscode from "vscode";
import { Commands } from "./commands";

const commands = new Commands();

export function activate(context: vscode.ExtensionContext) {
    const run = vscode.commands.registerCommand("nand2tetris.run", (fileUri: vscode.Uri) => {
        commands.executeCommand(fileUri);
    });

    const hardware = vscode.commands.registerCommand("nand2tetris.hardware", (fileUri: vscode.Uri) => {
        commands.executeHarderwareCommand();
    });

    const assembler = vscode.commands.registerCommand("nand2tetris.assembler", (fileUri: vscode.Uri) => {
        commands.executeAssemblerCommand();
    });

    const cpu = vscode.commands.registerCommand("nand2tetris.cpu", (fileUri: vscode.Uri) => {
        commands.executeCPUCommand();
    });

    const stop = vscode.commands.registerCommand("nand2tetris.stop", () => {
        commands.stopCommand();
    });

    const zip = vscode.commands.registerCommand("nand2tetris.zip", () => {
        commands.zipCommand();
    });

    context.subscriptions.push(run);
    context.subscriptions.push(commands);
}

export function deactivate() {
    commands.stopCommand();
}
