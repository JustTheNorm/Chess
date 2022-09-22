const chessboardParent = document.getElementById("chessboard");


// Chess Game
class Chess {
	constructor() {
		this.setDefault();
	}

	// set chess info as default
	setDefault() {
		this.info = {
			preview: false, // when previewing match history
			started: false, // when the started
			ended: false, // when the game is ended
			won: null, // Winning player
			turn: null, // Player turn
			timer: 10, // Five minutes Timer
		};

		this.data = {
			players: [], // all the players
			matchHistory: [], // storing match history
			board: null, // board
		};
	}

	// initialize game
	async init(callback) {
		// create new board
		this.data.board = new Board(this);
		// then create board elements
		this.data.board.create();

		// assign players
		await this.assignPlayers();

		// make sure that players is ready
		await this.data.players[0].init(this);
		await this.data.players[1].init(this);

		callback && callback.call(this);
	}

	// assign players (player1,player2)
	async assignPlayers() {
		// will return a promise
		return new Promise((resolve) => {
			const player1 = new Player({ username: "Player 1", id: 1, role: "white" }); // player 1
			const player2 = new Player({ username: "Player 2", id: 2, role: "black" }); // player 2

			this.data.players = [player1, player2]; // assign into the game players

			// player 1 is first to move
			this.info.turn = player1;
			player1.info.isTurn = true;

			resolve(); // return
		});
	}

	// when the game start
	start() {
		this.info.started = true;
		this.info.ended = false;
		this.info.won = false;

		this.data.board.placePiecesAsDefault(); // and place player pieces as default pos
		this.data.players.forEach((p) => p.startTimer()); // start the player
	}

	notify() {
		const players = this.data.players;
		const ischecked = players[0].info.isChecked || players[1].info.isChecked;
		const checkedPlayer = this.checkedPlayer();
		ischecked && console.log(checkedPlayer.data.username + " is in check");
	}

	// when their is a winner
	winner() {
		const Winner = this.info.won;
		const CreatePopUp = function () {
			alert(`The winner is ${Winner.data.username}`)
		};

		console.log(`The winner is ${Winner.data.username}`);

		CreatePopUp();
	}

	// end the game
	checkmate(player) {
		this.info.started = false;
		this.info.ended = true;
		this.info.won = player;

		console.log(`${this.info.turn.data.username} is in Mate`);

		this.winner();
	}

	updatePlayers() {
		this.data.players.forEach((player) => player.update());
	}

	checkedPlayer() {
		const players = this.data.players;
		return players.filter((player) => {
			return player.info.isChecked == true;
		})[0];
	}

	// change turning player
	changeTurn() {
		const turn = this.info.turn;
		const players = this.data.players;
		this.info.turn = players.filter((p, index) => {
			return players.indexOf(turn) != index;
		})[0];
	}

	// switch player into another player
	switchTurn(player) {
		const players = this.data.players;
		return players.filter((p, index) => {
			return players.indexOf(player) != index;
		})[0];
	}

	// test and check the move wheater checked or not
	// then alert when can't possibly moved
	testMove(piece, square) {
		const board = this.data.board;
		piece = board.filterPiece(this, piece); // filter piece
		square = board.filterSquare(square); // filter square

		if (!piece || !square) return false;
		const backup = { square: piece.square, piece: square.piece }; // back up current data
		let player = backup.piece ? backup.piece.player : null;
		let pieces = backup.piece ? player.data.pieces : null;
		let index = backup.piece ? pieces.indexOf(backup.piece) : null; // if there's piece inside store
		let status = false;

		// if there is piece, remove it from the board
		index && pieces.splice(index, 1);

		// then move the piece
		piece.silentMove(square);

		// then check how the board, react and possibilities
		status = this.data.board.analyze(); // will return false, if you are checked

		// move back again the piece in it's position
		piece.silentMove(backup.square);

		// place the piece in to it'square
		square.piece = backup.piece;

		// and place again in to the board
		index && pieces.splice(index, 0, backup.piece);

		return status;
	}

