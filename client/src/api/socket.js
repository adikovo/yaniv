import { io } from "socket.io-client";
import { SERVER_URL } from "./serverUrl";

const socket = io(SERVER_URL, { transports: ["websocket"] });

export default socket;
