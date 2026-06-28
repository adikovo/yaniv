const { Server } = require("socket.io");
const { createDeck, shuffleDeck, dealCards, getCurrentPlayer, whosTurn, nextTurn, handValue, topCard, validYaniv, yanivCall, eliminatePlayers, makeTurnCardFromHand, makeTurnCardFromDeck, makeTurnCardFromTop } = require("./gameLogic");
const { games, gameIds } = require("./globals");
const { ROUND_DELAY_MS, REMATCH_TIMEOUT_MS, corsOrigin } = require("./config");
const { validateJoinRoom, validateMakeTurn, validateChatMessage } = require("./validation");

let io;
const rooms = {}; // Store users per room { roomId: { socketId: username, ... }, ... }

const setupSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: corsOrigin,
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        // When a user joins a room
        socket.on("joinRoom", (payload) => {
            const check = validateJoinRoom(payload);
            if (!check.ok) return; // reject malformed join; don't create/populate the room
            const { player, room } = check.value;

            socket.join(room);

            if (!rooms[room]) {
                // Create room if it doesn't exist
                rooms[room] = {};
            }
            // Store user inside room
            rooms[room][socket.id] = player;

            io.to(room).emit("joinRoomResult", { user: "Server", player: player });
            console.log(`${player.name} joined room: ${room}`);

            const currentPlayers = Object.values(rooms[room]);
            io.to(room).emit("playersUpdate", { players: currentPlayers });
        });

        // When a user sends a message
        socket.on("chatMessage", (message) => {
            const check = validateChatMessage(message);
            if (!check.ok) return; // drop non-string / over-length messages
            let room = getUserRoom(socket.id);
            if (room) {
                io.to(room).emit("message", { user: rooms[room][socket.id], text: check.value });
            }
        });

        // Host clicked "Start Game" in the lobby → deal the first round.
        socket.on("startGame", () => {
            const room = getUserRoom(socket.id);
            if (!room || !games[room]) return; // no game for this socket — ignore safely
            if (Object.keys(rooms[room] ?? {}).length < 2) return;
            games[room].eliminated = [];
            dealNewRound(room, "start");
        });



        // turn = {type: "cardFromDeck"/ "cardFromTop"/"cardFromHand"/"yaniv", 
        //         value:                             "selectedCards"
        // }

        socket.on("makeTurn", (room, turn_data) => {
            if (typeof room !== "string") return;
            const socketPlayer = rooms[room]?.[socket.id];
            if (!socketPlayer) return;
            const player = games[room]?.players?.[socketPlayer.id];
            if (!player) return;
            const game_state = games[room].game_state;
            const currentPlayer = getCurrentPlayer(games[room]);
            if (!currentPlayer || socketPlayer.id !== currentPlayer.id) {
                return;
            }

            // Validate the payload (shape, type, in-hand card indices, side) before
            // acting — guards against crashes and game-state corruption from
            // hand-crafted messages.
            const check = validateMakeTurn(turn_data, player.hand.length);
            if (!check.ok) {
                socket.emit("turnError", { message: "Invalid move." });
                return;
            }

            if (turn_data.type === "cardFromDeck") {
                if (!turn_data.selected_cards || turn_data.selected_cards.length === 0) {
                    socket.emit("turnError", { message: "You must select cards to discard before drawing." });
                    return;
                }
                makeTurnCardFromHand(games[room], player, turn_data.selected_cards);
                makeTurnCardFromDeck(games[room], player);
                socket.emit("hand", { hand: player.hand, hand_sum: player.sum });
                io.to(room).emit("turn", {
                    top_card: game_state.top_card,
                    current_turn: game_state.current_turn,
                    deck: game_state.deck,
                    hand_sizes: getHandSizes(games[room])
                });
            }
            if (turn_data.type === "cardFromTop") {
                if (!turn_data.selected_cards || turn_data.selected_cards.length === 0) {
                    socket.emit("turnError", { message: "You must select cards to discard before drawing." });
                    return;
                }
                makeTurnCardFromTop(games[room], player, turn_data.side);
                makeTurnCardFromHand(games[room], player, turn_data.selected_cards);
                socket.emit("hand", { hand: player.hand, hand_sum: player.sum });
                io.to(room).emit("turn", {
                    top_card: game_state.top_card,
                    current_turn: game_state.current_turn,
                    deck: game_state.deck,
                    hand_sizes: getHandSizes(games[room])
                });
            }
            if (turn_data.type === "yaniv") {
                if (validYaniv(player.sum)) {
                    const { winner, asaf, caller, asafPlayers } = yanivCall(games[room]);
                    // Snapshot scores before eliminatePlayers deletes over-100 players from the map
                    const players = {};
                    for (const key in games[room].players) {
                        const p = games[room].players[key];
                        players[key] = { id: p.id, name: p.name, hand: p.hand, sum: p.sum, score: p.score };
                    }
                    const newlyEliminated = eliminatePlayers(games[room]);
                    io.to(room).emit("roundEnd", {
                        winner: { id: winner.id, name: winner.name },
                        asaf,
                        yanivCaller: { id: caller.id, name: caller.name },
                        asafPlayers,
                        players,
                        eliminated: newlyEliminated
                    });

                    const remaining = Object.keys(games[room].players).length;
                    if (remaining === 1) {
                        const winner = Object.values(games[room].players)[0];
                        const allPlayers = {};
                        for (const key in games[room].players) {
                            const p = games[room].players[key];
                            allPlayers[key] = { id: p.id, name: p.name, score: p.score };
                        }
                        for (const p of (games[room].eliminated || [])) {
                            allPlayers[p.id] = { id: p.id, name: p.name, score: p.score };
                        }
                        // Same delay as the nextRound path, so clients can play the round-end call-out first
                        games[room].roundTimer = setTimeout(() => io.to(room).emit("gameOver", { winner: { id: winner.id, name: winner.name }, players: allPlayers }), ROUND_DELAY_MS);
                    } else {
                        // remaining >= 2: game continues; remaining === 0: draw, restore both players
                        if (remaining === 0) {
                            for (const p of newlyEliminated) {
                                games[room].players[p.id] = { id: p.id, name: p.name, score: p.score };
                            }
                            games[room].eliminated = (games[room].eliminated || []).filter(
                                e => !newlyEliminated.some(n => n.id === e.id)
                            );
                        }
                        games[room].roundTimer = setTimeout(() => dealNewRound(room, "nextRound", winner.id), ROUND_DELAY_MS);
                    }
                }
            }

        })



        socket.on("spectatorJoin", () => {
            const room = getUserRoom(socket.id);
            if (!room || !games[room]) return;

            const socketPlayer = rooms[room][socket.id];
            if (!socketPlayer) return;

            if (!games[room].spectators) games[room].spectators = [];
            const alreadySpectating = games[room].spectators.some(s => s.id === socketPlayer.id);
            if (alreadySpectating) return;

            games[room].spectators.push({ id: socketPlayer.id, name: socketPlayer.name, socketId: socket.id });
        });

        socket.on("rematchReady", () => {
            const room = getUserRoom(socket.id);
            if (!room || !games[room]) return;

            const socketPlayer = rooms[room][socket.id];
            if (!socketPlayer) return;

            if (!games[room].rematchReady) games[room].rematchReady = new Set();
            if (games[room].rematchReady.has(socketPlayer.id)) return; // idempotent

            games[room].rematchReady.add(socketPlayer.id);

            // Everyone still in the room is ready → start immediately, no need to wait out the timer.
            const totalInRoom = Object.keys(rooms[room]).length;
            if (games[room].rematchReady.size >= totalInRoom) {
                startRematch(room);
                return;
            }

            if (!games[room].rematchTimer) {
                games[room].rematchTimer = setTimeout(() => startRematch(room), REMATCH_TIMEOUT_MS);
            }
        });

        socket.on("leaveRoom", () => {
            const room = getUserRoom(socket.id);
            if (!room) return;
            socket.leave(room);
            removePlayer(room, socket.id);
        });

        // When a user disconnects
        socket.on("disconnect", () => {
            const room = getUserRoom(socket.id);
            if (!room) return;
            const player = removePlayer(room, socket.id);
            if (player) {
                io.to(room).emit("message", { user: "Server", text: `${player.name} has left the chat.` });
                console.log(`User disconnected: ${socket.id}`);
            }
        });
    });

    return io;
};