	// After the player moves
	moved(...param) {
		this.data.board.resetSquares(); // reset possible squares ui
		this.data.board.setMovedSquare(...param);
		this.changeTurn(); // whem player moves, change turn player
		this.notify(); // update, alert and prompt
		this.isMate(); // check if mate
		this.updatePlayers(); // update players
		this.insertToMatchHistory(...param); // insert into match history
	}

	// insert moves into game match history
	insertToMatchHistory(from, to) {
		const move = {
			piece: to.piece.getAlias(),
			from: from.info.position,
			to: to.info.position,
		};

		this.data.matchHistory.push(move);
		to.piece.player.data.movesHistory.push(move);
		console.log(JSON.stringify(this.data.matchHistory));
	}

	// load match history before it preview
	async loadMatchHistory(matchHistoryJsonFile) {
		const isjson = typeof matchHistoryJsonFile == "object";
		const isString = typeof matchHistoryJsonFile == "string";

		// when not json or url string
		if (!isjson && !isString) {
			throw new Error("Invalid Match History!");
		}

		// if it is url, fetch
		if (isString) {
			try {
				matchHistoryJsonFile = await fetch(matchHistoryJsonFile);
				matchHistoryJsonFile = await matchHistoryJsonFile.json();
			} catch (e) {
				// if somethings not right throw an error
				throw new Error("Error, Can't load match history!");
			}
		}

		// notify if the match history is empty
		if (matchHistoryJsonFile.length == 0) {
			throw new Error("Empty Match History!");
		} else {
			// otherwise preview it
			this.previewMatchHistory(matchHistoryJsonFile);
		}
	}

	//  preview match history
	async previewMatchHistory(matchHistory, index = 0) {
		const board = this.data.board;
		// tell that you are previewing
		// so player can't move
		this.info.preview = true;

		// move piece that has transition effect
		const moveTo = async function (player, piece, square) {
			return new Promise((resolve) => {
				setTimeout(function () {
					if (!piece) resolve(); // if piece is undefine just return
					// analyze first the board
					board.setSquarePossibilities(piece.getPossibleSqOnly());
					// then move the piece
					resolve(player.move(piece, square)); //
				}, 1000);
			});
		};

		for (let i = 0; i < matchHistory.length; i++) {
			let player = this.data.players[index]; // the player
			let piece = board.filterPiece(player, matchHistory[i].piece); // convert it to piece class
			let square = board.filterSquare(matchHistory[i].to); // find the square
			let move = await moveTo(player, piece, square); // move the piece

			// if there's an error into a movement then throw an error
			if (!move)
				throw new Error(
					`Opps Something is wrong, Movement ${matchHistory[i].from} to ${matchHistory[i].to} is not right`
				);

			index = index == 0 ? 1 : 0;
		}

		// Previewing is Done, Player can move now
		this.info.preview = false;
	}

	// set time (min, sec)
	// will convert int into duration format => 5 mins = 300
	setTime(minutes, sec) {
		return 60 * parseInt(minutes) ?? 0 + parseInt(sec) ?? 0;
	}

	// parse time into string format
	parseTime(time) {
		let minutes = parseInt(time / 60, 10);
		let seconds = parseInt(time % 60, 10);

		minutes = minutes < 10 ? "0" + minutes : minutes;
		seconds = seconds < 10 ? "0" + seconds : seconds;

		return { minutes, seconds, text: minutes + ":" + seconds };
	}

	// is chess is ready
	isReady() {
		return this.info.started && !this.info.ended && !this.info.won;
	}

	// check if the player is mate
	isMate() {
		const playerTurn = this.info.turn; // turning player
		const pieces = playerTurn.data.pieces; // player pieces
		const King = this.data.board.findPiece(pieces, "King", true); // find a king
		const moves = []; // store the possible moves

		// if the player is checked
		if (playerTurn.info.isChecked) {
			for (const piece of pieces) {
				for (const square of piece.getPossibilities().moves) {
					if (this.testMove(piece, square)) {
						// if there was an success move
						// insert that move into moves array
						moves.push(piece);
					}
				}
			}

			// if there's no possible move, and King was don't have move also
			// then checkmate
			if (!moves.length && !King.getPossibleSqOnly()) {
				this.checkmate(this.switchTurn(playerTurn));
				return true;
			}
		}
	}
}

