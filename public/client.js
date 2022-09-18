const channel = geckos({port: 3000});

let id;
let timer = 4;
let roomJoined = false;
let gameHasToStart = false;
let timerResetTime = 1000;

const PLAYERSIZEW = 10;
const PLAYERSIZEH = 10;



let moveSetX = 1;
let moveSetY = 0;

let player1Info = {
  positionX: 40,
  positionY: ctx.canvas.height / 2 - PLAYERSIZEH / 2,
}

let player2Info = {
  positionX: 340, 
  positionY : ctx.canvas.height / 2 - PLAYERSIZEH / 2,
}

let basicMoveSet;

let gameMap;

let realTimer = 0;


async function testChannels() {
  await fetch('http://localhost:3000/test');
}



channel.onConnect(error => {

  const NeverChange = new CustomEvent('setId', 
    { 'detail': channel.id }
  )
  document.dispatchEvent(NeverChange)
  console.log("Connect")
  channel.on('newRoom', data => {
    const html = `<li id="${data.id}">${data.id}</li>`
    if(document.getElementById('joinRoomModal').style.display == 'flex') {
      document.getElementById('rooms').insertAdjacentHTML("beforeend", html);
    }
  })

  channel.on('gameHasToStart', data => {
    console.log("Game has to start")
    if(data.creatorId == channel.id) {
      basicMoveSet = 1;
      moveSetX = 1;
    }
    else {
      basicMoveSet = -1;
      moveSetX = -1;
    };
    gameHasToStart = true;
  })

  channel.on('draw', () => {
    console.log("Empate");
    clearInterval(gameMainInterval)
  })

  channel.on('winner', data => {
    if(data.winner == channel.id) {
      console.log("Loser");
    }
    else {
      console.log("Winner");
    }
  })

  channel.on('tick', data => {
    gameMap = data.gameMap;
  })

  id = channel.id;
  localStorage.setItem('id', id);

  document.addEventListener('keydown', (e) => {
    console.log("KEYDOWN")
    if(e.key == 'w') {
      moveSetX = 0;
      if(moveSetY != 1) moveSetY = -1;
      else moveSetY = 1;
    }
    else if(e.key == 's') {
      moveSetX = 0;
      if(moveSetY != -1) moveSetY = 1;
      else moveSetY = -1;
    }
    if(e.key == 'a') {
      moveSetY = 0;
      if(moveSetX != 1) moveSetX = -1;
      else moveSetX = 1;
    }
    else if(e.key == 'd') {
      moveSetY = 0;
      if(moveSetX != -1) moveSetX = 1;
      else moveSetX = -1;
    }
  })
})


document.addEventListener('openRoomsModal', () => {
  document.querySelectorAll('li').forEach(async (li) => {
    const resp = await fetch(`http://${HOST}:3000/joinRoom`, {
      method: 'POST', body: JSON.stringify({
        id: id,
        name: li.id
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    roomJoined = true;
    document.getElementById('canvasContainer').style.display = 'flex';
  })
})


const draw = () => {
  if(roomCreated || roomJoined) {
    ctx.clearRect(0, 0, 400, 400);
    fillBackground();
    if(!gameHasToStart)
    initCanvasState();
    else {
      if(timer > 0) {
        drawTimer();
      }
      else {
        drawPlayers();
        channel.emit('move', {
          moveSetX, moveSetY
        })
      }
    }
  }
}

const drawTimer = () => {
  if(realTimer == 30) {
    timer--;
  }
  startCounterDraw();
}

const drawPlayers = () => {
  if(gameMap != null) {
    for(let i = 0; i < 40; i++) {
      for(let j = 0; j < 40; j++) {
        if(!gameMap[i][j].marked) continue;
        ctx.beginPath();
        ctx.rect(i * 10, j * 10, PLAYERSIZEW, PLAYERSIZEH);
        ctx.fillStyle = gameMap[i][j].markedColor;
        ctx.fill()
        ctx.closePath();
      }
    }
  }
}

const fillBackground = () => {
  ctx.beginPath()
  ctx.rect(0, 0, 400, 400)
  ctx.fillStyle = "black"
  ctx.fill()
  ctx.closePath()
}

const startCounterDraw = () => {
  ctx.font = '24px serif';
  ctx.fillStyle = 'white'
  ctx.fillText(`${timer}`, 176, 200);
}

let gameMainInterval = window.onload = () => {
  setInterval(() => {
    if(realTimer == 30) {
      realTimer = 0;
    }
    if(gameHasToStart) realTimer++;
    draw();
  }, 1000 / 30)
}