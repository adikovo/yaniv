// {
//     "gameId": {
//         "players": {
//             "0": {
//                 "id": 0, 
//                 "name": "adi", 
//                 "playerType": "host",
//                 "hand": {'1' 'h', '2' 's'...}
//                 "sum": 15
//             },
//             "1": {
//                 "id": 1, 
//                 "name": "adiiiii", 
//                 "playerType": "join"
//                 "hand": {'1' 'h', '2' 's'...}
//                  "hand": []
//             }
//         }
//         game_state:{
//             "deck": {
//
//             }
//             "current_turn": "1"
//             "top_card": {'1', 's'}
//        }
//     }
// }

const games = {};

// Set of gameIDs currently in use. Guarantees uniqueness at creation time so a
// freshly generated random ID can never silently overwrite a live game.
// Kept in sync with `games`: an ID is added when a game is created
// (routes/game.js `/host`) and removed when the room is fully torn down
// (socket.js `cleanupRoomIfEmpty` and the `startRematch` cancel branch).
const gameIds = new Set();

module.exports = { games, gameIds };