// Chess Board
class Board {
	constructor(game) {
		this.default = {
			col_row: 8, // col len
			col: ["a", "b", "c", "d", "e", "f", "g", "h"], // col literals
			row: [8, 7, 6, 5, 4, 3, 2, 1], // row literals
		};

		this.game = game; // the game
		this.data = []; // empty data values
	}

	// create ui
	create() {
		const col_row = this.default.col_row;
		const col = this.default.col;
		const row = this.default.row;

		let role = "white"; // start with white

		// change role
		const setRole = () => {
			return (role = role == "white" ? "black" : "white");
		};

		for (let r = 0; r < col_row; r++) {
			const squares = []; // store all the square
			for (let c = 0; c < col_row; c++) {
				const letter = col[c];
				const number = row[r];
				const position = `${letter}${number}`; // new position
				const boardPos = { y: r, x: c };
				const square = new Square(boardPos, position, setRole(), this.game); // new square

				squares.push(square); // push the square
			}

			this.data.push(squares) && setRole(); // push the squares in the board data
		}
	}

	// place defaut piece into board
	placePiecesAsDefault() {
		const board = this;
		const game = this.game; // the game
		const players = game.data.players; // all player

		const place = function (piece) {
			const position = piece.info.position; // piece pos
			const square = board.filterSquare(position); // select square acccording to its pos
			const pieceElement = piece.info.element; // piece image
			const squareElement = square.info.element; // and the square element

			piece.square = square; // declare square into piece
			square.piece = piece; // declare piece into square

			squareElement.appendChild(pieceElement); // just append the image to the square el
		};

		// loop through players and place their pieces
		players.forEach((player) => player.data.pieces.forEach(place));
	}

	// get all players possibilities
	// enemies, moves and castling
	getAllPossibilities() {
		const players = this.game.data.players; // players
		const white = players[0].analyze(); // player 1
		const black = players[1].analyze(); // player 2

		return { white, black };
	}

	// analyze the board
	analyze() {
		let status = true; // stat
		let turnPlayer = this.game.info.turn;
		let AP = this.getAllPossibilities(); // all player possibilities
		let entries = Object.entries(AP); // convert as object

		// loop through players and collect their enemies
		for (let data of entries) {
			const King = this.findPiece(data[1].enemies, "King");
			if (King) {
				King.player.info.isChecked = true;
				// if the turn player role is equal to the king player role
				if (turnPlayer.data.role != data[0]) {
					status = false; // set as false
					King.player.info.isChecked = false;
				}
				break;
			}
		}

		return status;
	}

	// setting classes and possibilities
	setSquarePossibilities(possibilities, insertUI) {
		if (!possibilities) return;
		let { moves, enemies, castling } = possibilities;

		// reset first
		this.resetSquares();

		// then set square properties according to possibilities values
		moves.forEach((square) => square.setAs("move", true, insertUI));
		enemies.forEach((square) => square.setAs("enemy", true, insertUI));
		castling.forEach((square) => square.setAs("castling", true, insertUI));
	}

	// remove all class from all squares
	resetSquares() {
		for (let squares of this.data) {
			for (let square of squares) {
				square.setAs("move", false, true);
				square.setAs("enemy", false, true);
				square.setAs("castling", false, true);
				square.setAs("from", false, true);
				square.setAs("to", false, true);
			}
		}
	}

	setMovedSquare(from, to) {
		from.setAs("from", true, true);
		to.setAs("to", true, true);
	}

	// Check if the x and y position is valid in board
	isValidPos(y, x) {
		return this.data[y] ? this.data[y][x] : false;
	}

	// will convert position square in to a Square object
	// e4 => Square
	filterSquare(sq) {
		// check if it is already an object
		if (!sq || typeof sq == "object") return sq;

		// loop in board
		for (let squares of this.data) {
			// loop through the squares
			for (let square of squares) {
				// check if square the position is equal to the given pos
				if (square.info.position == sq) {
					return square;
				}
			}
		}
	}

