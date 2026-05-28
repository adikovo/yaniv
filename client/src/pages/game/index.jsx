import { useEffect, useState } from 'react';
import { useGameContext } from '../../context/game-context';
import { useNavigate } from "react-router-dom";
import socket from "../../api/socket";
import './styles.css'
import { Card } from '../../components/card';
import { RoundResult } from '../../components/round-result';

export const Game = () => {

    const { player, setPlayer, players, gameID, gameState, setGameState, sum, setSum, selectedCards, setSelectedCards } = useGameContext();
    const [roundResult, setRoundResult] = useState(null);

    useEffect(() => {
        socket.on('roundEnd', (data) => setRoundResult(data));
        return () => socket.off('roundEnd');
    }, []);

    //debug
    console.log("Component rendered!");

    const yanivCall = () => {
        socket.emit("makeTurn", gameID, { type: "yaniv" });
    }

    // const getTurn = () => {
    //     if(!hasEmittedTurn.current){
    //         hasEmittedTurn.current = true;

    //         //debug
    //         console.log("inside getTurn");
    //     }
    // }

    // useEffect(() => {
    //     getTurn();
    //   }, []);

    //debug
    //   useEffect(() => {
    //     console.log("Game state updated:", gameState);
    //   }, [gameState]);
    //   //debug
    //   useEffect(() => {
    //     console.log("Player updated:", player);
    //   }, [player]);

    //not needed
    const getTopCard = () => {
        if (!gameState.top_card || gameState.top_card.length === 0) return '';
        const top = gameState.top_card[gameState.top_card.length - 1];
        return getCardImageName(top);
    }

    const selectCards = (index) => {

        const card = player.hand[index];
        const firstCard = player.hand[selectedCards[0]];
        const lastCard = player.hand[selectedCards[selectedCards.length - 1]];

        console.log("Clicked card:", card);
        console.log("Currently selectedCards:", selectedCards);

        if (selectedCards.includes(index)) {
            setSelectedCards(prev => {
                const updated = prev.filter(i => i !== index);
                console.log("❎ Deselected card:", index, "Updated selection:", updated);
                return updated;

            });
            return;
        }

        if (selectedCards.length === 0) {
            console.log("✅ First card selected");
            setSelectedCards([index]);
            return;
        }
        //Same value 
        if (card.numeric_val === firstCard.numeric_val) {
            console.log("✅ Same value — added to selectedCards");
            setSelectedCards(prev => [...prev, index]);
            return;
        }
        //Seq check
        if (card.suit === firstCard.suit) {
            const cardsArray = [card];
            for (let cardIndex of selectedCards) {
                const maybeNewCard = player.hand[cardIndex];
                cardsArray.push(maybeNewCard);
            }
            const sorted = cardsArray.sort((a, b) => a.numeric_val - b.numeric_val);
            console.log("SORTEDDD", sorted);
            let seqOk = true;

            for (let i = 0; i < sorted.length - 1; i++) {
                if (Math.abs(sorted[i].numeric_val - sorted[i + 1].numeric_val) !== 1) {
                    seqOk = false;
                    //debug
                    console.log("not a seq!!")
                    break;
                }
            }
            if (seqOk) {
                console.log("✅ Valid sequence — added to selectedCards");
                setSelectedCards(prev => [...prev, index]);
            }
        }
    };


    const drawFromDeck = () => {
        socket.emit("makeTurn", gameID, { type: "cardFromDeck", selected_cards: selectedCards });
        setSelectedCards([]);
    }

    const drawFromTop = (index) => {
        if (index !== 0 && index !== gameState.top_card.length - 1) {
            console.log("INVALID DRAW FROM TOP!");
            return;
        }
        const side = index === 0 ? "start" : "end";
        socket.emit("makeTurn", gameID, { type: "cardFromTop", side, selected_cards: selectedCards });
        setSelectedCards([]);
    }

    const game = () => {
        return (
            <div>

                <h1>in game page</h1>
                <h3>Players:</h3>
                <ul>
                    {players.map((player, index) => (
                        <li key={index}>{player.name}</li>
                    ))}
                </ul>
                <h3>{`${players[gameState.current_turn]?.name}'s turn:`}</h3>
                <button onClick={drawFromDeck} disabled={selectedCards.length < 1}>DECK</button>
                <h3>TOP CARD:</h3>
                <div className='top_card_pile'>
                    {gameState.top_card?.map((card, index) => (
                        <Card key={index} card={card} onClick={() => drawFromTop(index)} disabled={selectedCards.length < 1} />
                    ))}
                </div>


                <h3>Your Hand:</h3>
                <div className='hand'>
                    {player.hand?.map((card, index) => (
                        <Card key={index}
                            card={card}
                            onClick={() => selectCards(index)}
                            selected={selectedCards.includes(index)} />
                    ))}
                </div>
                <button
                    onClick={yanivCall}
                    disabled={player.id !== gameState.current_turn || sum > 7}>
                    YANIV
                </button>
                <h4>Sum:{sum}</h4>


            </div>
        );
    }

    return (
        <div className='home'>
            {game()}
            {roundResult && (
                <RoundResult
                    winner={roundResult.winner}
                    asaf={roundResult.asaf}
                    asafCaller={roundResult.asafCaller}
                    players={roundResult.players}
                />
            )}
        </div>
    )
}