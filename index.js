import express from 'express'
import geckos, {
  iceServers
} from '@geckos.io/server'
import bodyParser from 'body-parser'
import http from 'http'
import cors from 'cors'

const CANVASSIZE = 400;

let playersAmount = 0;
let allRooms = {

}

let playersConnected = {

}

let playersToRoom = {

}

const app = express();
app.use(cors({origin: '*'}))
app.use(express.static('public'))
app.use(bodyParser.json())

const server = http.createServer(app)

app.use(bodyParser.urlencoded({extended: true}))

app.get('/', (req, res) => {
  res.send("Gustavo");
})

const filterRooms = () => {
  const keys = Object.keys(allRooms);
  let filter = {};
  keys.forEach(key => {
    if(!allRooms[key].deleted) filter[key] = allRooms[key];
  })
  return filter;
}

app.get('/rooms', (req, res) => {
  const roomsNotDeleted = filterRooms();
  return res.send(roomsNotDeleted);
})

const io = geckos();

io.onConnection(channel => {
  console.log("Geckos connection from id: " + channel.id);
  playersAmount++;
  playersConnected[channel.id] = channel;
  channel.on('move', data => {
    console.log(data);
    allRooms[playersToRoom[channel.id]].players[channel.id].moveSetX = data.moveSetX;
    allRooms[playersToRoom[channel.id]].players[channel.id].moveSetY = data.moveSetY;
  })
})

app.post('/createRoom', (req, res) => {
  const playerInfo = {
    color: 'white', direction: 'X+', positionX: 2, positionY: 20,
    moveSetX: 1, moveSetY: 0
  }
  if(allRooms[req.body.name] == null) {
    let gameMap = [

    ]
    for(let i = 0; i < 40; i++) {
      gameMap.push([]);
      for(let j = 0; j < 40; j++) {
        gameMap[i][j] = {
          marked: false,
          markedColor: 'black'
        }
      }
    }
    gameMap[2][20] = {
      marked: true,
      markedColor: 'white'
    }
    gameMap[38][20] = {
      marked: true,
      markedColor: 'green'
    }
    allRooms[req.body.name] = {
      creatorId: req.body.id,
      playersJoin: 1,
      players: {

      },
      active: false,
      gameMap: gameMap,
      deleted: false
    }
    allRooms[req.body.name].players[req.body.id] = playerInfo;
    playersToRoom[req.body.id] = req.body.name;
  }
  console.log(req.body.id);
  io.connectionsManager.getConnection(req.body.id).channel.join(req.body.id);
  io.raw.emit('newRoom', {id: req.body.name})
  return res.send().status(200);
})

app.post('/joinRoom', (req, res) => {
  const {id, name} = req.body;
  const {creatorId} = allRooms[name];
  if(allRooms[name].playersJoin < 2) {
    allRooms[name].playersJoin++;
    playersConnected[id].join(creatorId);
    allRooms[name].players[id] = {
      color: 'green', direction: 'X-', positionX: 38, positionY: 20,
      moveSetX: -1, moveSetY: 0, modified: [

      ]
    }
    playersToRoom[id] = name;

  }
  else if(allRooms[name].playersJoin == 2) {
    return res.send().status(401);
  }
  if(allRooms[name].playersJoin == 2) {
    setTimeout(() => {
      allRooms[name].active = true;
    }, 6000)
    playersConnected[creatorId].room.emit('gameHasToStart', {creatorId})
  }
  return res.send().status(200)
})


const updatePos = (room) => {
  const {players} = room;
  const keys = Object.keys(players);
  keys.forEach(key => {
    if((players[key].moveSetX < 0 && players[key].positionX > 0) || 
    (players[key].positionX < 39 && players[key].moveSetX > 0)) {
      players[key].positionX += players[key].moveSetX
    }
    if((players[key].moveSetY < 0 && players[key].positionY > 0) || 
    (players[key].positionY < 39 && players[key].moveSetY > 0)) {
      players[key].positionY += players[key].moveSetY
    }
  })
}

const setPos = (room, name) => {
  const {players, gameMap} = room;
  const keys = Object.keys(players);
  let losersCount = 0;
  let playerLoser;
  let player1TestCaseX;
  let player1TestCaseY;
  let player1Color;
  let index = 0;
  room.modified = [];
  keys.forEach(key => {
    player1TestCaseX = players[key].positionX;
    player1TestCaseY = players[key].positionY;
    player1Color = players[key].color;
    index++;
    if(!gameMap[players[key].positionX][players[key].positionY].marked
      && !checkCollision(players[key].positionX, players[key].positionY
        , players[key].moveSetX, players[key].moveSetY)
      ) {
      gameMap[players[key].positionX][players[key].positionY] = {
        marked: true,
        markedColor: players[key].color
      }
      const modified = {
        positionX: players[key].positionX,
        positionY: players[key].positionY,
        markedColor: players[key].color
      }
      room.modified.push(modified);
    }
    else {
      losersCount++;
      playerLoser = key;
    }
  })
  if(gameMap[player1TestCaseX][player1TestCaseY].markedColor != player1Color && gameMap[player1TestCaseX][player1TestCaseY].markedColor != 'black') {
    losersCount++;
  }
  if(losersCount >= 2) {
    playersConnected[room.creatorId].room.emit('draw', {});
    room.deleted = true;
    room.active = false;
    return false;
  }
  else if(losersCount == 1) {
    playersConnected[room.creatorId].room.emit('winner', {
      winner: playerLoser
    });
    room.deleted = true;
    room.active = false;
    return false;
  }
  return true;
}

const checkCollision = (positionX, positionY, directionX, directionY) => {
  if((positionX + directionX < 0 || positionX  + directionX > 39) || 
  (positionY  + directionY < 0 || positionY  + directionY > 39)) return true;
  return false;
}

setInterval(() => {
  const keys = Object.keys(allRooms);
  keys.forEach(key => {
    if(allRooms[key].active) {
      updatePos(allRooms[key])
      const data = setPos(allRooms[key], key);
      if(data) {
        playersConnected[allRooms[key].creatorId].room.emit('tick', {modified: allRooms[key].modified});
        console.log("Tick for room: " + key)
      }
    }
  })
}, 1000 / 20);

io.addServer(server);

server.listen(3000, () => {
  console.log("App listening on port 3000");
})