	// will convert piece alias into a Piece object
	// wP4 => Piece
	filterPiece(player, piece) {
		// check if it is already an object
		if (!piece || !player || typeof piece == "object") return piece;

		const pieces = player.data.pieces; // player pieces
		const alias = piece.substring(0, 2); // alias
		const index = piece.charAt(2); // index

		// loop through the pieces
		for (let piece of pieces) {
			// check if the alias and index is correct
			// the return it
			if (piece.info.alias == alias) {
				if (piece.info.index == index) {
					return piece;
				}
			}
		}
	}

	// find piece on array of piece or array of squares
	findPiece(squares, piece, isPieces) {
		if (!squares || !squares.length || !piece) return false;

		// if is not object then just return piece means it is alias or name of piece
		piece = this.filterPiece(piece) ?? piece;

		const filter = squares.filter((square) => {
			const p = isPieces
				? square
				: typeof square == "object"
				? square.piece
				: this.filterSquare(square).piece; // the piece
			const name = piece.info ? piece.info.name : piece; // piece name
			const alias = piece.info ? piece.info.alias : piece; // piece alias
			return p.info.name == name || p.info.alias == alias; // find piece where alias or name is equal to the given piece
		});

		return (
			filter.map((sq) => {
				return this.filterSquare(sq).piece ?? sq;
			})[0] ?? false
		);
	}
	
}

// Chess Piece
class Piece {
	constructor(pieceObj, player, game) {
		this.info = {
			...pieceObj, // piece information
			fastpawn: pieceObj.name == "Pawn", // only if pawn
			castling: pieceObj.name == "King", // only if king
			element: null,
		};

		this.data = {}; // just set to an empty * bug
		this.player = player; // players
		this.game = game; // game

		this.init();
	}

	init() {
		this.create(); // create new Image element
		this.listener(); // some listeners
	}

	// when there's piece inside the target square, eat them
	eat(piece) {
		if (!piece) return;
		const piecePlayer = piece.player;
		const player = this.player;

		// if element exist, remove the element
		piece.info.element && piece.info.element.remove();

		// insert into the target player dropped pieces
		piecePlayer.data.dropped.push(piece);
		// remove piece into the target player pieces
		piecePlayer.data.pieces.splice(piecePlayer.data.pieces.indexOf(piece), 1);
		// insert into the player eated pieces
		player.data.eated.push(piece);

		return piece;
	}

	moveElementTo(square) {
		// set fastpawn and castling to false
		this.info.fastpawn = false;
		this.info.castling = false;

		// append the element into the target square element
		square.info.element.appendChild(this.info.element);
	}

	// move from current square to the target square
	move(square, castling) {
		let old = this.square;
		// eat piece inside
		this.eat(square.piece);
		// move piece into the square
		this.silentMove(square);
		// move the image into the square element
		this.moveElementTo(square);

		// trigger, finished moved
		this.game.moved(old, square);

		// if the move is castling, then castle
		castling && this.castling();
	}

	// move in the background
	silentMove(square) {
		const piece = this;
		const board = this.game.data.board;

		// make sure it is Square object
		square = board.filterSquare(square)
		// set first to false
		square.piece = false;
		piece.square.piece = false;

		// change data
		square.piece = piece;
		piece.square = square;
		piece.info.position = square.info.position;
		piece.square.piece = piece;
	}

	// castling
	castling() {
		// castling only if it is King
		if (this.info.name != "King") return false;
	
		const game = this.game;
		const board = game.data.board.data;
		const { x, y } = this.square.info.boardPosition;

		const check = function (piece, square, condition) {
			// move only if the condition is true
			if (!condition) return;

			// move piece into the square
			piece.silentMove(square);
			// move element into the square element
			piece.moveElementTo(square);
		};
		
		// right and left rook
		const rr = board[y][x + 1].piece;
		const lr = board[y][x - 2].piece;
		// console.log(lr)
		// console.log("hello")
		// console.dir(board[y][x-2].piece)
		// check each rook
		check(rr, board[y][x - 1], rr && rr.info.name == "Rook");
		check(lr, board[y][x + 1], lr && lr.info.name == "Rook");
		
	}

