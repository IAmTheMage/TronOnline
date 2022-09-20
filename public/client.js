const channel = geckos(
  {
    port: 3001,
    url: HOST.toUpperCase() != 'LOCALHOST' ? HOST : ''
  }
);

let id;
let timer = 4;
let roomJoined = false;
let gameHasToStart = false;
let timerResetTime = 1000;

const PLAYERSIZEW = 10;
const PLAYERSIZEH = 10;



let moveSetX = 1;
let gameHasFinished = false;
let gameState = '';
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

let gameMap = [];

const gameResetState = () => {
  gameMap = [];
  gameHasToStart = false;
  for(let i = 0; i < 40; i++) {
    gameMap.push([]);
    for(let j = 0; j < 40; j++) {
      gameMap[i][j] = {
        marked: false,
        markedColor: 'black'
      }
    }
  }
  realTimer = 0;
  timer = 4;
  roomJoined = false;
  timerResetTime = 1000;
  roomCreated = false;
  gameHasFinished = false;
  document.getElementById('canvasContainer').style.display = 'none';
  ctx.clearRect(0, 0, 400, 400);
}

for(let i = 0; i < 40; i++) {
  gameMap.push([]);
  for(let j = 0; j < 40; j++) {
    gameMap[i][j] = {
      marked: false,
      markedColor: 'black'
    }
  }
}

let realTimer = 0;


async function testChannels() {
  await fetch('http://localhost:3000/test');
}

let rawIndex = 0;

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

  channel.on('draw', info => {
    console.log(info.modified[0])
    gameState = 'Empate';
    gameMap[info.modified[0].positionX][info.modified[0].positionY] = {
      marked: true,
      markedColor: info.modified[0].markedColor
    }
    gameHasFinished = true;   
    //clearInterval(gameMainInterval)
  })

  channel.on('winner', data => {
    if(data.winner == channel.id) {
      gameState = 'Perdeu'
    }
    else {
      gameState = 'Venceu'
    }
    data.modified.foreach(info => {
      gameMap[info.positionX][info.positionY] = {
        marked: true,
        markedColor: info.markedColor
      }
    })
    gameHasFinished = true;
    //gameResetState();
    //clearInterval(gameMainInterval)
  })

  channel.onRaw(data => {
    console.log("ON RAW")
    if(rawIndex != 0) {
      const d = modifiedModel.fromBuffer(data);
      console.log(d);
      d.modified.forEach(dat => {
        gameMap[dat.positionX][dat.positionY] = {
          marked: true,
          markedColor: dat.markedColor
        }
      })
    }
    else {
      rawIndex++;
    }
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
    if('wasd'.includes(e.key) && timer <= 0) {
      channel.emit('move', {
        moveSetX, moveSetY
      })
    }
  })
})


document.addEventListener('openRoomsModal', () => {
  document.querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', async () => {
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
      document.getElementById('joinRoomModal').style.display = 'none';
      createInterval();
    })
  })
})


const draw = () => {
  if(roomCreated || roomJoined) {
    ctx.clearRect(0, 0, 400, 400);
    fillBackground();
    if(!gameHasToStart)
    {
      console.log("Dont game has to start");
      initCanvasState();
    }
    else {
      if(timer > 0) {
        drawTimer();
      }
      else {
        drawPlayers();
      }
      if(gameHasFinished) {
        alert(gameState)
        gameResetState();
        clearInterval(gameMainInterval)
      }
    }
  }
}

const drawTimer = () => {
  if(realTimer == 15) {
    timer--;
  }
  console.log(timer)
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


window.onload = () => {
  
}