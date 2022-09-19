const { BufferSchema, Model } = Schema
const { uint8, int16, uint16, int64, string8 } = Schema

/*const modified = {
  positionX: players[key].positionX,
  positionY: players[key].positionY,
  markedColor: players[key].color
}*/

const ModifiedModel = BufferSchema.schema('modified', {
  markedColor: string8, positionX: uint8, positionY: uint8
})

const _ModifiedModel = BufferSchema.schema('_modified', {
  modified: [ModifiedModel]
})

const modifiedModel = new Model(_ModifiedModel);