	create() {
		const pieceElement = new Image(); // new Image element
		const classname = "chessboard-piece";

		// apply
		pieceElement.src = `./assets/media/pieces/${this.info.alias}.png`;
		pieceElement.classList.add(classname);

		this.info.element = pieceElement; // store
	}

	listener() {
		const piece = this; // selected piece
		const game = this.game; // the game
		const element = this.info.element; // the image of piece
		const board = game.data.board; // the board

		// on mousedown event
		const mousedown = function (event) {
			let current = null; // set as null a target square
			let elemBelow, droppableBelow; // squares positioning

			// if player is previewing match history
			// return false
			if (game.info.preview) return;

			// move the piece towards direction
			const move = function (pageX, pageY) {
				element.style.cursor = "grabbing"; // set the cursor as grab effect
				element.style.left = pageX - element.offsetWidth / 2 + "px";
				element.style.top = pageY - element.offsetHeight / 2 + "px";
			};

			// when user mousemove
			const mousemove = function (event) {
				move(event.pageX, event.pageY); // move the piece in mouse position

				element.hidden = true; // hide the element so it will not affect searching point
				elemBelow = document.elementFromPoint(event.clientX, event.clientY); // search from point x and y
				element.hidden = false; // then show again

				if (!elemBelow) return;

				// find the closest square from the mouse
				droppableBelow = elemBelow.closest(".chessboard-square");

				// if it is not the current square
				if (current != droppableBelow) current = droppableBelow;
			};

			// when the user drop the piece
			const drop = function () {
				// remove first the mousemove event
				document.removeEventListener("mousemove", mousemove);

				// then assign styles to go back to it's position in square
				element.removeAttribute("style");

				if (!current) return false;
				if (game.info.turn != piece.player) return false;

				piece.player.move(piece, current.getAttribute("data-position"));
			};

			// just setting the styles
			const setStyle = function () {
				// set the position to absolute so the image can drag anywhere on the screen
				element.style.position = "absolute";
				// set the z index to max so it will go above all elements
				element.style.zIndex = 1000;
			};

			// just sets some listeners
			const manageListener = function () {
				// drop on mouseup event
				element.onmouseup = drop;

				// disabled dragging
				element.ondragstart = function () {
					return false;
				};

				// add mousemove listener again
				document.addEventListener("mousemove", mousemove);
			};

			// declaration
			setStyle();
			manageListener();
			move(event.pageX, event.pageY);

			if (game.info.turn != piece.player) return false;
			// get the piece possibilities, values(moves(array), enemies(array), castling(array))
			// then show circles to all that squares
			board.setSquarePossibilities(piece.getPossibleSqOnly(), true);

			piece.player.data.currentPiece = piece;
		};

		// add mousedown listener
		element.addEventListener("mousedown", mousedown);
	}

