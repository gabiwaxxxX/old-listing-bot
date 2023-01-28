
import express, { Express } from "express";
import { Server, Socket } from 'socket.io'
import log from './logger'

const PORT = process.env.PORT || 3001;

const app: Express = express();
const httpServer = require("http").createServer(app);
const io = new Server(httpServer);

io.on("connection", (socket: Socket) => { 
    log("Received ws connection");
});

io.on("message", (socket: Socket) => {
    console.log("message from", socket);
})

export const notify = (type: string, data: any) => {
    io.emit( type, data )
}

app.use(express.urlencoded({
    extended: true
}))

app.use(express.json({
  	type: ['application/json', 'text/plain']
}))

app.use((req: any, res: any, next: any) => {
    log(`[${req.method}] ${req.url}`);
    next()
})

app.get( '/', (req: any, res: any, next: any) => {
    res.json({status: "ok"})
})

httpServer.listen(PORT, () => {
  	log(`Server listening on ${PORT}`);
});

export default io;