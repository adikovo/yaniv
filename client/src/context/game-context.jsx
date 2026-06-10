import { createContext, useState, useContext, useEffect } from "react";
import socket from "../api/socket";

const GameContext = createContext();

export const GameProvider = ({ children }) => {
    const [player, setPlayer] = useState({});
    const [players, setPlayers] = useState([]);
    const [gameID, setGameID] = useState('');
    const [gameState, setGameState] = useState({});
    const [gameStarted, setGameStarted] = useState(false);
    const [sum, setSum] = useState(0);
    const [selectedCards, setSelectedCards] = useState([]);
    const [gameOverData, setGameOverData] = useState(null);
    const [isSpectator, setIsSpectator] = useState(false);
    const [handSizes, setHandSizes] = useState({});
    const [opponentScores, setOpponentScores] = useState({});

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
        };

        socket.on("playersUpdate", handlePlayersUpdate);

        return () => {
            socket.off("playersUpdate", handlePlayersUpdate);
        };
    }, []);

    useEffect(() => {
        const handleStart = ({ deck, top_card, current_turn, hand_sizes }) => {
            //debug
            console.log("🌟 Received start event!", { deck, top_card, current_turn });
            setGameStarted(true);
            setGameState({ deck, top_card, current_turn });
            if (hand_sizes) setHandSizes(hand_sizes);
        };

        const handleHand = ({ hand, hand_sum }) => {
            //debug
            console.log("HAND RECEIVED ON CLIENT:", hand, hand_sum);
            setPlayer(prev => ({ ...prev, hand }));
            setSum(hand_sum);
            setSelectedCards([]);
        };

        const handleTurn = ({ top_card, current_turn, deck, hand_sizes }) => {
            //debug
            console.log("Turn update received:", { top_card, current_turn, deck });
            setGameState({ deck, top_card, current_turn });
            if (hand_sizes) setHandSizes(hand_sizes);
        };

        const handleRoundEnd = ({ players: roundPlayers }) => {
            console.log("🏆 roundEnd players:", roundPlayers);
            const scores = {};
            for (const id in roundPlayers) scores[id] = roundPlayers[id].score;
            console.log("🏆 scores map:", scores);
            setOpponentScores(scores);
        };

        socket.on("start", handleStart);
        socket.on("hand", handleHand);
        socket.on("turn", handleTurn);
        socket.on("roundEnd", handleRoundEnd);

        return () => {
            socket.off("start", handleStart);
            socket.off("hand", handleHand);
            socket.off("turn", handleTurn);
            socket.off("roundEnd", handleRoundEnd);
        };
    }, [])

    return (
        <GameContext.Provider value={{
            players, setPlayers,
            gameID, setGameID,
            player, setPlayer,
            gameState, setGameState,
            sum, setSum,
            selectedCards, setSelectedCards,
            gameStarted,
            gameOverData, setGameOverData,
            isSpectator, setIsSpectator,
            handSizes, setHandSizes,
            opponentScores, setOpponentScores
        }}>
            {children}
        </GameContext.Provider>
    );
};

// Custom Hook to use UserContext
export const useGameContext = () => {
    return useContext(GameContext);
};