	// get piece possibilites, move, enemies, castling
	getPossibilities() {
		const piece = this; // the current piece
		const square = this.square; // the current square where piece located
		const player = this.player; // the turning player
		const role = player.data.role; // player role values(white, black)
		const game = this.game; // the game
		const gameboard = game.data.board; // game board
		const board = gameboard.data; // and the board data
		const pos = { moves: [], enemies: [], castling: [] }; // possibilities object
		let { x, y } = square.info.boardPosition; // square position into board

		// will check if the piece inside the given square is enemy or not
		// then if it is push it into enemies pos
		const testEnemy = function (y, x) {
			// check if the position is valid
			if (!gameboard.isValidPos(y, x)) return false;

			const square = board[y][x]; // target square
			const piece = square.piece; // piece inside the target square

			if (!square || !piece) return false;
			if (piece.player.data.role == role) return false;

			pos.enemies.push(square);
		};

		// test the square when piece can be move or there is enemy
		const testSquare = function (y, x) {
			// check if the position is valid
			if (!gameboard.isValidPos(y, x)) return false;

			const square = board[y][x]; // target square
			const sqpiece = square.piece; // piece inside the target square

			if (!square) return false;

			if (sqpiece) {
				if (piece.info.name != "Pawn") testEnemy(y, x);
				return false;
			} else {
				pos.moves.push(square);
				return true;
			}
		};

		// test directions and check how long the piece can be move from the board
		// yi / xi = y/x need to change
		// yo / xo = what operation, true = addition while false = subtration
		// un = until (number), how many squares need to check
		// is = isKing, then if it is check for castlings
		const testLoopSquare = function (yi, yo, xi, xo, un = 8, is) {
			for (let i = 1; i < un; i++) {
				const ny = yi ? (yo ? y + i : y - i) : y;
				const nx = xi ? (xo ? x + i : x - i) : x;

				// check if the position is valid
				if (!gameboard.isValidPos(ny, nx)) return false;

				const square = board[ny][nx]; // target square
				const sqpiece = square.piece; // piece inside the target square

				if (square) {
					if (sqpiece) {
						// if not pawn then test if there is enemy
						if (piece.info.name != "Pawn") testEnemy(ny, nx);
						break;
					} else if (is && i == 2) {
						// if isKing then check then run as one only in a loop
						
						const check = function (condition) {
							if (condition) pos.castling.push(square);
						};

						const rightrook = board[ny][nx + 1].piece;
						const leftrook = board[ny][nx - 1].piece;

						
						check(rightrook && rightrook.info.name == "Rook");
						check(leftrook && leftrook.info.name == "Rook");
						
					}

					pos.moves.push(square);
				}
			}
		};

		// All Piece move patterns
		const Pattern = {
			Pawn: function () {
				// check if pawn can fastpawn then if it is, increment 1 to it's possible move
				let until = piece.info.fastpawn ? 3 : 2;

				// loop through until values
				for (let i = 1; i < until; i++) {
					if (role == "white") {
						// if it is white, subrtact current i value
						// so it moves from bottom to top
						if (!testSquare(y - i, x)) break;
					} else {
						// if it is black, add current i value
						// so it moves from top to bottom
						if (!testSquare(y + i, x)) break;
					}
				}

				// enemy detection
				if (role == "white") {
					// (white) check the top left and right square from it's position
					testEnemy(y - 1, x - 1);
					testEnemy(y - 1, x + 1);
				} else {
					// (black) check the bottom left and right square from it's position
					testEnemy(y + 1, x - 1);
					testEnemy(y + 1, x + 1);
				}
			},

			Rook: function () {
				// Top
				testLoopSquare(true, false, false, false);
				// Bottom
				testLoopSquare(true, true, false, false);
				// Left
				testLoopSquare(false, false, true, false);
				// Right
				testLoopSquare(false, false, true, true);
			},

			Bishop: function () {
				// Top left
				testLoopSquare(true, false, true, false);
				// Bottom Left
				testLoopSquare(true, true, true, false);
				// Bottom Right
				testLoopSquare(true, false, true, true);
				// Bottom Right
				testLoopSquare(true, true, true, true);
			},

			Knight: function () {
				// Top
				testSquare(y - 2, x - 1);
				testSquare(y - 2, x + 1);
				// Bottom
				testSquare(y + 2, x - 1);
				testSquare(y + 2, x + 1);
				// Left
				testSquare(y - 1, x - 2);
				testSquare(y + 1, x - 2);
				// Right
				testSquare(y - 1, x + 2);
				testSquare(y + 1, x + 2);
			},

			Queen: function () {
				Pattern.Rook(); // can move like a rook
				Pattern.Bishop(); // can move like a bishope
			},

			King: function () {
				// Top
				testSquare(y - 1, x);
				// Bottom
				testSquare(y + 1, x);
				// Top Left
				testSquare(y - 1, x - 1);
				// Top Right
				testSquare(y - 1, x + 1);
				// Bottom Left
				testSquare(y + 1, x - 1);
				// Bottom Right
				testSquare(y + 1, x + 1);

				if (piece.info.castling) {
					testLoopSquare(false, false, true, true, 3, true);
					testLoopSquare(false, false, true, false, 3, true);
				}
			},
		};

		// then get the pattern base on their name
		// and call it
		Pattern[this.info.name].call();

		// return possibilities
		return pos;
	}

