if (typeof global === "undefined") global = window;
global.sleep = async function (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

global.sanitizeUsername = function (username, forceLength = true) {
  // Remove all characters except alphanumeric and URL-safe chars: underscore, apostrophe, hyphen
  // Then collapse consecutive special characters to single occurrence
  let sanitized = username.replace(/[^a-zA-Z0-9_'\-]/g, '').replace(/\s+/g, '_');
  sanitized = sanitized.replace(/[_'\-]{2,}/g, match => match[0]); // Collapse consecutive special chars
  if (forceLength) {
    return sanitized.length < 3 ? 'user' : sanitized.length > 20 ? sanitized.substring(0, 20) : sanitized;
  } else { return sanitized; }
};

global.isUsernameValid = function (username) {
  // Must be 3-20 chars, contain at least one letter, only alphanumeric/underscore/apostrophe/hyphen, no consecutive special chars
  const regex = /^(?=.*[a-zA-Z])(?!.*[_'\-]{2})[a-zA-Z0-9_'\-]{3,20}$/;
  return regex.test(username);
};

/**
 * Parse a semantic version string into its components.
 * Supports formats: 1.0.0, 1.0.0-beta, 1.0.0-beta.2, 1.0.0+build, 1.0.0-beta+build
 * @param {string} version - The version string to parse
 * @returns {object|null} Parsed version object or null if invalid
 */
global.parseSemver = function (version) {
  if (typeof version !== 'string') return null;
  
  // Strip optional 'v' prefix
  const cleaned = version.trim().replace(/^v/i, '');
  
  // SemVer regex with capture groups: major, minor, patch, prerelease, buildmetadata
  const regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  
  const match = cleaned.match(regex);
  if (!match) return null;
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] ? match[4].split('.') : [],
    build: match[5] ? match[5].split('.') : [],
    raw: cleaned
  };
};

/**
 * Check if a string is a valid semantic version.
 * @param {string} version - The version string to validate
 * @returns {boolean} True if valid semver
 */
global.isValidSemver = function (version) {
  return global.parseSemver(version) !== null;
};

/**
 * Compare two pre-release identifier arrays according to SemVer spec.
 * @param {string[]} a - First pre-release identifiers
 * @param {string[]} b - Second pre-release identifiers
 * @returns {number} -1 if a < b, 0 if a == b, 1 if a > b
 */
function comparePrerelease(a, b) {
  // No pre-release means higher precedence than having pre-release
  // e.g., 1.0.0 > 1.0.0-alpha
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;  // a is release, b is pre-release
  if (b.length === 0) return -1; // a is pre-release, b is release
  
  const maxLen = Math.max(a.length, b.length);
  
  for (let i = 0; i < maxLen; i++) {
    // A larger set of pre-release fields has higher precedence
    // if all preceding identifiers are equal
    if (i >= a.length) return -1; // a has fewer fields
    if (i >= b.length) return 1;  // b has fewer fields
    
    const aId = a[i];
    const bId = b[i];
    
    if (aId === bId) continue;
    
    const aIsNum = /^\d+$/.test(aId);
    const bIsNum = /^\d+$/.test(bId);
    
    // Numeric identifiers always have lower precedence than alphanumeric
    if (aIsNum && !bIsNum) return -1;
    if (!aIsNum && bIsNum) return 1;
    
    // Both numeric: compare as integers
    if (aIsNum && bIsNum) {
      const diff = parseInt(aId, 10) - parseInt(bId, 10);
      if (diff !== 0) return diff < 0 ? -1 : 1;
    }
    
    // Both alphanumeric: compare lexically (ASCII sort order)
    if (aId < bId) return -1;
    if (aId > bId) return 1;
  }
  
  return 0;
}

/**
 * Compare two semantic versions.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 * Build metadata is ignored per SemVer spec.
 * 
 * Examples:
 *   compareSemver('1.0.0', '2.0.0') => -1
 *   compareSemver('1.0.0-alpha', '1.0.0') => -1 (pre-release < release)
 *   compareSemver('1.0.0-alpha', '1.0.0-alpha.1') => -1
 *   compareSemver('1.0.0-alpha', '1.0.0-beta') => -1
 *   compareSemver('1.0.0-beta.2', '1.0.0-beta.11') => -1
 *   compareSemver('1.0.0-1', '1.0.0-alpha') => -1 (numeric < alphanumeric)
 * 
 * @param {string} a - First version string
 * @param {string} b - Second version string
 * @returns {number} -1 if a < b, 0 if a == b, 1 if a > b
 * @throws {Error} If either version is invalid
 */
global.compareSemver = function (a, b) {
  const parsedA = global.parseSemver(a);
  const parsedB = global.parseSemver(b);
  
  if (!parsedA) throw new Error(`Invalid semantic version: "${a}"`);
  if (!parsedB) throw new Error(`Invalid semantic version: "${b}"`);
  
  // Compare major, minor, patch numerically
  if (parsedA.major !== parsedB.major) {
    return parsedA.major < parsedB.major ? -1 : 1;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor < parsedB.minor ? -1 : 1;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch < parsedB.patch ? -1 : 1;
  }
  
  // Compare pre-release identifiers
  return comparePrerelease(parsedA.prerelease, parsedB.prerelease);
};

/**
 * Check if version a is greater than version b.
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {boolean}
 */
global.semverGt = function (a, b) {
  return global.compareSemver(a, b) === 1;
};

/**
 * Check if version a is greater than or equal to version b.
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {boolean}
 */
global.semverGte = function (a, b) {
  return global.compareSemver(a, b) >= 0;
};

/**
 * Check if version a is less than version b.
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {boolean}
 */
global.semverLt = function (a, b) {
  return global.compareSemver(a, b) === -1;
};

/**
 * Check if version a is less than or equal to version b.
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {boolean}
 */
global.semverLte = function (a, b) {
  return global.compareSemver(a, b) <= 0;
};

/**
 * Check if version a equals version b (ignoring build metadata).
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {boolean}
 */
global.semverEq = function (a, b) {
  return global.compareSemver(a, b) === 0;
};

/**
 * Sort an array of version strings in ascending order.
 * @param {string[]} versions - Array of version strings
 * @returns {string[]} Sorted array (new array, does not mutate input)
 */
global.sortSemver = function (versions) {
  return [...versions].sort(global.compareSemver);
};

/**
 * Get the maximum version from an array of versions.
 * @param {string[]} versions - Array of version strings
 * @returns {string|null} The highest version, or null if array is empty
 */
global.maxSemver = function (versions) {
  if (!versions || versions.length === 0) return null;
  return versions.reduce((max, v) => global.semverGt(v, max) ? v : max);
};

/**
 * Get the minimum version from an array of versions.
 * @param {string[]} versions - Array of version strings
 * @returns {string|null} The lowest version, or null if array is empty
 */
global.minSemver = function (versions) {
  if (!versions || versions.length === 0) return null;
  return versions.reduce((min, v) => global.semverLt(v, min) ? v : min);
};