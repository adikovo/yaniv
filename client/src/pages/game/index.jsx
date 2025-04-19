import { useEffect, useRef } from 'react';
import { useGameContext } from '../../context/game-context';
import { useNavigate } from "react-router-dom";
import socket from "../../api/socket";
import './styles.css'

export const Game = () => {

    let hasEmittedTurn = useRef(false);

    const { player, setPlayer, players, gameID, gameState, setGameState, sum, setSum, selectedCards, setSelectedCards } = useGameContext();

    //debug
    console.log("Component rendered!");

    const makeTurn = () => {
        if(selectedCards.length >= 1){
            //debug
            console.log("SENDING TURN:", selectedCards);

            socket.emit("makeTurn", gameID, {
                type: "cardFromHand", 
                selected_cards: selectedCards
            });
            setSelectedCards([]);
        }      
    }

    const yanivCall = () => {
        socket.emit("makeTurn", gameID, {type: "yaniv"});
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
      useEffect(() => {
        console.log("Game state updated:", gameState);
      }, [gameState]);
      //debug
      useEffect(() => {
        console.log("Player updated:", player);
      }, [player]);

    const getCardImageName = (card) => {
        let new_suit = '';
        let new_value = card.value;

        if(card.suit === 'H'){
            new_suit = 'hearts';
        }
        if(card.suit === 'C'){
            new_suit = 'clubs';
        }
        if(card.suit === 'D'){
            new_suit = 'diamonds';
        }
        if(card.suit === 'S'){
            new_suit = 'spades';
        }
        if(card.value === 'J'){
            new_value = 'jack'; 
        }
        if(card.value === 'Q'){
            new_value = 'queen'; 
        }
        if(card.value === 'K'){
            new_value = 'king'; 
        }

        return `cards/${new_value}_of_${new_suit}.png`;
    } 

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
        //debug
        console.log("🆚 Comparing with firstCard:", firstCard);
        console.log("🧩 lastCard in current selection:", lastCard);
        console.log("🧪 Comparing values:", card.numeric_val, firstCard.numeric_val);
        // Same value 
        if (card.numeric_val === firstCard.numeric_val) {
            console.log("✅ Same value — added to selectedCards");
            setSelectedCards(prev => [...prev, index]);
            return;
        }
        // Seq check
        if (card.suit === firstCard.suit) {
            const isPrev = card.numeric_val === firstCard.numeric_val - 1;
            const isNext = card.numeric_val === lastCard.numeric_val + 1;
    
            if (isPrev || isNext) {
                console.log("✅ Valid sequence — added to selectedCards");
                setSelectedCards(prev => [...prev, index]);
                return;
            }
        } 
        console.log("🚫 Invalid card selection — not added");
    };
    
    
    const drawFromDeck = () => {
        makeTurn();
        socket.emit("makeTurn", gameID, {type: "cardFromDeck"});
    }

    const drawFromTop = (index) => {
        //debug
        console.log("draw from top index:" ,index);
        if(index !== 0 && index !== gameState.top_card.length - 1){
            console.log("INVALID DRAW FROM TOP!");
            return;
        }
        const side = index === 0 ? "start" : "end";
        socket.emit("makeTurn", gameID, {
            type: "cardFromTop",
            side
         });
        makeTurn();
    }

    const game = () => {
        return(
            <div>

                <h1>in game page</h1>
                <h3>Players:</h3>
                <ul>
                    {players.map((player, index) => (
                        <li key={index}>{player.name}</li>
                    ))}
                </ul>
                <h3>Player #{gameState.current_turn} turn</h3>
                <button onClick={drawFromDeck} disabled={selectedCards.length < 1}>DECK</button>
                <h3>TOP CARD:</h3>
                <div className='top_card_pile'>
                    {gameState.top_card?.map((card, index) => (
                        <img className='card' key={index} src={getCardImageName(card)} onClick={() => drawFromTop(index)} disabled={selectedCards.length < 1}/>
                    ))}
                </div>
            

                <h3>Your Hand:</h3>
                <div className='hand'>
                {player.hand?.map((card, index) => (
                    <div key= {index}>
                        <img  className='card' src={getCardImageName(card)} onClick={ () => selectCards(card.index)}></img>
                    </div>
                ))}
                </div>
                
                <button onClick={makeTurn} disabled={player.id !== gameState.current_turn && selectedCards.length < 1}>make turn</button>
                <button onClick={yanivCall} disabled={player.id !== gameState.current_turn && sum > 7}>YANIV</button>
                <h4>Sum:{sum}</h4>
                

            </div>
        );
    }
    
    return (
        <div className='home'>
            {game()}
            
        </div>
    )
}