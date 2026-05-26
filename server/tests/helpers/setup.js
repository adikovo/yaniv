const http = require('http');
const { Server } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');
const { games } = require('../../globals');
const { createDeck, shuffleDeck, dealCards, whosTurn, topCard, handValue } = require('../../gameLogic');

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
async function createTestServer() {
    const app = require('../../app');
    const { setupSocket } = require('../../socket');

    const httpServer = http.createServer(app);
    setupSocket(httpServer);

    await new Promise(resolve => httpServer.listen(0, resolve));
    const port = httpServer.address().port;

    // Seed a game directly into globals
    const gameID = 'TEST';
    const player0 = { id: 0, name: 'Alice', playerType: 'host' };
    const player1 = { id: 1, name: 'Bob', playerType: 'join' };
    games[gameID] = { players: { 0: player0, 1: player1 } };

    // Deal cards and set game state
    const deck = createDeck();
    shuffleDeck(games[gameID], deck);
    dealCards(games[gameID]);
    whosTurn(games[gameID]);
    topCard(games[gameID]);
    handValue(games[gameID].players[0]);
    handValue(games[gameID].players[1]);
    // Fix current_turn to player 0 for predictable tests
    games[gameID].game_state.current_turn = 0;

    /**
     * Connect a socket client that has already joined the room.
     * playerObj must match one of the seeded players.
     */
    function connectClient(playerObj) {
        return new Promise((resolve, reject) => {
            const client = ClientIO(`http://localhost:${port}`, { forceNew: true });
            client.on('connect', () => {
                client.emit('joinRoom', { player: playerObj, room: gameID });
                resolve(client);
            });
            client.on('connect_error', reject);
        });
    }

    function closeServer() {
        return new Promise(resolve => {
            delete games[gameID];
            httpServer.close(resolve);
        });
    }

    return { httpServer, port, gameID, player0, player1, connectClient, closeServer };
}

module.exports = { createTestServer };
