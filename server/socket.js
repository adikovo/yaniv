const { Server } = require("socket.io");
const { createDeck, shuffleDeck, dealCards, getCurrentPlayer, whosTurn, nextTurn, drawFromDeck, handValue, topCard, validYaniv, yanivCall, eliminatePlayers, drawTopCard, updateTopCard, makeTurnCardFromHand, selectCards, removeCardFromHand, rebuildDeck, makeTurnCardFromDeck, makeTurnCardFromTop } = require("./gameLogic");
const { games } = require("./globals");

let io;
const rooms = {}; // Store users per room { roomId: { socketId: username, ... }, ... }

const setupSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        // When a user joins a room
        socket.on("joinRoom", ({ player, room }) => {
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
            let room = getUserRoom(socket.id);
            if (room) {
                io.to(room).emit("message", { user: rooms[room][socket.id], text: message });
            }
        });

        //debug to check gamelogic
        socket.on("startGame", () => {
            const room = getUserRoom(socket.id);
            games[room].eliminated = [];
            dealNewRound(room, "start");
        });



        // turn = {type: "cardFromDeck"/ "cardFromTop"/"cardFromHand"/"yaniv", 
        //         value:                             "selectedCards"
        // }

        socket.on("makeTurn", (room, turn_data) => {
            //const player = getCurrentPlayer(games[room]);
            //debug
            console.log("RECEIVED selected_cards:", turn_data.selected_cards);

            const socketPlayer = rooms[room]?.[socket.id];
            if (!socketPlayer) return;
            const player = games[room]?.players?.[socketPlayer.id];
            if (!player) return;
            const game_state = games[room].game_state;
            const currentPlayer = getCurrentPlayer(games[room]);
            if (!currentPlayer || socketPlayer.id !== currentPlayer.id) {
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
                    const { winner, asaf, caller } = yanivCall(games[room]);
                    const newlyEliminated = eliminatePlayers(games[room]);
                    const players = {};
                    for (const key in games[room].players) {
                        const p = games[room].players[key];
                        players[key] = { id: p.id, name: p.name, hand: p.hand, sum: p.sum, score: p.score };
                    }
                    io.to(room).emit("roundEnd", {
                        winner: { id: winner.id, name: winner.name },
                        asaf,
                        yanivCaller: { id: caller.id, name: caller.name },
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
                        io.to(room).emit("gameOver", { winner: { id: winner.id, name: winner.name }, players: allPlayers });
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
                        setTimeout(() => dealNewRound(room, "nextRound", winner.id), 4000);
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

            const totalInRoom = Object.keys(rooms[room]).length;

            function startRematch() {
                if (games[room].rematchTimer) { clearTimeout(games[room].rematchTimer); delete games[room].rematchTimer; }
                delete games[room].rematchReady;

                for (const p of (games[room].eliminated || [])) {
                    games[room].players[p.id] = { id: p.id, name: p.name, score: 0 };
                }
                games[room].eliminated = [];

                for (const key in games[room].players) {
                    games[room].players[key].score = 0;
                }

                dealNewRound(room, "start");
            }

            if (games[room].rematchReady.size >= totalInRoom) {
                startRematch();
                return;
            }

            if (!games[room].rematchTimer) {
                games[room].rematchTimer = setTimeout(startRematch, 10000);
            }
        });

        // When a user disconnects
        socket.on("disconnect", () => {
            let room = getUserRoom(socket.id);
            if (room) {
                const player = rooms[room][socket.id];
                delete rooms[room][socket.id];

                if (Object.keys(rooms[room]).length === 0) {
                    delete rooms[room];
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
                            io.to(room).emit("turn", {
                                top_card: gs.top_card,
                                current_turn: gs.current_turn,
                                deck: gs.deck
                            });
                        }
                    }
                }

                if (player) {
                    io.to(room).emit("message", { user: "Server", text: `${player.name} has left the chat.` });
                    console.log(`User disconnected: ${socket.id}`);
                }
            }
        });
    });

    return io;
};

function dealNewRound(room, eventName, winnerId) {
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


module.exports = { setupSocket, getIo: () => io };
