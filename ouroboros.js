var timestep_length = 100;
var game_board;

var game_objects = {};
var obj_id = 0;

var player_spawn;

function generateObjectID(){
	return obj_id++;
}

function collidesWithRooms(x,y,size,rooms){
	var padding = 5;
	for(var i = 0; i < rooms.length; i++){
		var x_dist = Math.abs(x-rooms[i][0]) - padding;
		if(x_dist < size || x_dist < rooms[i][2]){
			return true;
		}
		var y_dist = Math.abs(y-rooms[i][1]) - padding;
		if(y_dist < size || y_dist < rooms[i][2]){
			return true;
		}
	}
	return false;
}

function getEnergyReducingMovement(room,rooms){
	var delta = [0,0];
	var x = room[0];
	var y = room[1];
	for(var j = 0; j < rooms.length; j++){
		if(x == rooms[j][0] && y == rooms[j][1]){
			//hit ourselves
			continue;
		}
		var diff_x = rooms[j][0] - x;
		var diff_y = rooms[j][1] - y;
		var magnitude = Math.sqrt(diff_x*diff_x + diff_y*diff_y);
		var direction = Math.atan2(diff_y,diff_x);
		console.log(Math.cos(direction));
		console.log(Math.sin(direction));

		var dx = (20/magnitude) * Math.cos(direction);
		var dy = (20/magnitude) * Math.sin(direction);
		delta[0] -= dx;
		delta[1] -= dy;
	}
	return delta;
}

function minimizeEnergy(rooms){
	var temperature = 0.75;
	for(var i = 0; i < 20; i++){
		var deltas = [];
		for(var j = 0; j < rooms.length; j++){
			deltas.push(getEnergyReducingMovement(rooms[j],rooms));
		}
		for(var j = 0; j < rooms.length; j++){
			var noise = 10*(0.5-Math.random())*Math.pow(temperature,i);
			var old_x = rooms[j][0];
			var old_y = rooms[j][1];
			var new_x = old_x + Math.pow(temperature,i) * (deltas[j][0] + noise);
			var new_y = old_y + Math.pow(temperature,i) * (deltas[j][1] + noise);
			//TODO fix hardcoding of board size
			rooms[j][0] = Math.min(100-rooms[j][2]-1,Math.max(1,Math.floor(new_x)));
			rooms[j][1] = Math.min(100-rooms[j][2]-1,Math.max(1,Math.floor(new_y)));
		}
	}
}


