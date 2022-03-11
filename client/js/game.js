const onlineDiv = document.getElementById('onlineDiv'),
  izazovAudio = document.getElementById('izazov-audio'),
  startAudio = document.getElementById('start-audio'),
  moveAudio = document.getElementById('move-audio'),
  nastavakDiv = document.getElementById('nastavakGejma');

let mark,
  user,
  socketId,
  turn = false,
  playerReady = true,
  opponentReady = true;

const onlineIgraci = {},
  gameFields = document.querySelectorAll('.button'),
  socket = io(),
  igraci = {},
  igraciDivovi = {
    1: document.getElementById('prviIgracDiv'),
    2: document.getElementById('drugiIgracDiv'),
  };

socket.on('start', data => {
  startAudio.play();
  if (data.opponentId) {
    onlineDiv.style.visibility = 'hidden';
    onlineIgraci[data.opponentId].innerHTML = `
        <button class="izazoviBtn" onclick = "izazovi(${data.opponentId})">Izazovi</button>
    `;
  }
  turn = data.turn;
  mark = data.mark;
  igraci[2] = {
    ime: data.opponentName,
    score: 0,
  };
  igraciDivovi[2].innerHTML = `
            <span id= "imeSpan2">${data.opponentName}</span> : <span id = "scoreSpan2">0</span>
        `;
  if (turn) {
    igraciDivovi[1].style.color = '#5cacf7';
  } else {
    igraciDivovi[2].style.color = '#5cacf7';
  }
  chatBox.style.display = 'block';
});

const PostaviIme = ele => {
  if (event.key === 'Enter') socket.emit('username', ele.value);
};

const izazovi = igrac => {
  if (document.getElementById(`${igrac}`).style.color === 'red') {
    alert('Igrac je vec u gejmu');
    return;
  }
  socket.emit('sendChallenge', igrac);
};

const prihvaceno = igrac => {
  onlineDiv.style.visibility = 'hidden';
  document.getElementById(`izazov-${igrac}`).innerHTML = `
  <button class="izazoviBtn" onclick = "izazovi(${igrac})">Izazovi</button>
  `;
  socket.emit('gameStart', igrac);
};

const odbijeno = igrac => {
  const id = `izazov-${igrac}`;
  document.getElementById(id).innerHTML = `
  <button class="izazoviBtn"  onclick = "izazovi(${igrac})">Izazovi</button>
  `;
  socket.emit('declineChallenge', igrac);
};

socket.on('challengeDeclined', () => alert('Igrac je odbio izazov'));

socket.on('acceptChallenge', igrac => {
  izazovAudio.play();
  const id = `izazov-${igrac}`;
  document.getElementById(id).innerHTML = `
    <button style="background-color:green" onclick="prihvaceno(${igrac})" />✓</button>
    <button style="background-color:red" onclick="odbijeno(${igrac})"/>X</button>
  `;
});

socket.on('usernameResponse', res => {
  if (res) {
    igraciDivovi[1].innerHTML = `
            <span id= "imeSpan1">${res.username}</span> : <span id = "scoreSpan1">0</span>
        `;
    igraci[1] = {
      ime: res.username,
      score: 0,
    };
    socketId = res.id;
    onlineDiv.style.visibility = 'visible';
  } else {
    alert('Neuspesna prijava');
  }
});

socket.on('inGame', igrac => {
  if (igrac.some(e => e === socketId)) return;
  igrac.forEach(i => (document.getElementById(`${i}`).style.color = 'red'));
});

socket.on('playerAvailable', igrac => {
  if (igrac.some(e => e === socketId)) return;
  igrac.forEach(i => (document.getElementById(`${i}`).style.color = 'white'));
});

socket.on('userConnected', data => {
  if (igraci[1] && data.username !== igraci[1].ime) {
    const spanId = `izazov-${data.id}`;
    onlineDiv.innerHTML += `
            <div id = ${data.id} style = "color: ${
      data.inGame ? 'red' : 'white'
    }" >
                <div class='online-igrac'>${
                  data.username
                }<div id=${spanId}><button class="izazoviBtn" onclick = "izazovi(${
      data.id
    })">Izazovi</button></div></div>
            </div>
        `;
    onlineIgraci[data.id] = document.getElementById(spanId);
  }
});

