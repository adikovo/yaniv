import { useState } from 'react';
import './styles.css'

export const Card = ({card, onClick, selected}) => {
    

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
    
    const onCardClick = () => {
        onClick(card.index);
    }

    return (
        <img  
        className={`card ${selected ? "selected" : ''}`} 
        src={getCardImageName(card)} 
        onClick={() => onCardClick()}></img>
    )
}