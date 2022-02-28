import {
  checkName,
  checkWin,
  findOpponentId,
  gameReset,
  Player,
  Game,
} from './helpers.js';
import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

const dirname = path.resolve();
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 2000;

app.get('/', (_, res) => res.sendFile(dirname + '/client/index.html'));
app.use('/client', express.static(dirname + '/client'));

const sockets = {};
const games = {};

const io = new Server(httpServer, {});

io.sockets.on('connection', socket => {
  socket.id = Math.random();
  sockets[socket.id] = socket;

  socket.on('username', username => {
    if (checkName(username, Object.values(sockets)))
      return socket.emit('usernameResponse', false);

    socket.emit('usernameResponse', { username, id: socket.id });
    socket.username = username;
    socket.currentGame = 0;
    for (let i in sockets)
      sockets[i].emit('userConnected', {
        username,
        id: socket.id,
      });

    if (Object.keys(sockets).length === 1) return;

    for (let i in sockets) {
      if (!sockets[i].username) continue;
      const inGame = sockets[i].currentGame ? true : false;
      socket.emit('userConnected', {
        username: sockets[i].username,
        id: i,
        inGame,
      });
    }
  });

  socket.on('sendChallenge', id =>
    sockets[id].emit('acceptChallenge', socket.id)
  );

  socket.on('declineChallenge', data => {
    sockets[data].emit('challengeDeclined');
  });

  socket.on('gameStart', id => {
    const opponentSocket = sockets[id];

    for (let i in sockets)
      sockets[i].emit('inGame', [socket.id, parseFloat(id)]);

    const gameId = Math.random();
    games[gameId] = new Game(socket.id, id);

    games[gameId].players[socket.id] = new Player(socket.username);
    games[gameId].players[id] = new Player(opponentSocket.username);

    const firstPlayer =
      games[gameId].players[Math.round(Math.random()) ? socket.id : id];
    firstPlayer.turn = true;
    firstPlayer.mark = 'X';

    socket.emit('start', {
      turn: games[gameId].players[socket.id].turn,
      mark: games[gameId].players[socket.id].mark,
      opponentName: opponentSocket.username,
    });
    socket.currentGame = gameId;
    opponentSocket.currentGame = gameId;
    opponentSocket.emit('start', {
      turn: games[gameId].players[id].turn,
      mark: games[gameId].players[id].mark,
      opponentName: socket.username,
      opponentId: socket.id,
    });
  });

  socket.on('endTurn', position => {
    const opponent = findOpponentId(socket.id, socket.currentGame, games);
    const game = games[socket.currentGame];
    const { gameBoard, players } = game;

    if (!players[opponent].ready || !players[socket.id].ready) return;
    gameBoard[position] = players[socket.id].mark;
    game.turnCount++;
    players[socket.id].turn = false;
    players[opponent].turn = true;
    socket.emit('opponentTurn');
    sockets[opponent].emit('yourTurn', {
      mark: players[socket.id].mark,
      position,
    });
    if (checkWin(gameBoard))
      gameReset(socket.id, opponent, game, 'win', sockets);

    if (game.turnCount === 9)
      gameReset(socket.id, opponent, game, 'draw', sockets);
  });

  socket.on('readyForNextGame', () => {
    if (!socket.currentGame) return;
    const gameId = socket.currentGame;
    games[gameId].players[socket.id].ready = true;
    sockets[findOpponentId(socket.id, gameId, games)].emit('opponentReady');
  });

  socket.on('declineNextGame', () => {
    if (!socket.currentGame) return;
    const gameId = socket.currentGame;
    const opponent = findOpponentId(socket.id, gameId, games);
    for (let i in sockets)
      sockets[i].emit('playerAvailable', [socket.id, opponent]);
    sockets[opponent].emit('nextGameDeclined');
    sockets[opponent].currentGame = 0;
    delete games[gameId];
    socket.currentGame = 0;
  });

  socket.on('sendMessage', poruka => {
    const opponent = findOpponentId(socket.id, socket.currentGame, games);
    sockets[opponent].emit('messageReceived', poruka);
  });

  socket.on('disconnect', () => {
    delete sockets[socket.id];
    if (!socket.username) return;
    for (let i in sockets) sockets[i].emit('userDisconnected', socket.id);
    if (!socket.currentGame) return;
    const opponent = findOpponentId(socket.id, socket.currentGame, games);
    sockets[opponent].emit('nextGameDeclined');
    for (let i in sockets) sockets[i].emit('playerAvailable', [opponent]);
    sockets[opponent].currentGame = 0;
    delete games[socket.currentGame];
  });
});

httpServer.listen(PORT, () => console.log('Server started'));
