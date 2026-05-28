# Test Specifications: Round End Event & Asaf Detection

All tests go in `server/tests/roundEnd.test.js`.
Use the existing `createTestServer()` helper from `server/tests/helpers/setup.js`.

**Timer note**: The `readyForNextRound` timeout must be injectable (default 15s, overridable in tests to ~100ms) so T-F and T-G don't take 15 seconds each.

---

## T-A: Normal Yaniv win

**Scenario**: Player 0 calls Yaniv with the strictly lowest hand. No Asaf.

**Setup**: Force `players[0].sum = 5`, `players[1].sum = 10`.

**Action**: `client0` emits `makeTurn` with `type: "yaniv"`.

**Assert**:
- `roundEnd` event received by both clients
- `roundEnd.winner.id === 0`
- `roundEnd.asaf === false`
- `roundEnd.asafCaller === null`
- `roundEnd.players[1].score === 10` (loser adds their own sum)
- `roundEnd.players[0].score === 0` (winner adds nothing)

---

## T-B: Asaf triggered — caller has higher sum

**Scenario**: Player 0 calls Yaniv but player 1 has a lower hand.

**Setup**: Force `players[0].sum = 5`, `players[1].sum = 4`.

**Action**: `client0` emits `makeTurn` with `type: "yaniv"`.

**Assert**:
- `roundEnd.asaf === true`
- `roundEnd.asafCaller.id === 0`
- `roundEnd.winner.id === 1`
- `roundEnd.players[0].score === 35` (30 + 5)
- `roundEnd.players[1].score === 4` (everyone adds their sum in Asaf round)

---

## T-C: Asaf triggered — tied hand value

**Scenario**: Player 0 calls Yaniv; player 1 has equal sum (tie → Asaf applies per spec).

**Setup**: Force `players[0].sum = 5`, `players[1].sum = 5`.

**Assert**:
- `roundEnd.asaf === true`
- `roundEnd.asafCaller.id === 0`
- `roundEnd.players[0].score === 35` (30 + 5)
- `roundEnd.players[1].score === 5` (everyone adds their sum in Asaf round)

---

## T-D: Multiple Asaf candidates — winner is lowest hand, not caller

**Scenario**: 3-player game. Player 0 calls Yaniv but two others both have lower hands.

**Setup**: Force `players[0].sum = 7`, `players[1].sum = 3`, `players[2].sum = 5`.

**Assert**:
- `roundEnd.asaf === true`
- `roundEnd.winner.id === 1` (lowest hand among all players)
- `roundEnd.players[0].score === 37` (30 + 7)
- `roundEnd.players[1].score === 3` (everyone adds their sum in Asaf round)
- `roundEnd.players[2].score === 5`

---

## T-E: Asaf penalty with sum = 0

**Scenario**: Caller holds 0 sum — penalty should still be 30 + 0 = 30.

**Setup**: Force `players[0].sum = 0`, `players[1].sum = 3`.

**Assert**:
- `roundEnd.players[0].score === 30` (30 + 0)
- `roundEnd.players[1].score === 3` (adds their own sum)

---

## T-F: Score exactly 100 — player NOT eliminated

**Scenario**: Score hits exactly 100 after a round — boundary check.

**Setup**: Force `players[1].score = 95`, `players[1].sum = 5`. Normal loss.

**Assert** after `eliminatePlayers`:
- `players[1]` still in `game.players` (100 is not > 100)
- `players[1].score === 100`

---

## T-G: Score over 100 — player eliminated

**Setup**: Force `players[1].score = 97`, `players[1].sum = 8`. Normal loss → score becomes 105.

**Assert** after `eliminatePlayers`:
- `players[1]` removed from `game.players`
- Returned eliminated array contains player 1

---

## T-H: readyForNextRound — both players ready, round restarts

**Action**: Both clients emit `readyForNextRound` (timer injected at 100ms).

**Assert** after timer fires:
- Both clients receive `nextRound` event
- Both clients receive a new `hand` event with 5 cards

---

## T-I: readyForNextRound — non-clicker dropped, only 1 remains → gameOver

**Scenario**: Only player 0 clicks ready; player 1 does not.

**Assert** after timer fires:
- `game.players` no longer contains player 1
- `gameOver` event emitted (< 2 players)

---

## T-J: readyForNextRound — same player clicks twice (idempotent)

**Assert**: Player is added to ready set only once — no duplicate handling or crash.
