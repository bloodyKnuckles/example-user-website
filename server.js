var http = require('http');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var ecstatic = require('ecstatic');
var st = ecstatic(__dirname + '/static');
var router = require('routes')();
var hyperstream = require('hyperstream');
var body = require('body/any');
var cookie = require('cookie');
var has = require('has');

var level = require('level');
var accountdown = require('accountdown');
var db = level('./users.db', { valueEncoding: 'json' });

var users = accountdown(db, {
    login: { basic: require('accountdown-basic') }
});
var sessions = {};

router.addRoute('/', function (req, res, params) {
    var cookies = cookie.parse(req.headers.cookie || '');
    if (cookies.session && has(sessions, cookies.session)) {
        users.get(sessions[cookies.session], function (err, user) {
            if (err) return error(res, 500, err);
            layout(res, 'main.html', { user: user });
        });
    }
    else layout(res, 'main.html');
});

router.addRoute('/create', function (req, res, params) {
    if (req.method !== 'POST') return layout(res, 'create.html');
    body(req, res, function (err, form) {
        if (err) return error(res, 500, err);
        var opts = {
            login: { basic: form },
            value: { name: form.username }
        };
        var id = crypto.randomBytes(16).toString('hex');
        var sid = crypto.randomBytes(64).toString('hex');
        users.create(id, opts, function (err) {
            if (err) return error(res, 500, err);
            sessions[sid] = id;
            res.setHeader('set-cookie', 'session=' + sid);
            layout(res, 'newuser.html');
        });
    });
});

router.addRoute('/login', function (req, res, params) {
    if (req.method !== 'POST') return layout(res, 'login.html');
    body(req, res, function (err, form) {
        if (err) return error(res, 500, err);
        var opts = { login: { basic: form } };
        
        users.verify('basic', form, function (err, ok, id) {
            if (err) return error(res, 500, err);
            if (!ok) return layout(res, 'badlogin.html');
            
            var sid = crypto.randomBytes(64).toString('hex');
            sessions[sid] = id;
            res.setHeader('set-cookie', 'session=' + sid);
            layout(res, 'main.html');
        });
    });
});

router.addRoute('/cool', function (req, res, params) {
    layout(res, 'cool.html');
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

function layout (res, name, opts) {
    if (!opts) opts = {};
    res.setHeader('content-type', 'text/html');
    var params = { '#content': page(name) };
    if (opts.user) {
        params['#auth .username'] = opts.user.name;
    }
    else params['#auth'] = '';
    return read('index.html').pipe(hyperstream(params)).pipe(res);
}

function error (res, code, err) {
    res.statusCode = code;
    res.end(err + '\n');
}
