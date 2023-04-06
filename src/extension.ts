/* eslint-disable @typescript-eslint/naming-convention */
import fetch from "node-fetch";
import * as vscode from "vscode";

const languages = [
  "Python",
  "Java",
  "Javascript",
  "Typescript",
  "C",
  "C++",
  "Ruby",
  "Rust",
  "C#",
];

interface ChatGPTResponse {
  choices: {
    message: Message;
    text: string;
    finish_reason: string;
    index: Number;
  }[];
}

interface Message {
  role: string;
  content: string;
}

async function getChatGPTResponse(
  prompt: string,
  key: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  try {
    const jsonResponse: ChatGPTResponse =
      (await response.json()) as ChatGPTResponse;
    const chatGPTResponse =
      jsonResponse.choices[0]["message"]["content"].trim();
    return chatGPTResponse;
  } catch {
    vscode.window.showErrorMessage(
      "Something is wrong at OPENAI's end, do check your key and it's usage"
    );
    return "error";
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("[+] codemetry is now active");

  let generateComments = vscode.commands.registerCommand(
    "codemetry.generateComments",
    async () => {
      if (!context.globalState.get("OPENAI_KEY")) {
        vscode.window.showErrorMessage("OPENAI_KEY not Set");
        return;
      }
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("Open a file and select your snippet!");
        return;
      }

      const text = editor.document.getText(editor.selection);
      if (!text) {
        vscode.window.showErrorMessage("Please select a code snippet");
        return;
      }
      if (text.length > 1000) {
        vscode.window.showErrorMessage("Code snippet too large");
        return;
      }
      const quickPick = vscode.window.createQuickPick();
      quickPick.items = languages.map((language: string) => ({
        label: language,
      }));
      quickPick.onDidChangeSelection(async ([item]) => {
        if (item) {
          const response: string = await getChatGPTResponse(
            `Write inline comments for the following ${item.label} code: ${text}`,
            context.globalState.get("OPENAI_KEY") || ""
          );
          if (response === "error") {
            return;
          }
          editor.edit((edit) => {
            edit.replace(editor.selection, response.trim());
          });
          quickPick.dispose();
        }
      });
      quickPick.onDidHide(() => quickPick.dispose());
      quickPick.show();
    }
  );

  let storeKey = vscode.commands.registerCommand(
    "codemetry.storeKey",
    async () => {
      const openai_key = await vscode.window.showInputBox({
        placeHolder: "Enter OPEN_AI key, format sk-xxx",
        prompt: "Enter OPEN_AI key",
        value: context.globalState.get("OPENAI_KEY"),
      });
      if (openai_key) {
        context.globalState.update("OPENAI_KEY", openai_key);
        vscode.window.showInformationMessage("OPENAI_KEY set");
      }
    }
  );

  context.subscriptions.push(generateComments);
  context.subscriptions.push(storeKey);
}

export function deactivate() {}
