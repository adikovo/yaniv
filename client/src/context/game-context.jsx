import { createContext, useState, useContext, useEffect } from "react";
import socket from "../api/socket";

const GameContext = createContext();

export const GameProvider = ({ children }) => {
    const [player, setPlayer] = useState({});
    const [players, setPlayers] = useState([]);
    const [gameID, setGameID] = useState('');
    const [gameState, setGameState] = useState({});
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

    return (
        <GameContext.Provider value={{ players, setPlayers, 
            gameID, setGameID,
            player, setPlayer,
            gameState, setGameState,
            sum, setSum,
            selectedCards, setSelectedCards }}>
            {children}
        </GameContext.Provider>
    );
};

// Custom Hook to use UserContext
export const useGameContext = () => {
    return useContext(GameContext);
};
