var util = require('util');
var readline = require('readline');

var scores = []; // scores is an array of arrays containing name as first element then scores for each ball bowled
// e.g [["Pete", 10, 10, 10],["Dave", 5, 0, 4, 6, 10]]
var nameEntry = true; // false for score entry
var frame;  // 1-10
var player; // starts at 0
var ball;   // 1,2 or 3
var previous; // records score from previous ball of this frame
var log = (process.argv[2] === "debug")?console.log:function(){};

var promptName = "Enter name for Player %d or return to start game:";
var promptScore = "Enter score for %s Frame %d Ball %d:";
var errorNoName = "Error: No player name has been entered.";
var errorUniqueName = "Error: Player name must be unique.";
var errorInvalidInput = "Error: Input must be a number between 0 and 10 inclusive.";
var errorMaxExceeded = "Error: You can't score more than 10 pins in a frame.";
var gameOver = "Game over. The winner is %s with a score of %d.";
var gameOver2 = "Game over. The winners are %s with a score of %d.";

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
var error = function(e){
	process.stdout.write(e+"\n");
};
var prompt = function(e){
	log("=====>"+e);
	rl.question(e, function(line){
		log("<====="+line);
		handler(line);
	});
};

var calc = function(scores) {
	var total = 0, count, j;
	for (j = 1, count = 1; j < scores.length; j++, count++){ // skip over name
		total += scores[j];
		if (scores[j] === 10){ // strike
			if(scores[j+1]){ total += scores[j+1];}
			if(scores[j+2]){ total += scores[j+2];}
			count++;
		} else if (count%2 === 0 && scores[j] > 0 && scores[j]+scores[j-1] === 10 ){ // spare
			if(scores[j+1]){ total += scores[j+1];}
		}
		if (count > 19){break;} // handle frame 10 correctly
	}
	return total;
};

var outputScore = function(){
	var total, grand=0, output, ball, last, i, j, col;
	process.stdout.write(["Name\\Frame","1","2","3","4","5","6","7","8","9","10"," Total","\n"].join("   "));
	for (i = 0; i < scores.length; i++) {
		total = 0;
		output = [];
		output[0] = (scores[i][0]+"            ").slice(0,12); // name in first column
		last = 0;
		for (j = 1, col = 1; col < 22; j++, col++){ // 2 balls per frame + 1 extra
			if (j < scores[i].length) {
				ball = scores[i][j];
				if ((col%2 === 1 || col> 19) && ball === 10){ // strike
					output[col] = "X";
					if (col < 19){ // end of frame except for frame 10
						col++;
						output[col] = " ";
					}
				} else if (col%2 === 0 && ball > 0 && ball + last === 10 ){ // spare
					output[col] = "/";
				} else {
					output[col] = ball.toString();
				}
				last = ball;
			} else {
				output[col] = " ";
			}
		}
		total = calc(scores[i]);
		grand += total;
		output[22] = total;
		output[23] = "\n";
		process.stdout.write(output.join(" "));
	}
	process.stdout.write( "Team total: "+grand.toString()+"\n");
};

var outputGameOver = function(){
	var i, max=0, score, array=[];
	for (i = 0; i < scores.length; i++){
		score = calc(scores[i]);
		if( score > max ){ max = score;}
	}
	for (i = 0; i < scores.length; i++){
		score = calc(scores[i]);
		if( score === max ){ array.push(scores[i][0]);}
	}
	process.stdout.write(util.format((array.length > 1)?gameOver2:gameOver, array.join(" and "), max)+"\n");
	rl.close();
	process.exit();
};

var checkUnique = function(name, scores){
	var compName = function(v){return v[0] === name;};
	return scores.some(compName);
};

var nextPlayer = function(){
	player++;
	ball = 1;
	extra = false;
	if (player === scores.length){ player = 0; frame++;}
	if (frame===11){ outputScore(); outputGameOver();}
};

var handler = function(input){
	log(scores, frame,  player, ball); // debug
	if (nameEntry) {
		if (input !== ""){ // not end of name entry
			if ( input !== undefined ){ // undefined first time through
				// check uniqueness
				if ( checkUnique( input, scores ) ){
					error(errorUniqueName);
				} else {
					scores.push([input]);
					outputScore();
				}
			}
			prompt(util.format(promptName, scores.length+1));
		} else { // end of name entry
			if(scores.length === 0){
				error(errorNoName);
				process.exit(1);
			}
			nameEntry = false;
			input = undefined;
			frame=1;
			player=0;
			ball=1;
		}
	}
	if (!nameEntry){
		if ( input !== undefined ){ // undefined first time through
			// validate
			if( input === ""){
				error(errorInvalidInput);
			} else {
				input = Number(input);
				if(isNaN(input) || 0 > input || input > 10){ // not in range 0-10
					error(errorInvalidInput);
				} else if ( ball === 2 && previous !== 10 && input + previous > 10){ // more than 10 pins!
					error( errorMaxExceeded);
				} else {
					// record
					scores[player].push(input);
					outputScore();
					// determine next state
					//	Frame	Ball	Input	Outcome
					//	1-10	1		0-9		ball=2
					//	1-9		1		10		next player
					//	10		1		10		ball=2 extra=true
					//	1-9		2		0-10	next player
					//	10		2		0-10    if (spare) extra=true; if (extra) ball=3 else next player
					//	10		3		0-10	next player
					if ( ball === 1 && input < 10)							{ ball=2; }
					else if ( frame < 10 && ball === 1 && input === 10)		{ nextPlayer();}
					else if ( frame === 10 && ball === 1 && input === 10)	{ ball=2; extra=true;}
					else if ( frame < 10 && ball === 2)						{ nextPlayer();}
					else if ( frame == 10 && ball === 2)					{ if (input + previous === 10){ extra = true; } if (extra){ ball = 3;} else { nextPlayer();}}
					else if ( ball === 3 )									{ nextPlayer();}
					previous = input;
				}
			}
		}
		prompt(util.format(promptScore, scores[player][0], frame, ball));
	}
};

handler(); // kick off first prompt

