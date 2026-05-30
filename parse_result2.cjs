const fs = require('fs');
const path = 'C:/Users/Admin/AppData/Roaming/Code/User/workspaceStorage/0c27559c6dc91f09516298918c612978/GitHub.copilot-chat/chat-session-resources/87540151-5c88-4d68-bcae-3f24502ba4a8/call_dOKVCCGdqeZzbMohmDDSpft6__vscode-1780136184092/content.txt';
const text = fs.readFileSync(path, 'utf8');
const json = text.replace(/^Result:\s*/, '');
const obj = JSON.parse(json);
for (const item of obj) {
  console.log('ROUTE:' + item.route);
  console.log('  editorUrl:' + item.editorUrl);
  console.log('  livePreviewHeader:' + item.livePreviewHeader);
  console.log('  uploadSuccess:' + item.uploadSuccess);
  console.log('  submitSuccess:' + item.submitSuccess);
  console.log('  submitResult:' + item.submitResult);
  if (item.metrics) {
    console.log('  preview:' + item.metrics.previewClientWidth + 'x' + item.metrics.previewClientHeight + ' scrollX:' + item.metrics.scrollX + ' scrollY:' + item.metrics.scrollY + ' overflowX:' + item.metrics.overflowX + ' overflowY:' + item.metrics.overflowY + ' transform:' + item.metrics.transform);
    console.log('  canvasText:' + item.metrics.canvasText);
    console.log('  scaleText:' + item.metrics.scaleText);
  }
  console.log('  screenshot:' + item.screenshotPath);
}