function generateRandomBoard(width,height){
	var new_board = new GameBoard(width,height);
	var rooms = [];
	var adj_matrix = [];
	var valid_xs = [];
	var valid_ys = [];
	for(var i = 5; i < width-5; i++){
		valid_xs.push(i);
	}
	for(var i = 5; i < height-5; i++){
		valid_ys.push(i);
	}

	for(var i = 0; i < 10; i++){
		while(rooms.length == i){
			var x = valid_xs[Math.floor(Math.random()*valid_xs.length)];
			var y = valid_ys[Math.floor(Math.random()*valid_ys.length)];
			var size = Math.min(width-x-1,height-y-1,Math.floor(width/12+Math.random()*width/10));


			// if(!collidesWithRooms(x,y,size,rooms)){
			rooms.push([x,y,size]);
			valid_xs.splice(x,size);
			valid_ys.splice(y,size);
			// }
		}
	}

	minimizeEnergy(rooms);

	player_spawn = [rooms[0][0],rooms[0][1]];
	for(var i = 0; i < rooms.length; i++){
		adj_matrix[i] = [];
		for(var j = 0; j < rooms.length; j++){
			adj_matrix[i][j] = 0;
		}
	}

	//randomly add edges until it's fully connected
	var count = 0;
	while(!isGraphConnected(adj_matrix)){
		count++;
		var x_index = Math.floor(Math.random()*rooms.length);
		var possible = [];
		for(var i = 0; i < adj_matrix.length; i++){
			if(x_index != i && adj_matrix[x_index][i] == 0){
				possible.push(i);
			}
		}
		var y_index = possible[Math.floor(Math.random() * possible.length)]; 
		adj_matrix[x_index][y_index] = 1;
		adj_matrix[y_index][x_index] = 1;
		if(count > adj_matrix.length * adj_matrix.length){
			break;
		}
	}

	//and construct
	var board_sketch = [];
	for(var i = 0; i < width; i++){
		board_sketch[i] = [];
		for(var j = 0; j < height; j++){
			board_sketch[i][j] = 1;
		}
	}

	//add rooms
	for(var i = 0; i < rooms.length; i++){
		var x = rooms[i][0];
		var y = rooms[i][1];
		var size = rooms[i][2];
		for(var j = 0; j < size; j++){
			for(var k = 0; k < size; k++){
				board_sketch[x+j][y+k] = 0;
			}
		}
	}

	//add edges
	for(var i = 0; i < adj_matrix.length; i++){
		for(var j = i; j < adj_matrix.length; j++){
			console.log(i,j);
			if(adj_matrix[i][j]){
				var start_x = Math.floor(rooms[i][0] + rooms[i][2]/2);
				var end_x = Math.floor(rooms[j][0] + rooms[j][2]/2);
				var start_y = Math.floor(rooms[i][1] + rooms[i][2]/2);
				var end_y = Math.floor(rooms[j][1] + rooms[j][2]/2);
				var shift_x = (start_x - end_x)/Math.abs(start_x - end_x);
				var shift_y = (start_y - end_y)/Math.abs(start_y - end_y);
				// if(Math.random() > 0.5){ 
				var jaunted = 0;
				for(var k = 0; k < Math.abs(start_x - end_x); k++){
					board_sketch[start_x - k*shift_x][start_y - jaunted * shift_y] = 0;
					if(jaunted == 0 && k > Math.abs(start_x - end_x)/2){
						for(;jaunted <= Math.abs(start_y - end_y); jaunted++){
							board_sketch[start_x - k*shift_x][start_y - jaunted * shift_y] = 0;
						}
						jaunted--;
					}
				}
				// }
			}
		}
	}

	//convert to a real board
	for(var i = 0; i < width; i++){
		for(var j = 0; j < width; j++){
			if(board_sketch[i][j]==1){
				var wall = new GameObject(0,0,1,i,j,null);
				wall.customCollisionHandler = function(obj){
					obj.undoMove();
				}
				new_board.addObject(wall.id,i,j);
			}
		}
	}

	return new_board;
}

function isGraphConnected(adj_matrix){
	var visited = [];
	for(var i = 0; i < adj_matrix.length; i++){
		visited[i] = false;
	}
	var stack = [0];
	var count = 0;
	visited[0] = true;
	while(stack.length > 0){
		count++;
		if(count > adj_matrix.length + 5){
			return true;
		}
		var current = stack.pop();
		var adjacent = adj_matrix[current];
		for(var i = 0; i < adjacent.length; i++){
			if(adjacent[i]){
				if(!visited[i]){
					stack.push(i);
					visited[i] = true;
				}
			}
		}
	}
	for(var i = 0; i < visited.length; i++){
		if(!visited[i]){
			return false;
		}
	}
	return true;
}

function GameBoard(width,height){
	this.board = []
	this.location_map = {};
	this.width = width;
	this.height = height;
	for(var i = 0; i < width; i++){
		this.board[i] = [];
		for(var j = 0; j < height; j++){
			this.board[i][j] = [];
		}
	}
}

var PlayerDirection = {
    UP : [0,-1],
    DOWN : [0,1],
    RIGHT : [1,0],
    LEFT : [-1,0]
}

var inputDirection = PlayerDirection.UP; 

GameBoard.prototype.removeObject = function(obj_id){
	var pos = this.location_map[obj_id];
	var index = $.inArray(this.board[pos[0]][pos[1]],obj_id);
	this.board[pos[0]][pos[1]].splice(index,1);
	delete this.location_map[obj_id];
}

GameBoard.prototype.addObject = function(obj_id,x,y){
	this.location_map[obj_id] = [x,y];
	this.board[x][y].push(obj_id);
}

GameBoard.prototype.move = function(obj_id,x,y){
	this.removeObject(obj_id);
	this.addObject(obj_id,x,y);
}

GameBoard.prototype.drawToGrid = function(){
	for(var i = 0; i < this.width; i++){
		for(var j = 0; j < this.height; j++){
			if(this.board[i][j].length > 0){
				var obj = game_objects[this.board[i][j][0]];
				HSVGrid.alterGrid(obj.color[0],obj.color[1],obj.color[2],i,j);
				HSVGrid.drawGridToCanvas();
			}
			else{
				HSVGrid.alterGrid(0,0,0,i,j);
				HSVGrid.drawGridToCanvas();
			}
		}
	}
}

