var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/core.js
var TENANT_ID = "breezy-cuts";
var TIMEZONE = "America/Chicago";
var ROLES = ["customer", "barber", "receptionist", "manager", "owner"];
var ADMIN_ROLES = ["barber", "receptionist", "manager", "owner"];
var MANAGER_ROLES = ["manager", "owner"];
var OWNER_ROLES = ["owner"];
var SLOT_MINUTES = 15;
var HOLD_MINUTES = 10;
var ACTIVE_QUEUE_STATUSES = /* @__PURE__ */ new Set(["waiting", "called", "in_service"]);
var MARKETING_CHANNELS = /* @__PURE__ */ new Set(["email", "sms", "social", "web"]);
var MARKETING_FREQUENCIES = /* @__PURE__ */ new Set(["weekly", "biweekly", "monthly"]);
var INTEGRATION_TYPES = /* @__PURE__ */ new Set(["identity", "payments", "email", "sms", "social"]);
var BREEZE_MARKETING_TOOLS = /* @__PURE__ */ new Set(["draft_marketing", "request_marketing_approval"]);
var WRANGLER_SECRET_REFERENCE = /^wrangler:[A-Z][A-Z0-9_]{1,127}$/;
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  constructor(status, message, code) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code || "request_failed";
  }
};
function assert(condition, status, message, code) {
  if (!condition) throw new HttpError(status, message, code);
}
__name(assert, "assert");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");
function newId(prefix) {
  return prefix + "_" + crypto.randomUUID().replace(/-/g, "");
}
__name(newId, "newId");
function normalizeBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}
__name(normalizeBoolean, "normalizeBoolean");
function cleanText(value, maxLength, label, required) {
  const text2 = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (required) assert(text2.length > 0, 400, label + " is required.", "invalid_input");
  assert(text2.length <= maxLength, 400, label + " is too long.", "invalid_input");
  return text2;
}
__name(cleanText, "cleanText");
function cleanOptionalText(value, maxLength, label) {
  if (value === null || value === void 0 || value === "") return null;
  return cleanText(value, maxLength, label, false);
}
__name(cleanOptionalText, "cleanOptionalText");
function cleanEmail(value) {
  const email = cleanOptionalText(value, 254, "Email");
  if (!email) return null;
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, "Enter a valid email address.", "invalid_input");
  return email.toLowerCase();
}
__name(cleanEmail, "cleanEmail");
function cleanPhone(value) {
  const phone = cleanOptionalText(value, 32, "Phone number");
  if (!phone) return null;
  assert(/^[0-9+().\-\s]{7,32}$/.test(phone), 400, "Enter a valid phone number.", "invalid_input");
  return phone;
}
__name(cleanPhone, "cleanPhone");
function cleanHttpsUrl(value, label) {
  const url = cleanOptionalText(value, 500, label);
  if (!url) return null;
  try {
    assert(new URL(url).protocol === "https:", 400, label + " must use HTTPS.", "invalid_input");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, label + " must be a valid HTTPS URL.", "invalid_input");
  }
  return url;
}
__name(cleanHttpsUrl, "cleanHttpsUrl");
function cleanSkills(value) {
  assert(Array.isArray(value), 400, "Skills must be a list.", "invalid_input");
  assert(value.length <= 16, 400, "Add up to 16 skills.", "invalid_input");
  const skills = value.map((skill) => cleanText(skill, 60, "Skill", true));
  assert(new Set(skills.map((skill) => skill.toLowerCase())).size === skills.length, 400, "Skills must be unique.", "invalid_input");
  return skills;
}
__name(cleanSkills, "cleanSkills");
function cleanSocialProfiles(value) {
  assert(value && typeof value === "object" && !Array.isArray(value), 400, "Social profiles must be a set of links.", "invalid_input");
  const profiles = /* @__PURE__ */ Object.create(null);
  for (const [name, url] of Object.entries(value)) {
    const safeName = cleanText(name, 50, "Social profile name", true);
    assert(!["__proto__", "constructor", "prototype"].includes(safeName.toLowerCase()), 400, "That social profile name is not allowed.", "invalid_input");
    const safeUrl = cleanHttpsUrl(url, "Social profile link");
    assert(safeUrl, 400, "Social profile links are required.", "invalid_input");
    profiles[safeName] = safeUrl;
  }
  return profiles;
}
__name(cleanSocialProfiles, "cleanSocialProfiles");
function updatedStaffRecord(input, current) {
  const source = input || {};
  const allowed = ["name", "phone", "skills", "availability", "active", "bookable", "publicPhoneEnabled"];
  for (const key of Object.keys(source)) {
    assert(allowed.includes(key), 400, "That staff setting cannot be edited here.", "invalid_setting");
  }
  const has = /* @__PURE__ */ __name((key) => Object.prototype.hasOwnProperty.call(source, key), "has");
  const next = {
    name: has("name") ? cleanText(source.name, 80, "Staff name", true) : current.name,
    phone: has("phone") ? cleanPhone(source.phone) : current.phone,
    skills: has("skills") ? cleanSkills(source.skills) : Array.isArray(current.skills) ? current.skills : [],
    availability: has("availability") ? cleanOptionalText(source.availability, 240, "Availability") : current.availability,
    active: has("active") ? normalizeBoolean(source.active) : Boolean(current.active),
    bookable: has("bookable") ? normalizeBoolean(source.bookable) : Boolean(current.bookable),
    publicPhoneEnabled: has("publicPhoneEnabled") ? normalizeBoolean(source.publicPhoneEnabled) : Boolean(current.publicPhoneEnabled)
  };
  if (!next.active) next.bookable = false;
  return next;
}
__name(updatedStaffRecord, "updatedStaffRecord");
function newStaffRecord(input) {
  assert(input && typeof input === "object" && !Array.isArray(input), 400, "Staff details are required.", "invalid_input");
  assert(Object.prototype.hasOwnProperty.call(input, "name"), 400, "Staff name is required.", "invalid_input");
  return updatedStaffRecord(input, {
    name: "",
    phone: null,
    skills: [],
    availability: null,
    active: false,
    bookable: false,
    publicPhoneEnabled: false
  });
}
__name(newStaffRecord, "newStaffRecord");
function customerSubjectFor(actor) {
  if (!actor || actor.role !== "customer" || !actor.sub || actor.sub === "public" || actor.sub === "guest") return null;
  return actor.sub;
}
__name(customerSubjectFor, "customerSubjectFor");
function updatedPortalPreferences(input, current) {
  const source = input || {};
  const allowed = ["communicationConsent", "privacyConsent", "preferredStaffId", "accessNeeds"];
  for (const key of Object.keys(source)) {
    assert(allowed.includes(key), 400, "That portal preference cannot be edited here.", "invalid_setting");
  }
  const has = /* @__PURE__ */ __name((key) => Object.prototype.hasOwnProperty.call(source, key), "has");
  return {
    communicationConsent: has("communicationConsent") ? normalizeBoolean(source.communicationConsent) : Boolean(current.communicationConsent),
    privacyConsent: has("privacyConsent") ? normalizeBoolean(source.privacyConsent) : Boolean(current.privacyConsent),
    preferredStaffId: has("preferredStaffId") ? cleanOptionalText(source.preferredStaffId, 80, "Preferred barber") : current.preferredStaffId || null,
    accessNeeds: has("accessNeeds") ? cleanOptionalText(source.accessNeeds, 500, "Accessibility preferences") : current.accessNeeds || null
  };
}
__name(updatedPortalPreferences, "updatedPortalPreferences");
function portalProfile(profile) {
  return {
    communicationConsent: Boolean(profile.communicationConsent),
    privacyConsent: Boolean(profile.privacyConsent),
    preferredStaffId: profile.preferredStaffId || null,
    accessNeeds: profile.accessNeeds || null,
    updatedAt: profile.updatedAt
  };
}
__name(portalProfile, "portalProfile");
function membershipPlanInput(input) {
  const priceCents = Number(input.priceCents);
  const billingInterval = cleanText(input.billingInterval, 20, "Billing interval", true).toLowerCase();
  assert(["monthly", "quarterly", "annual"].includes(billingInterval), 400, "Choose a supported billing interval.", "invalid_input");
  assert(Number.isInteger(priceCents) && priceCents >= 0 && priceCents <= 1e6, 400, "Membership price must be a valid amount in cents.", "invalid_input");
  return {
    name: cleanText(input.name, 80, "Membership name", true),
    description: cleanOptionalText(input.description, 500, "Membership description"),
    priceCents,
    billingInterval
  };
}
__name(membershipPlanInput, "membershipPlanInput");
function updatedMembershipPlan(input, current) {
  const source = input || {};
  const allowed = ["name", "description", "priceCents", "billingInterval", "active"];
  for (const key of Object.keys(source)) assert(allowed.includes(key), 400, "That membership plan setting cannot be edited here.", "invalid_setting");
  const details = membershipPlanInput(source);
  return {
    ...details,
    active: Object.prototype.hasOwnProperty.call(source, "active") ? normalizeBoolean(source.active) : Boolean(current.active)
  };
}
__name(updatedMembershipPlan, "updatedMembershipPlan");
function serviceInput(input) {
  const durationMinutes = Number(input.durationMinutes);
  const priceCents = Number(input.priceCents);
  assert(Number.isInteger(durationMinutes) && durationMinutes >= 15 && durationMinutes <= 480 && durationMinutes % SLOT_MINUTES === 0, 400, "Service duration must be a 15-minute increment.", "invalid_input");
  assert(Number.isInteger(priceCents) && priceCents >= 0 && priceCents <= 1e6, 400, "Service price must be a valid amount in cents.", "invalid_input");
  return {
    name: cleanText(input.name, 80, "Service name", true),
    description: cleanOptionalText(input.description, 500, "Service description"),
    durationMinutes,
    priceCents
  };
}
__name(serviceInput, "serviceInput");
function availabilityWindowInput(input) {
  const source = input || {};
  const allowed = ["staffId", "startsAt", "endsAt"];
  for (const key of Object.keys(source)) assert(allowed.includes(key), 400, "That availability setting cannot be edited here.", "invalid_setting");
  const startsAt = startOfFutureWindow(source.startsAt, "Availability start");
  const endsAt = startOfFutureWindow(source.endsAt, "Availability end");
  assert(endsAt.getTime() > startsAt.getTime(), 400, "Availability must end after it starts.", "invalid_time");
  return {
    staffId: cleanText(source.staffId, 80, "Barber", true),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString()
  };
}
__name(availabilityWindowInput, "availabilityWindowInput");
function availabilityHasReservations(slotReservations, staffId, startsAt, endsAt) {
  const prefix = staffId + ":";
  return Array.from(slotReservations.keys()).some((key) => {
    if (!key.startsWith(prefix)) return false;
    const slotStart = key.slice(prefix.length);
    return slotStart >= startsAt && slotStart < endsAt;
  });
}
__name(availabilityHasReservations, "availabilityHasReservations");
function marketingDraftInput(input) {
  const channel = cleanText(input.channel, 40, "Marketing channel", true).toLowerCase();
  assert(MARKETING_CHANNELS.has(channel), 400, "Choose a supported marketing channel.", "invalid_input");
  return {
    channel,
    objective: cleanText(input.objective, 180, "Marketing objective", true),
    audience: cleanOptionalText(input.audience, 180, "Audience")
  };
}
__name(marketingDraftInput, "marketingDraftInput");
function defaultMarketingDraftContent({ channel, objective, audience }) {
  return [
    "DRAFT - OWNER APPROVAL REQUIRED",
    "",
    "Breezy Cuts | Quincy, Illinois",
    "Fresh Cuts. Easy Booking.",
    "",
    "Channel: " + channel,
    "Campaign goal: " + objective,
    audience ? "Audience: " + audience : null,
    "",
    "This is an internal draft only. It has not been sent, posted, published, or scheduled with any provider.",
    "Before any external use, an owner must verify services, pricing, availability, claims, consent, and destination links."
  ].filter(Boolean).join("\n");
}
__name(defaultMarketingDraftContent, "defaultMarketingDraftContent");
function marketingDraftContent(input, fallback) {
  if (!Object.prototype.hasOwnProperty.call(input || {}, "content")) return fallback;
  return cleanText(input.content, 4e3, "Marketing draft content", true);
}
__name(marketingDraftContent, "marketingDraftContent");
function marketingDraftUpdateInput(input, current) {
  const source = input || {};
  const allowed = ["channel", "objective", "audience", "content"];
  for (const key of Object.keys(source)) assert(allowed.includes(key), 400, "That marketing draft field cannot be edited here.", "invalid_setting");
  const fields = marketingDraftInput({
    channel: Object.prototype.hasOwnProperty.call(source, "channel") ? source.channel : current.channel,
    objective: Object.prototype.hasOwnProperty.call(source, "objective") ? source.objective : current.objective,
    audience: Object.prototype.hasOwnProperty.call(source, "audience") ? source.audience : current.audience
  });
  return { ...fields, content: marketingDraftContent(source, current.content) };
}
__name(marketingDraftUpdateInput, "marketingDraftUpdateInput");
function marketingDraftNeedsReview(draft) {
  return draft && (draft.status === "draft" || draft.status === "approval_requested");
}
__name(marketingDraftNeedsReview, "marketingDraftNeedsReview");
function marketingProgramSummary(drafts, cadences, reference) {
  const now = reference instanceof Date ? reference : new Date(reference || Date.now());
  const activeCadences = cadences.filter((cadence) => Boolean(cadence.active));
  const reviewBlockedCadenceIds = new Set(drafts.filter((draft) => marketingDraftNeedsReview(draft) && draft.cadenceId).map((draft) => draft.cadenceId));
  let nextDraftAt = null;
  let nextDraftTimestamp = null;
  let overdueCadenceCount = 0;
  for (const cadence of activeCadences) {
    const scheduledAt = new Date(cadence.nextDraftAt);
    if (Number.isNaN(scheduledAt.getTime())) continue;
    if (scheduledAt.getTime() <= now.getTime()) overdueCadenceCount += 1;
    if (nextDraftTimestamp === null || scheduledAt.getTime() < nextDraftTimestamp) {
      nextDraftAt = cadence.nextDraftAt;
      nextDraftTimestamp = scheduledAt.getTime();
    }
  }
  return {
    activeCadenceCount: activeCadences.length,
    draftReadyForReview: drafts.filter((draft) => draft.status === "draft").length,
    approvalRequestedCount: drafts.filter((draft) => draft.status === "approval_requested").length,
    reviewBlockedCadenceCount: activeCadences.filter((cadence) => reviewBlockedCadenceIds.has(cadence.id)).length,
    overdueCadenceCount,
    nextDraftAt,
    externalDeliveryEnabled: false
  };
}
__name(marketingProgramSummary, "marketingProgramSummary");
function marketingCadenceInput(input) {
  const draft = marketingDraftInput(input);
  const frequency = cleanText(input.frequency, 20, "Marketing frequency", true).toLowerCase();
  assert(MARKETING_FREQUENCIES.has(frequency), 400, "Choose a supported marketing frequency.", "invalid_input");
  return {
    name: cleanText(input.name, 80, "Cadence name", true),
    ...draft,
    frequency,
    nextDraftAt: parseFutureDate(input.nextDraftAt, "Next draft time").toISOString(),
    active: Object.prototype.hasOwnProperty.call(input || {}, "active") ? normalizeBoolean(input.active) : true
  };
}
__name(marketingCadenceInput, "marketingCadenceInput");
function nextCadenceAt(value, frequency, reference) {
  let next = new Date(value);
  assert(!Number.isNaN(next.getTime()), 500, "The marketing cadence has an invalid next-draft time.", "configuration_error");
  const now = reference instanceof Date ? reference : new Date(reference || Date.now());
  let attempts = 0;
  do {
    if (frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
    else if (frequency === "biweekly") next.setUTCDate(next.getUTCDate() + 14);
    else next.setUTCMonth(next.getUTCMonth() + 1);
    attempts += 1;
  } while (next.getTime() <= now.getTime() && attempts < 120);
  assert(attempts < 120, 500, "The marketing cadence could not calculate its next draft time.", "configuration_error");
  return next.toISOString();
}
__name(nextCadenceAt, "nextCadenceAt");
function cleanAgentTools(value) {
  assert(Array.isArray(value), 400, "Agent tools must be a list.", "invalid_input");
  assert(value.length <= BREEZE_MARKETING_TOOLS.size, 400, "Too many agent tools were requested.", "invalid_input");
  const tools = value.map((tool) => cleanText(tool, 80, "Agent tool", true));
  assert(new Set(tools).size === tools.length, 400, "Agent tools must be unique.", "invalid_input");
  assert(tools.every((tool) => BREEZE_MARKETING_TOOLS.has(tool)), 400, "That agent tool is not allowed.", "invalid_input");
  return tools;
}
__name(cleanAgentTools, "cleanAgentTools");
function agentPolicyChange(input, current) {
  const source = input || {};
  const allowed = ["enabled", "allowedTools"];
  for (const key of Object.keys(source)) assert(allowed.includes(key), 400, "That agent policy setting cannot be edited here.", "invalid_setting");
  const has = /* @__PURE__ */ __name((key) => Object.prototype.hasOwnProperty.call(source, key), "has");
  return {
    enabled: has("enabled") ? normalizeBoolean(source.enabled) : Boolean(current.enabled),
    allowedTools: has("allowedTools") ? cleanAgentTools(source.allowedTools) : Array.isArray(current.allowedTools) ? current.allowedTools : []
  };
}
__name(agentPolicyChange, "agentPolicyChange");
function integrationDraftInput(input) {
  const integrationType = cleanText(input.integrationType, 40, "Integration type", true).toLowerCase();
  assert(INTEGRATION_TYPES.has(integrationType), 400, "Choose a supported integration type.", "invalid_input");
  const reference = cleanOptionalText(input.secretReference, 160, "Secret reference");
  if (reference) {
    assert(WRANGLER_SECRET_REFERENCE.test(reference), 400, "Use a Wrangler secret-name reference such as wrangler:PAYMENTS_API_KEY; never paste a secret value.", "invalid_input");
  }
  const capabilities = Array.isArray(input.capabilities) ? input.capabilities.map((value) => cleanText(value, 80, "Integration capability", true)) : [];
  assert(capabilities.length <= 12, 400, "Add up to 12 integration capabilities.", "invalid_input");
  assert(new Set(capabilities).size === capabilities.length, 400, "Integration capabilities must be unique.", "invalid_input");
  return {
    integrationType,
    providerName: cleanText(input.providerName, 80, "Provider name", true),
    secretReference: reference,
    capabilities
  };
}
__name(integrationDraftInput, "integrationDraftInput");
function parseFutureDate(value, label) {
  const date = new Date(value);
  assert(!Number.isNaN(date.getTime()), 400, label + " must be a valid date and time.", "invalid_time");
  assert(date.getTime() > Date.now() - 6e4, 400, label + " must be in the future.", "invalid_time");
  return date;
}
__name(parseFutureDate, "parseFutureDate");
function bookingSlotStarts(startAt, durationMinutes) {
  const start = new Date(startAt);
  assert(!Number.isNaN(start.getTime()), 400, "Choose a valid appointment time.", "invalid_time");
  assert(start.getUTCSeconds() === 0 && start.getUTCMilliseconds() === 0, 400, "Appointment times must be exact 15-minute slots.", "invalid_time");
  assert(start.getUTCMinutes() % SLOT_MINUTES === 0, 400, "Appointment times must be exact 15-minute slots.", "invalid_time");
  assert(Number.isInteger(durationMinutes) && durationMinutes > 0 && durationMinutes % SLOT_MINUTES === 0, 500, "The selected service has an invalid duration.", "configuration_error");
  const slots = [];
  for (let minute = 0; minute < durationMinutes; minute += SLOT_MINUTES) {
    slots.push(new Date(start.getTime() + minute * 6e4).toISOString());
  }
  return slots;
}
__name(bookingSlotStarts, "bookingSlotStarts");
function endOfBooking(startAt, durationMinutes) {
  return new Date(new Date(startAt).getTime() + durationMinutes * 6e4).toISOString();
}
__name(endOfBooking, "endOfBooking");
function maskQueueName(name) {
  const clean = cleanText(name, 80, "Name", true);
  return clean.slice(0, 1).toUpperCase() + "\u2022\u2022";
}
__name(maskQueueName, "maskQueueName");
function publicStaff(staff, settings) {
  const result = {
    id: staff.id,
    name: staff.name,
    skills: Array.isArray(staff.skills) ? staff.skills : [],
    availability: staff.availability || "Availability is set by the shop.",
    bookable: Boolean(staff.bookable && staff.active)
  };
  if (settings.publicPhoneEnabled && staff.publicPhoneEnabled && staff.phone) {
    result.phone = staff.phone;
  }
  return result;
}
__name(publicStaff, "publicStaff");
function publicService(service) {
  return {
    id: service.id,
    name: service.name,
    description: service.description || null,
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents
  };
}
__name(publicService, "publicService");
function publicSettings(settings) {
  return {
    businessName: settings.businessName,
    tagline: settings.tagline,
    city: settings.city,
    region: settings.region,
    country: settings.country,
    timezone: settings.timezone,
    address: settings.address || null,
    hours: settings.hours || null,
    website: settings.website || null,
    bookingUrl: settings.bookingUrl || null,
    socialProfiles: settings.socialProfiles || {},
    walkInsEnabled: Boolean(settings.walkInsEnabled),
    publicPhoneEnabled: Boolean(settings.publicPhoneEnabled)
  };
}
__name(publicSettings, "publicSettings");
function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 1) continue;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key) cookies[key] = value;
  }
  return cookies;
}
__name(parseCookies, "parseCookies");
function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlEncode, "base64UrlEncode");
function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
__name(base64UrlDecode, "base64UrlDecode");
async function hmacBase64Url(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(hmacBase64Url, "hmacBase64Url");
function fixedTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
__name(fixedTimeEqual, "fixedTimeEqual");
async function hashValue(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
__name(hashValue, "hashValue");
async function createSignedSession(payload, secret) {
  assert(secret, 500, "The session signing secret is not configured.", "server_misconfigured");
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return encoded + "." + await hmacBase64Url(encoded, secret);
}
__name(createSignedSession, "createSignedSession");
async function verifySignedSession(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const expected = await hmacBase64Url(parts[0], secret);
  if (!fixedTimeEqual(expected, parts[1])) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[0]));
    if (!payload || !ROLES.includes(payload.role) || payload.tenantId !== TENANT_ID || !payload.exp || Number(payload.exp) * 1e3 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
__name(verifySignedSession, "verifySignedSession");
function assertRole(session, allowedRoles) {
  assert(session, 401, "Sign in is required for this action.", "authentication_required");
  assert(allowedRoles.includes(session.role), 403, "Your role is not allowed to perform this action.", "forbidden");
  return session;
}
__name(assertRole, "assertRole");
function assertSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return;
  const expected = new URL(request.url).origin;
  assert(origin === expected, 403, "This request must originate from Breezy Cuts.", "csrf_rejected");
}
__name(assertSameOrigin, "assertSameOrigin");
function assertCsrf(request, session) {
  assertSameOrigin(request);
  const token = request.headers.get("X-Breezy-CSRF");
  assert(token && session && fixedTimeEqual(token, session.csrf || ""), 403, "Your security token is missing or expired. Refresh and try again.", "csrf_rejected");
}
__name(assertCsrf, "assertCsrf");
function seoSchema(settings, siteUrl) {
  const url = siteUrl.replace(/\/+$/, "");
  const schema = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: settings.businessName,
    description: settings.tagline,
    url,
    address: {
      "@type": "PostalAddress",
      addressLocality: settings.city,
      addressRegion: settings.region,
      addressCountry: settings.country
    }
  };
  if (settings.address) schema.address.streetAddress = settings.address;
  const ownerVerifiedLinks = [settings.website, ...Object.values(settings.socialProfiles || {})].filter(Boolean);
  if (ownerVerifiedLinks.length) schema.sameAs = Array.from(new Set(ownerVerifiedLinks));
  if (settings.bookingUrl) {
    schema.potentialAction = {
      "@type": "ReserveAction",
      target: settings.bookingUrl
    };
  }
  return schema;
}
__name(seoSchema, "seoSchema");
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
__name(clone, "clone");
function compareStaffMatches(left, right) {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}
__name(compareStaffMatches, "compareStaffMatches");
function startOfFutureWindow(value, label) {
  const date = parseFutureDate(value, label);
  assert(date.getUTCMinutes() % SLOT_MINUTES === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0, 400, label + " must use a 15-minute slot.", "invalid_time");
  return date;
}
__name(startOfFutureWindow, "startOfFutureWindow");
var MemoryStore = class {
  static {
    __name(this, "MemoryStore");
  }
  constructor() {
    this.settings = {
      tenantId: TENANT_ID,
      businessName: "Breezy Cuts",
      tagline: "Fresh Cuts. Easy Booking.",
      city: "Quincy",
      region: "Illinois",
      country: "US",
      timezone: TIMEZONE,
      address: null,
      hours: null,
      website: null,
      bookingUrl: null,
      socialProfiles: {},
      publicPhoneEnabled: false,
      walkInsEnabled: false,
      queueAverageMinutes: null
    };
    this.staff = [
      {
        id: "breon",
        name: "Breon",
        phone: "217-506-9343",
        skills: [],
        availability: null,
        active: true,
        bookable: true,
        publicPhoneEnabled: false
      }
    ];
    this.services = [];
    this.availabilityWindows = [];
    this.holds = /* @__PURE__ */ new Map();
    this.bookings = /* @__PURE__ */ new Map();
    this.slotReservations = /* @__PURE__ */ new Map();
    this.queue = /* @__PURE__ */ new Map();
    this.marketingDrafts = /* @__PURE__ */ new Map();
    this.marketingCadences = /* @__PURE__ */ new Map();
    this.agentPolicies = /* @__PURE__ */ new Map([
      ["breeze-marketing", {
        id: "breeze-marketing",
        tenantId: TENANT_ID,
        agentKey: "breeze_marketing",
        displayName: "Breeze Marketing Draft Agent",
        enabled: true,
        allowedTools: ["draft_marketing", "request_marketing_approval"],
        externalActionsEnabled: false,
        updatedAt: nowIso()
      }]
    ]);
    this.integrationConfigs = /* @__PURE__ */ new Map();
    this.approvals = /* @__PURE__ */ new Map();
    this.customerProfiles = /* @__PURE__ */ new Map();
    this.membershipPlans = /* @__PURE__ */ new Map();
    this.customerMemberships = /* @__PURE__ */ new Map();
    this.loyaltyLedger = [];
    this.auditEvents = [];
  }
  getPublicConfig() {
    const approvedServices = this.services.filter((service) => service.approved && service.priceCents !== null).length;
    const publishedAvailability = this.availabilityWindows.some((window) => {
      const staff = this.staff.find((candidate) => candidate.id === window.staffId);
      return staff && staff.active && staff.bookable && new Date(window.endsAt).getTime() > Date.now();
    });
    return {
      ...publicSettings(this.settings),
      bookingReady: approvedServices > 0 && publishedAvailability,
      brandAssetStatus: "draft_pending_owner_approval"
    };
  }
  getPublicServices() {
    return this.services.filter((service) => service.approved && service.priceCents !== null).map(publicService);
  }
  getPublicStaff() {
    return this.staff.filter((staff) => staff.active).map((staff) => publicStaff(staff, this.settings));
  }
  getAdminOverview() {
    this.expireHolds();
    const marketingDrafts = Array.from(this.marketingDrafts.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    const marketingCadences = Array.from(this.marketingCadences.values()).sort((left, right) => left.nextDraftAt.localeCompare(right.nextDraftAt));
    return {
      settings: clone(this.settings),
      staff: clone(this.staff),
      services: clone(this.services),
      membershipPlans: Array.from(this.membershipPlans.values()).sort((left, right) => left.name.localeCompare(right.name)).map(clone),
      availabilityWindows: clone(this.availabilityWindows),
      approvals: Array.from(this.approvals.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 50),
      marketingSummary: marketingProgramSummary(marketingDrafts, marketingCadences),
      marketingDrafts: marketingDrafts.slice(0, 50).map(clone),
      marketingCadences: marketingCadences.map(clone),
      agentPolicies: Array.from(this.agentPolicies.values()).sort((left, right) => left.displayName.localeCompare(right.displayName)).map(clone),
      integrationConfigs: Array.from(this.integrationConfigs.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).map(clone),
      auditEvents: clone(this.auditEvents.slice(0, 50))
    };
  }
  recordAudit(actor, action, targetType, targetId, outcome, metadata) {
    const event = {
      id: newId("audit"),
      tenantId: TENANT_ID,
      actorId: actor && actor.sub ? actor.sub : "public",
      actorRole: actor && actor.role ? actor.role : "public",
      action,
      targetType,
      targetId: targetId || null,
      outcome,
      metadata: metadata || {},
      createdAt: nowIso()
    };
    this.auditEvents.unshift(event);
    this.auditEvents.splice(250);
    return event;
  }
  updateSettings(input, actor) {
    const allowed = ["address", "hours", "website", "bookingUrl", "publicPhoneEnabled", "walkInsEnabled", "queueAverageMinutes", "socialProfiles"];
    for (const key of Object.keys(input || {})) {
      assert(allowed.includes(key), 400, "That business setting cannot be edited here.", "invalid_setting");
    }
    if (Object.prototype.hasOwnProperty.call(input, "address")) this.settings.address = cleanOptionalText(input.address, 220, "Address");
    if (Object.prototype.hasOwnProperty.call(input, "hours")) this.settings.hours = cleanOptionalText(input.hours, 500, "Hours");
    if (Object.prototype.hasOwnProperty.call(input, "website")) this.settings.website = cleanHttpsUrl(input.website, "Website");
    if (Object.prototype.hasOwnProperty.call(input, "bookingUrl")) this.settings.bookingUrl = cleanHttpsUrl(input.bookingUrl, "Booking URL");
    if (Object.prototype.hasOwnProperty.call(input, "publicPhoneEnabled")) this.settings.publicPhoneEnabled = normalizeBoolean(input.publicPhoneEnabled);
    if (Object.prototype.hasOwnProperty.call(input, "walkInsEnabled")) this.settings.walkInsEnabled = normalizeBoolean(input.walkInsEnabled);
    if (Object.prototype.hasOwnProperty.call(input, "queueAverageMinutes")) {
      const number = input.queueAverageMinutes === null || input.queueAverageMinutes === "" ? null : Number(input.queueAverageMinutes);
      assert(number === null || Number.isInteger(number) && number >= 5 && number <= 240, 400, "Queue time must be a whole number between 5 and 240 minutes.", "invalid_input");
      this.settings.queueAverageMinutes = number;
    }
    if (Object.prototype.hasOwnProperty.call(input, "socialProfiles")) this.settings.socialProfiles = cleanSocialProfiles(input.socialProfiles);
    this.recordAudit(actor, "business_settings_updated", "business_settings", TENANT_ID, "success", {});
    return clone(this.settings);
  }
  createStaff(input, actor) {
    const createdAt = nowIso();
    const staff = {
      id: newId("staff"),
      tenantId: TENANT_ID,
      ...newStaffRecord(input),
      createdAt,
      updatedAt: createdAt
    };
    this.staff.push(staff);
    this.recordAudit(actor, "staff_created", "staff", staff.id, "success", {
      active: staff.active,
      bookable: staff.bookable,
      publicPhoneEnabled: staff.publicPhoneEnabled
    });
    return clone(staff);
  }
  updateStaff(staffId, input, actor) {
    const id = cleanText(staffId, 100, "Staff member", true);
    const staff = this.staff.find((candidate) => candidate.id === id);
    assert(staff, 404, "Staff member not found.", "staff_not_found");
    Object.assign(staff, updatedStaffRecord(input, staff));
    this.recordAudit(actor, "staff_updated", "staff", staff.id, "success", {
      active: staff.active,
      bookable: staff.bookable,
      publicPhoneEnabled: staff.publicPhoneEnabled
    });
    return clone(staff);
  }
  ensureCustomerProfile(actor) {
    const subject = customerSubjectFor(actor);
    assert(subject, 401, "Sign in with a customer account to use the portal.", "authentication_required");
    let profile = this.customerProfiles.get(subject);
    if (!profile) {
      profile = {
        id: newId("customer"),
        tenantId: TENANT_ID,
        subject,
        communicationConsent: false,
        privacyConsent: false,
        preferredStaffId: null,
        accessNeeds: null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      this.customerProfiles.set(subject, profile);
      this.recordAudit(actor, "customer_portal_profile_created", "customer_profile", profile.id, "success", {});
    }
    return profile;
  }
  getPortalSummary(actor) {
    const profile = this.ensureCustomerProfile(actor);
    const appointments = Array.from(this.bookings.values()).filter((booking) => booking.customerSubject === profile.subject).sort((left, right) => right.startsAt.localeCompare(left.startsAt)).slice(0, 50).map((booking) => {
      const staff = this.staff.find((candidate) => candidate.id === booking.staffId);
      const service = this.services.find((candidate) => candidate.id === booking.serviceId);
      return {
        id: booking.id,
        serviceId: booking.serviceId,
        staffId: booking.staffId,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        status: booking.status,
        staffName: staff ? staff.name : "Owner-managed staff",
        serviceName: service ? service.name : "Owner-approved service",
        priceCents: service && service.approved ? service.priceCents : null,
        receiptStatus: "payment_provider_required"
      };
    });
    const membership = Array.from(this.customerMemberships.values()).filter((candidate) => candidate.customerSubject === profile.subject).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null;
    const plan = membership ? this.membershipPlans.get(membership.planId) : null;
    const loyaltyPoints = this.loyaltyLedger.filter((entry) => entry.customerSubject === profile.subject).reduce((total, entry) => total + entry.pointsDelta, 0);
    return {
      profile: portalProfile(profile),
      appointments,
      membership: membership && plan ? {
        status: membership.status,
        planName: plan.name,
        billingInterval: plan.billingInterval,
        endsAt: membership.endsAt || null
      } : null,
      loyalty: { points: loyaltyPoints, providerRequired: true },
      paymentProviderRequired: true
    };
  }
  updatePortalPreferences(input, actor) {
    const profile = this.ensureCustomerProfile(actor);
    const next = updatedPortalPreferences(input, profile);
    if (next.preferredStaffId) {
      const staff = this.staff.find((candidate) => candidate.id === next.preferredStaffId && candidate.active && candidate.bookable);
      assert(staff, 400, "Choose an active, bookable barber.", "staff_not_found");
    }
    Object.assign(profile, next, { updatedAt: nowIso() });
    this.recordAudit(actor, "customer_portal_preferences_updated", "customer_profile", profile.id, "success", {
      communicationConsent: profile.communicationConsent,
      privacyConsent: profile.privacyConsent,
      hasPreferredStaff: Boolean(profile.preferredStaffId),
      hasAccessNeeds: Boolean(profile.accessNeeds)
    });
    return portalProfile(profile);
  }
  createMembershipPlanDraft(input, actor) {
    const details = membershipPlanInput(input);
    const plan = {
      id: newId("membership"),
      tenantId: TENANT_ID,
      ...details,
      approved: false,
      active: true,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.membershipPlans.set(plan.id, plan);
    this.recordAudit(actor, "membership_plan_draft_created", "membership_plan", plan.id, "success", {});
    return clone(plan);
  }
  updateMembershipPlan(planId, input, actor) {
    const id = cleanText(planId, 100, "Membership plan", true);
    const plan = this.membershipPlans.get(id);
    assert(plan, 404, "Membership plan not found.", "membership_not_found");
    const details = updatedMembershipPlan(input, plan);
    const changed = plan.name !== details.name || plan.description !== details.description || plan.priceCents !== details.priceCents || plan.billingInterval !== details.billingInterval || Boolean(plan.active) !== details.active;
    assert(changed, 400, "Make a membership plan change before saving.", "no_changes");
    const pending = Array.from(this.approvals.values()).find((approval2) => approval2.targetType === "membership_plan" && approval2.targetId === id && approval2.status === "pending");
    assert(!pending, 409, "This membership plan already has a pending approval request.", "approval_pending");
    if (!plan.approved) {
      Object.assign(plan, details, { updatedAt: nowIso() });
      this.recordAudit(actor, "membership_plan_draft_updated", "membership_plan", plan.id, "success", {});
      return { membershipPlan: clone(plan), approval: null };
    }
    const approval = {
      id: newId("approval"),
      tenantId: TENANT_ID,
      actionType: "pricing_change",
      targetType: "membership_plan",
      targetId: plan.id,
      payload: details,
      status: "pending",
      requestedBy: actor.sub,
      decidedBy: null,
      decisionNote: null,
      createdAt: nowIso(),
      decidedAt: null
    };
    this.approvals.set(approval.id, approval);
    this.recordAudit(actor, "membership_plan_change_requested", "approval_request", approval.id, "success", { membershipPlanId: plan.id });
    return { membershipPlan: clone(plan), approval: clone(approval) };
  }
  requestMembershipPlanApproval(planId, actor) {
    const id = cleanText(planId, 100, "Membership plan", true);
    const plan = this.membershipPlans.get(id);
    assert(plan, 404, "Membership plan draft not found.", "membership_not_found");
    assert(!plan.approved, 409, "This membership plan is already approved. Price changes need a new approval request.", "invalid_state");
    const existing = Array.from(this.approvals.values()).find((approval2) => approval2.targetType === "membership_plan" && approval2.targetId === plan.id && approval2.status === "pending");
    assert(!existing, 409, "This membership plan already has a pending approval request.", "approval_pending");
    const approval = {
      id: newId("approval"),
      tenantId: TENANT_ID,
      actionType: "pricing_change",
      targetType: "membership_plan",
      targetId: plan.id,
      payload: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        billingInterval: plan.billingInterval,
        active: Boolean(plan.active)
      },
      status: "pending",
      requestedBy: actor.sub,
      decidedBy: null,
      decisionNote: null,
      createdAt: nowIso(),
      decidedAt: null
    };
    this.approvals.set(approval.id, approval);
    this.recordAudit(actor, "membership_plan_approval_requested", "approval_request", approval.id, "success", { membershipPlanId: plan.id });
    return clone(approval);
  }
  createServiceDraft(input, actor) {
    const details = serviceInput(input);
    const service = {
      id: newId("service"),
      ...details,
      approved: false,
      sample: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.services.push(service);
    this.recordAudit(actor, "service_draft_created", "service", service.id, "success", {});
    return clone(service);
  }
  updateService(serviceId, input, actor) {
    const id = cleanText(serviceId, 100, "Service", true);
    const service = this.services.find((candidate) => candidate.id === id);
    assert(service, 404, "Service not found.", "service_not_found");
    const details = serviceInput(input);
    const changed = service.name !== details.name || service.description !== details.description || service.durationMinutes !== details.durationMinutes || service.priceCents !== details.priceCents;
    assert(changed, 400, "Make a service change before saving.", "no_changes");
    const pending = Array.from(this.approvals.values()).find((approval2) => approval2.targetType === "service" && approval2.targetId === service.id && approval2.status === "pending");
    assert(!pending, 409, "This service already has a pending approval request.", "approval_pending");
    if (!service.approved) {
      Object.assign(service, details, { updatedAt: nowIso() });
      this.recordAudit(actor, "service_draft_updated", "service", service.id, "success", {});
      return { service: clone(service), approval: null };
    }
    const approval = {
      id: newId("approval"),
      tenantId: TENANT_ID,
      actionType: "pricing_change",
      targetType: "service",
      targetId: service.id,
      payload: details,
      status: "pending",
      requestedBy: actor.sub,
      decidedBy: null,
      decisionNote: null,
      createdAt: nowIso(),
      decidedAt: null
    };
    this.approvals.set(approval.id, approval);
    this.recordAudit(actor, "service_change_requested", "approval_request", approval.id, "success", { serviceId: service.id });
    return { service: clone(service), approval: clone(approval) };
  }
  requestServiceApproval(serviceId, actor) {
    const service = this.services.find((candidate) => candidate.id === serviceId);
    assert(service, 404, "Service draft not found.", "service_not_found");
    assert(!service.approved, 409, "This service is already public. Price changes need a new approval request.", "invalid_state");
    const existing = Array.from(this.approvals.values()).find((approval2) => approval2.targetType === "service" && approval2.targetId === service.id && approval2.status === "pending");
    assert(!existing, 409, "This service already has a pending approval request.", "approval_pending");
    const approval = {
      id: newId("approval"),
      tenantId: TENANT_ID,
      actionType: "pricing_change",
      targetType: "service",
      targetId: service.id,
      payload: {
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents
      },
      status: "pending",
      requestedBy: actor.sub,
      decidedBy: null,
      decisionNote: null,
      createdAt: nowIso(),
      decidedAt: null
    };
    this.approvals.set(approval.id, approval);
    this.recordAudit(actor, "service_approval_requested", "approval_request", approval.id, "success", { serviceId: service.id });
    return clone(approval);
  }
  addAvailabilityWindow(input, actor) {
    const details = availabilityWindowInput(input);
    const staff = this.staff.find((candidate) => candidate.id === details.staffId && candidate.active);
    assert(staff, 404, "That barber is not available.", "staff_not_found");
    const window = { id: newId("availability"), ...details, createdAt: nowIso() };
    this.availabilityWindows.push(window);
    this.recordAudit(actor, "availability_window_created", "availability_window", window.id, "success", { staffId: window.staffId });
    return clone(window);
  }
  updateAvailabilityWindow(windowId, input, actor) {
    const id = cleanText(windowId, 100, "Availability window", true);
    const window = this.availabilityWindows.find((candidate) => candidate.id === id);
    assert(window, 404, "Availability window not found.", "availability_not_found");
    this.expireHolds();
    assert(new Date(window.endsAt).getTime() > Date.now(), 409, "Only future availability windows can be changed.", "availability_locked");
    assert(!availabilityHasReservations(this.slotReservations, window.staffId, window.startsAt, window.endsAt), 409, "This availability window has a booking or active hold and cannot be changed.", "availability_reserved");
    const details = availabilityWindowInput(input);
    const staff = this.staff.find((candidate) => candidate.id === details.staffId && candidate.active);
    assert(staff, 404, "That barber is not available.", "staff_not_found");
    const changed = window.staffId !== details.staffId || window.startsAt !== details.startsAt || window.endsAt !== details.endsAt;
    assert(changed, 400, "Make an availability change before saving.", "no_changes");
    Object.assign(window, details);
    this.recordAudit(actor, "availability_window_updated", "availability_window", window.id, "success", { staffId: window.staffId });
    return clone(window);
  }
  removeAvailabilityWindow(windowId, actor) {
    const id = cleanText(windowId, 100, "Availability window", true);
    const index = this.availabilityWindows.findIndex((candidate) => candidate.id === id);
    assert(index >= 0, 404, "Availability window not found.", "availability_not_found");
    const window = this.availabilityWindows[index];
    this.expireHolds();
    assert(new Date(window.endsAt).getTime() > Date.now(), 409, "Only future availability windows can be removed.", "availability_locked");
    assert(!availabilityHasReservations(this.slotReservations, window.staffId, window.startsAt, window.endsAt), 409, "This availability window has a booking or active hold and cannot be removed.", "availability_reserved");
    this.availabilityWindows.splice(index, 1);
    this.recordAudit(actor, "availability_window_removed", "availability_window", id, "success", { staffId: window.staffId });
    return { id };
  }
  getAvailability(staffId, serviceId) {
    const staff = this.staff.find((candidate) => candidate.id === staffId && candidate.active && candidate.bookable);
    const service = this.services.find((candidate) => candidate.id === serviceId && candidate.approved && candidate.priceCents !== null);
    if (!staff || !service) return [];
    this.expireHolds();
    return this.getAvailabilityForStaff(staffId, service);
  }
  getAvailabilityForStaff(staffId, service) {
    const available = [];
    const windows = this.availabilityWindows.filter((candidate) => candidate.staffId === staffId).sort((left, right) => left.startsAt.localeCompare(right.startsAt) || left.id.localeCompare(right.id));
    for (const window of windows) {
      const windowStart = new Date(window.startsAt).getTime();
      const windowEnd = new Date(window.endsAt).getTime();
      for (let cursor = windowStart; cursor + service.durationMinutes * 6e4 <= windowEnd; cursor += SLOT_MINUTES * 6e4) {
        if (cursor < Date.now()) continue;
        const start = new Date(cursor).toISOString();
        const slots = bookingSlotStarts(start, service.durationMinutes);
        const clear = slots.every((slot) => !this.slotReservations.has(staffId + ":" + slot));
        if (clear) available.push(start);
        if (available.length >= 48) return available;
      }
    }
    return available;
  }
  getFirstAvailableAvailability(serviceId) {
    const service = this.services.find((candidate) => candidate.id === serviceId && candidate.approved && candidate.priceCents !== null);
    if (!service) return { staffId: null, slots: [] };
    this.expireHolds();
    const matches = this.staff.filter((staff) => staff.active && staff.bookable).sort(compareStaffMatches).map((staff) => ({ staff, slots: this.getAvailabilityForStaff(staff.id, service) })).filter((match2) => match2.slots.length > 0).sort((left, right) => left.slots[0].localeCompare(right.slots[0]) || compareStaffMatches(left.staff, right.staff));
    const match = matches[0];
    return match ? { staffId: match.staff.id, slots: match.slots } : { staffId: null, slots: [] };
  }
  expireHolds() {
    const now = Date.now();
    for (const hold of this.holds.values()) {
      if (hold.status === "held" && new Date(hold.expiresAt).getTime() < now) {
        hold.status = "expired";
        for (const slot of hold.slotStarts) this.slotReservations.delete(hold.staffId + ":" + slot);
        this.recordAudit({ sub: "system", role: "owner" }, "booking_hold_expired", "booking_hold", hold.id, "success", {});
      }
    }
  }
  async createBookingHold(input, actor) {
    this.expireHolds();
    const staffId = cleanText(input.staffId, 80, "Barber", true);
    const serviceId = cleanText(input.serviceId, 80, "Service", true);
    const idempotencyKey = cleanText(input.idempotencyKey, 180, "Booking request key", true);
    const customerSubject = customerSubjectFor(actor);
    const existing = Array.from(this.holds.values()).find((hold2) => hold2.idempotencyKey === idempotencyKey);
    if (existing) {
      if (existing.customerSubject) {
        assert(existing.customerSubject === customerSubject, 403, "This booking hold belongs to another customer account.", "booking_not_owned");
      }
      assert(existing.status === "held" && new Date(existing.expiresAt).getTime() > Date.now(), 409, "This booking request cannot be replayed. Start a new request.", "idempotency_replay");
      return { hold: this.publicHold(existing), holdToken: existing.holdToken, replayed: true };
    }
    const staff = this.staff.find((candidate) => candidate.id === staffId && candidate.active && candidate.bookable);
    assert(staff, 404, "Choose an available barber.", "staff_not_found");
    const service = this.services.find((candidate) => candidate.id === serviceId && candidate.approved && candidate.priceCents !== null);
    assert(service, 404, "Choose an owner-approved service.", "service_not_found");
    const start = parseFutureDate(input.startsAt, "Appointment time");
    const startsAt = start.toISOString();
    const endsAt = endOfBooking(startsAt, service.durationMinutes);
    const isPublished = this.availabilityWindows.some((window) => window.staffId === staffId && window.startsAt <= startsAt && window.endsAt >= endsAt);
    assert(isPublished, 409, "That appointment time is not available. Choose another published slot.", "slot_unavailable");
    const slots = bookingSlotStarts(startsAt, service.durationMinutes);
    assert(slots.every((slot) => !this.slotReservations.has(staffId + ":" + slot)), 409, "That appointment time was just reserved. Choose another slot.", "slot_conflict");
    const holdToken = newId("token");
    const hold = {
      id: newId("hold"),
      tenantId: TENANT_ID,
      staffId,
      serviceId,
      startsAt,
      endsAt,
      customerName: cleanText(input.customerName, 80, "Name", true),
      customerPhone: cleanPhone(input.customerPhone),
      customerEmail: cleanEmail(input.customerEmail),
      customerSubject,
      idempotencyKey,
      holdToken,
      slotStarts: slots,
      status: "held",
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + HOLD_MINUTES * 6e4).toISOString()
    };
    for (const slot of slots) this.slotReservations.set(staffId + ":" + slot, hold.id);
    this.holds.set(hold.id, hold);
    this.recordAudit(actor, "booking_hold_created", "booking_hold", hold.id, "success", { staffId, serviceId });
    return { hold: this.publicHold(hold), holdToken, replayed: false };
  }
  publicHold(hold) {
    return {
      id: hold.id,
      staffId: hold.staffId,
      serviceId: hold.serviceId,
      startsAt: hold.startsAt,
      endsAt: hold.endsAt,
      status: hold.status,
      expiresAt: hold.expiresAt
    };
  }
  async confirmBooking(input, actor) {
    this.expireHolds();
    const holdId = cleanText(input.holdId, 100, "Booking hold", true);
    const holdToken = cleanText(input.holdToken, 200, "Booking confirmation token", true);
    const idempotencyKey = cleanText(input.idempotencyKey, 180, "Confirmation request key", true);
    const existing = Array.from(this.bookings.values()).find((booking2) => booking2.idempotencyKey === idempotencyKey);
    if (existing) return { booking: this.publicBooking(existing), replayed: true };
    const hold = this.holds.get(holdId);
    assert(hold, 404, "This booking hold no longer exists.", "hold_not_found");
    if (hold.customerSubject) {
      assert(hold.customerSubject === customerSubjectFor(actor), 403, "This booking hold belongs to another customer account.", "booking_not_owned");
    }
    assert(fixedTimeEqual(hold.holdToken, holdToken), 403, "This booking confirmation is not valid.", "hold_token_invalid");
    assert(hold.status === "held" && new Date(hold.expiresAt).getTime() > Date.now(), 409, "This booking hold expired. Choose another appointment time.", "hold_expired");
    const booking = {
      id: newId("booking"),
      tenantId: TENANT_ID,
      holdId: hold.id,
      staffId: hold.staffId,
      serviceId: hold.serviceId,
      startsAt: hold.startsAt,
      endsAt: hold.endsAt,
      customerName: hold.customerName,
      customerPhone: hold.customerPhone,
      customerEmail: hold.customerEmail,
      customerSubject: hold.customerSubject || null,
      status: "confirmed",
      idempotencyKey,
      createdAt: nowIso()
    };
    hold.status = "confirmed";
    for (const slot of hold.slotStarts) this.slotReservations.set(hold.staffId + ":" + slot, booking.id);
    this.bookings.set(booking.id, booking);
    this.recordAudit(actor, "booking_confirmed", "booking", booking.id, "success", { staffId: booking.staffId, serviceId: booking.serviceId });
    return { booking: this.publicBooking(booking), replayed: false };
  }
  publicBooking(booking) {
    return {
      id: booking.id,
      staffId: booking.staffId,
      serviceId: booking.serviceId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      status: booking.status
    };
  }
  queueSnapshot(entry) {
    const active = Array.from(this.queue.values()).filter((candidate) => ACTIVE_QUEUE_STATUSES.has(candidate.status)).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const position = Math.max(0, active.findIndex((candidate) => candidate.id === entry.id) + 1);
    const average = this.settings.queueAverageMinutes;
    return {
      id: entry.id,
      position,
      estimatedWaitRange: average && position ? Math.max(0, (position - 1) * average) + "\u2013" + position * average + " min" : null,
      notificationStatus: entry.notificationStatus,
      status: entry.status
    };
  }
  getQueue(entryId) {
    this.expireHolds();
    const entry = entryId ? this.queue.get(entryId) : null;
    return {
      enabled: Boolean(this.settings.walkInsEnabled),
      entry: entry ? this.queueSnapshot(entry) : null
    };
  }
  getAdminQueue() {
    this.expireHolds();
    const active = Array.from(this.queue.values()).filter((entry) => ACTIVE_QUEUE_STATUSES.has(entry.status)).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    const average = this.settings.queueAverageMinutes;
    return active.map((entry, index) => {
      const position = index + 1;
      return {
        id: entry.id,
        customerDisplayName: entry.customerDisplayName,
        position,
        estimatedWaitRange: average ? Math.max(0, (position - 1) * average) + "\xE2\u20AC\u201C" + position * average + " min" : null,
        notificationStatus: entry.notificationStatus,
        status: entry.status,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      };
    });
  }
  joinQueue(input, actor) {
    assert(this.settings.walkInsEnabled, 409, "Walk-in requests are not enabled by the owner right now.", "walkins_disabled");
    const entry = {
      id: newId("queue"),
      tenantId: TENANT_ID,
      customerDisplayName: maskQueueName(input.customerName),
      customerPhone: cleanPhone(input.customerPhone),
      notificationStatus: input.customerPhone ? "pending" : "not_requested",
      status: "waiting",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.queue.set(entry.id, entry);
    this.recordAudit(actor, "queue_entry_created", "queue_entry", entry.id, "success", {});
    return this.queueSnapshot(entry);
  }
  updateQueueStatus(input, actor) {
    const entry = this.queue.get(cleanText(input.entryId, 100, "Queue entry", true));
    assert(entry, 404, "Queue entry not found.", "queue_not_found");
    const status = cleanText(input.status, 40, "Queue status", true);
    assert(["waiting", "called", "in_service", "completed", "cancelled"].includes(status), 400, "Queue status is not valid.", "invalid_input");
    entry.status = status;
    entry.updatedAt = nowIso();
    this.recordAudit(actor, "queue_status_updated", "queue_entry", entry.id, "success", { status });
    return this.queueSnapshot(entry);
  }
  createMarketingCadence(input, actor) {
    const details = marketingCadenceInput(input);
    const cadence = {
      id: newId("cadence"),
      tenantId: TENANT_ID,
      ...details,
      createdBy: actor.sub,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.marketingCadences.set(cadence.id, cadence);
    this.recordAudit(actor, "marketing_cadence_created", "marketing_cadence", cadence.id, "success", { channel: cadence.channel, frequency: cadence.frequency, active: cadence.active });
    return clone(cadence);
  }
  updateMarketingCadence(cadenceId, input, actor) {
    const id = cleanText(cadenceId, 100, "Marketing cadence", true);
    const cadence = this.marketingCadences.get(id);
    assert(cadence, 404, "Marketing cadence not found.", "cadence_not_found");
    const source = input || {};
    const allowed = ["name", "channel", "objective", "audience", "frequency", "nextDraftAt", "active"];
    for (const key of Object.keys(source)) assert(allowed.includes(key), 400, "That marketing cadence setting cannot be edited here.", "invalid_setting");
    const marketingFields = marketingDraftInput({
      channel: Object.prototype.hasOwnProperty.call(source, "channel") ? source.channel : cadence.channel,
      objective: Object.prototype.hasOwnProperty.call(source, "objective") ? source.objective : cadence.objective,
      audience: Object.prototype.hasOwnProperty.call(source, "audience") ? source.audience : cadence.audience
    });
    Object.assign(cadence, marketingFields);
    if (Object.prototype.hasOwnProperty.call(source, "name")) cadence.name = cleanText(source.name, 80, "Cadence name", true);
    if (Object.prototype.hasOwnProperty.call(source, "frequency")) {
      cadence.frequency = cleanText(source.frequency, 20, "Marketing frequency", true).toLowerCase();
      assert(MARKETING_FREQUENCIES.has(cadence.frequency), 400, "Choose a supported marketing frequency.", "invalid_input");
    }
    if (Object.prototype.hasOwnProperty.call(source, "active")) cadence.active = normalizeBoolean(source.active);
    if (Object.prototype.hasOwnProperty.call(source, "nextDraftAt")) cadence.nextDraftAt = parseFutureDate(source.nextDraftAt, "Next draft time").toISOString();
    cadence.updatedAt = nowIso();
    this.recordAudit(actor, "marketing_cadence_updated", "marketing_cadence", cadence.id, "success", { active: cadence.active, editedFields: Object.keys(source).sort() });
    return clone(cadence);
  }
  runDueMarketingCadences(reference, actor) {
    const now = reference instanceof Date ? reference : new Date(reference || Date.now());
    assert(!Number.isNaN(now.getTime()), 500, "The marketing scheduler received an invalid time.", "configuration_error");
    const policy = this.agentPolicies.get("breeze-marketing");
    if (!policy || !policy.enabled || !policy.allowedTools.includes("draft_marketing")) {
      this.recordAudit(actor || { sub: "system", role: "manager" }, "marketing_cadence_skipped", "agent_policy", "breeze-marketing", "success", { reason: "draft_tool_not_allowed" });
      return { created: [], reviewBlockedCadenceIds: [], skipped: true };
    }
    const created = [];
    const reviewBlockedCadenceIds = new Set(Array.from(this.marketingDrafts.values()).filter((draft) => marketingDraftNeedsReview(draft) && draft.cadenceId).map((draft) => draft.cadenceId));
    const blocked = [];
    for (const cadence of this.marketingCadences.values()) {
      if (!cadence.active || new Date(cadence.nextDraftAt).getTime() > now.getTime()) continue;
      if (reviewBlockedCadenceIds.has(cadence.id)) {
        blocked.push(cadence.id);
        continue;
      }
      const draft = this.createMarketingDraft({ channel: cadence.channel, objective: cadence.objective, audience: cadence.audience }, actor || { sub: "breeze-marketing-scheduler", role: "manager" }, cadence.id);
      cadence.nextDraftAt = nextCadenceAt(cadence.nextDraftAt, cadence.frequency, now);
      cadence.updatedAt = nowIso();
      created.push(draft);
      this.recordAudit(actor || { sub: "breeze-marketing-scheduler", role: "manager" }, "marketing_cadence_draft_created", "marketing_cadence", cadence.id, "success", { marketingDraftId: draft.id, nextDraftAt: cadence.nextDraftAt });
    }
    return { created, reviewBlockedCadenceIds: blocked, skipped: false };
  }
  requestAgentPolicyChange(policyId, input, actor) {
    const id = cleanText(policyId, 100, "Agent policy", true);
    const policy = this.agentPolicies.get(id);
    assert(policy, 404, "Agent policy not found.", "agent_policy_not_found");
    const next = agentPolicyChange(input, policy);
    const existing = Array.from(this.approvals.values()).find((approval2) => approval2.targetType === "agent_policy" && approval2.targetId === policy.id && approval2.status === "pending");
    assert(!existing, 409, "This agent policy already has a pending approval request.", "approval_pending");
    const approval = {
      id: newId("approval"),
      tenantId: TENANT_ID,
      actionType: "integration_change",
      targetType: "agent_policy",
      targetId: policy.id,
      payload: next,
      status: "pending",
      requestedBy: actor.sub,
      decidedBy: null,
      decisionNote: null,
      createdAt: nowIso(),
      decidedAt: null
    };
    this.approvals.set(approval.id, approval);
    this.recordAudit(actor, "agent_policy_change_requested", "approval_request", approval.id, "success", { agentKey: policy.agentKey });
    return clone(approval);
  }
  createIntegrationDraft(input, actor) {
    const details = integrationDraftInput(input);
    const integration = {
      id: newId("integration"),
      tenantId: TENANT_ID,
      ...details,
      status: "draft",
      createdBy: actor.sub,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.integrationConfigs.set(integration.id, integration);
    this.recordAudit(actor, "integration_draft_created", "integration_config", integration.id, "success", { integrationType: integration.integrationType });
    return clone(integration);
  }
  saveIntegrationDraft(integrationId, input, actor) {
    const id = cleanText(integrationId, 100, "Integration", true);
    const current = this.integrationConfigs.get(id);
    assert(current, 404, "Integration configuration not found.", "integration_not_found");
    assert(current.status !== "approval_requested", 409, "This integration has a pending approval request and cannot be edited.", "approval_pending");
    const details = integrationDraftInput(input);
    if (current.status === "approved" || current.status === "disabled") {
      const revision = this.createIntegrationDraft(details, actor);
      this.recordAudit(actor, "integration_revision_draft_created", "integration_config", revision.id, "success", { revisedFrom: current.id, integrationType: revision.integrationType });
      return { integration: revision, revisedFrom: current.id };
    }
    Object.assign(current, details, { status: "draft", updatedAt: nowIso() });
    this.recordAudit(actor, "integration_draft_updated", "integration_config", current.id, "success", { integrationType: current.integrationType });
    return { integration: clone(current), revisedFrom: null };
  }
  disableIntegration(integrationId, actor) {
    const id = cleanText(integrationId, 100, "Integration", true);
    const integration = this.integrationConfigs.get(id);
    assert(integration, 404, "Integration configuration not found.", "integration_not_found");
    assert(integration.status === "approved", 409, "Only an approved integration can be disabled.", "invalid_state");
    integration.status = "disabled";
    integration.updatedAt = nowIso();
    this.recordAudit(actor, "integration_disabled", "integration_config", integration.id, "success", { integrationType: integration.integrationType });
    return clone(integration);
  }
  requestIntegrationApproval(integrationId, actor) {
    const id = cleanText(integrationId, 100, "Integration", true);
    const integration = this.integrationConfigs.get(id);
    assert(integration, 404, "Integration draft not found.", "integration_not_found");
    assert(integration.status === "draft" || integration.status === "rejected", 409, "Only an integration draft can be submitted for approval.", "invalid_state");
    const existing = Array.from(this.approvals.values()).find((approval2) => approval2.targetType === "integration_config" && approval2.targetId === id && approval2.status === "pending");
    assert(!existing, 409, "This integration already has a pending approval request.", "approval_pending");
    integration.status = "approval_requested";
    integration.updatedAt = nowIso();
    const approval = {
      id: newId("approval"),
      tenantId: TENANT_ID,
      actionType: "integration_change",
      targetType: "integration_config",
      targetId: id,
      payload: { integrationType: integration.integrationType, providerName: integration.providerName, capabilities: integration.capabilities },
      status: "pending",
      requestedBy: actor.sub,
      decidedBy: null,
      decisionNote: null,
      createdAt: nowIso(),
      decidedAt: null
    };
    this.approvals.set(approval.id, approval);
    this.recordAudit(actor, "integration_approval_requested", "approval_request", approval.id, "success", { integrationType: integration.integrationType });
    return clone(approval);
  }
  createMarketingDraft(input, actor, cadenceId) {
    const { channel, objective, audience } = marketingDraftInput(input);
    const content = marketingDraftContent(input, defaultMarketingDraftContent({ channel, objective, audience }));
    const safeCadenceId = cadenceId ? cleanText(cadenceId, 100, "Marketing cadence", true) : null;
    const draft = {
      id: newId("marketing"),
      tenantId: TENANT_ID,
      channel,
      objective,
      audience,
      cadenceId: safeCadenceId,
      content: "DRAFT \u2014 OWNER APPROVAL REQUIRED\n\nBreezy Cuts \xB7 Quincy, Illinois\nFresh Cuts. Easy Booking.\n\nObjective: " + objective + (audience ? "\nAudience: " + audience : "") + "\n\nBefore publishing, an owner must verify services, pricing, availability, claims, and destination links.",
      status: "draft",
      createdBy: actor.sub,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    draft.content = content;
    this.marketingDrafts.set(draft.id, draft);
    this.recordAudit(actor, "marketing_draft_created", "marketing_draft", draft.id, "success", { channel, cadenceId: safeCadenceId });
    return clone(draft);
  }
  updateMarketingDraft(marketingId, input, actor) {
    const id = cleanText(marketingId, 100, "Marketing draft", true);
    const draft = this.marketingDrafts.get(id);
    assert(draft, 404, "Marketing draft not found.", "marketing_not_found");
    assert(draft.status === "draft" || draft.status === "rejected", 409, "Only an unsubmitted or rejected marketing draft can be edited.", "invalid_state");
    const details = marketingDraftUpdateInput(input, draft);
    Object.assign(draft, details, { status: "draft", updatedAt: nowIso() });
    this.recordAudit(actor, "marketing_draft_updated", "marketing_draft", draft.id, "success", { channel: draft.channel, editedFields: Object.keys(input || {}).sort() });
    return clone(draft);
  }
  requestMarketingApproval(marketingId, actor) {
    const draft = this.marketingDrafts.get(marketingId);
    assert(draft, 404, "Marketing draft not found.", "marketing_not_found");
    assert(draft.status === "draft", 409, "Only a draft can be submitted for approval.", "invalid_state");
    draft.status = "approval_requested";
    draft.updatedAt = nowIso();
    const approval = {
      id: newId("approval"),
      tenantId: TENANT_ID,
      actionType: "bulk_marketing",
      targetType: "marketing_draft",
      targetId: draft.id,
      payload: { channel: draft.channel },
      status: "pending",
      requestedBy: actor.sub,
      decidedBy: null,
      decisionNote: null,
      createdAt: nowIso(),
      decidedAt: null
    };
    this.approvals.set(approval.id, approval);
    this.recordAudit(actor, "marketing_approval_requested", "approval_request", approval.id, "success", { marketingDraftId: draft.id });
    return clone(approval);
  }
  decideApproval(input, actor) {
    const approval = this.approvals.get(cleanText(input.approvalId, 100, "Approval", true));
    assert(approval, 404, "Approval request not found.", "approval_not_found");
    assert(approval.status === "pending", 409, "This approval request has already been decided.", "invalid_state");
    const decision = cleanText(input.decision, 20, "Decision", true);
    assert(["approved", "rejected"].includes(decision), 400, "Decision must be approved or rejected.", "invalid_input");
    approval.status = decision;
    approval.decidedBy = actor.sub;
    approval.decisionNote = cleanOptionalText(input.note, 500, "Decision note");
    approval.decidedAt = nowIso();
    if (approval.targetType === "marketing_draft") {
      const draft = this.marketingDrafts.get(approval.targetId);
      if (draft) {
        draft.status = decision === "approved" ? "approved" : "rejected";
        draft.updatedAt = nowIso();
      }
    }
    if (approval.targetType === "service" && approval.actionType === "pricing_change" && decision === "approved") {
      const service = this.services.find((candidate) => candidate.id === approval.targetId);
      if (service) {
        service.name = approval.payload.name;
        service.description = approval.payload.description;
        service.durationMinutes = approval.payload.durationMinutes;
        service.priceCents = approval.payload.priceCents;
        service.approved = true;
        service.sample = false;
        service.updatedAt = nowIso();
      }
    }
    if (approval.targetType === "membership_plan" && approval.actionType === "pricing_change" && decision === "approved") {
      const plan = this.membershipPlans.get(approval.targetId);
      if (plan) {
        plan.name = approval.payload.name;
        plan.description = approval.payload.description;
        plan.priceCents = approval.payload.priceCents;
        plan.billingInterval = approval.payload.billingInterval;
        if (Object.prototype.hasOwnProperty.call(approval.payload, "active")) plan.active = Boolean(approval.payload.active);
        plan.approved = true;
        plan.updatedAt = nowIso();
      }
    }
    if (approval.targetType === "agent_policy" && approval.actionType === "integration_change" && decision === "approved") {
      const policy = this.agentPolicies.get(approval.targetId);
      if (policy) {
        policy.enabled = Boolean(approval.payload.enabled);
        policy.allowedTools = cleanAgentTools(approval.payload.allowedTools || []);
        policy.externalActionsEnabled = false;
        policy.updatedAt = nowIso();
      }
    }
    if (approval.targetType === "integration_config") {
      const integration = this.integrationConfigs.get(approval.targetId);
      if (integration) {
        integration.status = decision === "approved" ? "approved" : "rejected";
        integration.updatedAt = nowIso();
      }
    }
    this.recordAudit(actor, "approval_" + decision, "approval_request", approval.id, "success", { actionType: approval.actionType });
    return clone(approval);
  }
};
function createLocalStore() {
  return new MemoryStore();
}
__name(createLocalStore, "createLocalStore");
function fromJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
__name(fromJson, "fromJson");
function settingsFromRow(row) {
  return {
    tenantId: row.tenant_id,
    businessName: row.business_name,
    tagline: row.tagline,
    city: row.city,
    region: row.region,
    country: row.country,
    timezone: row.timezone,
    address: row.address,
    hours: row.hours_text,
    website: row.website,
    bookingUrl: row.booking_url,
    socialProfiles: fromJson(row.social_profiles_json, {}),
    publicPhoneEnabled: Boolean(row.public_phone_enabled),
    walkInsEnabled: Boolean(row.walk_ins_enabled),
    queueAverageMinutes: row.queue_average_minutes === null ? null : Number(row.queue_average_minutes)
  };
}
__name(settingsFromRow, "settingsFromRow");
function staffFromRow(row) {
  return {
    id: row.id,
    name: row.display_name,
    phone: row.phone_e164,
    skills: fromJson(row.skills_json, []),
    availability: row.availability_summary,
    active: Boolean(row.active),
    bookable: Boolean(row.bookable),
    publicPhoneEnabled: Boolean(row.public_phone_enabled)
  };
}
__name(staffFromRow, "staffFromRow");
function serviceFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: Number(row.duration_minutes),
    priceCents: row.price_cents === null ? null : Number(row.price_cents),
    approved: Boolean(row.approved),
    sample: Boolean(row.sample)
  };
}
__name(serviceFromRow, "serviceFromRow");
function membershipPlanFromRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    priceCents: Number(row.price_cents),
    billingInterval: row.billing_interval,
    approved: Boolean(row.approved),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(membershipPlanFromRow, "membershipPlanFromRow");
function approvalFromRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    actionType: row.action_type,
    targetType: row.target_type,
    targetId: row.target_id,
    payload: fromJson(row.payload_json, {}),
    status: row.status,
    requestedBy: row.requested_by,
    decidedBy: row.decided_by,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
    decidedAt: row.decided_at
  };
}
__name(approvalFromRow, "approvalFromRow");
function marketingFromRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    channel: row.channel,
    objective: row.objective,
    audience: row.audience,
    content: row.content,
    cadenceId: row.cadence_id || null,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(marketingFromRow, "marketingFromRow");
function customerProfileFromRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    subject: row.auth_subject,
    communicationConsent: Boolean(row.communication_consent),
    privacyConsent: Boolean(row.privacy_consent),
    preferredStaffId: row.preferred_staff_id || null,
    accessNeeds: row.access_needs || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(customerProfileFromRow, "customerProfileFromRow");
function marketingCadenceFromRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    channel: row.channel,
    objective: row.objective,
    audience: row.audience,
    frequency: row.frequency,
    nextDraftAt: row.next_draft_at,
    active: Boolean(row.active),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(marketingCadenceFromRow, "marketingCadenceFromRow");
function agentPolicyFromRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    agentKey: row.agent_key,
    displayName: row.display_name,
    enabled: Boolean(row.enabled),
    allowedTools: fromJson(row.allowed_tools_json, []),
    externalActionsEnabled: false,
    updatedAt: row.updated_at
  };
}
__name(agentPolicyFromRow, "agentPolicyFromRow");
function integrationFromRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    integrationType: row.integration_type,
    providerName: row.provider_name,
    secretReference: row.secret_reference || null,
    capabilities: fromJson(row.capabilities_json, []),
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(integrationFromRow, "integrationFromRow");
async function derivedHoldToken(holdId, idempotencyKey, secret) {
  assert(secret, 500, "The production booking secret is not configured.", "server_misconfigured");
  return hmacBase64Url("booking-hold:" + holdId + ":" + idempotencyKey, secret);
}
__name(derivedHoldToken, "derivedHoldToken");
var D1Store = class {
  static {
    __name(this, "D1Store");
  }
  constructor(database, sessionSecret) {
    this.db = database;
    this.sessionSecret = sessionSecret;
  }
  async settingRow() {
    const row = await this.db.prepare("SELECT * FROM business_settings WHERE tenant_id = ?").bind(TENANT_ID).first();
    assert(row, 500, "The business configuration has not been initialized.", "configuration_error");
    return row;
  }
  async getPublicConfig() {
    const [settingsRow, serviceCount, availabilityCount] = await Promise.all([
      this.settingRow(),
      this.db.prepare("SELECT COUNT(*) AS count FROM services WHERE tenant_id = ? AND approved = 1 AND price_cents IS NOT NULL").bind(TENANT_ID).first(),
      this.db.prepare(
        "SELECT COUNT(*) AS count FROM availability_windows AS window JOIN staff ON staff.tenant_id = window.tenant_id AND staff.id = window.staff_id WHERE window.tenant_id = ? AND window.ends_at > ? AND staff.active = 1 AND staff.bookable = 1"
      ).bind(TENANT_ID, nowIso()).first()
    ]);
    const settings = settingsFromRow(settingsRow);
    return {
      ...publicSettings(settings),
      bookingReady: Number(serviceCount.count) > 0 && Number(availabilityCount.count) > 0,
      brandAssetStatus: "draft_pending_owner_approval"
    };
  }
  async getPublicServices() {
    const result = await this.db.prepare(
      "SELECT * FROM services WHERE tenant_id = ? AND approved = 1 AND price_cents IS NOT NULL ORDER BY name"
    ).bind(TENANT_ID).all();
    return result.results.map(serviceFromRow).map(publicService);
  }
  async getPublicStaff() {
    const [settingsRow, staffResult] = await Promise.all([
      this.settingRow(),
      this.db.prepare("SELECT * FROM staff WHERE tenant_id = ? AND active = 1 ORDER BY display_name").bind(TENANT_ID).all()
    ]);
    const settings = settingsFromRow(settingsRow);
    return staffResult.results.map(staffFromRow).map((staff) => publicStaff(staff, settings));
  }
  async getAdminOverview() {
    const summaryReference = nowIso();
    const [settingsRow, staffResult, servicesResult, membershipPlansResult, availabilityResult, approvalsResult, draftsResult, cadencesResult, agentPoliciesResult, integrationConfigsResult, auditResult, draftSummaryRow, cadenceSummaryRow] = await Promise.all([
      this.settingRow(),
      this.db.prepare("SELECT * FROM staff WHERE tenant_id = ? ORDER BY display_name").bind(TENANT_ID).all(),
      this.db.prepare("SELECT * FROM services WHERE tenant_id = ? ORDER BY name").bind(TENANT_ID).all(),
      this.db.prepare("SELECT * FROM membership_plans WHERE tenant_id = ? ORDER BY name").bind(TENANT_ID).all(),
      this.db.prepare("SELECT * FROM availability_windows WHERE tenant_id = ? ORDER BY starts_at DESC LIMIT 100").bind(TENANT_ID).all(),
      this.db.prepare("SELECT * FROM approval_requests WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50").bind(TENANT_ID).all(),
      this.db.prepare("SELECT * FROM marketing_drafts WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 50").bind(TENANT_ID).all(),
      this.db.prepare("SELECT * FROM marketing_cadences WHERE tenant_id = ? ORDER BY next_draft_at ASC LIMIT 50").bind(TENANT_ID).all(),
      this.db.prepare("SELECT * FROM agent_policies WHERE tenant_id = ? ORDER BY display_name").bind(TENANT_ID).all(),
      this.db.prepare("SELECT * FROM integration_configs WHERE tenant_id = ? ORDER BY updated_at DESC LIMIT 50").bind(TENANT_ID).all(),
      this.db.prepare("SELECT * FROM audit_events WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50").bind(TENANT_ID).all(),
      this.db.prepare("SELECT SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_ready_for_review, SUM(CASE WHEN status = 'approval_requested' THEN 1 ELSE 0 END) AS approval_requested_count FROM marketing_drafts WHERE tenant_id = ?").bind(TENANT_ID).first(),
      this.db.prepare("SELECT COUNT(*) AS active_cadence_count, SUM(CASE WHEN next_draft_at <= ? THEN 1 ELSE 0 END) AS overdue_cadence_count, MIN(next_draft_at) AS next_draft_at, SUM(CASE WHEN EXISTS (SELECT 1 FROM marketing_drafts AS draft WHERE draft.tenant_id = cadence.tenant_id AND draft.cadence_id = cadence.id AND draft.status IN ('draft', 'approval_requested')) THEN 1 ELSE 0 END) AS review_blocked_cadence_count FROM marketing_cadences AS cadence WHERE tenant_id = ? AND active = 1").bind(summaryReference, TENANT_ID).first()
    ]);
    const marketingSummary = {
      activeCadenceCount: Number(cadenceSummaryRow?.active_cadence_count ?? 0),
      draftReadyForReview: Number(draftSummaryRow?.draft_ready_for_review ?? 0),
      approvalRequestedCount: Number(draftSummaryRow?.approval_requested_count ?? 0),
      reviewBlockedCadenceCount: Number(cadenceSummaryRow?.review_blocked_cadence_count ?? 0),
      overdueCadenceCount: Number(cadenceSummaryRow?.overdue_cadence_count ?? 0),
      nextDraftAt: cadenceSummaryRow && cadenceSummaryRow.next_draft_at ? cadenceSummaryRow.next_draft_at : null,
      externalDeliveryEnabled: false
    };
    return {
      settings: settingsFromRow(settingsRow),
      staff: staffResult.results.map(staffFromRow),
      services: servicesResult.results.map(serviceFromRow),
      membershipPlans: membershipPlansResult.results.map(membershipPlanFromRow),
      availabilityWindows: availabilityResult.results.map((window) => ({
        id: window.id,
        staffId: window.staff_id,
        startsAt: window.starts_at,
        endsAt: window.ends_at,
        createdAt: window.created_at
      })),
      approvals: approvalsResult.results.map(approvalFromRow),
      marketingSummary,
      marketingDrafts: draftsResult.results.map(marketingFromRow),
      marketingCadences: cadencesResult.results.map(marketingCadenceFromRow),
      agentPolicies: agentPoliciesResult.results.map(agentPolicyFromRow),
      integrationConfigs: integrationConfigsResult.results.map(integrationFromRow),
      auditEvents: auditResult.results.map((event) => ({
        id: event.id,
        actorId: event.actor_id,
        actorRole: event.actor_role,
        action: event.action,
        targetType: event.target_type,
        targetId: event.target_id,
        outcome: event.outcome,
        metadata: fromJson(event.metadata_json, {}),
        createdAt: event.created_at
      }))
    };
  }
  async recordAudit(actor, action, targetType, targetId, outcome, metadata) {
    const payload = {
      id: newId("audit"),
      tenantId: TENANT_ID,
      actorId: actor && actor.sub ? actor.sub : "public",
      actorRole: actor && actor.role ? actor.role : "public",
      action,
      targetType,
      targetId: targetId || null,
      outcome,
      metadata: metadata || {},
      createdAt: nowIso()
    };
    await this.db.prepare(
      "INSERT INTO audit_events (id, tenant_id, actor_id, actor_role, action, target_type, target_id, outcome, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      payload.id,
      payload.tenantId,
      payload.actorId,
      payload.actorRole,
      payload.action,
      payload.targetType,
      payload.targetId,
      payload.outcome,
      JSON.stringify(payload.metadata),
      payload.createdAt
    ).run();
    return payload;
  }
  async updateSettings(input, actor) {
    const current = settingsFromRow(await this.settingRow());
    const allowed = ["address", "hours", "website", "bookingUrl", "publicPhoneEnabled", "walkInsEnabled", "queueAverageMinutes", "socialProfiles"];
    for (const key of Object.keys(input || {})) assert(allowed.includes(key), 400, "That business setting cannot be edited here.", "invalid_setting");
    if (Object.prototype.hasOwnProperty.call(input, "address")) current.address = cleanOptionalText(input.address, 220, "Address");
    if (Object.prototype.hasOwnProperty.call(input, "hours")) current.hours = cleanOptionalText(input.hours, 500, "Hours");
    if (Object.prototype.hasOwnProperty.call(input, "bookingUrl")) current.bookingUrl = cleanHttpsUrl(input.bookingUrl, "Booking URL");
    if (Object.prototype.hasOwnProperty.call(input, "publicPhoneEnabled")) current.publicPhoneEnabled = normalizeBoolean(input.publicPhoneEnabled);
    if (Object.prototype.hasOwnProperty.call(input, "walkInsEnabled")) current.walkInsEnabled = normalizeBoolean(input.walkInsEnabled);
    if (Object.prototype.hasOwnProperty.call(input, "website")) current.website = cleanHttpsUrl(input.website, "Website");
    if (Object.prototype.hasOwnProperty.call(input, "queueAverageMinutes")) {
      const amount = input.queueAverageMinutes === null || input.queueAverageMinutes === "" ? null : Number(input.queueAverageMinutes);
      assert(amount === null || Number.isInteger(amount) && amount >= 5 && amount <= 240, 400, "Queue time must be a whole number between 5 and 240 minutes.", "invalid_input");
      current.queueAverageMinutes = amount;
    }
    if (Object.prototype.hasOwnProperty.call(input, "socialProfiles")) current.socialProfiles = cleanSocialProfiles(input.socialProfiles);
    const updatedAt = nowIso();
    await this.db.prepare(
      "UPDATE business_settings SET address = ?, hours_text = ?, website = ?, booking_url = ?, social_profiles_json = ?, public_phone_enabled = ?, walk_ins_enabled = ?, queue_average_minutes = ?, updated_at = ? WHERE tenant_id = ?"
    ).bind(
      current.address,
      current.hours,
      current.website,
      current.bookingUrl,
      JSON.stringify(current.socialProfiles),
      current.publicPhoneEnabled ? 1 : 0,
      current.walkInsEnabled ? 1 : 0,
      current.queueAverageMinutes,
      updatedAt,
      TENANT_ID
    ).run();
    await this.recordAudit(actor, "business_settings_updated", "business_settings", TENANT_ID, "success", {});
    return current;
  }
  async createStaff(input, actor) {
    const createdAt = nowIso();
    const staff = {
      id: newId("staff"),
      ...newStaffRecord(input),
      createdAt,
      updatedAt: createdAt
    };
    await this.db.prepare(
      "INSERT INTO staff (id, tenant_id, display_name, phone_e164, skills_json, availability_summary, active, bookable, public_phone_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      staff.id,
      TENANT_ID,
      staff.name,
      staff.phone,
      JSON.stringify(staff.skills),
      staff.availability,
      staff.active ? 1 : 0,
      staff.bookable ? 1 : 0,
      staff.publicPhoneEnabled ? 1 : 0,
      staff.createdAt,
      staff.updatedAt
    ).run();
    await this.recordAudit(actor, "staff_created", "staff", staff.id, "success", {
      active: staff.active,
      bookable: staff.bookable,
      publicPhoneEnabled: staff.publicPhoneEnabled
    });
    return { tenantId: TENANT_ID, ...staff };
  }
  async updateStaff(staffId, input, actor) {
    const id = cleanText(staffId, 100, "Staff member", true);
    const row = await this.db.prepare("SELECT * FROM staff WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Staff member not found.", "staff_not_found");
    const staff = updatedStaffRecord(input, staffFromRow(row));
    const updatedAt = nowIso();
    await this.db.prepare(
      "UPDATE staff SET display_name = ?, phone_e164 = ?, skills_json = ?, availability_summary = ?, active = ?, bookable = ?, public_phone_enabled = ?, updated_at = ? WHERE tenant_id = ? AND id = ?"
    ).bind(
      staff.name,
      staff.phone,
      JSON.stringify(staff.skills),
      staff.availability,
      staff.active ? 1 : 0,
      staff.bookable ? 1 : 0,
      staff.publicPhoneEnabled ? 1 : 0,
      updatedAt,
      TENANT_ID,
      id
    ).run();
    await this.recordAudit(actor, "staff_updated", "staff", id, "success", {
      active: staff.active,
      bookable: staff.bookable,
      publicPhoneEnabled: staff.publicPhoneEnabled
    });
    return { id, ...staff };
  }
  async ensureCustomerProfile(actor) {
    const subject = customerSubjectFor(actor);
    assert(subject, 401, "Sign in with a customer account to use the portal.", "authentication_required");
    let row = await this.db.prepare(
      "SELECT * FROM customer_profiles WHERE tenant_id = ? AND auth_subject = ?"
    ).bind(TENANT_ID, subject).first();
    if (!row) {
      const createdAt = nowIso();
      const profile = {
        id: newId("customer"),
        subject,
        communicationConsent: false,
        privacyConsent: false,
        preferredStaffId: null,
        accessNeeds: null,
        createdAt,
        updatedAt: createdAt
      };
      await this.db.prepare(
        "INSERT INTO customer_profiles (id, tenant_id, auth_subject, communication_consent, privacy_consent, preferred_staff_id, access_needs, created_at, updated_at) VALUES (?, ?, ?, 0, 0, NULL, NULL, ?, ?)"
      ).bind(profile.id, TENANT_ID, profile.subject, profile.createdAt, profile.updatedAt).run();
      await this.recordAudit(actor, "customer_portal_profile_created", "customer_profile", profile.id, "success", {});
      return { tenantId: TENANT_ID, ...profile };
    }
    return customerProfileFromRow(row);
  }
  async getPortalSummary(actor) {
    const profile = await this.ensureCustomerProfile(actor);
    const [appointmentsResult, membershipRow, loyaltyRow] = await Promise.all([
      this.db.prepare(
        "SELECT bookings.id, bookings.staff_id, bookings.service_id, bookings.starts_at, bookings.ends_at, bookings.status, staff.display_name AS staff_name, services.name AS service_name, services.price_cents AS service_price_cents, services.approved AS service_approved FROM bookings LEFT JOIN staff ON staff.tenant_id = bookings.tenant_id AND staff.id = bookings.staff_id LEFT JOIN services ON services.tenant_id = bookings.tenant_id AND services.id = bookings.service_id WHERE bookings.tenant_id = ? AND bookings.customer_subject = ? ORDER BY bookings.starts_at DESC LIMIT 50"
      ).bind(TENANT_ID, profile.subject).all(),
      this.db.prepare(
        "SELECT customer_memberships.status, customer_memberships.ends_at, membership_plans.name AS plan_name, membership_plans.billing_interval FROM customer_memberships JOIN membership_plans ON membership_plans.tenant_id = customer_memberships.tenant_id AND membership_plans.id = customer_memberships.plan_id WHERE customer_memberships.tenant_id = ? AND customer_memberships.customer_subject = ? ORDER BY customer_memberships.updated_at DESC LIMIT 1"
      ).bind(TENANT_ID, profile.subject).first(),
      this.db.prepare(
        "SELECT COALESCE(SUM(points_delta), 0) AS points FROM loyalty_ledger WHERE tenant_id = ? AND customer_subject = ?"
      ).bind(TENANT_ID, profile.subject).first()
    ]);
    return {
      profile: portalProfile(profile),
      appointments: appointmentsResult.results.map((booking) => ({
        id: booking.id,
        serviceId: booking.service_id,
        staffId: booking.staff_id,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        status: booking.status,
        staffName: booking.staff_name || "Owner-managed staff",
        serviceName: booking.service_name || "Owner-approved service",
        priceCents: booking.service_approved ? Number(booking.service_price_cents) : null,
        receiptStatus: "payment_provider_required"
      })),
      membership: membershipRow ? {
        status: membershipRow.status,
        planName: membershipRow.plan_name,
        billingInterval: membershipRow.billing_interval,
        endsAt: membershipRow.ends_at || null
      } : null,
      loyalty: { points: Number(loyaltyRow && loyaltyRow.points ? loyaltyRow.points : 0), providerRequired: true },
      paymentProviderRequired: true
    };
  }
  async updatePortalPreferences(input, actor) {
    const profile = await this.ensureCustomerProfile(actor);
    const next = updatedPortalPreferences(input, profile);
    if (next.preferredStaffId) {
      const staff = await this.db.prepare(
        "SELECT id FROM staff WHERE tenant_id = ? AND id = ? AND active = 1 AND bookable = 1"
      ).bind(TENANT_ID, next.preferredStaffId).first();
      assert(staff, 400, "Choose an active, bookable barber.", "staff_not_found");
    }
    const updatedAt = nowIso();
    await this.db.prepare(
      "UPDATE customer_profiles SET communication_consent = ?, privacy_consent = ?, preferred_staff_id = ?, access_needs = ?, updated_at = ? WHERE tenant_id = ? AND auth_subject = ?"
    ).bind(
      next.communicationConsent ? 1 : 0,
      next.privacyConsent ? 1 : 0,
      next.preferredStaffId,
      next.accessNeeds,
      updatedAt,
      TENANT_ID,
      profile.subject
    ).run();
    const updated = { ...profile, ...next, updatedAt };
    await this.recordAudit(actor, "customer_portal_preferences_updated", "customer_profile", profile.id, "success", {
      communicationConsent: updated.communicationConsent,
      privacyConsent: updated.privacyConsent,
      hasPreferredStaff: Boolean(updated.preferredStaffId),
      hasAccessNeeds: Boolean(updated.accessNeeds)
    });
    return portalProfile(updated);
  }
  async createMembershipPlanDraft(input, actor) {
    const details = membershipPlanInput(input);
    const plan = {
      id: newId("membership"),
      ...details,
      approved: false,
      active: true,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    await this.db.prepare(
      "INSERT INTO membership_plans (id, tenant_id, name, description, price_cents, billing_interval, approved, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)"
    ).bind(plan.id, TENANT_ID, plan.name, plan.description, plan.priceCents, plan.billingInterval, plan.createdAt, plan.updatedAt).run();
    await this.recordAudit(actor, "membership_plan_draft_created", "membership_plan", plan.id, "success", {});
    return { tenantId: TENANT_ID, ...plan };
  }
  async updateMembershipPlan(planId, input, actor) {
    const id = cleanText(planId, 100, "Membership plan", true);
    const row = await this.db.prepare("SELECT * FROM membership_plans WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Membership plan not found.", "membership_not_found");
    const plan = membershipPlanFromRow(row);
    const details = updatedMembershipPlan(input, plan);
    const changed = plan.name !== details.name || plan.description !== details.description || plan.priceCents !== details.priceCents || plan.billingInterval !== details.billingInterval || Boolean(plan.active) !== details.active;
    assert(changed, 400, "Make a membership plan change before saving.", "no_changes");
    const pending = await this.db.prepare(
      "SELECT id FROM approval_requests WHERE tenant_id = ? AND action_type = 'pricing_change' AND target_type = 'membership_plan' AND target_id = ? AND status = 'pending'"
    ).bind(TENANT_ID, id).first();
    assert(!pending, 409, "This membership plan already has a pending approval request.", "approval_pending");
    const updatedAt = nowIso();
    if (!plan.approved) {
      await this.db.prepare(
        "UPDATE membership_plans SET name = ?, description = ?, price_cents = ?, billing_interval = ?, active = ?, updated_at = ? WHERE tenant_id = ? AND id = ?"
      ).bind(details.name, details.description, details.priceCents, details.billingInterval, details.active ? 1 : 0, updatedAt, TENANT_ID, id).run();
      const membershipPlan = { ...plan, ...details, updatedAt };
      await this.recordAudit(actor, "membership_plan_draft_updated", "membership_plan", id, "success", {});
      return { membershipPlan, approval: null };
    }
    const approval = {
      id: newId("approval"),
      actionType: "pricing_change",
      targetType: "membership_plan",
      targetId: id,
      payload: details,
      status: "pending",
      requestedBy: actor.sub,
      createdAt: updatedAt
    };
    await this.db.prepare(
      "INSERT INTO approval_requests (id, tenant_id, action_type, target_type, target_id, payload_json, status, requested_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(approval.id, TENANT_ID, approval.actionType, approval.targetType, approval.targetId, JSON.stringify(approval.payload), approval.status, approval.requestedBy, approval.createdAt).run();
    await this.recordAudit(actor, "membership_plan_change_requested", "approval_request", approval.id, "success", { membershipPlanId: id });
    return {
      membershipPlan: plan,
      approval: { ...approval, tenantId: TENANT_ID, decidedBy: null, decisionNote: null, decidedAt: null }
    };
  }
  async requestMembershipPlanApproval(planId, actor) {
    const id = cleanText(planId, 100, "Membership plan", true);
    const row = await this.db.prepare("SELECT * FROM membership_plans WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Membership plan draft not found.", "membership_not_found");
    assert(!row.approved, 409, "This membership plan is already approved. Price changes need a new approval request.", "invalid_state");
    const pending = await this.db.prepare(
      "SELECT id FROM approval_requests WHERE tenant_id = ? AND action_type = 'pricing_change' AND target_type = 'membership_plan' AND target_id = ? AND status = 'pending'"
    ).bind(TENANT_ID, id).first();
    assert(!pending, 409, "This membership plan already has a pending approval request.", "approval_pending");
    const plan = membershipPlanFromRow(row);
    const approval = {
      id: newId("approval"),
      actionType: "pricing_change",
      targetType: "membership_plan",
      targetId: id,
      payload: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        billingInterval: plan.billingInterval,
        active: Boolean(plan.active)
      },
      status: "pending",
      requestedBy: actor.sub,
      createdAt: nowIso()
    };
    await this.db.prepare(
      "INSERT INTO approval_requests (id, tenant_id, action_type, target_type, target_id, payload_json, status, requested_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(approval.id, TENANT_ID, approval.actionType, approval.targetType, approval.targetId, JSON.stringify(approval.payload), approval.status, approval.requestedBy, approval.createdAt).run();
    await this.recordAudit(actor, "membership_plan_approval_requested", "approval_request", approval.id, "success", { membershipPlanId: id });
    return { ...approval, tenantId: TENANT_ID, decidedBy: null, decisionNote: null, decidedAt: null };
  }
  async createServiceDraft(input, actor) {
    const details = serviceInput(input);
    const service = {
      id: newId("service"),
      ...details,
      approved: false,
      sample: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    await this.db.prepare(
      "INSERT INTO services (id, tenant_id, name, description, duration_minutes, price_cents, approved, sample, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)"
    ).bind(
      service.id,
      TENANT_ID,
      service.name,
      service.description,
      service.durationMinutes,
      service.priceCents,
      service.createdAt,
      service.updatedAt
    ).run();
    await this.recordAudit(actor, "service_draft_created", "service", service.id, "success", {});
    return service;
  }
  async updateService(serviceId, input, actor) {
    const id = cleanText(serviceId, 100, "Service", true);
    const row = await this.db.prepare("SELECT * FROM services WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Service not found.", "service_not_found");
    const service = serviceFromRow(row);
    const details = serviceInput(input);
    const changed = service.name !== details.name || service.description !== details.description || service.durationMinutes !== details.durationMinutes || service.priceCents !== details.priceCents;
    assert(changed, 400, "Make a service change before saving.", "no_changes");
    const pending = await this.db.prepare(
      "SELECT id FROM approval_requests WHERE tenant_id = ? AND action_type = 'pricing_change' AND target_type = 'service' AND target_id = ? AND status = 'pending'"
    ).bind(TENANT_ID, id).first();
    assert(!pending, 409, "This service already has a pending approval request.", "approval_pending");
    const updatedAt = nowIso();
    if (!service.approved) {
      await this.db.prepare(
        "UPDATE services SET name = ?, description = ?, duration_minutes = ?, price_cents = ?, updated_at = ? WHERE tenant_id = ? AND id = ?"
      ).bind(details.name, details.description, details.durationMinutes, details.priceCents, updatedAt, TENANT_ID, id).run();
      const updatedService = { ...service, ...details };
      await this.recordAudit(actor, "service_draft_updated", "service", id, "success", {});
      return { service: updatedService, approval: null };
    }
    const approval = {
      id: newId("approval"),
      actionType: "pricing_change",
      targetType: "service",
      targetId: id,
      payload: details,
      status: "pending",
      requestedBy: actor.sub,
      createdAt: updatedAt
    };
    await this.db.prepare(
      "INSERT INTO approval_requests (id, tenant_id, action_type, target_type, target_id, payload_json, status, requested_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(approval.id, TENANT_ID, approval.actionType, approval.targetType, approval.targetId, JSON.stringify(approval.payload), approval.status, approval.requestedBy, approval.createdAt).run();
    await this.recordAudit(actor, "service_change_requested", "approval_request", approval.id, "success", { serviceId: id });
    return {
      service,
      approval: { ...approval, tenantId: TENANT_ID, decidedBy: null, decisionNote: null, decidedAt: null }
    };
  }
  async requestServiceApproval(serviceId, actor) {
    const serviceRow = await this.db.prepare("SELECT * FROM services WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, serviceId).first();
    assert(serviceRow, 404, "Service draft not found.", "service_not_found");
    assert(!serviceRow.approved, 409, "This service is already public. Price changes need a new approval request.", "invalid_state");
    const pending = await this.db.prepare(
      "SELECT id FROM approval_requests WHERE tenant_id = ? AND action_type = 'pricing_change' AND target_type = 'service' AND target_id = ? AND status = 'pending'"
    ).bind(TENANT_ID, serviceId).first();
    assert(!pending, 409, "This service already has a pending approval request.", "approval_pending");
    const service = serviceFromRow(serviceRow);
    const approval = {
      id: newId("approval"),
      actionType: "pricing_change",
      targetType: "service",
      targetId: serviceId,
      payload: {
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents
      },
      status: "pending",
      requestedBy: actor.sub,
      createdAt: nowIso()
    };
    await this.db.prepare(
      "INSERT INTO approval_requests (id, tenant_id, action_type, target_type, target_id, payload_json, status, requested_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(approval.id, TENANT_ID, approval.actionType, approval.targetType, approval.targetId, JSON.stringify(approval.payload), approval.status, approval.requestedBy, approval.createdAt).run();
    await this.recordAudit(actor, "service_approval_requested", "approval_request", approval.id, "success", { serviceId });
    return { ...approval, tenantId: TENANT_ID, decidedBy: null, decisionNote: null, decidedAt: null };
  }
  async addAvailabilityWindow(input, actor) {
    const details = availabilityWindowInput(input);
    const staffRow = await this.db.prepare("SELECT id FROM staff WHERE tenant_id = ? AND id = ? AND active = 1").bind(TENANT_ID, details.staffId).first();
    assert(staffRow, 404, "That barber is not available.", "staff_not_found");
    const window = { id: newId("availability"), ...details, createdAt: nowIso() };
    await this.db.prepare(
      "INSERT INTO availability_windows (id, tenant_id, staff_id, starts_at, ends_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(window.id, TENANT_ID, window.staffId, window.startsAt, window.endsAt, window.createdAt).run();
    await this.recordAudit(actor, "availability_window_created", "availability_window", window.id, "success", { staffId: window.staffId });
    return window;
  }
  async availabilityWindowHasReservations(window) {
    const reserved = await this.db.prepare(
      "SELECT slot_start FROM booking_slots WHERE tenant_id = ? AND staff_id = ? AND slot_start >= ? AND slot_start < ? LIMIT 1"
    ).bind(TENANT_ID, window.staffId, window.startsAt, window.endsAt).first();
    return Boolean(reserved);
  }
  async updateAvailabilityWindow(windowId, input, actor) {
    const id = cleanText(windowId, 100, "Availability window", true);
    const row = await this.db.prepare("SELECT * FROM availability_windows WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Availability window not found.", "availability_not_found");
    const current = { id: row.id, staffId: row.staff_id, startsAt: row.starts_at, endsAt: row.ends_at, createdAt: row.created_at };
    await this.cleanupExpiredHolds();
    assert(new Date(current.endsAt).getTime() > Date.now(), 409, "Only future availability windows can be changed.", "availability_locked");
    assert(!await this.availabilityWindowHasReservations(current), 409, "This availability window has a booking or active hold and cannot be changed.", "availability_reserved");
    const details = availabilityWindowInput(input);
    const staffRow = await this.db.prepare("SELECT id FROM staff WHERE tenant_id = ? AND id = ? AND active = 1").bind(TENANT_ID, details.staffId).first();
    assert(staffRow, 404, "That barber is not available.", "staff_not_found");
    const changed = current.staffId !== details.staffId || current.startsAt !== details.startsAt || current.endsAt !== details.endsAt;
    assert(changed, 400, "Make an availability change before saving.", "no_changes");
    await this.db.prepare(
      "UPDATE availability_windows SET staff_id = ?, starts_at = ?, ends_at = ? WHERE tenant_id = ? AND id = ?"
    ).bind(details.staffId, details.startsAt, details.endsAt, TENANT_ID, id).run();
    const window = { ...current, ...details };
    await this.recordAudit(actor, "availability_window_updated", "availability_window", id, "success", { staffId: window.staffId });
    return window;
  }
  async removeAvailabilityWindow(windowId, actor) {
    const id = cleanText(windowId, 100, "Availability window", true);
    const row = await this.db.prepare("SELECT * FROM availability_windows WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Availability window not found.", "availability_not_found");
    const current = { id: row.id, staffId: row.staff_id, startsAt: row.starts_at, endsAt: row.ends_at, createdAt: row.created_at };
    await this.cleanupExpiredHolds();
    assert(new Date(current.endsAt).getTime() > Date.now(), 409, "Only future availability windows can be removed.", "availability_locked");
    assert(!await this.availabilityWindowHasReservations(current), 409, "This availability window has a booking or active hold and cannot be removed.", "availability_reserved");
    await this.db.prepare("DELETE FROM availability_windows WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).run();
    await this.recordAudit(actor, "availability_window_removed", "availability_window", id, "success", { staffId: current.staffId });
    return { id };
  }
  async cleanupExpiredHolds() {
    const expired = await this.db.prepare(
      "SELECT id FROM booking_holds WHERE tenant_id = ? AND status = 'held' AND expires_at < ?"
    ).bind(TENANT_ID, nowIso()).all();
    if (!expired.results.length) return;
    const statements = [];
    for (const hold of expired.results) {
      statements.push(this.db.prepare("DELETE FROM booking_slots WHERE tenant_id = ? AND hold_id = ?").bind(TENANT_ID, hold.id));
      statements.push(this.db.prepare("UPDATE booking_holds SET status = 'expired' WHERE id = ? AND tenant_id = ? AND status = 'held'").bind(hold.id, TENANT_ID));
    }
    await this.db.batch(statements);
  }
  async getAvailability(staffId, serviceId) {
    const [staffRow, serviceRow] = await Promise.all([
      this.db.prepare("SELECT * FROM staff WHERE tenant_id = ? AND id = ? AND active = 1 AND bookable = 1").bind(TENANT_ID, staffId).first(),
      this.db.prepare("SELECT * FROM services WHERE tenant_id = ? AND id = ? AND approved = 1 AND price_cents IS NOT NULL").bind(TENANT_ID, serviceId).first()
    ]);
    if (!staffRow || !serviceRow) return [];
    await this.cleanupExpiredHolds();
    return this.getAvailabilityForStaff(staffId, serviceFromRow(serviceRow));
  }
  async getAvailabilityForStaff(staffId, service) {
    const windows = await this.db.prepare(
      "SELECT starts_at, ends_at FROM availability_windows WHERE tenant_id = ? AND staff_id = ? AND ends_at > ? ORDER BY starts_at"
    ).bind(TENANT_ID, staffId, nowIso()).all();
    const candidates = [];
    for (const window of windows.results) {
      const start = new Date(window.starts_at).getTime();
      const end = new Date(window.ends_at).getTime();
      for (let cursor = Math.max(start, Date.now()); cursor + service.durationMinutes * 6e4 <= end; cursor += SLOT_MINUTES * 6e4) {
        const normalized = new Date(Math.ceil(cursor / (SLOT_MINUTES * 6e4)) * SLOT_MINUTES * 6e4).toISOString();
        if (new Date(normalized).getTime() + service.durationMinutes * 6e4 <= end) candidates.push(normalized);
        if (candidates.length >= 80) break;
      }
      if (candidates.length >= 80) break;
    }
    if (!candidates.length) return [];
    const candidateSlots = Array.from(new Set(candidates.flatMap((candidate) => bookingSlotStarts(candidate, service.durationMinutes))));
    const placeholders = candidateSlots.map(() => "?").join(",");
    const reserved = await this.db.prepare(
      "SELECT slot_start FROM booking_slots WHERE tenant_id = ? AND staff_id = ? AND slot_start IN (" + placeholders + ")"
    ).bind(TENANT_ID, staffId, ...candidateSlots).all();
    const reservedSet = new Set(reserved.results.map((row) => row.slot_start));
    return candidates.filter((candidate) => bookingSlotStarts(candidate, service.durationMinutes).every((slot) => !reservedSet.has(slot))).slice(0, 48);
  }
  async getFirstAvailableAvailability(serviceId) {
    const [serviceRow, staffResult] = await Promise.all([
      this.db.prepare("SELECT * FROM services WHERE tenant_id = ? AND id = ? AND approved = 1 AND price_cents IS NOT NULL").bind(TENANT_ID, serviceId).first(),
      this.db.prepare("SELECT id, display_name FROM staff WHERE tenant_id = ? AND active = 1 AND bookable = 1 ORDER BY display_name, id").bind(TENANT_ID).all()
    ]);
    if (!serviceRow) return { staffId: null, slots: [] };
    await this.cleanupExpiredHolds();
    const service = serviceFromRow(serviceRow);
    const matches = (await Promise.all(staffResult.results.map(async (staff) => ({
      staff: { id: staff.id, name: staff.display_name },
      slots: await this.getAvailabilityForStaff(staff.id, service)
    })))).filter((match2) => match2.slots.length > 0);
    matches.sort((left, right) => left.slots[0].localeCompare(right.slots[0]) || compareStaffMatches(left.staff, right.staff));
    const match = matches[0];
    return match ? { staffId: match.staff.id, slots: match.slots } : { staffId: null, slots: [] };
  }
  async createBookingHold(input, actor) {
    await this.cleanupExpiredHolds();
    const staffId = cleanText(input.staffId, 80, "Barber", true);
    const serviceId = cleanText(input.serviceId, 80, "Service", true);
    const idempotencyKey = cleanText(input.idempotencyKey, 180, "Booking request key", true);
    const customerSubject = customerSubjectFor(actor);
    const existing = await this.db.prepare(
      "SELECT * FROM booking_holds WHERE tenant_id = ? AND client_idempotency_key = ?"
    ).bind(TENANT_ID, idempotencyKey).first();
    if (existing) {
      if (existing.customer_subject) {
        assert(existing.customer_subject === customerSubject, 403, "This booking hold belongs to another customer account.", "booking_not_owned");
      }
      assert(existing.status === "held" && new Date(existing.expires_at).getTime() > Date.now(), 409, "This booking request cannot be replayed. Start a new request.", "idempotency_replay");
      const token = await derivedHoldToken(existing.id, idempotencyKey, this.sessionSecret);
      return {
        hold: { id: existing.id, staffId: existing.staff_id, serviceId: existing.service_id, startsAt: existing.starts_at, endsAt: existing.ends_at, status: existing.status, expiresAt: existing.expires_at },
        holdToken: token,
        replayed: true
      };
    }
    const [staffRow, serviceRow] = await Promise.all([
      this.db.prepare("SELECT * FROM staff WHERE tenant_id = ? AND id = ? AND active = 1 AND bookable = 1").bind(TENANT_ID, staffId).first(),
      this.db.prepare("SELECT * FROM services WHERE tenant_id = ? AND id = ? AND approved = 1 AND price_cents IS NOT NULL").bind(TENANT_ID, serviceId).first()
    ]);
    assert(staffRow, 404, "Choose an available barber.", "staff_not_found");
    assert(serviceRow, 404, "Choose an owner-approved service.", "service_not_found");
    const service = serviceFromRow(serviceRow);
    const startsAt = parseFutureDate(input.startsAt, "Appointment time").toISOString();
    const endsAt = endOfBooking(startsAt, service.durationMinutes);
    const availability = await this.db.prepare(
      "SELECT id FROM availability_windows WHERE tenant_id = ? AND staff_id = ? AND starts_at <= ? AND ends_at >= ? LIMIT 1"
    ).bind(TENANT_ID, staffId, startsAt, endsAt).first();
    assert(availability, 409, "That appointment time is not available. Choose another published slot.", "slot_unavailable");
    const slotStarts = bookingSlotStarts(startsAt, service.durationMinutes);
    const placeholders = slotStarts.map(() => "?").join(",");
    const occupied = await this.db.prepare(
      "SELECT slot_start FROM booking_slots WHERE tenant_id = ? AND staff_id = ? AND slot_start IN (" + placeholders + ")"
    ).bind(TENANT_ID, staffId, ...slotStarts).all();
    assert(!occupied.results.length, 409, "That appointment time was just reserved. Choose another slot.", "slot_conflict");
    const holdId = newId("hold");
    const holdToken = await derivedHoldToken(holdId, idempotencyKey, this.sessionSecret);
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 6e4).toISOString();
    const hold = {
      id: holdId,
      staffId,
      serviceId,
      startsAt,
      endsAt,
      customerName: cleanText(input.customerName, 80, "Name", true),
      customerPhone: cleanPhone(input.customerPhone),
      customerEmail: cleanEmail(input.customerEmail),
      customerSubject,
      idempotencyKey,
      expiresAt,
      createdAt
    };
    const statements = [
      this.db.prepare(
        "INSERT INTO booking_holds (id, tenant_id, staff_id, service_id, starts_at, ends_at, customer_name, customer_phone, customer_email, customer_subject, hold_token_hash, client_idempotency_key, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'held', ?, ?)"
      ).bind(
        hold.id,
        TENANT_ID,
        hold.staffId,
        hold.serviceId,
        hold.startsAt,
        hold.endsAt,
        hold.customerName,
        hold.customerPhone,
        hold.customerEmail,
        hold.customerSubject,
        await hashValue(holdToken),
        hold.idempotencyKey,
        hold.expiresAt,
        hold.createdAt
      ),
      ...slotStarts.map((slot) => this.db.prepare(
        "INSERT INTO booking_slots (tenant_id, staff_id, slot_start, hold_id, booking_id, expires_at) VALUES (?, ?, ?, ?, NULL, ?)"
      ).bind(TENANT_ID, hold.staffId, slot, hold.id, hold.expiresAt))
    ];
    try {
      await this.db.batch(statements);
    } catch {
      const raced = await this.db.prepare(
        "SELECT * FROM booking_holds WHERE tenant_id = ? AND client_idempotency_key = ?"
      ).bind(TENANT_ID, idempotencyKey).first();
      if (raced && raced.status === "held" && new Date(raced.expires_at).getTime() > Date.now()) {
        if (raced.customer_subject) {
          assert(raced.customer_subject === customerSubject, 403, "This booking hold belongs to another customer account.", "booking_not_owned");
        }
        return {
          hold: { id: raced.id, staffId: raced.staff_id, serviceId: raced.service_id, startsAt: raced.starts_at, endsAt: raced.ends_at, status: raced.status, expiresAt: raced.expires_at },
          holdToken: await derivedHoldToken(raced.id, idempotencyKey, this.sessionSecret),
          replayed: true
        };
      }
      throw new HttpError(409, "That appointment time was just reserved. Choose another slot.", "slot_conflict");
    }
    await this.recordAudit(actor, "booking_hold_created", "booking_hold", hold.id, "success", { staffId, serviceId });
    return {
      hold: { id: hold.id, staffId: hold.staffId, serviceId: hold.serviceId, startsAt: hold.startsAt, endsAt: hold.endsAt, status: "held", expiresAt: hold.expiresAt },
      holdToken,
      replayed: false
    };
  }
  async confirmBooking(input, actor) {
    await this.cleanupExpiredHolds();
    const holdId = cleanText(input.holdId, 100, "Booking hold", true);
    const holdToken = cleanText(input.holdToken, 200, "Booking confirmation token", true);
    const idempotencyKey = cleanText(input.idempotencyKey, 180, "Confirmation request key", true);
    const existing = await this.db.prepare(
      "SELECT * FROM bookings WHERE tenant_id = ? AND confirmation_idempotency_key = ?"
    ).bind(TENANT_ID, idempotencyKey).first();
    if (existing) {
      if (existing.customer_subject) {
        assert(existing.customer_subject === customerSubjectFor(actor), 403, "This booking belongs to another customer account.", "booking_not_owned");
      }
      return {
        booking: { id: existing.id, staffId: existing.staff_id, serviceId: existing.service_id, startsAt: existing.starts_at, endsAt: existing.ends_at, status: existing.status },
        replayed: true
      };
    }
    const hold = await this.db.prepare("SELECT * FROM booking_holds WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, holdId).first();
    assert(hold, 404, "This booking hold no longer exists.", "hold_not_found");
    if (hold.customer_subject) {
      assert(hold.customer_subject === customerSubjectFor(actor), 403, "This booking hold belongs to another customer account.", "booking_not_owned");
    }
    assert(fixedTimeEqual(await hashValue(holdToken), hold.hold_token_hash), 403, "This booking confirmation is not valid.", "hold_token_invalid");
    assert(hold.status === "held" && new Date(hold.expires_at).getTime() > Date.now(), 409, "This booking hold expired. Choose another appointment time.", "hold_expired");
    const booking = {
      id: newId("booking"),
      holdId: hold.id,
      staffId: hold.staff_id,
      serviceId: hold.service_id,
      startsAt: hold.starts_at,
      endsAt: hold.ends_at,
      customerName: hold.customer_name,
      customerPhone: hold.customer_phone,
      customerEmail: hold.customer_email,
      customerSubject: hold.customer_subject || null,
      idempotencyKey,
      createdAt: nowIso()
    };
    try {
      await this.db.batch([
        this.db.prepare(
          "INSERT INTO bookings (id, tenant_id, hold_id, staff_id, service_id, starts_at, ends_at, customer_name, customer_phone, customer_email, customer_subject, status, confirmation_idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)"
        ).bind(
          booking.id,
          TENANT_ID,
          booking.holdId,
          booking.staffId,
          booking.serviceId,
          booking.startsAt,
          booking.endsAt,
          booking.customerName,
          booking.customerPhone,
          booking.customerEmail,
          booking.customerSubject,
          booking.idempotencyKey,
          booking.createdAt
        ),
        this.db.prepare("UPDATE booking_holds SET status = 'confirmed' WHERE tenant_id = ? AND id = ? AND status = 'held'").bind(TENANT_ID, booking.holdId),
        this.db.prepare("UPDATE booking_slots SET booking_id = ?, hold_id = NULL, expires_at = NULL WHERE tenant_id = ? AND hold_id = ?").bind(booking.id, TENANT_ID, booking.holdId)
      ]);
    } catch {
      const replayed = await this.db.prepare(
        "SELECT * FROM bookings WHERE tenant_id = ? AND confirmation_idempotency_key = ?"
      ).bind(TENANT_ID, idempotencyKey).first();
      if (replayed) {
        return {
          booking: { id: replayed.id, staffId: replayed.staff_id, serviceId: replayed.service_id, startsAt: replayed.starts_at, endsAt: replayed.ends_at, status: replayed.status },
          replayed: true
        };
      }
      throw new HttpError(409, "This booking could not be confirmed. Choose another time.", "booking_conflict");
    }
    await this.recordAudit(actor, "booking_confirmed", "booking", booking.id, "success", { staffId: booking.staffId, serviceId: booking.serviceId });
    return {
      booking: { id: booking.id, staffId: booking.staffId, serviceId: booking.serviceId, startsAt: booking.startsAt, endsAt: booking.endsAt, status: "confirmed" },
      replayed: false
    };
  }
  async queueSnapshot(entry) {
    const positionRow = await this.db.prepare(
      "SELECT COUNT(*) AS count FROM queue_entries WHERE tenant_id = ? AND status IN ('waiting', 'called', 'in_service') AND created_at <= ?"
    ).bind(TENANT_ID, entry.created_at).first();
    const settings = settingsFromRow(await this.settingRow());
    const position = ACTIVE_QUEUE_STATUSES.has(entry.status) ? Number(positionRow.count) : 0;
    const average = settings.queueAverageMinutes;
    return {
      id: entry.id,
      position,
      estimatedWaitRange: average && position ? Math.max(0, (position - 1) * average) + "\u2013" + position * average + " min" : null,
      notificationStatus: entry.notification_status,
      status: entry.status
    };
  }
  async getQueue(entryId) {
    const settings = settingsFromRow(await this.settingRow());
    if (!entryId) return { enabled: Boolean(settings.walkInsEnabled), entry: null };
    const entry = await this.db.prepare("SELECT * FROM queue_entries WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, entryId).first();
    return { enabled: Boolean(settings.walkInsEnabled), entry: entry ? await this.queueSnapshot(entry) : null };
  }
  async getAdminQueue() {
    const [settingsRow, result] = await Promise.all([
      this.settingRow(),
      this.db.prepare(
        "SELECT id, customer_display_name, notification_status, status, created_at, updated_at FROM queue_entries WHERE tenant_id = ? AND status IN ('waiting', 'called', 'in_service') ORDER BY created_at ASC, id ASC LIMIT 100"
      ).bind(TENANT_ID).all()
    ]);
    const average = settingsFromRow(settingsRow).queueAverageMinutes;
    return result.results.map((entry, index) => {
      const position = index + 1;
      return {
        id: entry.id,
        customerDisplayName: entry.customer_display_name,
        position,
        estimatedWaitRange: average ? Math.max(0, (position - 1) * average) + "\xE2\u20AC\u201C" + position * average + " min" : null,
        notificationStatus: entry.notification_status,
        status: entry.status,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at
      };
    });
  }
  async joinQueue(input, actor) {
    const settings = settingsFromRow(await this.settingRow());
    assert(settings.walkInsEnabled, 409, "Walk-in requests are not enabled by the owner right now.", "walkins_disabled");
    const entry = {
      id: newId("queue"),
      displayName: maskQueueName(input.customerName),
      phone: cleanPhone(input.customerPhone),
      notificationStatus: input.customerPhone ? "pending" : "not_requested",
      status: "waiting",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    await this.db.prepare(
      "INSERT INTO queue_entries (id, tenant_id, customer_display_name, customer_phone, notification_status, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(entry.id, TENANT_ID, entry.displayName, entry.phone, entry.notificationStatus, entry.status, entry.createdAt, entry.updatedAt).run();
    await this.recordAudit(actor, "queue_entry_created", "queue_entry", entry.id, "success", {});
    return this.queueSnapshot({
      id: entry.id,
      notification_status: entry.notificationStatus,
      status: entry.status,
      created_at: entry.createdAt
    });
  }
  async updateQueueStatus(input, actor) {
    const entryId = cleanText(input.entryId, 100, "Queue entry", true);
    const status = cleanText(input.status, 40, "Queue status", true);
    assert(["waiting", "called", "in_service", "completed", "cancelled"].includes(status), 400, "Queue status is not valid.", "invalid_input");
    const existing = await this.db.prepare("SELECT * FROM queue_entries WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, entryId).first();
    assert(existing, 404, "Queue entry not found.", "queue_not_found");
    await this.db.prepare("UPDATE queue_entries SET status = ?, updated_at = ? WHERE tenant_id = ? AND id = ?").bind(status, nowIso(), TENANT_ID, entryId).run();
    existing.status = status;
    await this.recordAudit(actor, "queue_status_updated", "queue_entry", entryId, "success", { status });
    return this.queueSnapshot(existing);
  }
  async createMarketingCadence(input, actor) {
    const details = marketingCadenceInput(input);
    const cadence = {
      id: newId("cadence"),
      ...details,
      createdBy: actor.sub,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    await this.db.prepare(
      "INSERT INTO marketing_cadences (id, tenant_id, name, channel, objective, audience, frequency, next_draft_at, active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(cadence.id, TENANT_ID, cadence.name, cadence.channel, cadence.objective, cadence.audience, cadence.frequency, cadence.nextDraftAt, cadence.active ? 1 : 0, cadence.createdBy, cadence.createdAt, cadence.updatedAt).run();
    await this.recordAudit(actor, "marketing_cadence_created", "marketing_cadence", cadence.id, "success", { channel: cadence.channel, frequency: cadence.frequency, active: cadence.active });
    return { tenantId: TENANT_ID, ...cadence };
  }
  async updateMarketingCadence(cadenceId, input, actor) {
    const id = cleanText(cadenceId, 100, "Marketing cadence", true);
    const row = await this.db.prepare("SELECT * FROM marketing_cadences WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Marketing cadence not found.", "cadence_not_found");
    const cadence = marketingCadenceFromRow(row);
    const source = input || {};
    const allowed = ["name", "channel", "objective", "audience", "frequency", "nextDraftAt", "active"];
    for (const key of Object.keys(source)) assert(allowed.includes(key), 400, "That marketing cadence setting cannot be edited here.", "invalid_setting");
    const marketingFields = marketingDraftInput({
      channel: Object.prototype.hasOwnProperty.call(source, "channel") ? source.channel : cadence.channel,
      objective: Object.prototype.hasOwnProperty.call(source, "objective") ? source.objective : cadence.objective,
      audience: Object.prototype.hasOwnProperty.call(source, "audience") ? source.audience : cadence.audience
    });
    Object.assign(cadence, marketingFields);
    if (Object.prototype.hasOwnProperty.call(source, "name")) cadence.name = cleanText(source.name, 80, "Cadence name", true);
    if (Object.prototype.hasOwnProperty.call(source, "frequency")) {
      cadence.frequency = cleanText(source.frequency, 20, "Marketing frequency", true).toLowerCase();
      assert(MARKETING_FREQUENCIES.has(cadence.frequency), 400, "Choose a supported marketing frequency.", "invalid_input");
    }
    if (Object.prototype.hasOwnProperty.call(source, "active")) cadence.active = normalizeBoolean(source.active);
    if (Object.prototype.hasOwnProperty.call(source, "nextDraftAt")) cadence.nextDraftAt = parseFutureDate(source.nextDraftAt, "Next draft time").toISOString();
    cadence.updatedAt = nowIso();
    await this.db.prepare(
      "UPDATE marketing_cadences SET name = ?, channel = ?, objective = ?, audience = ?, frequency = ?, next_draft_at = ?, active = ?, updated_at = ? WHERE tenant_id = ? AND id = ?"
    ).bind(cadence.name, cadence.channel, cadence.objective, cadence.audience, cadence.frequency, cadence.nextDraftAt, cadence.active ? 1 : 0, cadence.updatedAt, TENANT_ID, id).run();
    await this.recordAudit(actor, "marketing_cadence_updated", "marketing_cadence", id, "success", { active: cadence.active, editedFields: Object.keys(source).sort() });
    return cadence;
  }
  async runDueMarketingCadences(reference, actor) {
    const now = reference instanceof Date ? reference : new Date(reference || Date.now());
    assert(!Number.isNaN(now.getTime()), 500, "The marketing scheduler received an invalid time.", "configuration_error");
    const policyRow = await this.db.prepare(
      "SELECT * FROM agent_policies WHERE tenant_id = ? AND agent_key = 'breeze_marketing'"
    ).bind(TENANT_ID).first();
    const policy = policyRow ? agentPolicyFromRow(policyRow) : null;
    if (!policy || !policy.enabled || !policy.allowedTools.includes("draft_marketing")) {
      await this.recordAudit(actor || { sub: "system", role: "manager" }, "marketing_cadence_skipped", "agent_policy", policy ? policy.id : null, "success", { reason: "draft_tool_not_allowed" });
      return { created: [], reviewBlockedCadenceIds: [], skipped: true };
    }
    const due = await this.db.prepare(
      "SELECT * FROM marketing_cadences WHERE tenant_id = ? AND active = 1 AND next_draft_at <= ? ORDER BY next_draft_at ASC LIMIT 20"
    ).bind(TENANT_ID, now.toISOString()).all();
    const unresolved = await this.db.prepare(
      "SELECT DISTINCT cadence_id FROM marketing_drafts WHERE tenant_id = ? AND cadence_id IS NOT NULL AND status IN ('draft', 'approval_requested')"
    ).bind(TENANT_ID).all();
    const reviewBlockedCadenceIds = new Set(unresolved.results.map((draft) => draft.cadence_id));
    const created = [];
    const blocked = [];
    for (const row of due.results) {
      const cadence = marketingCadenceFromRow(row);
      if (reviewBlockedCadenceIds.has(cadence.id)) {
        blocked.push(cadence.id);
        continue;
      }
      const nextDraftAt = nextCadenceAt(cadence.nextDraftAt, cadence.frequency, now);
      const claim = await this.db.prepare(
        "UPDATE marketing_cadences SET next_draft_at = ?, updated_at = ? WHERE tenant_id = ? AND id = ? AND active = 1 AND next_draft_at = ?"
      ).bind(nextDraftAt, nowIso(), TENANT_ID, cadence.id, cadence.nextDraftAt).run();
      if (!claim.meta || Number(claim.meta.changes) !== 1) continue;
      const draft = await this.createMarketingDraft({ channel: cadence.channel, objective: cadence.objective, audience: cadence.audience }, actor || { sub: "breeze-marketing-scheduler", role: "manager" }, cadence.id);
      created.push(draft);
      await this.recordAudit(actor || { sub: "breeze-marketing-scheduler", role: "manager" }, "marketing_cadence_draft_created", "marketing_cadence", cadence.id, "success", { marketingDraftId: draft.id, nextDraftAt });
    }
    return { created, reviewBlockedCadenceIds: blocked, skipped: false };
  }
  async requestAgentPolicyChange(policyId, input, actor) {
    const id = cleanText(policyId, 100, "Agent policy", true);
    const row = await this.db.prepare("SELECT * FROM agent_policies WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Agent policy not found.", "agent_policy_not_found");
    const policy = agentPolicyFromRow(row);
    const next = agentPolicyChange(input, policy);
    const pending = await this.db.prepare(
      "SELECT id FROM approval_requests WHERE tenant_id = ? AND action_type = 'integration_change' AND target_type = 'agent_policy' AND target_id = ? AND status = 'pending'"
    ).bind(TENANT_ID, id).first();
    assert(!pending, 409, "This agent policy already has a pending approval request.", "approval_pending");
    const approval = {
      id: newId("approval"),
      actionType: "integration_change",
      targetType: "agent_policy",
      targetId: id,
      payload: next,
      status: "pending",
      requestedBy: actor.sub,
      createdAt: nowIso()
    };
    await this.db.prepare(
      "INSERT INTO approval_requests (id, tenant_id, action_type, target_type, target_id, payload_json, status, requested_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(approval.id, TENANT_ID, approval.actionType, approval.targetType, approval.targetId, JSON.stringify(approval.payload), approval.status, approval.requestedBy, approval.createdAt).run();
    await this.recordAudit(actor, "agent_policy_change_requested", "approval_request", approval.id, "success", { agentKey: policy.agentKey });
    return { ...approval, tenantId: TENANT_ID, decidedBy: null, decisionNote: null, decidedAt: null };
  }
  async createIntegrationDraft(input, actor) {
    const details = integrationDraftInput(input);
    const integration = {
      id: newId("integration"),
      ...details,
      status: "draft",
      createdBy: actor.sub,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    await this.db.prepare(
      "INSERT INTO integration_configs (id, tenant_id, integration_type, provider_name, secret_reference, capabilities_json, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)"
    ).bind(integration.id, TENANT_ID, integration.integrationType, integration.providerName, integration.secretReference, JSON.stringify(integration.capabilities), integration.createdBy, integration.createdAt, integration.updatedAt).run();
    await this.recordAudit(actor, "integration_draft_created", "integration_config", integration.id, "success", { integrationType: integration.integrationType });
    return { tenantId: TENANT_ID, ...integration };
  }
  async saveIntegrationDraft(integrationId, input, actor) {
    const id = cleanText(integrationId, 100, "Integration", true);
    const row = await this.db.prepare("SELECT * FROM integration_configs WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Integration configuration not found.", "integration_not_found");
    const current = integrationFromRow(row);
    assert(current.status !== "approval_requested", 409, "This integration has a pending approval request and cannot be edited.", "approval_pending");
    const details = integrationDraftInput(input);
    if (current.status === "approved" || current.status === "disabled") {
      const revision = await this.createIntegrationDraft(details, actor);
      await this.recordAudit(actor, "integration_revision_draft_created", "integration_config", revision.id, "success", { revisedFrom: current.id, integrationType: revision.integrationType });
      return { integration: revision, revisedFrom: current.id };
    }
    const updatedAt = nowIso();
    await this.db.prepare(
      "UPDATE integration_configs SET integration_type = ?, provider_name = ?, secret_reference = ?, capabilities_json = ?, status = 'draft', updated_at = ? WHERE tenant_id = ? AND id = ?"
    ).bind(details.integrationType, details.providerName, details.secretReference, JSON.stringify(details.capabilities), updatedAt, TENANT_ID, id).run();
    const integration = { ...current, ...details, status: "draft", updatedAt };
    await this.recordAudit(actor, "integration_draft_updated", "integration_config", id, "success", { integrationType: integration.integrationType });
    return { integration, revisedFrom: null };
  }
  async disableIntegration(integrationId, actor) {
    const id = cleanText(integrationId, 100, "Integration", true);
    const row = await this.db.prepare("SELECT * FROM integration_configs WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Integration configuration not found.", "integration_not_found");
    const integration = integrationFromRow(row);
    assert(integration.status === "approved", 409, "Only an approved integration can be disabled.", "invalid_state");
    const updatedAt = nowIso();
    await this.db.prepare(
      "UPDATE integration_configs SET status = 'disabled', updated_at = ? WHERE tenant_id = ? AND id = ?"
    ).bind(updatedAt, TENANT_ID, id).run();
    const disabled = { ...integration, status: "disabled", updatedAt };
    await this.recordAudit(actor, "integration_disabled", "integration_config", id, "success", { integrationType: integration.integrationType });
    return disabled;
  }
  async requestIntegrationApproval(integrationId, actor) {
    const id = cleanText(integrationId, 100, "Integration", true);
    const row = await this.db.prepare("SELECT * FROM integration_configs WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Integration draft not found.", "integration_not_found");
    const integration = integrationFromRow(row);
    assert(integration.status === "draft" || integration.status === "rejected", 409, "Only an integration draft can be submitted for approval.", "invalid_state");
    const pending = await this.db.prepare(
      "SELECT id FROM approval_requests WHERE tenant_id = ? AND action_type = 'integration_change' AND target_type = 'integration_config' AND target_id = ? AND status = 'pending'"
    ).bind(TENANT_ID, id).first();
    assert(!pending, 409, "This integration already has a pending approval request.", "approval_pending");
    const approval = {
      id: newId("approval"),
      actionType: "integration_change",
      targetType: "integration_config",
      targetId: id,
      payload: { integrationType: integration.integrationType, providerName: integration.providerName, capabilities: integration.capabilities },
      status: "pending",
      requestedBy: actor.sub,
      createdAt: nowIso()
    };
    await this.db.batch([
      this.db.prepare("UPDATE integration_configs SET status = 'approval_requested', updated_at = ? WHERE tenant_id = ? AND id = ?").bind(approval.createdAt, TENANT_ID, id),
      this.db.prepare(
        "INSERT INTO approval_requests (id, tenant_id, action_type, target_type, target_id, payload_json, status, requested_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(approval.id, TENANT_ID, approval.actionType, approval.targetType, approval.targetId, JSON.stringify(approval.payload), approval.status, approval.requestedBy, approval.createdAt)
    ]);
    await this.recordAudit(actor, "integration_approval_requested", "approval_request", approval.id, "success", { integrationType: integration.integrationType });
    return { ...approval, tenantId: TENANT_ID, decidedBy: null, decisionNote: null, decidedAt: null };
  }
  async createMarketingDraft(input, actor, cadenceId) {
    const { channel, objective, audience } = marketingDraftInput(input);
    const content = marketingDraftContent(input, defaultMarketingDraftContent({ channel, objective, audience }));
    const safeCadenceId = cadenceId ? cleanText(cadenceId, 100, "Marketing cadence", true) : null;
    const draft = {
      id: newId("marketing"),
      channel,
      objective,
      audience,
      cadenceId: safeCadenceId,
      content: "DRAFT \u2014 OWNER APPROVAL REQUIRED\n\nBreezy Cuts \xB7 Quincy, Illinois\nFresh Cuts. Easy Booking.\n\nObjective: " + objective + (audience ? "\nAudience: " + audience : "") + "\n\nBefore publishing, an owner must verify services, pricing, availability, claims, and destination links.",
      status: "draft",
      createdBy: actor.sub,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    draft.content = content;
    await this.db.prepare(
      "INSERT INTO marketing_drafts (id, tenant_id, channel, objective, audience, content, cadence_id, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(draft.id, TENANT_ID, draft.channel, draft.objective, draft.audience, draft.content, draft.cadenceId, draft.status, draft.createdBy, draft.createdAt, draft.updatedAt).run();
    await this.recordAudit(actor, "marketing_draft_created", "marketing_draft", draft.id, "success", { channel, cadenceId: safeCadenceId });
    return { ...draft, tenantId: TENANT_ID };
  }
  async updateMarketingDraft(marketingId, input, actor) {
    const id = cleanText(marketingId, 100, "Marketing draft", true);
    const row = await this.db.prepare("SELECT * FROM marketing_drafts WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, id).first();
    assert(row, 404, "Marketing draft not found.", "marketing_not_found");
    const draft = marketingFromRow(row);
    assert(draft.status === "draft" || draft.status === "rejected", 409, "Only an unsubmitted or rejected marketing draft can be edited.", "invalid_state");
    const details = marketingDraftUpdateInput(input, draft);
    const updatedAt = nowIso();
    await this.db.prepare(
      "UPDATE marketing_drafts SET channel = ?, objective = ?, audience = ?, content = ?, status = 'draft', updated_at = ? WHERE tenant_id = ? AND id = ?"
    ).bind(details.channel, details.objective, details.audience, details.content, updatedAt, TENANT_ID, id).run();
    await this.recordAudit(actor, "marketing_draft_updated", "marketing_draft", id, "success", { channel: details.channel, editedFields: Object.keys(input || {}).sort() });
    return { ...draft, ...details, status: "draft", updatedAt };
  }
  async requestMarketingApproval(marketingId, actor) {
    const draft = await this.db.prepare("SELECT * FROM marketing_drafts WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, marketingId).first();
    assert(draft, 404, "Marketing draft not found.", "marketing_not_found");
    assert(draft.status === "draft", 409, "Only a draft can be submitted for approval.", "invalid_state");
    const approval = {
      id: newId("approval"),
      actionType: "bulk_marketing",
      targetType: "marketing_draft",
      targetId: marketingId,
      payload: { channel: draft.channel },
      status: "pending",
      requestedBy: actor.sub,
      createdAt: nowIso()
    };
    await this.db.batch([
      this.db.prepare("UPDATE marketing_drafts SET status = 'approval_requested', updated_at = ? WHERE tenant_id = ? AND id = ?").bind(approval.createdAt, TENANT_ID, marketingId),
      this.db.prepare(
        "INSERT INTO approval_requests (id, tenant_id, action_type, target_type, target_id, payload_json, status, requested_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(approval.id, TENANT_ID, approval.actionType, approval.targetType, approval.targetId, JSON.stringify(approval.payload), approval.status, approval.requestedBy, approval.createdAt)
    ]);
    await this.recordAudit(actor, "marketing_approval_requested", "approval_request", approval.id, "success", { marketingDraftId: marketingId });
    return { ...approval, tenantId: TENANT_ID, decidedBy: null, decisionNote: null, decidedAt: null };
  }
  async decideApproval(input, actor) {
    const approvalId = cleanText(input.approvalId, 100, "Approval", true);
    const decision = cleanText(input.decision, 20, "Decision", true);
    assert(["approved", "rejected"].includes(decision), 400, "Decision must be approved or rejected.", "invalid_input");
    const approval = await this.db.prepare("SELECT * FROM approval_requests WHERE tenant_id = ? AND id = ?").bind(TENANT_ID, approvalId).first();
    assert(approval, 404, "Approval request not found.", "approval_not_found");
    assert(approval.status === "pending", 409, "This approval request has already been decided.", "invalid_state");
    const note = cleanOptionalText(input.note, 500, "Decision note");
    const decidedAt = nowIso();
    const statements = [
      this.db.prepare("UPDATE approval_requests SET status = ?, decided_by = ?, decision_note = ?, decided_at = ? WHERE tenant_id = ? AND id = ?").bind(decision, actor.sub, note, decidedAt, TENANT_ID, approvalId)
    ];
    if (approval.target_type === "marketing_draft") {
      statements.push(this.db.prepare("UPDATE marketing_drafts SET status = ?, updated_at = ? WHERE tenant_id = ? AND id = ?").bind(decision, decidedAt, TENANT_ID, approval.target_id));
    }
    if (approval.target_type === "service" && approval.action_type === "pricing_change" && decision === "approved") {
      const payload = fromJson(approval.payload_json, {});
      statements.push(this.db.prepare(
        "UPDATE services SET name = ?, description = ?, duration_minutes = ?, price_cents = ?, approved = 1, sample = 0, updated_at = ? WHERE tenant_id = ? AND id = ?"
      ).bind(payload.name, payload.description, payload.durationMinutes, payload.priceCents, decidedAt, TENANT_ID, approval.target_id));
    }
    if (approval.target_type === "membership_plan" && approval.action_type === "pricing_change" && decision === "approved") {
      const payload = fromJson(approval.payload_json, {});
      statements.push(this.db.prepare(
        "UPDATE membership_plans SET name = ?, description = ?, price_cents = ?, billing_interval = ?, active = COALESCE(?, active), approved = 1, updated_at = ? WHERE tenant_id = ? AND id = ?"
      ).bind(payload.name, payload.description, payload.priceCents, payload.billingInterval, Object.prototype.hasOwnProperty.call(payload, "active") ? payload.active ? 1 : 0 : null, decidedAt, TENANT_ID, approval.target_id));
    }
    if (approval.target_type === "agent_policy" && approval.action_type === "integration_change" && decision === "approved") {
      const payload = fromJson(approval.payload_json, {});
      const tools = cleanAgentTools(payload.allowedTools || []);
      statements.push(this.db.prepare(
        "UPDATE agent_policies SET enabled = ?, allowed_tools_json = ?, external_actions_enabled = 0, updated_at = ? WHERE tenant_id = ? AND id = ?"
      ).bind(payload.enabled ? 1 : 0, JSON.stringify(tools), decidedAt, TENANT_ID, approval.target_id));
    }
    if (approval.target_type === "integration_config") {
      statements.push(this.db.prepare(
        "UPDATE integration_configs SET status = ?, updated_at = ? WHERE tenant_id = ? AND id = ?"
      ).bind(decision === "approved" ? "approved" : "rejected", decidedAt, TENANT_ID, approval.target_id));
    }
    await this.db.batch(statements);
    await this.recordAudit(actor, "approval_" + decision, "approval_request", approvalId, "success", { actionType: approval.action_type });
    return {
      ...approvalFromRow(approval),
      status: decision,
      decidedBy: actor.sub,
      decisionNote: note,
      decidedAt
    };
  }
};
function createD1Store(database, sessionSecret) {
  return new D1Store(database, sessionSecret);
}
__name(createD1Store, "createD1Store");

// src/index.js
var localStore = createLocalStore();
var d1Stores = /* @__PURE__ */ new WeakMap();
var rateBuckets = /* @__PURE__ */ new Map();
var API_CACHE_CONTROL = "no-store, max-age=0";
function json(data, status, extraHeaders) {
  const headers = new Headers(extraHeaders || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", API_CACHE_CONTROL);
  return new Response(JSON.stringify(data), { status: status || 200, headers });
}
__name(json, "json");
function text(value, status, contentType) {
  return new Response(value, {
    status: status || 200,
    headers: {
      "Content-Type": contentType || "text/plain; charset=utf-8",
      "Cache-Control": API_CACHE_CONTROL
    }
  });
}
__name(text, "text");
function securityHeaders(response, isApi, robotsDirective) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests");
  if (isApi) headers.set("Cache-Control", API_CACHE_CONTROL);
  if (robotsDirective) headers.set("X-Robots-Tag", robotsDirective);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
__name(securityHeaders, "securityHeaders");
function requestIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "anonymous";
}
__name(requestIp, "requestIp");
function storeFor(env) {
  if (!env.DB) {
    if (env.ENVIRONMENT === "production") {
      throw new HttpError(503, "The production data store is not configured.", "database_unavailable");
    }
    return localStore;
  }
  let repository = d1Stores.get(env);
  if (!repository) {
    repository = createD1Store(env.DB, env.SESSION_SECRET || null);
    d1Stores.set(env, repository);
  }
  return repository;
}
__name(storeFor, "storeFor");
function checkRateLimit(request, scope, maxRequests, windowMs) {
  const now = Date.now();
  const key = scope + ":" + requestIp(request);
  const bucket = rateBuckets.get(key) || [];
  const recent = bucket.filter((timestamp) => timestamp > now - windowMs);
  if (recent.length >= maxRequests) {
    throw new HttpError(429, "Too many requests. Please wait a moment and try again.", "rate_limited");
  }
  recent.push(now);
  rateBuckets.set(key, recent);
}
__name(checkRateLimit, "checkRateLimit");
async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(length) && length > 2e4) {
    throw new HttpError(413, "That request is too large.", "payload_too_large");
  }
  const type = request.headers.get("Content-Type") || "";
  if (!type.includes("application/json")) {
    throw new HttpError(415, "Send this request as JSON.", "unsupported_media_type");
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError(400, "Request data must be a JSON object.", "invalid_json");
    }
    return body;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Request data could not be read.", "invalid_json");
  }
}
__name(readJson, "readJson");
function getSecret(env) {
  return env.SESSION_SECRET || null;
}
__name(getSecret, "getSecret");
async function getSession(request, env) {
  const token = parseCookies(request.headers.get("Cookie")).breezy_session;
  return verifySignedSession(token, getSecret(env));
}
__name(getSession, "getSession");
async function customerOrGuest(request, env) {
  const session = await getSession(request, env);
  if (session && session.role === "customer") return session;
  return { sub: "guest", role: "customer", tenantId: TENANT_ID };
}
__name(customerOrGuest, "customerOrGuest");
function localDevIsEnabled(env) {
  return env.ENVIRONMENT === "development" && env.ALLOW_LOCAL_OWNER_SESSION === "true" && Boolean(env.SESSION_SECRET);
}
__name(localDevIsEnabled, "localDevIsEnabled");
function publicSiteUrl(env, url) {
  const requestUrl = url instanceof URL ? url : new URL(url);
  const configured = String(env && env.PUBLIC_SITE_URL ? env.PUBLIC_SITE_URL : "").trim();
  if (!configured) return requestUrl.origin;
  try {
    const candidate = new URL(configured);
    return candidate.protocol === "https:" || candidate.protocol === "http:" ? candidate.origin : requestUrl.origin;
  } catch {
    return requestUrl.origin;
  }
}
__name(publicSiteUrl, "publicSiteUrl");
function sessionCookie(token, request) {
  const isHttps = new URL(request.url).protocol === "https:";
  return "breezy_session=" + token + "; Path=/; HttpOnly; SameSite=Strict" + (isHttps ? "; Secure" : "") + "; Max-Age=28800";
}
__name(sessionCookie, "sessionCookie");
function serializeIdempotency(request, body) {
  const key = request.headers.get("Idempotency-Key");
  if (!key) throw new HttpError(400, "This action needs an Idempotency-Key header.", "idempotency_required");
  if (body.idempotencyKey && body.idempotencyKey !== key) {
    throw new HttpError(400, "The request key does not match the Idempotency-Key header.", "idempotency_mismatch");
  }
  body.idempotencyKey = key;
  return body;
}
__name(serializeIdempotency, "serializeIdempotency");
function pageMetadata(pathname) {
  const pages = {
    "/": {
      title: "Breezy Cuts | Barber in Quincy, Illinois",
      description: "Fresh Cuts. Easy Booking. Owner-approved barber services and booking in Quincy, Illinois."
    },
    "/services": {
      title: "Barber Services | Breezy Cuts, Quincy IL",
      description: "Explore owner-approved barber services at Breezy Cuts in Quincy, Illinois."
    },
    "/barbers": {
      title: "Meet Breon | Breezy Cuts, Quincy IL",
      description: "Meet Breon and review owner-approved availability at Breezy Cuts in Quincy, Illinois."
    },
    "/booking": {
      title: "Book a Haircut with Breon | Breezy Cuts, Quincy IL",
      description: "Book an owner-approved service with Breon at Breezy Cuts in Quincy, Illinois."
    },
    "/queue": {
      title: "Walk-In Queue | Breezy Cuts, Quincy IL",
      description: "Join the owner-enabled walk-in queue at Breezy Cuts in Quincy, Illinois."
    },
    "/portal": {
      title: "Customer Portal | Breezy Cuts",
      description: "Secure customer appointments, preferences, and privacy controls for Breezy Cuts."
    },
    "/admin": {
      title: "Owner Setup | Breezy Cuts",
      description: "Secure owner controls for Breezy Cuts business settings and operations."
    }
  };
  return pages[pathname] || pages["/"];
}
__name(pageMetadata, "pageMetadata");
var PAGE_CONTENT = {
  "/": {
    eyebrow: "Quincy, Illinois",
    heading: "A fresher cut. A simpler booking path.",
    summary: "Choose owner-approved services, book with Breon, and keep control of your visit with clear appointment steps.",
    action: '<a href="/booking" class="button" data-route>Book a Cut</a>',
    layout: "hero"
  },
  "/services": {
    eyebrow: "Services",
    heading: "Barber services at Breezy Cuts",
    summary: "Only owner-approved services, durations, and prices are published for online booking.",
    action: '<a href="/booking" class="button" data-route>Start booking</a>'
  },
  "/barbers": {
    eyebrow: "Your barber",
    heading: "Meet Breon",
    summary: "Review owner-approved public details and continue to current availability when you are ready to book.",
    action: '<a href="/booking" class="button" data-route>Book with Breon</a>'
  },
  "/booking": {
    eyebrow: "Booking",
    heading: "Book a haircut with Breon",
    summary: "Choose from services and availability that the owner has approved and published. Your time is held before confirmation.",
    action: '<a href="/services" class="button button--secondary" data-route>View services</a>'
  },
  "/queue": {
    eyebrow: "Walk-ins",
    heading: "Breezy Cuts walk-in queue",
    summary: "Walk-in requests appear only when the owner enables them, and each guest can view only their own queue status.",
    action: '<a href="/booking" class="button button--secondary" data-route>Book instead</a>'
  },
  "/portal": {
    eyebrow: "Private account",
    heading: "Breezy Cuts customer portal",
    summary: "Sign in to manage the appointments and preferences connected to your customer account.",
    action: '<a href="/" class="button button--secondary" data-route>Return home</a>'
  },
  "/admin": {
    eyebrow: "Protected operations",
    heading: "Breezy Cuts owner setup",
    summary: "Authorized staff can manage approved services, availability, queue operations, and business settings.",
    action: '<a href="/" class="button button--secondary" data-route>Return home</a>'
  }
};
function knownPageRoute(pathname) {
  return Object.prototype.hasOwnProperty.call(PAGE_CONTENT, pathname);
}
__name(knownPageRoute, "knownPageRoute");
function crawlablePageContent(pathname) {
  const content = PAGE_CONTENT[pathname];
  if (!content) {
    return '<section class="page-header"><div><p class="eyebrow">404</p><h1 class="page-title">Page not found</h1></div><div><p>The page you requested does not exist.</p><div class="button-row"><a href="/" class="button button--secondary">Return home</a></div></div></section>';
  }
  if (content.layout === "hero") {
    return `<section class="hero"><div><p class="eyebrow">${content.eyebrow}</p><h1>${content.heading}</h1><p class="hero-copy">${content.summary}</p><div class="hero-actions">${content.action}</div><p class="hero-note"><span aria-hidden="true">●</span>Services and availability appear only when the owner has enabled them.</p></div><aside class="hero-art" aria-label="Breezy Cuts booking overview"><article class="breon-card"><p class="draft-chip">Breezy Cuts</p><h2>Fresh cuts. Easy booking.</h2><p>Business details remain owner-managed.</p></article></aside></section>`;
  }
  return `<section class="page-header"><div><p class="eyebrow">${content.eyebrow}</p><h1 class="page-title">${content.heading}</h1></div><div><p>${content.summary}</p><div class="button-row">${content.action}</div></div></section>`;
}
__name(crawlablePageContent, "crawlablePageContent");
function xmlEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
__name(xmlEscape, "xmlEscape");
function sitemap(origin) {
  const pages = ["/", "/services", "/barbers", "/booking", "/queue"];
  const urls = pages.map((path) => "<url><loc>" + xmlEscape(origin + path) + "</loc></url>").join("");
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls + "</urlset>";
}
__name(sitemap, "sitemap");
function dynamicRobots(origin) {
  return "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /portal\nSitemap: " + origin + "/sitemap.xml\n";
}
__name(dynamicRobots, "dynamicRobots");
function privateRoute(pathname) {
  return pathname === "/admin" || pathname === "/portal";
}
__name(privateRoute, "privateRoute");
function routeParams(pathname, pattern) {
  const match = pathname.match(pattern);
  return match ? match.slice(1).map((value) => decodeURIComponent(value)) : null;
}
__name(routeParams, "routeParams");
async function serveHtml(request, env, url) {
  const response = await env.ASSETS.fetch(request);
  const acceptsHtml = (request.headers.get("Accept") || "").includes("text/html");
  const extensionlessPath = !/\/[^/]+\.[a-z0-9]{1,12}$/i.test(url.pathname);
  const assetResponse = response.status === 404 && (acceptsHtml || extensionlessPath) ? await env.ASSETS.fetch(new Request(new URL("/", url), request)) : response;
  if (!assetResponse.headers.get("Content-Type") || !assetResponse.headers.get("Content-Type").includes("text/html")) {
    return securityHeaders(assetResponse, false);
  }
  const knownRoute = knownPageRoute(url.pathname);
  const settings = await storeFor(env).getPublicConfig();
  const siteUrl = publicSiteUrl(env, url);
  const canonical = siteUrl + (url.pathname === "/" ? "/" : url.pathname);
  const metadata = knownRoute ? pageMetadata(url.pathname) : {
    title: "Page Not Found | Breezy Cuts",
    description: "The requested Breezy Cuts page could not be found."
  };
  const schema = JSON.stringify(seoSchema(settings, siteUrl));
  const robotsDirective = privateRoute(url.pathname) || !knownRoute ? "noindex, nofollow, noarchive" : "index, follow";
  const htmlResponse = knownRoute ? assetResponse : new Response(assetResponse.body, {
    status: 404,
    headers: assetResponse.headers
  });
  const transformed = new HTMLRewriter().on("title", { element(element) {
    element.setInnerContent(metadata.title);
  } }).on("meta[name='description']", { element(element) {
    element.setAttribute("content", metadata.description);
  } }).on("meta[name='robots']", { element(element) {
    element.setAttribute("content", robotsDirective);
  } }).on("meta[property='og:title']", { element(element) {
    element.setAttribute("content", metadata.title);
  } }).on("meta[property='og:description']", { element(element) {
    element.setAttribute("content", metadata.description);
  } }).on("meta[property='og:url']", { element(element) {
    element.setAttribute("content", canonical);
  } }).on("meta[property='og:image']", { element(element) {
    element.setAttribute("content", siteUrl + "/og.png");
  } }).on("meta[name='twitter:image']", { element(element) {
    element.setAttribute("content", siteUrl + "/og.png");
  } }).on("link[rel='canonical']", { element(element) {
    element.setAttribute("href", canonical);
  } }).on("#business-schema", { element(element) {
    if (knownRoute) element.setInnerContent(schema, { html: false });
    else element.remove();
  } }).on("#app", { element(element) {
    element.setInnerContent(crawlablePageContent(url.pathname), { html: true });
  } }).on("script[src='/app.js']", { element(element) {
    if (!knownRoute) element.remove();
  } }).transform(htmlResponse);
  return securityHeaders(transformed, false, robotsDirective === "index, follow" ? null : robotsDirective);
}
__name(serveHtml, "serveHtml");
async function handleApi(request, env, url) {
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  const store = storeFor(env);
  if (method === "GET" && pathname === "/api/public/config") {
    return json({ config: await store.getPublicConfig() });
  }
  if (method === "GET" && pathname === "/api/public/services") {
    return json({ services: await store.getPublicServices() });
  }
  if (method === "GET" && pathname === "/api/public/staff") {
    return json({ staff: await store.getPublicStaff() });
  }
  if (method === "GET" && pathname === "/api/public/availability") {
    const staffId = url.searchParams.get("staffId") || "";
    const serviceId = url.searchParams.get("serviceId") || "";
    const availability = staffId === "first_available" ? await store.getFirstAvailableAvailability(serviceId) : { staffId, slots: await store.getAvailability(staffId, serviceId) };
    return json({
      ...availability,
      timezone: "America/Chicago"
    });
  }
  if (method === "POST" && pathname === "/api/bookings/hold") {
    assertSameOrigin(request);
    checkRateLimit(request, "booking_hold", 12, 10 * 6e4);
    const body = serializeIdempotency(request, await readJson(request));
    const result = await store.createBookingHold(body, await customerOrGuest(request, env));
    return json(result, result.replayed ? 200 : 201);
  }
  if (method === "POST" && pathname === "/api/bookings/confirm") {
    assertSameOrigin(request);
    checkRateLimit(request, "booking_confirm", 12, 10 * 6e4);
    const body = serializeIdempotency(request, await readJson(request));
    const result = await store.confirmBooking(body, await customerOrGuest(request, env));
    return json(result, result.replayed ? 200 : 201);
  }
  if (method === "GET" && pathname === "/api/queue") {
    return json(await store.getQueue(url.searchParams.get("entry") || null));
  }
  if (method === "POST" && pathname === "/api/queue") {
    assertSameOrigin(request);
    checkRateLimit(request, "queue_join", 6, 30 * 6e4);
    const entry = await store.joinQueue(await readJson(request), { sub: "public", role: "customer", tenantId: TENANT_ID });
    return json({ entry }, 201);
  }
  if (method === "POST" && pathname === "/api/dev/owner-session") {
    if (!localDevIsEnabled(env)) throw new HttpError(404, "Not found.", "not_found");
    assertSameOrigin(request);
    const csrf = crypto.randomUUID();
    const session2 = {
      sub: "local-owner",
      role: "owner",
      tenantId: TENANT_ID,
      csrf,
      exp: Math.floor(Date.now() / 1e3) + 8 * 60 * 60
    };
    const token = await createSignedSession(session2, env.SESSION_SECRET);
    return json({ session: { authenticated: true, role: "owner", csrf, developmentOnly: true } }, 200, { "Set-Cookie": sessionCookie(token, request) });
  }
  if (method === "POST" && pathname === "/api/dev/customer-session") {
    if (!localDevIsEnabled(env)) throw new HttpError(404, "Not found.", "not_found");
    assertSameOrigin(request);
    const csrf = crypto.randomUUID();
    const session2 = {
      sub: "local-customer",
      role: "customer",
      tenantId: TENANT_ID,
      csrf,
      exp: Math.floor(Date.now() / 1e3) + 8 * 60 * 60
    };
    const token = await createSignedSession(session2, env.SESSION_SECRET);
    return json({ session: { authenticated: true, role: "customer", csrf, developmentOnly: true } }, 200, { "Set-Cookie": sessionCookie(token, request) });
  }
  if (method === "GET" && pathname === "/api/session") {
    const session2 = await getSession(request, env);
    return json({
      session: session2 ? { authenticated: true, role: session2.role, csrf: session2.csrf || null } : { authenticated: false }
    });
  }
  const session = await getSession(request, env);
  if (method === "GET" && pathname === "/api/portal/summary") {
    assertRole(session, ["customer"]);
    return json({ portal: await store.getPortalSummary(session) });
  }
  if (method === "POST" && pathname === "/api/portal/preferences") {
    assertRole(session, ["customer"]);
    assertCsrf(request, session);
    return json({ profile: await store.updatePortalPreferences(await readJson(request), session) });
  }
  if (method === "GET" && pathname === "/api/admin/queue") {
    assertRole(session, ADMIN_ROLES);
    return json({ entries: await store.getAdminQueue() });
  }
  if (method === "GET" && pathname === "/api/admin/overview") {
    assertRole(session, MANAGER_ROLES);
    return json({ overview: await store.getAdminOverview() });
  }
  if (method === "POST" && pathname === "/api/admin/settings") {
    assertRole(session, OWNER_ROLES);
    assertCsrf(request, session);
    return json({ settings: await store.updateSettings(await readJson(request), session) });
  }
  if (method === "POST" && pathname === "/api/admin/staff") {
    assertRole(session, OWNER_ROLES);
    assertCsrf(request, session);
    return json({ staff: await store.createStaff(await readJson(request), session) }, 201);
  }
  const staffUpdate = routeParams(pathname, /^\/api\/admin\/staff\/([^/]+)$/);
  if (method === "POST" && staffUpdate) {
    assertRole(session, OWNER_ROLES);
    assertCsrf(request, session);
    return json({ staff: await store.updateStaff(staffUpdate[0], await readJson(request), session) });
  }
  if (method === "POST" && pathname === "/api/admin/availability") {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ availabilityWindow: await store.addAvailabilityWindow(await readJson(request), session) }, 201);
  }
  const availabilityUpdate = routeParams(pathname, /^\/api\/admin\/availability\/([^/]+)$/);
  if (method === "POST" && availabilityUpdate) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ availabilityWindow: await store.updateAvailabilityWindow(availabilityUpdate[0], await readJson(request), session) });
  }
  if (method === "DELETE" && availabilityUpdate) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ removed: await store.removeAvailabilityWindow(availabilityUpdate[0], session) });
  }
  if (method === "POST" && pathname === "/api/admin/services/drafts") {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ service: await store.createServiceDraft(await readJson(request), session) }, 201);
  }
  if (method === "POST" && pathname === "/api/admin/memberships/drafts") {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ membershipPlan: await store.createMembershipPlanDraft(await readJson(request), session) }, 201);
  }
  const serviceUpdate = routeParams(pathname, /^\/api\/admin\/services\/([^/]+)$/);
  if (method === "POST" && serviceUpdate) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json(await store.updateService(serviceUpdate[0], await readJson(request), session));
  }
  const membershipUpdate = routeParams(pathname, /^\/api\/admin\/memberships\/([^/]+)$/);
  if (method === "POST" && membershipUpdate) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json(await store.updateMembershipPlan(membershipUpdate[0], await readJson(request), session));
  }
  const serviceRequest = routeParams(pathname, /^\/api\/admin\/services\/([^/]+)\/request-approval$/);
  if (method === "POST" && serviceRequest) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ approval: await store.requestServiceApproval(serviceRequest[0], session) }, 201);
  }
  const membershipRequest = routeParams(pathname, /^\/api\/admin\/memberships\/([^/]+)\/request-approval$/);
  if (method === "POST" && membershipRequest) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ approval: await store.requestMembershipPlanApproval(membershipRequest[0], session) }, 201);
  }
  if (method === "POST" && pathname === "/api/admin/queue/status") {
    assertRole(session, ADMIN_ROLES);
    assertCsrf(request, session);
    return json({ entry: await store.updateQueueStatus(await readJson(request), session) });
  }
  if (method === "POST" && pathname === "/api/admin/marketing/drafts") {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ draft: await store.createMarketingDraft(await readJson(request), session) }, 201);
  }
  if (method === "POST" && pathname === "/api/admin/marketing/cadences") {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ cadence: await store.createMarketingCadence(await readJson(request), session) }, 201);
  }
  if (method === "POST" && pathname === "/api/admin/marketing/cadences/run") {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ result: await store.runDueMarketingCadences(/* @__PURE__ */ new Date(), session) });
  }
  const cadenceUpdate = routeParams(pathname, /^\/api\/admin\/marketing\/cadences\/([^/]+)$/);
  if (method === "POST" && cadenceUpdate) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ cadence: await store.updateMarketingCadence(cadenceUpdate[0], await readJson(request), session) });
  }
  const marketingDraftUpdate = routeParams(pathname, /^\/api\/admin\/marketing\/([^/]+)$/);
  if (method === "POST" && marketingDraftUpdate) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ draft: await store.updateMarketingDraft(marketingDraftUpdate[0], await readJson(request), session) });
  }
  const marketingRequest = routeParams(pathname, /^\/api\/admin\/marketing\/([^/]+)\/request-approval$/);
  if (method === "POST" && marketingRequest) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ approval: await store.requestMarketingApproval(marketingRequest[0], session) }, 201);
  }
  const agentPolicyRequest = routeParams(pathname, /^\/api\/admin\/agents\/([^/]+)\/request-change$/);
  if (method === "POST" && agentPolicyRequest) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ approval: await store.requestAgentPolicyChange(agentPolicyRequest[0], await readJson(request), session) }, 201);
  }
  if (method === "POST" && pathname === "/api/admin/integrations/drafts") {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ integration: await store.createIntegrationDraft(await readJson(request), session) }, 201);
  }
  const integrationUpdate = routeParams(pathname, /^\/api\/admin\/integrations\/([^/]+)$/);
  if (method === "POST" && integrationUpdate) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json(await store.saveIntegrationDraft(integrationUpdate[0], await readJson(request), session));
  }
  const integrationDisable = routeParams(pathname, /^\/api\/admin\/integrations\/([^/]+)\/disable$/);
  if (method === "POST" && integrationDisable) {
    assertRole(session, OWNER_ROLES);
    assertCsrf(request, session);
    return json({ integration: await store.disableIntegration(integrationDisable[0], session) });
  }
  const integrationRequest = routeParams(pathname, /^\/api\/admin\/integrations\/([^/]+)\/request-approval$/);
  if (method === "POST" && integrationRequest) {
    assertRole(session, MANAGER_ROLES);
    assertCsrf(request, session);
    return json({ approval: await store.requestIntegrationApproval(integrationRequest[0], session) }, 201);
  }
  if (method === "POST" && pathname === "/api/admin/approvals/decide") {
    assertRole(session, OWNER_ROLES);
    assertCsrf(request, session);
    return json({ approval: await store.decideApproval(await readJson(request), session) });
  }
  throw new HttpError(404, "This service route does not exist.", "not_found");
}
__name(handleApi, "handleApi");
async function dispatch(request, env) {
  const url = new URL(request.url);
  const siteUrl = publicSiteUrl(env, url);
  if (url.pathname === "/robots.txt") return securityHeaders(text(dynamicRobots(siteUrl), 200, "text/plain; charset=utf-8"), false);
  if (url.pathname === "/sitemap.xml") return securityHeaders(text(sitemap(siteUrl), 200, "application/xml; charset=utf-8"), false);
  if (url.pathname.startsWith("/api/")) return securityHeaders(await handleApi(request, env, url), true);
  if (request.method !== "GET" && request.method !== "HEAD") return securityHeaders(text("Method not allowed.", 405), true);
  return serveHtml(request, env, url);
}
__name(dispatch, "dispatch");
var index_default = {
  async fetch(request, env) {
    try {
      return await dispatch(request, env);
    } catch (error) {
      if (error instanceof HttpError) return securityHeaders(json({ error: error.code, message: error.message }, error.status), true);
      return securityHeaders(json({ error: "internal_error", message: "Something went wrong. Please try again." }, 500), true);
    }
  },
  async scheduled(controller, env, executionContext) {
    if (!env.DB) return;
    const run = /* @__PURE__ */ __name(async () => {
      try {
        await storeFor(env).runDueMarketingCadences(new Date(controller.scheduledTime || Date.now()), {
          sub: "breeze-marketing-scheduler",
          role: "manager",
          tenantId: TENANT_ID
        });
      } catch {
      }
    }, "run");
    if (executionContext && typeof executionContext.waitUntil === "function") {
      executionContext.waitUntil(run());
      return;
    }
    await run();
  }
};
export {
  crawlablePageContent,
  index_default as default,
  dynamicRobots,
  knownPageRoute,
  pageMetadata,
  publicSiteUrl,
  sessionCookie,
  sitemap
};