	getPossibleSqOnly() {
		let { moves, enemies, castling } = this.getPossibilities();
		const game = this.game;

		const filter = (s) => {
			return s.filter((sq) => {
				return game.testMove(this, sq);
			});
		};

		game.data.board.resetSquares();
		moves = filter(moves);
		enemies = filter(enemies);
		castling = filter(castling);

		return moves.length || enemies.length || castling.length
			? { moves, enemies, castling }
			: false;
	}

	getAlias() {
		return `${this.info.alias}${this.info.index}`;
	}
}

// Chess Square
class Square {
	constructor(boardPosition, position, role, game) {
		this.info = {
			boardPosition, // square board position
			position, // square position
			role, // square role
			element: null, // square element
			isMove: false, // possible move
			isEnemy: false, // possible enemy
			isCastle: false, // possible castle
		};

		this.piece = null; // the piece
		this.game = game; // the game

		this.init();
	}

	// initialize and ready
	init() {
		this.create(); // create square element
		this.listener(); // some listeners
	}

	// create ui
	create() {
		const squareElement = document.createElement("DIV"); // new Div element
		const classname = "chessboard-square"; // element classname

		squareElement.classList.add(classname); // add
		squareElement.setAttribute("role", this.info.role); // set role
		squareElement.setAttribute("data-position", this.info.position); // and pos

		chessboardParent.appendChild(squareElement); // append to parent
		this.info.element = squareElement; // store
	}

	listener() {
		// action when player clicks on square
		const action = function () {
			const player = this.game.info.turn;
			const info = this.info;
			const isQualified = info.isMove || info.isEnemy || info.isCastle;
			const currentPiece = player.data.currentPiece;

			if (!isQualified || !currentPiece) return false;

			// move the player on the selected squares
			player.move(currentPiece, this);
		};

		this.info.element.addEventListener("click", action.bind(this));
	}

	setAs(classname, bool, ui) {
		const element = this.info.element;

		this.info.isEnemy = classname == "enemy" && bool; // if there's enemy on the square
		this.info.isMove = classname == "move" && bool; // if can possibly move the piece
		this.info.isCastle = classname == "castling" && bool; // if can castling through that position

		if (!ui) return;
		// add class if true and remove if false
		bool
			? element.classList.add(classname)
			: element.classList.remove(classname);
	}
}

// Player
class Player {
	constructor(player) {
		this.info = {
			isTurn: false, // is player turn
			isWinner: false, // is already won
			isStarted: false, // is player started to move
			isTimeout: false, // is player time was ended
			isLeave: false, // is player was leaved
			isChecked: false, // is player was checked
			isReady: false, // is player is ready to go
		};

		this.data = {
			...player, // rewrite player information
			total_moves: 0, // all the moves
			timer: { m: null, s: null },
			piecesData: {}, // data pieces
			pieces: [], // array of pieces
			dropped: [], // all of the pieces that enemy slay
			eated: [], // eated pieces
			moves: [], // total possible moves
			enemies: [], // total possible enemies
			movesHistory: [], // player moves history
			currentPiece: null, // current Piece Holding,
			card: null,
		};

		this.game = null; // empty game
	}
	
	// analyze player side
	analyze() {
		this.data.moves = []; // empty the array
		this.data.enemies = []; // empty the array

		const game = this.game; // the game
		const turnPlayer = game.info.turn;
		const pieces = this.data.pieces; // player pieces
		const pos = { moves: [], enemies: [], castling: [] }; // store

		// loop through the pieces
		for (const piece of pieces) {
			for (const data of Object.entries(piece.getPossibilities())) {
				for (const square of data[1]) {
					if (!square) return;
					if (!pos[data[0]].includes(square.info.position)) {
						pos[data[0]].push(square.info.position);
					}
				}
			}
		}

		this.data.moves = pos.moves; // set the moves
		this.data.enemies = pos.enemies; // set the enemies
		this.info.isTurn = turnPlayer.data.username == this.data.username; // if the player is equal to turning player

		return pos;
	}