GameBoard.prototype.handleCollisions = function(){
	for(var i = 0; i < this.board.length; i++){
		for(var j = 0; j < this.board[i].length; j++){
			for(var obj_index = 0; obj_index < this.board[i][j].length; obj_index++){
				if(this.board[i][j].length > 1){
					game_objects[this.board[i][j][obj_index]].handleCollision(this.board[i][j]);
				}
			}
		}
	}
}

function GameObject(h,s,v,x,y){
	this.color = [h,s,v];
	this.id = generateObjectID();
	this.pos = [x,y];
	this.old_pos = [x,y];
	game_objects[this.id] = this;

	this.updater = null;
	this.customCollisionHandler = null;
}

GameObject.prototype.handleCollision = function(objects){
	if(this.customCollisionHandler){
		for(var i = 0; i < objects.length; i++){
			if(objects[i] != this.id){
				this.customCollisionHandler(game_objects[objects[i]]);
			}
		}
	}
}

GameObject.prototype.move = function(new_x,new_y){
	this.old_pos = this.pos;
	this.pos = [new_x,new_y];
	game_board.move(this.id,new_x,new_y);
}

GameObject.prototype.undoMove = function(){
	this.pos = this.old_pos;
	game_board.move(this.id,this.old_pos[0],this.old_pos[1]);
}

GameObject.prototype.getPosition = function(board){
	return board.location_map[this.id];
}

jQuery(document).ready(function(){
	$(document).keydown(function(e){
		var key = (e.keyCode ? e.keyCode : e.charCode);
		console.log(key);
		if(key == 37){
			inputDirection = PlayerDirection.LEFT;
		}
		else if(key == 38){
			inputDirection = PlayerDirection.UP;
		}
		else if(key == 39){
			inputDirection = PlayerDirection.RIGHT;
		}
		else if(key == 40){
			inputDirection = PlayerDirection.DOWN;
		}
	});
	$(window).resize(resize);
});

function init() {
	var test_board = "#########\n# #  #  #\n# #     #\n# #     #\n#       #\n######  #\n#    #  #\n#       #\n#########\n";
	resize();
	canvas = document.getElementById("game_canvas");
	HSVGrid.initGrid(canvas,100);
	game_board = generateRandomBoard(100,100);

	var player = new GameObject(0,0.5,1,player_spawn[0],player_spawn[1]);
	player.updater = function(){
		var pos = this.getPosition(game_board);
		console.log(pos);
		this.move(pos[0]+inputDirection[0],pos[1]+inputDirection[1]);
	};
	game_board.addObject(player.id,player.pos[0],player.pos[1]);

	return setInterval(gameTimestep, timestep_length);
}

function resize(){
	var game_area = $("#game_area")[0];
	var new_width = window.innerWidth;
	var new_height = window.innerHeight;

	if(new_width >= new_height){
		new_width = new_height;
	}
	else{
		new_height = new_width;
	}
	if(new_height > 800){
		new_height = 800;
		new_width =  800;
	}
	game_area.style.height = new_height + 'px';
	game_area.style.width = new_width + 'px';
	game_area.style.marginTop = (-new_height / 2) + 'px';
	game_area.style.marginLeft = (-new_height / 2) + 'px';
	canvas = document.getElementById("game_canvas");
	canvas.width = new_width;
	canvas.height = new_height;
	game_area.style.fontSize = (new_width / 800) + 'em';
}

var boardmap = {
	"#" : 1,
	" " : 0
}

function updateBoardFromString(str,x,y){
	var lines = str.split("\n");
	for(var i = 0; i < lines.length; i++){
		var line = lines[i];
		for(var j = 0; j < line.length; j++){
			if(line[j] == "#"){
				var wall = new GameObject(0,0,1,i,j,null);
				wall.customCollisionHandler = function(obj){
					obj.undoMove();
				}
				game_board.addObject(wall.id,i,j);
			}
		}
	}
}

function updateObjects(){
	for(var key in game_objects){
		if(game_objects.hasOwnProperty(key)){
			var obj = game_objects[key];
			if(obj.updater){
				obj.updater();
			}
		}
	}
}

function gameTimestep(){
	updateObjects();
	game_board.handleCollisions();
	game_board.drawToGrid();
	// for(var i = 0; i < 10; i++){
	// 	for(var j = 0; j < 10; j++){
	// 		HSVGrid.alterGrid(360* Math.random(),1,game_board[i][j],j,i);
	// 	}
	// }
	HSVGrid.drawGridToCanvas();
}
