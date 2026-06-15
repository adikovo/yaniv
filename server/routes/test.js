// Test-only routes. Mounted under /test in app.js ONLY when not in production,
// so this state-manipulation surface is never exposed on a real deployment.
//
// e2e tests drive a real running server in a separate process, so (unlike the
// in-process Jest unit tests) they cannot mutate the server's `games` object
// directly — these HTTP endpoints are how a browser-driven test seeds state.
const express = require('express');
const router = express.Router();
const { getIo, rooms } = require("../socket");
const { games } = require("../globals");
const { handValue } = require("../gameLogic");

// Seed every player's cumulative score so a single round ends the game.
router.get('/seedScores', function(req, res, next) {
    const gameID = req.query.gameID;
    const score = Number(req.query.score);

    if (!gameID || Number.isNaN(score)) {
        return res.status(400).json({error: 'gameID and numeric score are required!'});
    }
    if (!(gameID in games)) {
        return res.status(400).json({error: 'No such game id'});
    }

    for (const id in games[gameID].players) {
        games[gameID].players[id].score = score;
    }

    res.send({gameID: gameID, score: score});
});

// Set one player's hand to a single card of value `sum` (default 1) and emit
// `hand` to their socket so the YANIV button enables. Lets e2e tests force
// Yaniv (sum=1) / Asaf (caller=7 vs opponent=3) without playing turns.
router.get('/seedHand', function(req, res, next) {
    const gameID = req.query.gameID;
    const playerId = Number(req.query.playerId);
    const sum = req.query.sum === undefined ? 1 : Number(req.query.sum);

    if (!gameID || Number.isNaN(playerId)) {
        return res.status(400).json({error: 'gameID and numeric playerId are required!'});
    }
    if (!(gameID in games)) {
        return res.status(400).json({error: 'No such game id'});
    }
    const player = games[gameID].players[playerId];
    if (!player) {
        return res.status(400).json({error: 'No such player in game'});
    }
    if (Number.isNaN(sum) || sum < 1 || sum > 10) {
        return res.status(400).json({error: 'sum must be between 1 and 10 (single-card seed)'});
    }

    // A single card with numeric_val === sum (deck values are strings '1'..'10').
    player.hand = [{ value: String(sum), suit: 'H', numeric_val: sum }];
    handValue(player); // recompute player.sum from the new hand

    // Push the new hand to that player's own socket so the client's `sum` state
    // updates and the YANIV button (disabled when sum > 7) enables.
    const room = rooms[gameID] || {};
    const socketId = Object.keys(room).find(sid => room[sid].id === playerId);
    if (socketId) {
        getIo().to(socketId).emit('hand', { hand: player.hand, hand_sum: player.sum });
    }

    res.send({gameID: gameID, playerId: playerId, sum: player.sum});
});

module.exports = router;
