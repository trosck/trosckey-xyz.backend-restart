const { spawn } = require("node:child_process")
const http = require("node:http");

const port = 6969;

const server = http.createServer(
  (request, response) => response.end()
);

server.listen(port, () => {
  console.log(`Server running at ${port} port`);
});

server.on("request", request => {
  const buffer = []
  request.on("data", chunk => {
    buffer.push(chunk)
  })

  request.on("close", () => {
    processHook(buffer.toString())
  })
})

async function processHook(data) {
  if (!data?.length) {
    console.error("Received incorrect payload.")
    return
  }

  const {
    callback_url,
    repository: {
      repo_name
    }
  } = JSON.parse(data)
  console.log(`Updating ${repo_name} container.`)

  validateHook(callback_url)

  await runProcess("docker", ["pull", repo_name])
  await runProcess("docker", ["compose", "down"])
  await runProcess("docker", ["compose", "up", "-d"])
}

async function validateHook(url) {
  const { hostname, pathname } = new URL(url)
  const data = JSON.stringify({ state: "success" })
  const request = http.request({
    method: "POST",
    host: hostname,
    path: pathname,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  })

  request.write(data)
  request.end()
}

async function runProcess(name, args = []) {
  console.log(`Run process "${name}" with "${args}" arguments.`)
  await new Promise(
    resolve => {
      const proc = spawn(name, args)
      proc.on("error", console.error)
      proc.on("message", console.info)
      proc.on("close", resolve)
    }
  )
}
