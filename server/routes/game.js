const express = require('express');
const router = express.Router();
const { getIo } = require("../socket");
const { games, gameIds } = require("../globals");

function gameId(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    
    return result;
}

const GAME_ID_LEN = 4;

router.get('/host', function(req, res, next) {
    const playerName = req.query.name;

    if(!playerName){
        return res.status(400).json({error: 'Player\'s name required!'});
    }

    // Generate a unique gameID: re-roll until we find one not already in use.
    let gameID = gameId(GAME_ID_LEN);
    while (gameIds.has(gameID)) {
        gameID = gameId(GAME_ID_LEN);
    }
    gameIds.add(gameID);
    games[gameID] = {"players": {}};

    const id = 0;
    const playerType = 'host';
    const player = {id: id, name: playerName, playerType: playerType, score: 0};
    games[gameID]["players"][id] = player;

    console.log(`Crearted new game with game id: ${gameID}`);
    console.log(`${playerName} player #${id} had joined the game!`);

    res.send({player: player, gameID: gameID});
});

router.get('/join', function(req, res, next) {
    const playerName = req.query.name;
    const gameID = req.query.gameID;

    if(!playerName || !gameID){
        return res.status(400).json({error: 'Player\'s name and gameID are required!'});
    }

    if (!(gameID in games)) {
        return res.status(400).json({error: 'No such game id'});
    }

    const id = Object.keys(games[gameID].players).length;
    const playerType = 'join';
    const player = {id: id, name: playerName, playerType: playerType, score: 0};
    games[gameID]["players"][id] = player;
    //debug
    console.log(games);
    
    console.log(`${playerName} player #${id} had joined the game!`);

    const io = getIo();
    // Broadcast to room
    // io.to(gameID).emit("message", { user: "Server", players: games[gameID]["players"] });

    res.send({player: player, gameID: gameID});
});

// Test-only: seed every player's score in a game so a single round ends it.
// Used by e2e tests to reach the game-over overlay without playing many rounds.
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

module.exports = router;
