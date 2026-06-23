const dns = require("dns").promises;
const net = require("net");
const { config } = require("../common/config");
const { AppError } = require("../common/errors");

function ipv4ToNumber(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function ipv4InRange(ip, cidrBase, bits) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(cidrBase) & mask);
}

function isPrivateIp(address) {
  if (net.isIP(address) === 4) {
    return (
      ipv4InRange(address, "10.0.0.0", 8) ||
      ipv4InRange(address, "127.0.0.0", 8) ||
      ipv4InRange(address, "169.254.0.0", 16) ||
      ipv4InRange(address, "172.16.0.0", 12) ||
      ipv4InRange(address, "192.168.0.0", 16) ||
      ipv4InRange(address, "0.0.0.0", 8)
    );
  }

  if (net.isIP(address) === 6) {
    const value = address.toLowerCase();
    return (
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      value.startsWith("fe80:") ||
      value === "::"
    );
  }

  return false;
}

function isAllowedHost(hostname, allowlist = config.payment.webhookAllowlist) {
  return allowlist.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );
}

async function validateOutboundUrl(rawUrl, allowlist = config.payment.webhookAllowlist) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError(400, "invalid_url", "Callback URL is invalid");
  }

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new AppError(400, "invalid_scheme", "Only HTTP(S) callbacks are allowed");
  }

  if (!isAllowedHost(parsed.hostname, allowlist)) {
    throw new AppError(403, "host_not_allowed", "Callback host is not allowlisted");
  }

  const records = await dns.lookup(parsed.hostname, { all: true });
  if (records.some((record) => isPrivateIp(record.address))) {
    throw new AppError(403, "private_ip_blocked", "Private network targets are blocked");
  }

  return parsed.toString();
}

module.exports = { isPrivateIp, isAllowedHost, validateOutboundUrl };
