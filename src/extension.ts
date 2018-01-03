"use strict";
import * as vscode from "vscode";
import { Commands } from "./commands";

const commands = new Commands();

export function activate(context: vscode.ExtensionContext) {
    const run = vscode.commands.registerCommand("nand2tetris.run", (fileUri: vscode.Uri) => {
        commands.executeCommand(fileUri);
    });

    const open = vscode.commands.registerCommand("nand2tetris.open", (fileUri: vscode.Uri) => {
        commands.executeOpenCommand();
    });

    const stop = vscode.commands.registerCommand("nand2tetris.stop", () => {
        commands.stopCommand();
    });

    context.subscriptions.push(run);
    context.subscriptions.push(commands);
}

export function deactivate() {
    commands.stopCommand();
}
