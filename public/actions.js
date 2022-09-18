const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
//const HOST = "143.198.117.112";
const HOST = "localhost";

const newRoom = document.getElementById('newRoom')
const joinRoom = document.getElementById('joinRoom');

let global_id;

let rooms;

newRoom.addEventListener('click', async () => {
  document.getElementById('newRoomModal').style.display = "flex";
})

document.getElementById('sendCreateNewRoom').addEventListener('click', () => {
  createNewRoom();
})

const initCanvasState = (name) => {
  document.getElementById('canvasContainer').style.display = 'flex';
  ctx.font = '24px serif';
  ctx.fillStyle = 'white'
  ctx.fillText('Aguardando outro jogador', 75, 200);
  document.getElementById('newRoomModal').style.display = "none";
}

let roomCreated = false;
const createNewRoom = async () => {
  console.log(global_id)
  const el = document.getElementById('newRoomName');
  const value = el.value;
  const resp = await fetch(`http://${HOST}:3000/createRoom`, {
    body: JSON.stringify({name: value, id: global_id}),
    method: 'POST', headers: {
      'Content-Type': 'application/json'
    }
  });
  if(resp.status == 200) {
    roomCreated = true;
    const cus = new CustomEvent('ChangeMoveset')
    document.dispatchEvent(cus)
    initCanvasState(value);
  }
}

joinRoom.addEventListener('click', () => {
  document.getElementById('joinRoomModal').style.display = 'flex';
  getRooms();
})

async function getRooms() {
  const resp = await fetch(`http://${HOST}:3000/rooms`);
  const json = await resp.json();
  rooms = json;
  initRooms(json);
}

function initRooms(rooms) {
  const keys = Object.keys(rooms);
  keys.forEach(key => {
    document.getElementById('rooms').insertAdjacentHTML('beforeend', `
    <li id="${key}">${key}</li>
    `)
  })
  const event = new Event('openRoomsModal')
  document.dispatchEvent(event);
}

document.addEventListener('setId', (e) => {
  global_id = e.detail;
})