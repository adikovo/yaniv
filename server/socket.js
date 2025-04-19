const { Server } = require("socket.io");
const { createDeck , shuffleDeck, dealCards, getCurrentPlayer, whosTurn, nextTurn, drawFromDeck, handValue, topCard, validYaniv, yanivCall, drawTopCard, updateTopCard, makeTurnCardFromHand, selectCards, removeCardFromHand, rebuildDeck, makeTurnCardFromDeck, makeTurnCardFromTop} = require("./gameLogic");
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
                rooms[room] = {}; // Create room if it doesn't exist
            }
            rooms[room][socket.id] = player; // Store user inside room

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

            let room = getUserRoom(socket.id);
            const players = games[room]["players"];
            let deck = createDeck();
            shuffleDeck(games[room], deck);
            dealCards(games[room]);
            whosTurn(games[room]);
            topCard(games[room]);
            
            console.log(`top card: ${games[room].game_state.top_card}`);
            
            io.to(room).emit("start", {deck: deck, top_card: games[room].game_state.top_card, current_turn: games[room].game_state.current_turn});
            for(let socket_id in rooms[room]){
                const player = rooms[room][socket_id];
                const player_id = player.id;
                const hand = games[room].players[player_id].hand;
                handValue(games[room].players[player_id]);
                
            
                //debug
                console.log(`Sending hand to player ${player.name}:`, hand);

                io.to(socket_id).emit("hand", {hand: hand, hand_sum: games[room].players[player_id].sum});

            }            
        });



       // turn = {type: "cardFromDeck"/ "cardFromTop"/"cardFromHand"/"yaniv", 
       //         value:                             "selectedCards"
       // }

        socket.on("makeTurn", (room, turn_data) => {
            //const player = getCurrentPlayer(games[room]);
            //debug
            console.log("RECEIVED selected_cards:", turn_data.selected_cards);

            const socketPlayer = rooms[room][socket.id];
            const player = games[room].players[socketPlayer.id];
            console.log(player);
            const game_state = games[room].game_state;
            if(socketPlayer.id !== getCurrentPlayer(games[room]).id){
                return;
            }

            if(turn_data.type === "cardFromHand"){
                makeTurnCardFromHand(games[room], player, turn_data.selected_cards);
                socket.emit("hand", {hand: player.hand, hand_sum: player.sum});
                io.to(room).emit("turn", {
                    top_card: game_state.top_card, 
                    current_turn: game_state.current_turn, 
                    deck: game_state.deck})
            } 
            if(turn_data.type === "cardFromDeck") {
                makeTurnCardFromDeck(games[room], player);
                socket.emit("hand", {hand: player.hand, hand_sum: player.sum});
                io.to(room).emit("turn", {
                    top_card: game_state.top_card, 
                    current_turn: game_state.current_turn, 
                    deck: game_state.deck})
            }     
            if(turn_data.type === "cardFromTop"){
                //function below gets turn_data.index
                makeTurnCardFromTop(games[room], player, turn_data.side);
                socket.emit("hand", {hand: player.hand, hand_sum: player.sum});
                io.to(room).emit("turn", {
                    top_card: game_state.top_card, 
                    current_turn: game_state.current_turn, 
                    deck: game_state.deck})
            }  
            if(turn_data.type === "yaniv"){
                if(validYaniv(player.sum)){
                    yanivCall(games[room]);
                    io.to(room).emit("turn", {
                        top_card: game_state.top_card, 
                        current_turn: game_state.current_turn, 
                        deck: game_state.deck})
                }
            }   
    
        })
            
        

        // When a user disconnects
        socket.on("disconnect", () => {
            let room = getUserRoom(socket.id);
            if (room) {
                const player = rooms[room][socket.id];
                delete rooms[room][socket.id]; // Remove user from room

                if (Object.keys(rooms[room]).length === 0) {
                    delete rooms[room]; // Delete room if empty
                }

                io.to(room).emit("playersUpdate", { players: games[room].players });

                io.to(room).emit("message", { user: "Server", text: `${player.name} has left the chat.` });
                console.log(`User disconnected: ${socket.id}`);
            }
        });
    });

    return io;
};

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
