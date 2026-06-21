import './styles.css'

export const Card = ({card, onClick, selected, disabled, faceDown}) => {

    const handleClick = () => {
        if(disabled || faceDown){
           return;
        }
        onClick(card.index);
    }
    

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
    

    const src = faceDown ? 'cards/back.png' : getCardImageName(card);

    return (
        <img
        className={`card ${selected ? "selected" : ''}`}
        src={src}
        onClick={handleClick}></img>
    )
}