import { createStorage } from '@ailoi/core'

const client = createStorage({
  prefix: 'playground',
})

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <h1>@ailoi/core playground</h1>
  <pre id="output"></pre>
`

const output = document.querySelector<HTMLPreElement>('#output')!
output.textContent = JSON.stringify(client, null, 2)

console.log('StorageClient:', client)
