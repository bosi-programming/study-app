export type FileGateway = {
  saveFile(name: string, content: string): Promise<void>
  pickFile(): Promise<string | null>
}

export const browserFiles: FileGateway = {
  saveFile: async (name, content) => {
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  },
  pickFile: () =>
    new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json'
      input.onchange = () => {
        const file = input.files?.[0]
        if (file === undefined) {
          resolve(null)
          return
        }
        file.text().then(resolve, () => resolve(null))
      }
      input.click()
    }),
}
