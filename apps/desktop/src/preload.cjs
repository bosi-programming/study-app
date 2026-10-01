const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('studyDesktop', {
  platform: process.platform,
  electron: process.versions.electron,
})
