export const checkName = (name, sockets) =>
  sockets.some(e => e.username === name);

export const checkWin = gameBoard =>
  (gameBoard[0] === gameBoard[1] && gameBoard[1] === gameBoard[2]) ||
  (gameBoard[3] === gameBoard[4] && gameBoard[4] === gameBoard[5]) ||
  (gameBoard[6] === gameBoard[7] && gameBoard[7] === gameBoard[8]) ||
  (gameBoard[0] === gameBoard[3] && gameBoard[3] === gameBoard[6]) ||
  (gameBoard[1] === gameBoard[4] && gameBoard[4] === gameBoard[7]) ||
  (gameBoard[2] === gameBoard[5] && gameBoard[5] === gameBoard[8]) ||
  (gameBoard[0] === gameBoard[4] && gameBoard[4] === gameBoard[8]) ||
  (gameBoard[2] === gameBoard[4] && gameBoard[4] === gameBoard[6]);

export const findOpponentId = (id, gameId, games) =>
  id === games[gameId].player1Id
    ? games[gameId].player2Id
    : games[gameId].player1Id;

export const gameReset = (
  playerSocketId,
  opponentSocketId,
  game,
  outcome,
  sockets
) => {
  const { players } = game;
  const playerSocket = sockets[playerSocketId];
  const opponentSocket = sockets[opponentSocketId];
  if (
    outcome === 'draw' ||
    (outcome === 'win' && players[playerSocketId].mark === 'X')
  ) {
    players[playerSocketId].mark = 'O';
    players[opponentSocketId].mark = 'X';
  }
  game.gameBoard = game.gameBoard.map((e, i) => (e = i));
  game.turnCount = 0;
  players[playerSocketId].ready = players[opponentSocketId].ready = false;
  if (outcome === 'win') {
    playerSocket.emit('winUpdate');
    opponentSocket.emit('loseUpdate');
    players[playerSocketId].score++;
  }
  if (outcome === 'draw') {
    playerSocket.emit('draw', 'O');
    opponentSocket.emit('draw', 'X');
  }
};

export class Player {
  score = 0;
  turn = false;
  mark = 'O';
  ready = true;
  constructor(username) {
    this.username = username;
  }
}

export class Game {
  gameBoard = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  turnCount = 0;
  players = {};
  constructor(player1, player2) {
    this.player1Id = player1;
    this.player2Id = player2;
  }
}