	// update ui
	update() {
		const game = this.game;
		const players = game.data.players;
		const pos = players.indexOf(this) + 1;
		const playerCard = document.querySelector(`.player-card.player-${pos}`);
		const isTurn = game.info.turn == this;

		if (!playerCard) return;
		const username = playerCard.querySelector(".row-1 .text .headline h4");
		const status = playerCard.querySelector(".row-1 .text .status span");
		const timer = playerCard.querySelector(".row-2 .timer");

		username.innerText = this.data.username;
		status.innerText = isTurn ? "Player Turn" : "";

		this.data.card = { username, status, timer };

		try {
			this.analyze();
		} catch (e) {}
	}

	// move target piece to the target square
	move(piece, square) {
		if (!piece || !square) return false;
		const board = this.game.data.board;
		// make sure piece and square is an object
		piece = board.filterPiece(this, piece);
		square = board.filterSquare(square);

		const game = this.game; // the game
		const test = game.testMove(piece, square); // test first the move, will return bollean
		const info = square.info; // square information
		const isQualified = info.isMove || info.isEnemy || info.isCastle; // wheater move, enemy or castle

		// if the game was not started
		if (!game.isReady()) return false;

		// if not ready or not already fetch all the pieces
		if (!this.info.isReady) return false;

		// if checked and not correct move
		if (this.info.isChecked) return false;

		// if out of time
		if (this.info.isTimeout) return false;

		// if not turn
		if (!this.info.isTurn) return false;

		// if not qualified, or not possible (move, enemy)
		if (!isQualified) return false;

		// if theres no wrong in move, then move
		if (test) piece.move(square, info.isCastle);

		return test;
	}

	// start the timer
	startTimer() {
		const game = this.game; // the game
		const player = this; // the player
		const card = player.data.card; // playr card element
		const timer = card.timer; // player card timer element
		const span = timer.querySelector("span"); // timer span element
		let { m, s } = player.data.timer; // current data
		let curentduration = parseInt(60 * m) + parseInt(s) ?? 0;
		let duration = m ? curentduration : game.setTime(game.info.timer);

		// callback
		const countdownfunction = function () {
			let { minutes, seconds, text } = game.parseTime(duration); // parse time

			span.innerText = text; // insert into span

			// countdown only if player turn
			if (player.info.isTurn) {
				// if timeout
				if (--duration < 0) {
					timer.classList.add("timeout");
					player.info.isTimeout = true;
					game.info.won = game.switchTurn(player);
					game.winner();
					clearInterval(countdown);
				}

				// store current data
				player.data.timer = { m: minutes, s: seconds };
			}
		};

		const countdown = setInterval(countdownfunction, 1000);

		countdownfunction();
	}

	async getPieces() {
		let role = this.data.role; // values ("white", "black")
		let path = `./assets/javascript/json/${role}-pieces.json`; // just a path of json file
		let data = await fetch(path); // get the file content
		this.data.piecesData = await data.json(); // convert data as json
		this.info.isReady = true; // now the player is ready to go
	}

	async setPieces() {
		const player = this; // the player
		const game = this.game; // the game
		const pieces = this.data.pieces; // array of class Pieces
		const piecesData = this.data.piecesData; // data of all Chess Pieces

		const set = function (setPieceObj) {
			// Get Values
			let { name, length, alias, position } = setPieceObj;
			let { letter: letters, number } = position;
			// Loop through their lengths
			for (let i = 0; i < length; i++) {
				const position = `${letters[i]}${number}`; // get the position
				const obj = { name, alias, position, index: i }; // create piece information
				const piece = new Piece(obj, player, game); // new Piece
				pieces.push(piece); // insert to the array of class Pieces
			}
		};

		// Loop through all the data then generate some Piece base on their length
		// And game rules
		piecesData.forEach(set);
	}

	async init(game) {
		this.game = game; // initialize the game

		await this.getPieces(); // get all data pieces
		await this.setPieces(); // set object pieces to class Pieces

		this.update();
	}
}
const reset = document.querySelector(".button-64");
reset.addEventListener("click", resetGame);

	function resetGame (){
		location.reload()
	}

const Game = new Chess(); // game

Game.init(function () {
	this.start();
	// this.loadMatchHistory("./assets/javascript/json/matchhistory.json");
}); // initialize

