function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version)
  return match ? match.slice(1).map(Number) : null
}

function compareVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index]
  }
  return 0
}

export function supportsNodeVersion(version, minimum = '24.14.0', maximumMajor = 25) {
  const actual = parseVersion(version)
  const minimumVersion = parseVersion(minimum)
  if (!actual || !minimumVersion) return false

  return actual[0] < maximumMajor && compareVersions(actual, minimumVersion) >= 0
}
