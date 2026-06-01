import { createContext, useState, useContext, useEffect } from "react";
import socket from "../api/socket";

const GameContext = createContext();

export const GameProvider = ({ children }) => {
    const [player, setPlayer] = useState({});
    const [players, setPlayers] = useState([]);
    const [eliminatedPlayers, setEliminatedPlayers] = useState([]);
    const [gameID, setGameID] = useState('');
    const [gameState, setGameState] = useState({});
    const [gameStarted, setGameStarted] = useState(false);
    const [sum, setSum] = useState(0);
    const [selectedCards, setSelectedCards] = useState([]);

    useEffect(() => {
        const handleJoinRoomResult = (data) => {
            setPlayers((prev) => [...prev, data.player]);
        };

        socket.on("joinRoomResult", handleJoinRoomResult);

        return () => {
            socket.off("joinRoomResult", handleJoinRoomResult);
        };
    }, []);

    useEffect(() => {
        const handlePlayersUpdate = (data) => {
            setPlayers(data.players);
            //debug
            console.log("Players updated:", data.players)
        };

        socket.on("playersUpdate", handlePlayersUpdate);

        return () => {
            socket.off("playersUpdate", handlePlayersUpdate);
        };
    }, []);

    useEffect(() => {
        socket.on("start", ({ deck, top_card, current_turn }) => {
            //debug
            console.log("🌟 Received start event!", { deck, top_card, current_turn });
            setGameStarted(true);
            setGameState({ deck, top_card, current_turn });
        });

        socket.on("hand", ({ hand, hand_sum }) => {
            //debug
            console.log("HAND RECEIVED ON CLIENT:", hand, hand_sum);
            setPlayer(prev => ({ ...prev, hand }));

            setSum(hand_sum);
            console.log("updated sum", sum);
            setSelectedCards([]);
        });

        socket.on("turn", ({ top_card, current_turn, deck }) => {
            //debug
            console.log("Turn update received:", { top_card, current_turn, deck });
            setGameState({ deck, top_card, current_turn });
        });

        return () => {
            socket.off("start");
            socket.off("hand");
            socket.off("turn");
        };
    })

    return (
        <GameContext.Provider value={{
            players, setPlayers,
            eliminatedPlayers, setEliminatedPlayers,
            gameID, setGameID,
            player, setPlayer,
            gameState, setGameState,
            sum, setSum,
            selectedCards, setSelectedCards,
            gameStarted
        }}>
            {children}
        </GameContext.Provider>
    );
};

// Custom Hook to use UserContext
export const useGameContext = () => {
    return useContext(GameContext);
};