socket.on('userDisconnected', data => {
  if (document.getElementById(`${data}`))
    document.getElementById(`${data}`).remove();
});

const chatBox = document.getElementById('chat-box');

socket.on('opponentTurn', () => {
  turn = false;
  igraciDivovi[2].style.color = '#5cacf7';
  igraciDivovi[1].style.color = '#d1b580';
});

socket.on('yourTurn', data => {
  const { position, mark } = data;
  moveAudio.play();
  gameFields[position].innerText = mark;
  gameFields[position].style.color = '#524b3d';
  igraciDivovi[1].style.color = '#5cacf7';
  igraciDivovi[2].style.color = '#d1b580';
  turn = true;
});

socket.on('winUpdate', () => {
  document.getElementById('scoreSpan1').innerText++;
  mark = 'O';
  playerReady = opponentReady = false;
  toggleNastavak();
});

socket.on('loseUpdate', () => {
  document.getElementById('scoreSpan2').innerText++;
  mark = 'X';
  playerReady = opponentReady = false;
  toggleNastavak();
});

socket.on('draw', data => {
  mark = data;
  playerReady = false;
  opponentReady = false;
  toggleNastavak();
});

const toggleNastavak = () => {
  nastavakDiv.style.visibility =
    nastavakDiv.style.visibility === 'hidden' ? 'visible' : 'hidden';
};

socket.on('opponentReady', () => (opponentReady = true));

const resetPolja = () => {
  gameFields.forEach((dugme, i) => {
    dugme.innerText = i;
    dugme.style.color = '#d1b580';
  });
};

const spreman = () => {
  resetPolja();
  socket.emit('readyForNextGame');
  playerReady = true;
  toggleNastavak();
};

const otkazi = () => {
  socket.emit('declineNextGame');
  resetPolja();
  toggleNastavak();
  onlineDiv.style.visibility = 'visible';
  turn = false;
  playerReady = true;
  opponentReady = true;
  igraciDivovi[1].style.color = '#d1b580';
  igraciDivovi[2].style.color = '#d1b580';
  igraciDivovi[2].innerHTML = '';
  document.getElementById('scoreSpan1').innerText = 0;
  chatMessages.innerHTML = '';
  chatBox.style.display = 'none';
};

socket.on('nextGameDeclined', () => {
  nastavakDiv.style.visibility = 'hidden';
  onlineDiv.style.visibility = 'visible';
  resetPolja();
  turn = false;
  playerReady = true;
  opponentReady = true;
  igraciDivovi[1].style.color = '#d1b580';
  igraciDivovi[2].style.color = '#d1b580';
  igraciDivovi[2].innerHTML = '';
  document.getElementById('scoreSpan1').innerText = 0;
  chatMessages.innerHTML = '';
  chatBox.style.display = 'none';
});

gameFields.forEach(field => field.addEventListener('click', chooseMove));

function chooseMove() {
  if (!turn || !playerReady || !opponentReady) return;
  if (this.innerText === 'X' || this.innerText === 'O') return;
  moveAudio.play();
  this.innerText = mark;
  this.style.color = '#524b3d';
  socket.emit('endTurn', this.dataset.position);
}

const chatInput = document.getElementById('saljiPoruku');
const chatMessages = document.getElementById('chat-messages');

chatInput.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const porukaParagraf = document.createElement('p');
  const poruka = `<span style="color:white">${igraci[1].ime}</span>: ${chatInput.value}`;
  porukaParagraf.innerHTML = poruka;
  chatMessages.appendChild(porukaParagraf);
  socket.emit('sendMessage', poruka);
  chatInput.value = '';
});

socket.on('messageReceived', message =>
  chatMessages.insertAdjacentHTML('beforeend', `<p>${message}</p>`)
);
