// Validators for the Socket.io event boundary. Each returns { ok, value? } or
// { ok: false, reason } and never throws — malformed input is expected here.
// These protect the server (crashes, state corruption), not against XSS; markup
// in names is allowed and escaped at render. See data-model.md / research.md R4.

const NAME_MIN = 1;
const NAME_MAX = 20;
const ROOM_MAX = 64;
const CHAT_MAX = 500;

// Block only invisible control characters; visible chars (incl. markup) are fine.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F]/;

const MAKE_TURN_TYPES = new Set([
    "cardFromDeck",
    "cardFromTop",
    "cardFromHand",
    "yaniv",
]);
const TOP_SIDES = new Set(["start", "end"]);

const isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === "string" && v.length > 0;
// Server assigns numeric ids; also accept non-empty strings.
const isValidId = (v) => isNonEmptyString(v) || (typeof v === "number" && Number.isFinite(v));

function fail(reason) {
    return { ok: false, reason };
}

function validateJoinRoom(payload) {
    if (!isPlainObject(payload)) return fail("payload must be an object");

    const { player, room } = payload;

    if (!isPlainObject(player)) return fail("player must be an object");
    if (!isValidId(player.id)) return fail("player.id must be a non-empty string or number");
    if (typeof player.name !== "string") return fail("player.name must be a string");

    const name = player.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
        return fail(`player.name must be ${NAME_MIN}-${NAME_MAX} characters after trimming`);
    }
    if (CONTROL_CHARS.test(name)) return fail("player.name contains invalid characters");

    if (!isNonEmptyString(room)) return fail("room must be a non-empty string");
    if (room.length > ROOM_MAX) return fail(`room must be at most ${ROOM_MAX} characters`);

    return { ok: true, value: { player: { ...player, name }, room } };
}

function validateMakeTurn(turn_data, handLength) {
    if (!isPlainObject(turn_data)) return fail("turn_data must be an object");
    if (!MAKE_TURN_TYPES.has(turn_data.type)) return fail("unknown turn type");

    if (turn_data.selected_cards !== undefined) {
        const cards = turn_data.selected_cards;
        if (!Array.isArray(cards)) return fail("selected_cards must be an array");
        for (const i of cards) {
            if (!Number.isInteger(i) || i < 0 || i >= handLength) {
                return fail("selected_cards must be in-hand integer indices");
            }
        }
        if (new Set(cards).size !== cards.length) {
            return fail("selected_cards must not contain duplicates");
        }
    }

    if (turn_data.type === "cardFromTop" && !TOP_SIDES.has(turn_data.side)) {
        return fail('cardFromTop requires side "start" or "end"');
    }

    return { ok: true };
}

function validateChatMessage(message) {
    if (typeof message !== "string") return fail("message must be a string");
    if (message.length > CHAT_MAX) return fail(`message must be at most ${CHAT_MAX} characters`);
    return { ok: true, value: message };
}

module.exports = { validateJoinRoom, validateMakeTurn, validateChatMessage };
