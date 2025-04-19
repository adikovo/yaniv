import axios from 'axios';

const SERVER_URL = 'http://localhost:3000'

export const sendHost = async (name) => {
    try {
        const response = await axios.get(`${SERVER_URL}/game/host?name=${name}`);
        return response;
        
    }
    catch (error) {
        if (error.response) {
            return error.reposnse;
        }
    }
}

export const sendJoin = async (name, gameId) => {
    try {
        const response = await axios.get(`${SERVER_URL}/game/join?name=${name}&gameID=${gameId}`);
        return response;
    } catch (error) {
        if (error.response) {
            return error.response;
        }
    }
}

export const getPlayers = async () => {
    return await axios.get(`${SERVER_URL}/join/players`);
}
