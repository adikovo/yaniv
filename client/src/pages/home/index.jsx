import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { sendHost, sendJoin } from '../../api/api';

import './styles.css'
import { useGameContext } from '../../context/game-context';
import socket from "../../api/socket";

export const Home = () => {
    const navigate = useNavigate();
    const [hostName, setHostName] = useState('');
    const [joinName, setJoinName] = useState('');
    const [gameMode, setGameMode] = useState('welcome');
    const [joinError, setJoinError] = useState('');

    const { players, setPlayers, setGameID, gameID, setPlayer, resetGame } = useGameContext();

    const hostGameClicked = async () => {
        resetGame();
        const result = await sendHost(hostName);
        socket.emit("joinRoom", {player: result.data.player, room: result.data.gameID});
        setGameID(result.data.gameID);
        setPlayer(result.data.player);
        navigate('/lobby');
    }

    const joinGameClicked = async () => {
        resetGame();
        const result = await sendJoin(joinName, gameID);
        if (result.status === 200) {
            socket.emit("joinRoom", {player: result.data.player, room: gameID});
            setGameID(gameID); // resetGame() cleared it; restore so makeTurn targets the room
            setPlayer(result.data.player);
            navigate('/lobby');

        } else {
            setJoinError(result.data.error)
        }
        
    }

    const hostGame = () => {
        return (
            <div>
                <h1>Host a Game:</h1>
                <div>
                    Name: <input type="text" name="name" onChange={(event) => setHostName(event.target.value)}/>
                    <br/>
                    <button value="Host Game" onClick={hostGameClicked}>Start game!!!</button>
                </div>
            </div>
        );
    }

    const joinGame = () => {
        return(
            <div>
                <h1>Join a Game:</h1>
                <div> 
                    Name: <input type="text" name="name" onChange={(event) => setJoinName(event.target.value)}/>
                    <br/>
                    Game ID: <input type="text" name="GameID" onChange={(event) => setGameID(event.target.value)}/>
                    <br/>
                    <button value="Join Game" onClick={joinGameClicked}>Join Game</button>
                    <h3>{joinError}</h3>
                </div>
            </div>
        )
    }  

    return (
        <div className="home">
            {gameMode === 'welcome' && (
                <>
                    <h1>Welcome To YANIV! </h1>
                    <div className="button-container">
                        <button className="button" onClick={() => {setGameMode('host')}}> Host a Game </button>
                        <button className="button" onClick={() => {setGameMode('join')}}> Join a Game</button>
                    </div>
                </>) }
            {gameMode === 'host' && hostGame()} 
            {gameMode === 'join' && joinGame()}
        </div>
    )
};