// Tears down an empty room and its game (clearing any pending rematch timer).
// Returns true if the room was removed.
function cleanupRoomIfEmpty(room) {
    if (!rooms[room] || Object.keys(rooms[room]).length > 0) return false;
    delete rooms[room];
    if (games[room]) {
        if (games[room].rematchTimer) clearTimeout(games[room].rematchTimer);
        delete games[room];
    }
    gameIds.delete(room); // `room` is the gameID; release it for reuse
    return true;
}

// Removes a player (by socket id) from a room, whether they disconnected or chose to
// leave. Shared by the `disconnect` and `leaveRoom` handlers. Returns the player object
// that was removed, or null.
function removePlayer(room, socketId) {
    if (!room || !rooms[room]) return null;
    const player = rooms[room][socketId];
    delete rooms[room][socketId];

    if (games[room]) {
        // Drop the leaver from any post-game collections so a pending rematch can't restore them.
        if (games[room].rematchReady && player) games[room].rematchReady.delete(player.id);
        if (games[room].eliminated && player) {
            games[room].eliminated = games[room].eliminated.filter(e => e.id !== player.id);
        }
        if (games[room].spectators) {
            games[room].spectators = games[room].spectators.filter(s => s.socketId !== socketId);
        }
    }

    if (cleanupRoomIfEmpty(room)) return player;

    // Pre-start lobby: game exists but hasn't dealt yet (no game_state).
    // Emit the roster update the lobby UI listens to and skip the in-game path.
    if (games[room] && !games[room].game_state) {
        if (player) delete games[room].players[player.id];
        io.to(room).emit("playersUpdate", { players: Object.values(rooms[room]) });
        return player;
    }

    if (games[room] && player && games[room].players[player.id]) {
        delete games[room].players[player.id];
        io.to(room).emit("playerDisconnected", { name: player.name, id: player.id });

        const remaining = Object.keys(games[room].players).length;
        if (remaining === 1) {
            const winner = Object.values(games[room].players)[0];
            io.to(room).emit("gameOver", { winner: { id: winner.id, name: winner.name }, reason: 'disconnect' });
        } else if (remaining >= 2) {
            const gs = games[room].game_state;
            if (gs && gs.current_turn === player.id) {
                nextTurn(games[room]);
                io.to(room).emit("turn", { top_card: gs.top_card, current_turn: gs.current_turn, deck: gs.deck });
            }
        }
    }
    return player;
}

