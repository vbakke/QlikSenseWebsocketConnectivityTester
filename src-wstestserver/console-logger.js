var fs = require('fs');
var path = require('path');

var _logPath = null;

module.exports = {
	init: function (logPath, logfile) {
		
		if (logPath) {
			_logPath = buildLogPath(logPath, logfile);

			let logDir = path.dirname(_logPath);
			fs.mkdirSync(logDir, {recursive: true});
		}
	}
}

function buildLogPath (logPath, logfile) {
	if (!logPath)
		logPath = process.argv[1];
	if (!logfile)
		logfile = process.argv[1];

	logfile = path.basename(logfile, '.js') + '.log';
	logPath = path.join(logPath, logfile);
	
	if (path.extname(logPath) === '.js')
		logPath = path.basename(logPath)

	return logPath;
}


var originalConsoleLog = console.log;

function logFunction() {

	var now = new Date();
	args = [];
	args.push('[' + now.toISOString().replace('T', ' ').replace('Z', ' Z') + '] ' + process.pid + ' ');
	// Note: arguments is part of the prototype
	for (var i = 0; i < arguments.length; i++) {
		args.push(arguments[i]);
	}
	originalConsoleLog.apply(console, args);
	logToFile(args.map(x => (x instanceof Object) ? JSON.stringify(x) : x).join(' ')+'\r\n');

};


function logToFile(str, suffix) {
	if (_logPath) {
		var logPath = _logPath;
		
		suffix = (suffix) ? '-'+suffix : '';
		var today = new Date().toISOString().slice(0, 10);
		var ext = path.extname(logPath);
		logPath = logPath.slice(0, -ext.length) + '-' + today.slice(0,10) + suffix + ext;
	
		


		try {
			fs.appendFileSync(logPath, str);
		} catch (err) {
			if (err.code === 'EISDIR') {
				originalConsoleLog('LOG ERROR: The logfile name is a directory: '+_logPath);
			} else if (err.code === 'EPERM') {
				if (suffix) {
					originalConsoleLog('ERROR: Cannot write to: ', logPath);
				} else  {
					var username = process.env.USERNAME;
					logToFile(str, username);
				}
			} else {
				originalConsoleLog('LOG ERROR: ', err);
			}
		}
	}
}


console.log = logFunction;