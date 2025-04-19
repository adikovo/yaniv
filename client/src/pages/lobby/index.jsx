import { useEffect } from 'react';
import { useGameContext } from '../../context/game-context';
import { useNavigate } from "react-router-dom";
import socket from "../../api/socket"
import './styles.css'

export const Lobby = () => {
    const navigate = useNavigate();
    const { player, players, gameID } = useGameContext();

    useEffect(() => {
        console.log(player, players);
    }, [player, players])

    useEffect(() => {
        socket.on("start", () => {
            navigate('/game');
        });

        return () => {
            socket.off("start");
        };
    }, []);

    const startGameClicked = () => {
        
        //debug
        socket.emit("startGame");

        //TODO check if theres at least 2 players in the game

        navigate('/game');
    }


    const lobby = () => {
        return(
            <div>
                <h4>Game ID: {gameID}</h4>
                <h4>{player.name} {player.playerType === 'host' ? `(${player.playerType})` : ''}</h4>
                <ul>
                    {players.filter((p) => p.id !== player.id).map((player, index) => (
                    <li key={index}>{player.name}</li>
                    ))}
                </ul>

                <p>Waiting for host to start the game...</p>
                {player.playerType === 'host' && <button onClick={startGameClicked}>Start Game!!</button>}
            </div>
        );
    }  

    return (
        <div className="home">
            {lobby()}
        </div>
    )
};
