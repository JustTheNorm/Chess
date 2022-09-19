const chessboardParent = document.getElementById("chessboard")
//game
class Chess{
    constructor (){
        this.setDefault()
    }

    setDefault(){
        this.info = {
            preview: false, //When preview match history
            started: false,// when started
            ended: false,//when game ends
            won: null,// Winning player
            turn: null,//Player turns
            timer: 5,//5 minute timer
        }

        this.data = {
            players: [], // all the players
            matchHistory: [], //starting match history
            board: null, //board
        }
    }
}
//Chessboard
class Board{
    constructor (){}
}
//Pieces
class Piece{
    constructor (){}
}
class Square{
    constructor (){}
}
class Player{
    constructor (){}
}

const Game = new Chess();