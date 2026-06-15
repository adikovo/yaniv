const http = require('http');
const { Server } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');
const { games } = require('../../globals');
const { createDeck, shuffleDeck, dealCards, whosTurn, topCard, handValue } = require('../../gameLogic');

const PLAYER_NAMES = ['Alice', 'Bob', 'Carol', 'Dave'];

// Wires up socket handlers on an existing io instance (mirrors socket.js without the globals coupling)
function attachSocketHandlers(io, rooms) {
    const { setupSocket } = require('../../socket');
    return io;
}

/**
 * Spins up a real HTTP + Socket.io server on a random port.
 * Seeds a game with two players and starts it.
 * Returns { httpServer, port, gameID, player0, player1, connectClient }
 */
async function createTestServer({ readyTimeout, playerCount = 2 } = {}) {
    const app = require('../../app');
    const { setupSocket } = require('../../socket');

    const httpServer = http.createServer(app);
    const io = setupSocket(httpServer, ...(readyTimeout !== undefined ? [{ readyTimeout }] : []));

    await new Promise(resolve => httpServer.listen(0, resolve));
    const port = httpServer.address().port;

    const gameID = 'TEST';
    const playerObjects = {};
    for (let i = 0; i < playerCount; i++) {
        playerObjects[i] = { id: i, name: PLAYER_NAMES[i], playerType: i === 0 ? 'host' : 'join' };
    }
    games[gameID] = { players: playerObjects };

    const deck = createDeck();
    shuffleDeck(games[gameID], deck);
    dealCards(games[gameID]);
    whosTurn(games[gameID]);
    topCard(games[gameID]);
    for (let i = 0; i < playerCount; i++) {
        handValue(games[gameID].players[i]);
    }
    games[gameID].game_state.current_turn = 0;

    function connectClient(playerObj) {
        return new Promise((resolve, reject) => {
            const client = ClientIO(`http://localhost:${port}`, { forceNew: true });
            client.on('connect', () => {
                client.once('joinRoomResult', () => resolve(client));
                client.emit('joinRoom', { player: playerObj, room: gameID });
            });
            client.on('connect_error', reject);
        });
    }

    function closeServer() {
        return new Promise(resolve => {
            if (games[gameID]?.roundTimer) clearTimeout(games[gameID].roundTimer);
            delete games[gameID];
            // io.close() disconnects any still-open clients and closes the
            // underlying httpServer
            io.close(resolve);
        });
    }

    const players = Object.values(playerObjects);
    return {
        httpServer, port, gameID,
        player0: playerObjects[0],
        player1: playerObjects[1],
        ...(playerCount >= 3 && { player2: playerObjects[2] }),
        players,
        connectClient, closeServer
    };
}

module.exports = { createTestServer };
