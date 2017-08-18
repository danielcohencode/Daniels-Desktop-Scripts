var fs = require('fs');
var parse = require('csv-parse');
var validUrl = require('valid-url');
var http = require('http')
const https = require('https');
var async = require('async');

var txt_string = '';
var err_string = '';
var filepath = process.argv[2];
var filename = process.argv[3];
var file_extension = process.argv[4];
var output = process.argv[5];


/* Calls different functions depending on file extension */ 
if (file_extension == 'csv') {
	csv_wrapper();
}
else if (file_extension == 'txt') {
	txt_wrapper();
}

/* Function to print string to output file */
function print() {
	var time = (new Date/1000|0).toString();
	if (err_string != '') {
			var log_filepath = output + filename.substring(0, filename.length-4) + '.log';
			fs.writeFile(log_filepath, err_string, function(err) {
				if (err) throw err;
				// console.log('Errors found! log file\n' + log_filepath +' written');
			})
	}

	var new_filepath = output + filename.substring(0, filename.length-4) + '-' + time + '.txt';
	fs.writeFile(new_filepath, txt_string, function(err) {
		if (err) throw err;
		// console.log('file written!');
	})
	console.log(new_filepath); // this sends the new filepath to applescript in the easiest possible way. VERY IMPORTANT!
}

