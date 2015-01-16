var http = require('http');
var ecstatic = require('ecstatic');
var st = ecstatic(__dirname + '/static');
var router = require('routes')();
var hyperstream = require('hyperstream');
var fs = require('fs');
var path = require('path');

router.addRoute('/', function (req, res, params) {
    read('index.html').pipe(hyperstream({
        '#content': page('main.html')
    })).pipe(res);
});

router.addRoute('/cool', function (req, res, params) {
    read('index.html').pipe(hyperstream({
        '#content': page('cool.html')
    })).pipe(res);
});

var server = http.createServer(function (req, res) {
    var m = router.match(req.url);
    if (m) m.fn(req, res, m.params);
    else st(req, res);
});
server.listen(5000);

function page (file) { return read('pages/' + file) }
function read (file) {
    return fs.createReadStream(path.join(__dirname, 'static', file));
}
