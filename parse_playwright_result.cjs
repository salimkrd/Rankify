const fs = require('fs');
const path = 'C:/Users/Admin/AppData/Roaming/Code/User/workspaceStorage/0c27559c6dc91f09516298918c612978/GitHub.copilot-chat/chat-session-resources/87540151-5c88-4d68-bcae-3f24502ba4a8/call_BSCXFmvu2or6nrF7qQ5V9bWz__vscode-1780136184050/content.txt';
const text = fs.readFileSync(path, 'utf8');
const json = text.replace(/^Result:\s*/, '');
const obj = JSON.parse(json);
for (const item of obj) {
  console.log('ROUTE:' + item.route + ' URL:' + item.editorUrl + ' UPLOAD:' + item.uploadSuccess + ' SUBMIT:' + item.submitSuccess + ' WIDTH:' + item.metrics.previewClientWidth + ' HEIGHT:' + item.metrics.previewClientHeight + ' SCROLLX:' + item.metrics.scrollX + ' SCROLLY:' + item.metrics.scrollY + ' TRANSFORM:' + item.metrics.transform + ' CANVAS:' + (item.metrics.canvasText ? item.metrics.canvasText.slice(0,100).replace(/\n/g,' ') : '') + ' SCALE:' + item.metrics.scaleText + ' SCREEN:' + item.screenshotPath);
}