/* Function to process .txt files */
function txt_wrapper() {
	fs.readFile(filepath, 'utf8', function (err, data) {
		if (err) throw err;
		txt_string = data;
		async.series([
			function(callback) {
				txt();
				callback(null, 'one');
			},
			function(callback) {
				var urls_array = txt_string.match(/((http:\/\/|https:\/\/)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/g);
				async.each(urls_array, function(uri, callback) {
					if (uri.startsWith('https')) {
						https.get(uri,  function(res) {
							if (Math.floor(res.statusCode / 100) == 4 || Math.floor(res.statusCode / 100) == 5)
							{
								err_string += '\n\n__________________________________________________________\nhttps error code:' 
								+ res.statusCode + '\n' + uri + " didn't work for me! Try it in a browser!\n";
								callback();
							} else {
								callback();
							}
						}).on('error', function(err) {
							err_string += '\n\n__________________________________________________________\nFundamental error with URI: ' 
							+ uri + '. Check for major syntax errors.\n\n';
							callback();
						});
					} else {
						http.get(uri, function(res) {
							if (Math.floor(res.statusCode / 100) == 4 || Math.floor(res.statusCode / 100) == 5)
							{
								err_string += '\n\n__________________________________________________________\nhttp error code: ' 
								+ res.statusCode + '\n' + uri + " didn't work for me! Try it in a browser!\n";
								callback();
							} else {
								callback();
							}
						}).on('error', function (err) {
							err_string +=  '\n\n__________________________________________________________\nFundamental error with URI: ' 
							+ uri + '. Check for major syntax errors.\n';
							callback();
						});
					}
				}, function(err){
					callback(null, 'two');
				});
			},
			function(callback) {
				print();
				callback(null, 'three');
			}
			],
			function(err, results) {
				// if errors
			});
	})
}

/* Function to process .csv files */
function csv_wrapper() {
	async.series([
		function(callback) {
			fs.readFile(filepath, 'utf8', function (err, data) {
				if (err) throw err;
				parse(data, {trim: true}, function(err, output) {
					for (var i = 0; i < output.length; i++) {
						//output[i][1] = output[i][1].trim();
						if (output[i][0].match(/(Slide Title➤)/g) != null) {
							output[i][1] = output[i][1].replace(/(\n|\r|\n\r|\r\n)/g, '');
							if (output[i][1].match(/\)$/g) == null) {
								if (output[i][1].match(/\(/g) == null) {
									var n = output[i][1].indexOf("]");					
									txt_string += '#!#title' + output[i][1].substring(0, n + 1) + '(' + output[i][1].substring(n + 1) + ')' + '\r\n\n\r';
								}
								else {
									txt_string += '#!#title' + output[i][1] + ')' + '\r\n\n\r';	
								}
							}
							else if (output[i][1].match(/\(/g) == null) {
								var n = output[i][1].indexOf("]");					
								if (output[i][1].match(/\)/g) == null) {
									txt_string += '#!#title' + output[i][1].substring(0, n + 1) + '(' + output[i][1].substring(n + 1) + ')' + '\r\n\n\r';
								}
								else {
									txt_string += '#!#title' + output[i][1].substring(0, n + 1) + '(' + output[i][1].substring(n + 1) + '\r\n\n\r';	
								}
							}
							else {
								txt_string += '#!#title' + output[i][1] + '\r\n\n\r';
							}
						}
						else if (output[i][0].match(/URL/g) != null) {
							var fixed_url = output[i][1].trim();
							fixed_url = fixed_url.replace(" ", "");
							fixed_url = fixed_url.replace(/\(([-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)\)/g, '(http://$1');
							
						  /* checks URI for correct syntax and whether it gets a response */
						    if (!validUrl.isWebUri(fixed_url)){
								err_string += "\n\n__________________________________________________________\nSeems like this is not a valid Web URI:\n\n"
								+ fixed_url + '\n\n__________________________________________________________\nInvalid Web URI:\n\n';
						    }

							txt_string += '!img[' + output[i+1][1] + '](' + fixed_url + ')' +'\r\n\n\r';
							i += 1;
						}
						else {
							if (output[i][1].match(/>>.*?(\n|\r).*?<</g) != null) {
								txt_string += output[i][1].replace(/(>>.*?)(\n|\r|\n\r|\r\n)(.*?<<)/g, '$1$3') + '\r\n\n\r';
							}
							else {
								txt_string += output[i][1] + '\r\n\n\r';
							}
						}
					}
								callback(null, 'one');

				});
			});
		},
		function(callback) {
			txt();
			callback(null, 'two');
		},
		function(callback) {
			var urls_array = txt_string.match(/((http:\/\/|https:\/\/)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/g);
			async.each(urls_array, function(uri, callback) {
				if (uri.startsWith('https')) {
					https.get(uri,  function(res) {
						if (Math.floor(res.statusCode / 100) == 4 || Math.floor(res.statusCode / 100) == 5)
						{
							err_string += '\n\n__________________________________________________________\nhttps error code: ' 
								+ res.statusCode + '\n' + uri + " doesn't work! Try it in a browser!\n";
							callback();
						} else {
							callback();
						}
					}).on('error', function(err) {
						err_string += '\nFundamental error with URI: ' + uri + '. Check for major syntax errors.\n';
						callback();
					});
				} else {
					http.get(uri, function(res) {
						if (Math.floor(res.statusCode / 100) == 4 || Math.floor(res.statusCode / 100) == 5)
						{
							err_string += '\n\n__________________________________________________________\nhttp error code: ' 
								+ res.statusCode + '\n' + uri + " doesn't work! Try it in a browser!\n";
							callback();
						} else {
							callback();
						}
					}).on('error', function (err) {
						err_string +=  '\n\n__________________________________________________________\nFundamental error with URI: ' 
						+ uri + '. Check for major syntax errors.\n';
						callback();
					});
				}
			}, function(err){

				callback(null, 'three');
			});
		},
		function(callback) {
			print();
			callback(null, 'four');
		}
	]);
}

/* Function to parse .txt string data */
function txt() {

	/* Error checking and termination conditions */
	var image_embbed_error = txt_string.match(/(!img)((?!\[.*?\])|(\[.*?\])(?!\(.*\)))(.*)/g);
	if (image_embbed_error != null)
	{
		err_string += "__________________________________________________________\nPossible problem with an image:\n\n"
		+ image_embbed_error.join('\n\n__________________________________________________________\nIncorrect Image Embedding Syntax:\n\n');	
	}

	var title_syntax_error = txt_string.match(/(#!#title|!#title)((?!\[.*?\])|(\[.*?\])(?!\(.*\)))(.*)/g);
	if (title_syntax_error != null)
	{
		err_string += "\n\n__________________________________________________________\nPossible problem with a title:\n\n"
		+ title_syntax_error.join('\n\n__________________________________________________________\nIncorrect Title Embedding Syntax:\n\n');	
	}

	var blank_image_tag = txt_string.match(/(#!#title.+\s+)(!img\[\]\(\)\s+)(?!(#!#title)|(\s+#!#title))(.+)/g);
	if (blank_image_tag != null)
	{
		err_string += "\n\n__________________________________________________________\nSeems like the image is blank when it shouldn't be:\n\n"
		+ blank_image_tag.join('\n\n__________________________________________________________\nBlank Image Tag followed by Text:\n\n');
	}

	var text_follow_title = txt_string.match(/(#!#title.+\n)(\s+)(?!(!img)|(\s+!img))(.*)/g);
	if (text_follow_title != null)
	{
		err_string += "\n\n__________________________________________________________\nSeems like an image line might be missing here:\n\n"
		+ text_follow_title.join('\n\n__________________________________________________________\nText follows Title:\n\n');
	}


	/* Finds and Replaces simple errors */
	txt_string = txt_string.replace(/(\])(\s+)(\()/g, '$1$3'); //removes whitespace between closed brackets and parantheses
	txt_string = txt_string.replace(/(\))( *)(\s+)/g, '$1$3'); // removes space after closed brackets and before new line or carriage return
	txt_string = txt_string.replace(/( +)(\s+)/g, '$2'); // removes space before new line
	txt_string = txt_string.replace(/(\s+)( +)/g, '$1'); // removes space after new line	
	txt_string = txt_string.replace(/^( +)((?:!img)|(?:#!#title))/gm, '$2'); // removes space from before !img or #!#title tags
	txt_string = txt_string.replace(/^((?:!img)|(?:#!#title))(.*)\n(.+)/, '$1$2\n\n$3'); // adds newline after !img or #!#title tag if needed
	txt_string = txt_string.replace(/\(([-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)\)/g, '(http://$1)'); // inserts http into URIs without https or http
	txt_string = txt_string.replace(/(<)(\d)/g, '$1 $2'); // inserts space between &lt and numeral
	txt_string = txt_string.replace(/(#!#!title1\[.*\]\()(\))/g, '$1 $2'); // inserts space between parentheses in null titles
	txt_string = txt_string.trim(); // trims any remaining whitespace from beginning and end of string
	if (!txt_string.includes("SH:YES"))
	{
		txt_sting += "\n\n<span id=\"SH:YES\" style=\"display: none;\"></span>";
	}
}

/* Function to parse .csv dad */
function csv() {
	fs.readFile(filepath, 'utf8', function (err, data) {
		if (err) throw err;
		parse(data, {trim: true}, function(err, output) {
			for (var i = 0; i < output.length; i++) {
				//output[i][1] = output[i][1].trim();
				if (output[i][0].match(/(Slide Title➤)/g) != null) {
					output[i][1] = output[i][1].replace(/(\n|\r|\n\r|\r\n)/g, '');
					if (output[i][1].match(/\)$/g) == null) {
						if (output[i][1].match(/\(/g) == null) {
							var n = output[i][1].indexOf("]");					
							txt_string += '#!#title' + output[i][1].substring(0, n + 1) + '(' + output[i][1].substring(n + 1) + ')' + '\r\n\n\r';
						}
						else {
							txt_string += '#!#title' + output[i][1] + ')' + '\r\n\n\r';	
						}
					}
					else if (output[i][1].match(/\(/g) == null) {
						var n = output[i][1].indexOf("]");					
						if (output[i][1].match(/\)/g) == null) {
							txt_string += '#!#title' + output[i][1].substring(0, n + 1) + '(' + output[i][1].substring(n + 1) + ')' + '\r\n\n\r';
						}
						else {
							txt_string += '#!#title' + output[i][1].substring(0, n + 1) + '(' + output[i][1].substring(n + 1) + '\r\n\n\r';	
						}
					}
					else {
						txt_string += '#!#title' + output[i][1] + '\r\n\n\r';
					}
				}
				else if (output[i][0].match(/URL/g) != null) {
					var fixed_url = output[i][1].trim();
					fixed_url = fixed_url.replace(" ", "");
					fixed_url = fixed_url.replace(/\(([-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)\)/g, '(http://$1');
					
				  /* checks URI for correct syntax and whether it gets a response */
				    if (!validUrl.isWebUri(fixed_url)){
						err_string += "\n\n__________________________________________________________\nSeems like this is not a valid Web URI:\n\n"
						+ fixed_url + '\n\n__________________________________________________________\nInvalid Web URI:\n\n';
				    }

					txt_string += '!img[' + output[i+1][1] + '](' + fixed_url + ')' +'\r\n\n\r';
					i += 1;
				}
				else {
					if (output[i][1].match(/>>.*?(\n|\r).*?<</g) != null) {
						txt_string += output[i][1].replace(/(>>.*?)(\n|\r|\n\r|\r\n)(.*?<<)/g, '$1$3') + '\r\n\n\r';
					}
					else {
						txt_string += output[i][1] + '\r\n\n\r';
					}
				}
			}
		});
	});
}


// function uri() {
// 	/* Checks URIs for Web response */
// 	var urls_array = txt_string.match(/((http:\/\/|https:\/\/)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/g);
// 	async.each(urls_array, function(uri, callback) {
// 		if (uri.startsWith('https')) {
// 			https.get(uri,  function(res) {
// 				if (Math.floor(res.statusCode / 100) == 4 || Math.floor(res.statusCode / 100) == 5)
// 				{
// 					err_string += '\nhttps error code:' + res.statusCode + '\n' + uri + " doesn't work! Try it in a browser!\n";
// 				} else {
// 					callback();
// 				}
// 			}).on('error', function(err) {
// 				err_string += '\nFundamental error with URI: ' + uri + '. Check for major syntax errors.\n';
// 				callback();
// 			});
// 		} else {
// 			http.get(uri, function(res) {
// 				if (Math.floor(res.statusCode / 100) == 4 || Math.floor(res.statusCode / 100) == 5)
// 				{
// 					err_string += '\nhttp error code: ' + res.statusCode + '\n' + uri + " doesn't work! Try it in a browser!\n";
// 					callback();
// 				} else {
// 					callback();
// 				}
// 			}).on('error', function (err) {
// 				err_string +=  '\nFundamental error with URI: ' + uri + '. Check for major syntax errors.\n';
// 				callback();
// 			});
// 		}
// 	}, function(err){
// 		// put callback here!
// 	});
// }