// Ready-authoritative rematch: when the timer expires (or everyone is ready), start a new
// game with ONLY the players who clicked Rematch — and only if at least 2 are ready.
// Non-ready players are dropped and told to go home; fewer than 2 ready cancels the rematch.
function startRematch(room) {
    if (!games[room]) return; // room emptied while the rematch timer was pending
    if (games[room].rematchTimer) { clearTimeout(games[room].rematchTimer); delete games[room].rematchTimer; }

    const readyIds = new Set(games[room].rematchReady || []);

    if (readyIds.size < 2) {
        // Not enough players to play: cancel, send everyone home, tear the room down.
        io.to(room).emit("rematchCancelled");
        for (const sid in (rooms[room] || {})) {
            const sock = io.sockets.sockets.get(sid);
            if (sock) sock.leave(room);
        }
        delete rooms[room];
        delete games[room];
        gameIds.delete(room); // game fully over (rematch cancelled); release the gameID
        return;
    }

    // Drop players who never clicked Rematch from the room, and send them home.
    for (const sid of Object.keys(rooms[room] || {})) {
        const p = rooms[room][sid];
        if (readyIds.has(p.id)) continue;
        io.to(sid).emit("rematchCancelled");
        const sock = io.sockets.sockets.get(sid);
        if (sock) sock.leave(room);
        delete rooms[room][sid];
        // Remove from games.players now so their subsequent leaveRoom/disconnect
        // doesn't trigger a playerDisconnected broadcast to the remaining players.
        if (games[room]?.players?.[p.id]) delete games[room].players[p.id];
    }

    // Tell remaining players who was dropped so their UI removes the opponent area.
    io.to(room).emit("playersUpdate", { players: Object.values(rooms[room]) });

    // Rebuild the player map from the ready set only (restoring ready-but-eliminated players),
    // with scores reset to 0.
    const players = {};
    for (const id in games[room].players) {
        if (readyIds.has(games[room].players[id].id)) players[id] = games[room].players[id];
    }
    for (const p of (games[room].eliminated || [])) {
        if (readyIds.has(p.id)) players[p.id] = { id: p.id, name: p.name, score: 0 };
    }
    games[room].players = players;
    games[room].eliminated = [];
    for (const id in games[room].players) games[room].players[id].score = 0;

    delete games[room].rematchReady;
    dealNewRound(room, "start");
}

function dealNewRound(room, eventName, winnerId) {
    if (!games[room]) return; // room emptied while the round delay was pending
    const deck = createDeck();
    shuffleDeck(games[room], deck);
    dealCards(games[room]);
    if (winnerId !== undefined && games[room].players[winnerId]) {
        games[room].game_state.current_turn = winnerId;
    } else {
        whosTurn(games[room]);
    }
    topCard(games[room]);

    const gs = games[room].game_state;
    io.to(room).emit(eventName, { top_card: gs.top_card, current_turn: gs.current_turn, deck: gs.deck, hand_sizes: getHandSizes(games[room]) });

    const spectatorIds = new Set((games[room].spectators || []).map(s => s.id));

    for (const socket_id in rooms[room]) {
        const socketPlayer = rooms[room][socket_id];
        if (spectatorIds.has(socketPlayer.id)) continue;
        const gamePlayer = games[room].players[socketPlayer.id];
        if (gamePlayer) {
            handValue(gamePlayer);
            io.to(socket_id).emit("hand", { hand: gamePlayer.hand, hand_sum: gamePlayer.sum });
        }
    }
}

function getHandSizes(game) {
    const sizes = {};
    for (const id in game.players) sizes[id] = game.players[id].hand.length;
    return sizes;
}

// Utility function to get a user's room
const getUserRoom = (socketId) => {
    for (const room in rooms) {
        if (rooms[room][socketId]) {
            return room
        };
    }
    return null;
};


module.exports = { setupSocket, getIo: () => io, rooms };
