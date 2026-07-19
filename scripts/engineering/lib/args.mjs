// Minimal `--kebab-case value` CLI argument parser shared by the engineering scripts.
export function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]
    if (!flag?.startsWith('--')) continue
    const camel = flag.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    args[camel] = argv[i + 1]
  }
  return args
}
