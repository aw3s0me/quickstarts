(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
(function (global){

var rng;

if (global.crypto && crypto.getRandomValues) {
  // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
  // Moderately fast, high quality
  var _rnds8 = new Uint8Array(16);
  rng = function whatwgRNG() {
    crypto.getRandomValues(_rnds8);
    return _rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var  _rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return _rnds;
  };
}

module.exports = rng;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

// Unique ID creation requires a high quality random # generator.  We feature
// detect to determine the best RNG source, normalizing to a function that
// returns 128-bits of randomness, since that's what's usually required
var _rng = require('./rng');

// Maps for number <-> hex string conversion
var _byteToHex = [];
var _hexToByte = {};
for (var i = 0; i < 256; i++) {
  _byteToHex[i] = (i + 0x100).toString(16).substr(1);
  _hexToByte[_byteToHex[i]] = i;
}

// **`parse()` - Parse a UUID into it's component bytes**
function parse(s, buf, offset) {
  var i = (buf && offset) || 0, ii = 0;

  buf = buf || [];
  s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
    if (ii < 16) { // Don't overflow!
      buf[i + ii++] = _hexToByte[oct];
    }
  });

  // Zero out remaining bytes if string was short
  while (ii < 16) {
    buf[i + ii++] = 0;
  }

  return buf;
}

// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
function unparse(buf, offset) {
  var i = offset || 0, bth = _byteToHex;
  return  bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = _rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; n++) {
    b[i + n] = node[n];
  }

  return buf ? buf : unparse(b);
}

// **`v4()` - Generate random UUID**

// See https://github.com/broofa/node-uuid for API details
function v4(options, buf, offset) {
  // Deprecated - 'format' argument, as supported in v1.2
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options == 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || _rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ii++) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || unparse(rnds);
}

// Export public API
var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;
uuid.parse = parse;
uuid.unparse = unparse;

module.exports = uuid;

},{"./rng":2}],4:[function(require,module,exports){
'use strict';

var _deviceManager = require('./lib/device-manager');

var _deviceManager2 = _interopRequireDefault(_deviceManager);

var _storageManager = require('./lib/storage-manager');

var _storageManager2 = _interopRequireDefault(_storageManager);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = new _deviceManager2.default();

/**
 * Find the parent node of a given name
 * @param {string} name the name we are searching for
 * @param {Node} el the current el
 */
function findParentNode(name, el) {
    if (el.localName.toLowerCase() === 'body') {
        return undefined;
    }
    if (el.localName.toLowerCase() === name) {
        return el;
    }
    return findParentNode(name, el.parentNode);
}

app.on('deviceready', function () {
    var taskStore = new _storageManager2.default();

    // Get the various pieces of the UX so they can be referred to later
    var el = {
        todoitems: document.querySelector('#todo-items'),
        summary: document.querySelector('#summary'),
        refreshicon: document.querySelector('#refresh-icon'),
        addnewtask: document.querySelector('#add-new-task'),
        newitemtextbox: document.querySelector('#new-item-text')
    };

    function setRefreshIcon(loading) {
        if (loading) {
            el.refreshicon.className = 'fa fa-refresh fa-spin';
        } else {
            el.refreshicon.className = 'fa fa-refresh';
        }
    }

    // This is called whenever we want to refresh the contents from the database
    function refreshTaskList() {
        setRefreshIcon(true);

        taskStore.read({ complete: false }).then(function (todoItems) {
            var count = 0;
            el.todoitems.innerHTML = '';
            todoItems.forEach(function (entry, index) {
                var checked = entry.complete ? ' checked="checked"' : '';
                var entrytext = entry.text.replace('"', '&quot;');
                var html = '<li data-todoitem-id="' + entry.id + '"><input type="checkbox" class="item-complete"' + checked + '><div><input class="item-text" value="' + entrytext + '"></div></li>';
                el.todoitems.innerHTML += html;
                count++;
            });
            el.summary.innerHTML = '<strong>' + count + '</strong> item(s)';
            setRefreshIcon(false);
        }).catch(function (error) {
            console.error('Error reading task store: ', error);
            el.summary.innerHTML = '<strong>Error reading store.</strong>';
            setRefreshIcon(false);
        });
    }

    // Set up the event handler for clicking on Refresh Tasks
    el.refreshicon.addEventListener('click', refreshTaskList);
    refreshTaskList();
    el.newitemtextbox.focus();

    // Set up the event handler for clicking on Add New Task
    el.addnewtask.addEventListener('click', function (event) {
        var itemText = el.newitemtextbox.value;
        if (itemText !== '') {
            taskStore.insert({ text: itemText, complete: false }).then(refreshTaskList);
        }
        el.newitemtextbox.value = '';
        el.newitemtextbox.focus();
        event.preventDefault();
    });

    // Set up the event handler for updating a task
    el.todoitems.addEventListener('change', function (event) {
        var target = event.target;
        // Only handle change events on the item-text or item-complete elements
        if (target.className === 'item-text' || target.className === 'item-complete') {
            // Get the LI node above the current node
            var li = findParentNode('li', target);
            if (!li) {
                console.log('Could not find LI - break');
                return;
            }
            // The ID is the data-todoitem-id attribute value
            var id = li.getAttribute('data-todoitem-id');

            // Pull the original record
            taskStore.getById(id).then(function (element) {
                // Replace the complete or text field from the event
                if (target.className === 'item-text') {
                    element.text = target.value.trim();
                } else if (target.className === 'item-complete') {
                    element.complete = target.checked;
                }
                // Update the record with the new information
                return taskStore.update(element);
            }).then(function (element) {
                refreshTaskList();
            });
            event.preventDefault();
        }
    });
});

},{"./lib/device-manager":5,"./lib/storage-manager":6}],5:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _events = require('events');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * A class for handling all the event handling for Apache Cordova
 * @extends EventEmitter
 */

var DeviceManager = (function (_EventEmitter) {
  _inherits(DeviceManager, _EventEmitter);

  /**
   * Create  new DeviceManager instance
   */

  function DeviceManager() {
    _classCallCheck(this, DeviceManager);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(DeviceManager).call(this));

    document.addEventListener('deviceready', _this.onDeviceReady.bind(_this), false);
    return _this;
  }

  /**
   * Handle the deviceready event
   * @see http://cordova.apache.org/docs/en/5.4.0/cordova/events/events.deviceready.html
   * @emits {deviceready} a deviceready event
   * @param {Event} the deviceready event object
   */

  _createClass(DeviceManager, [{
    key: 'onDeviceReady',
    value: function onDeviceReady(e) {
      console.debug('[DeviceManager#onDeviceReady] event = ', e);

      this.emit('deviceready', e);
    }
  }]);

  return DeviceManager;
})(_events.EventEmitter);

exports.default = DeviceManager;

},{"events":1}],6:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Store = (function () {
    function Store() {
        _classCallCheck(this, Store);

        console.info('Initializing Storage Manager');

        this._data = [{ id: _uuid2.default.v1(), text: 'Item 1', complete: false }, { id: _uuid2.default.v1(), text: 'Item 2', complete: false }];
    }

    /**
     * Read some records based on the query.  The elements must match
     * the query
     * @method read
     * @param {object} query the things to match
     * @return {Promise} - resolve(items), reject(error)
     */

    _createClass(Store, [{
        key: 'read',
        value: function read(query) {
            var _this = this;

            console.log('[storage-manager] read query=', query);
            var promise = new Promise(function (resolve, reject) {
                var filteredData = _this._data.filter(function (element, index, array) {
                    for (var q in query) {
                        if (query[q] !== element[q]) {
                            return false;
                        }
                    }
                    return true;
                });
                resolve(filteredData);
            });

            return promise;
        }

        /**
         * Insert a new object into the database.
         * @method insert
         * @param {object} data the data to insert
         * @return {Promise} - resolve(newitem), reject(error)
         */

    }, {
        key: 'insert',
        value: function insert(data) {
            var _this2 = this;

            data.id = _uuid2.default.v1();
            console.log('[storage-manager] insert data=', data);
            var promise = new Promise(function (resolve, reject) {
                // This promise always resolves
                _this2._data.push(data);
                resolve(data);
            });

            return promise;
        }

        /**
         * Fetches a record by ID
         * @method get
         * @param {string} id the ID to retrieve
         * @return {Promise} - resolve(item), reject(error)
         */

    }, {
        key: 'getById',
        value: function getById(id) {
            var _this3 = this;

            console.log('[storage-manager] get id=', id);
            var promise = new Promise(function (resolve, reject) {
                _this3._data.forEach(function (element) {
                    if (element.id === id) {
                        resolve(element);
                    }
                });
                reject(new Error('Cannot find ID: ' + id));
            });
            return promise;
        }

        /**
         * Update a record
         * @method update
         * @param {Object} data the object to update
         * @return {Promise} - resolve(item), reject(error)
         */

    }, {
        key: 'update',
        value: function update(data) {
            var _this4 = this;

            console.log('[storage-manager] update data=', data);
            var promise = new Promise(function (resolve, reject) {
                for (var i = 0; i < _this4._data.length; i++) {
                    if (_this4._data[i].id === data.id) {
                        _this4._data[i] = data;
                        resolve(data);
                    }
                }
                reject(new Error('Cannot find ID: ' + data[id]));
            });
            return promise;
        }
    }]);

    return Store;
})();

exports.default = Store;
;

},{"uuid":3}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL3JuZy1icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL3V1aWQvdXVpZC5qcyIsInNyY1xcanNcXGluZGV4LmpzIiwic3JjXFxqc1xcbGliXFxkZXZpY2UtbWFuYWdlci5qcyIsInNyY1xcanNcXGxpYlxcc3RvcmFnZS1tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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LEVBQUU7QUFDOUIsK0JBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUNyQiwrQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNqQjtpQkFDSjtBQUNELHNCQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNwRCxDQUFDLENBQUM7QUFDSCxtQkFBTyxPQUFPLENBQUM7U0FDbEI7OztXQXpGZ0IsS0FBSzs7O2tCQUFMLEtBQUs7QUEwRnpCLENBQUMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmICh0aGlzLl9ldmVudHMpIHtcbiAgICB2YXIgZXZsaXN0ZW5lciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGV2bGlzdGVuZXIpKVxuICAgICAgcmV0dXJuIDE7XG4gICAgZWxzZSBpZiAoZXZsaXN0ZW5lcilcbiAgICAgIHJldHVybiBldmxpc3RlbmVyLmxlbmd0aDtcbiAgfVxuICByZXR1cm4gMDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICByZXR1cm4gZW1pdHRlci5saXN0ZW5lckNvdW50KHR5cGUpO1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiXG52YXIgcm5nO1xuXG5pZiAoZ2xvYmFsLmNyeXB0byAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKSB7XG4gIC8vIFdIQVRXRyBjcnlwdG8tYmFzZWQgUk5HIC0gaHR0cDovL3dpa2kud2hhdHdnLm9yZy93aWtpL0NyeXB0b1xuICAvLyBNb2RlcmF0ZWx5IGZhc3QsIGhpZ2ggcXVhbGl0eVxuICB2YXIgX3JuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpO1xuICBybmcgPSBmdW5jdGlvbiB3aGF0d2dSTkcoKSB7XG4gICAgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhfcm5kczgpO1xuICAgIHJldHVybiBfcm5kczg7XG4gIH07XG59XG5cbmlmICghcm5nKSB7XG4gIC8vIE1hdGgucmFuZG9tKCktYmFzZWQgKFJORylcbiAgLy9cbiAgLy8gSWYgYWxsIGVsc2UgZmFpbHMsIHVzZSBNYXRoLnJhbmRvbSgpLiAgSXQncyBmYXN0LCBidXQgaXMgb2YgdW5zcGVjaWZpZWRcbiAgLy8gcXVhbGl0eS5cbiAgdmFyICBfcm5kcyA9IG5ldyBBcnJheSgxNik7XG4gIHJuZyA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgMTY7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBfcm5kc1tpXSA9IHIgPj4+ICgoaSAmIDB4MDMpIDw8IDMpICYgMHhmZjtcbiAgICB9XG5cbiAgICByZXR1cm4gX3JuZHM7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcm5nO1xuXG4iLCIvLyAgICAgdXVpZC5qc1xuLy9cbi8vICAgICBDb3B5cmlnaHQgKGMpIDIwMTAtMjAxMiBSb2JlcnQgS2llZmZlclxuLy8gICAgIE1JVCBMaWNlbnNlIC0gaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuXG4vLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgV2UgZmVhdHVyZVxuLy8gZGV0ZWN0IHRvIGRldGVybWluZSB0aGUgYmVzdCBSTkcgc291cmNlLCBub3JtYWxpemluZyB0byBhIGZ1bmN0aW9uIHRoYXRcbi8vIHJldHVybnMgMTI4LWJpdHMgb2YgcmFuZG9tbmVzcywgc2luY2UgdGhhdCdzIHdoYXQncyB1c3VhbGx5IHJlcXVpcmVkXG52YXIgX3JuZyA9IHJlcXVpcmUoJy4vcm5nJyk7XG5cbi8vIE1hcHMgZm9yIG51bWJlciA8LT4gaGV4IHN0cmluZyBjb252ZXJzaW9uXG52YXIgX2J5dGVUb0hleCA9IFtdO1xudmFyIF9oZXhUb0J5dGUgPSB7fTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgX2J5dGVUb0hleFtpXSA9IChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG4gIF9oZXhUb0J5dGVbX2J5dGVUb0hleFtpXV0gPSBpO1xufVxuXG4vLyAqKmBwYXJzZSgpYCAtIFBhcnNlIGEgVVVJRCBpbnRvIGl0J3MgY29tcG9uZW50IGJ5dGVzKipcbmZ1bmN0aW9uIHBhcnNlKHMsIGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gKGJ1ZiAmJiBvZmZzZXQpIHx8IDAsIGlpID0gMDtcblxuICBidWYgPSBidWYgfHwgW107XG4gIHMudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bMC05YS1mXXsyfS9nLCBmdW5jdGlvbihvY3QpIHtcbiAgICBpZiAoaWkgPCAxNikgeyAvLyBEb24ndCBvdmVyZmxvdyFcbiAgICAgIGJ1ZltpICsgaWkrK10gPSBfaGV4VG9CeXRlW29jdF07XG4gICAgfVxuICB9KTtcblxuICAvLyBaZXJvIG91dCByZW1haW5pbmcgYnl0ZXMgaWYgc3RyaW5nIHdhcyBzaG9ydFxuICB3aGlsZSAoaWkgPCAxNikge1xuICAgIGJ1ZltpICsgaWkrK10gPSAwO1xuICB9XG5cbiAgcmV0dXJuIGJ1Zjtcbn1cblxuLy8gKipgdW5wYXJzZSgpYCAtIENvbnZlcnQgVVVJRCBieXRlIGFycmF5IChhbGEgcGFyc2UoKSkgaW50byBhIHN0cmluZyoqXG5mdW5jdGlvbiB1bnBhcnNlKGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gb2Zmc2V0IHx8IDAsIGJ0aCA9IF9ieXRlVG9IZXg7XG4gIHJldHVybiAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dO1xufVxuXG4vLyAqKmB2MSgpYCAtIEdlbmVyYXRlIHRpbWUtYmFzZWQgVVVJRCoqXG4vL1xuLy8gSW5zcGlyZWQgYnkgaHR0cHM6Ly9naXRodWIuY29tL0xpb3NLL1VVSUQuanNcbi8vIGFuZCBodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvdXVpZC5odG1sXG5cbi8vIHJhbmRvbSAjJ3Mgd2UgbmVlZCB0byBpbml0IG5vZGUgYW5kIGNsb2Nrc2VxXG52YXIgX3NlZWRCeXRlcyA9IF9ybmcoKTtcblxuLy8gUGVyIDQuNSwgY3JlYXRlIGFuZCA0OC1iaXQgbm9kZSBpZCwgKDQ3IHJhbmRvbSBiaXRzICsgbXVsdGljYXN0IGJpdCA9IDEpXG52YXIgX25vZGVJZCA9IFtcbiAgX3NlZWRCeXRlc1swXSB8IDB4MDEsXG4gIF9zZWVkQnl0ZXNbMV0sIF9zZWVkQnl0ZXNbMl0sIF9zZWVkQnl0ZXNbM10sIF9zZWVkQnl0ZXNbNF0sIF9zZWVkQnl0ZXNbNV1cbl07XG5cbi8vIFBlciA0LjIuMiwgcmFuZG9taXplICgxNCBiaXQpIGNsb2Nrc2VxXG52YXIgX2Nsb2Nrc2VxID0gKF9zZWVkQnl0ZXNbNl0gPDwgOCB8IF9zZWVkQnl0ZXNbN10pICYgMHgzZmZmO1xuXG4vLyBQcmV2aW91cyB1dWlkIGNyZWF0aW9uIHRpbWVcbnZhciBfbGFzdE1TZWNzID0gMCwgX2xhc3ROU2VjcyA9IDA7XG5cbi8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYnJvb2ZhL25vZGUtdXVpZCBmb3IgQVBJIGRldGFpbHNcbmZ1bmN0aW9uIHYxKG9wdGlvbnMsIGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gYnVmICYmIG9mZnNldCB8fCAwO1xuICB2YXIgYiA9IGJ1ZiB8fCBbXTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgY2xvY2tzZXEgPSBvcHRpb25zLmNsb2Nrc2VxICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmNsb2Nrc2VxIDogX2Nsb2Nrc2VxO1xuXG4gIC8vIFVVSUQgdGltZXN0YW1wcyBhcmUgMTAwIG5hbm8tc2Vjb25kIHVuaXRzIHNpbmNlIHRoZSBHcmVnb3JpYW4gZXBvY2gsXG4gIC8vICgxNTgyLTEwLTE1IDAwOjAwKS4gIEpTTnVtYmVycyBhcmVuJ3QgcHJlY2lzZSBlbm91Z2ggZm9yIHRoaXMsIHNvXG4gIC8vIHRpbWUgaXMgaGFuZGxlZCBpbnRlcm5hbGx5IGFzICdtc2VjcycgKGludGVnZXIgbWlsbGlzZWNvbmRzKSBhbmQgJ25zZWNzJ1xuICAvLyAoMTAwLW5hbm9zZWNvbmRzIG9mZnNldCBmcm9tIG1zZWNzKSBzaW5jZSB1bml4IGVwb2NoLCAxOTcwLTAxLTAxIDAwOjAwLlxuICB2YXIgbXNlY3MgPSBvcHRpb25zLm1zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm1zZWNzIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIHVzZSBjb3VudCBvZiB1dWlkJ3MgZ2VuZXJhdGVkIGR1cmluZyB0aGUgY3VycmVudCBjbG9ja1xuICAvLyBjeWNsZSB0byBzaW11bGF0ZSBoaWdoZXIgcmVzb2x1dGlvbiBjbG9ja1xuICB2YXIgbnNlY3MgPSBvcHRpb25zLm5zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zZWNzIDogX2xhc3ROU2VjcyArIDE7XG5cbiAgLy8gVGltZSBzaW5jZSBsYXN0IHV1aWQgY3JlYXRpb24gKGluIG1zZWNzKVxuICB2YXIgZHQgPSAobXNlY3MgLSBfbGFzdE1TZWNzKSArIChuc2VjcyAtIF9sYXN0TlNlY3MpLzEwMDAwO1xuXG4gIC8vIFBlciA0LjIuMS4yLCBCdW1wIGNsb2Nrc2VxIG9uIGNsb2NrIHJlZ3Jlc3Npb25cbiAgaWYgKGR0IDwgMCAmJiBvcHRpb25zLmNsb2Nrc2VxID09PSB1bmRlZmluZWQpIHtcbiAgICBjbG9ja3NlcSA9IGNsb2Nrc2VxICsgMSAmIDB4M2ZmZjtcbiAgfVxuXG4gIC8vIFJlc2V0IG5zZWNzIGlmIGNsb2NrIHJlZ3Jlc3NlcyAobmV3IGNsb2Nrc2VxKSBvciB3ZSd2ZSBtb3ZlZCBvbnRvIGEgbmV3XG4gIC8vIHRpbWUgaW50ZXJ2YWxcbiAgaWYgKChkdCA8IDAgfHwgbXNlY3MgPiBfbGFzdE1TZWNzKSAmJiBvcHRpb25zLm5zZWNzID09PSB1bmRlZmluZWQpIHtcbiAgICBuc2VjcyA9IDA7XG4gIH1cblxuICAvLyBQZXIgNC4yLjEuMiBUaHJvdyBlcnJvciBpZiB0b28gbWFueSB1dWlkcyBhcmUgcmVxdWVzdGVkXG4gIGlmIChuc2VjcyA+PSAxMDAwMCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXVpZC52MSgpOiBDYW5cXCd0IGNyZWF0ZSBtb3JlIHRoYW4gMTBNIHV1aWRzL3NlYycpO1xuICB9XG5cbiAgX2xhc3RNU2VjcyA9IG1zZWNzO1xuICBfbGFzdE5TZWNzID0gbnNlY3M7XG4gIF9jbG9ja3NlcSA9IGNsb2Nrc2VxO1xuXG4gIC8vIFBlciA0LjEuNCAtIENvbnZlcnQgZnJvbSB1bml4IGVwb2NoIHRvIEdyZWdvcmlhbiBlcG9jaFxuICBtc2VjcyArPSAxMjIxOTI5MjgwMDAwMDtcblxuICAvLyBgdGltZV9sb3dgXG4gIHZhciB0bCA9ICgobXNlY3MgJiAweGZmZmZmZmYpICogMTAwMDAgKyBuc2VjcykgJSAweDEwMDAwMDAwMDtcbiAgYltpKytdID0gdGwgPj4+IDI0ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDE2ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfbWlkYFxuICB2YXIgdG1oID0gKG1zZWNzIC8gMHgxMDAwMDAwMDAgKiAxMDAwMCkgJiAweGZmZmZmZmY7XG4gIGJbaSsrXSA9IHRtaCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRtaCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfaGlnaF9hbmRfdmVyc2lvbmBcbiAgYltpKytdID0gdG1oID4+PiAyNCAmIDB4ZiB8IDB4MTA7IC8vIGluY2x1ZGUgdmVyc2lvblxuICBiW2krK10gPSB0bWggPj4+IDE2ICYgMHhmZjtcblxuICAvLyBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGAgKFBlciA0LjIuMiAtIGluY2x1ZGUgdmFyaWFudClcbiAgYltpKytdID0gY2xvY2tzZXEgPj4+IDggfCAweDgwO1xuXG4gIC8vIGBjbG9ja19zZXFfbG93YFxuICBiW2krK10gPSBjbG9ja3NlcSAmIDB4ZmY7XG5cbiAgLy8gYG5vZGVgXG4gIHZhciBub2RlID0gb3B0aW9ucy5ub2RlIHx8IF9ub2RlSWQ7XG4gIGZvciAodmFyIG4gPSAwOyBuIDwgNjsgbisrKSB7XG4gICAgYltpICsgbl0gPSBub2RlW25dO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZiA/IGJ1ZiA6IHVucGFyc2UoYik7XG59XG5cbi8vICoqYHY0KClgIC0gR2VuZXJhdGUgcmFuZG9tIFVVSUQqKlxuXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2Jyb29mYS9ub2RlLXV1aWQgZm9yIEFQSSBkZXRhaWxzXG5mdW5jdGlvbiB2NChvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICAvLyBEZXByZWNhdGVkIC0gJ2Zvcm1hdCcgYXJndW1lbnQsIGFzIHN1cHBvcnRlZCBpbiB2MS4yXG4gIHZhciBpID0gYnVmICYmIG9mZnNldCB8fCAwO1xuXG4gIGlmICh0eXBlb2Yob3B0aW9ucykgPT0gJ3N0cmluZycpIHtcbiAgICBidWYgPSBvcHRpb25zID09ICdiaW5hcnknID8gbmV3IEFycmF5KDE2KSA6IG51bGw7XG4gICAgb3B0aW9ucyA9IG51bGw7XG4gIH1cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIHJuZHMgPSBvcHRpb25zLnJhbmRvbSB8fCAob3B0aW9ucy5ybmcgfHwgX3JuZykoKTtcblxuICAvLyBQZXIgNC40LCBzZXQgYml0cyBmb3IgdmVyc2lvbiBhbmQgYGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWRgXG4gIHJuZHNbNl0gPSAocm5kc1s2XSAmIDB4MGYpIHwgMHg0MDtcbiAgcm5kc1s4XSA9IChybmRzWzhdICYgMHgzZikgfCAweDgwO1xuXG4gIC8vIENvcHkgYnl0ZXMgdG8gYnVmZmVyLCBpZiBwcm92aWRlZFxuICBpZiAoYnVmKSB7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IDE2OyBpaSsrKSB7XG4gICAgICBidWZbaSArIGlpXSA9IHJuZHNbaWldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWYgfHwgdW5wYXJzZShybmRzKTtcbn1cblxuLy8gRXhwb3J0IHB1YmxpYyBBUElcbnZhciB1dWlkID0gdjQ7XG51dWlkLnYxID0gdjE7XG51dWlkLnY0ID0gdjQ7XG51dWlkLnBhcnNlID0gcGFyc2U7XG51dWlkLnVucGFyc2UgPSB1bnBhcnNlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV1aWQ7XG4iLCJpbXBvcnQgRGV2aWNlTWFuYWdlciBmcm9tICcuL2xpYi9kZXZpY2UtbWFuYWdlcic7XHJcbmltcG9ydCBTdG9yZSBmcm9tICcuL2xpYi9zdG9yYWdlLW1hbmFnZXInO1xyXG5cclxudmFyIGFwcCA9IG5ldyBEZXZpY2VNYW5hZ2VyKCk7XHJcblxyXG4vKipcclxuICogRmluZCB0aGUgcGFyZW50IG5vZGUgb2YgYSBnaXZlbiBuYW1lXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSBuYW1lIHdlIGFyZSBzZWFyY2hpbmcgZm9yXHJcbiAqIEBwYXJhbSB7Tm9kZX0gZWwgdGhlIGN1cnJlbnQgZWxcclxuICovXHJcbmZ1bmN0aW9uIGZpbmRQYXJlbnROb2RlKG5hbWUsIGVsKSB7XHJcbiAgIGlmIChlbC5sb2NhbE5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2JvZHknKSB7XHJcbiAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICB9IFxyXG4gICBpZiAoZWwubG9jYWxOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5hbWUpIHtcclxuICAgICAgIHJldHVybiBlbDtcclxuICAgfVxyXG4gICByZXR1cm4gZmluZFBhcmVudE5vZGUobmFtZSwgZWwucGFyZW50Tm9kZSk7XHJcbn1cclxuXHJcbmFwcC5vbignZGV2aWNlcmVhZHknLCBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgdGFza1N0b3JlID0gbmV3IFN0b3JlKCk7XHJcbiAgICBcclxuICAgIC8vIEdldCB0aGUgdmFyaW91cyBwaWVjZXMgb2YgdGhlIFVYIHNvIHRoZXkgY2FuIGJlIHJlZmVycmVkIHRvIGxhdGVyXHJcbiAgICB2YXIgZWwgPSB7XHJcbiAgICAgICAgdG9kb2l0ZW1zOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdG9kby1pdGVtcycpLFxyXG4gICAgICAgIHN1bW1hcnk6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzdW1tYXJ5JyksXHJcbiAgICAgICAgcmVmcmVzaGljb246IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZWZyZXNoLWljb24nKSxcclxuICAgICAgICBhZGRuZXd0YXNrOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjYWRkLW5ldy10YXNrJyksXHJcbiAgICAgICAgbmV3aXRlbXRleHRib3g6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNuZXctaXRlbS10ZXh0JylcclxuICAgIH07XHJcbiAgICBcclxuICAgIGZ1bmN0aW9uIHNldFJlZnJlc2hJY29uKGxvYWRpbmcpIHtcclxuICAgICAgICBpZiAobG9hZGluZykge1xyXG4gICAgICAgICAgICBlbC5yZWZyZXNoaWNvbi5jbGFzc05hbWUgPSAnZmEgZmEtcmVmcmVzaCBmYS1zcGluJztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBlbC5yZWZyZXNoaWNvbi5jbGFzc05hbWUgPSAnZmEgZmEtcmVmcmVzaCc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gVGhpcyBpcyBjYWxsZWQgd2hlbmV2ZXIgd2Ugd2FudCB0byByZWZyZXNoIHRoZSBjb250ZW50cyBmcm9tIHRoZSBkYXRhYmFzZVxyXG4gICAgZnVuY3Rpb24gcmVmcmVzaFRhc2tMaXN0KCkge1xyXG4gICAgICAgIHNldFJlZnJlc2hJY29uKHRydWUpO1xyXG5cclxuICAgICAgICB0YXNrU3RvcmUucmVhZCh7IGNvbXBsZXRlOiBmYWxzZSB9KS50aGVuKCh0b2RvSXRlbXMpID0+IHtcclxuICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcclxuICAgICAgICAgICAgZWwudG9kb2l0ZW1zLmlubmVySFRNTCA9ICcnOyBcclxuICAgICAgICAgICAgdG9kb0l0ZW1zLmZvckVhY2goKGVudHJ5LCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNoZWNrZWQgPSBlbnRyeS5jb21wbGV0ZSA/ICcgY2hlY2tlZD1cImNoZWNrZWRcIic6ICcnO1xyXG4gICAgICAgICAgICAgICAgbGV0IGVudHJ5dGV4dCA9IGVudHJ5LnRleHQucmVwbGFjZSgnXCInLCAnJnF1b3Q7Jyk7XHJcbiAgICAgICAgICAgICAgICBsZXQgaHRtbCA9IGA8bGkgZGF0YS10b2RvaXRlbS1pZD1cIiR7ZW50cnkuaWR9XCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNsYXNzPVwiaXRlbS1jb21wbGV0ZVwiJHtjaGVja2VkfT48ZGl2PjxpbnB1dCBjbGFzcz1cIml0ZW0tdGV4dFwiIHZhbHVlPVwiJHtlbnRyeXRleHR9XCI+PC9kaXY+PC9saT5gO1xyXG4gICAgICAgICAgICAgICAgZWwudG9kb2l0ZW1zLmlubmVySFRNTCArPSBodG1sO1xyXG4gICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgfSk7ICBcclxuICAgICAgICAgICAgZWwuc3VtbWFyeS5pbm5lckhUTUwgPSBgPHN0cm9uZz4ke2NvdW50fTwvc3Ryb25nPiBpdGVtKHMpYDsgIFxyXG4gICAgICAgICAgICBzZXRSZWZyZXNoSWNvbihmYWxzZSk7XHJcbiAgICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlYWRpbmcgdGFzayBzdG9yZTogJywgZXJyb3IpO1xyXG4gICAgICAgICAgICBlbC5zdW1tYXJ5LmlubmVySFRNTCA9ICc8c3Ryb25nPkVycm9yIHJlYWRpbmcgc3RvcmUuPC9zdHJvbmc+JztcclxuICAgICAgICAgICAgc2V0UmVmcmVzaEljb24oZmFsc2UpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBTZXQgdXAgdGhlIGV2ZW50IGhhbmRsZXIgZm9yIGNsaWNraW5nIG9uIFJlZnJlc2ggVGFza3NcclxuICAgIGVsLnJlZnJlc2hpY29uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVmcmVzaFRhc2tMaXN0KTtcclxuICAgIHJlZnJlc2hUYXNrTGlzdCgpO1xyXG4gICAgZWwubmV3aXRlbXRleHRib3guZm9jdXMoKTtcclxuICAgIFxyXG4gICAgLy8gU2V0IHVwIHRoZSBldmVudCBoYW5kbGVyIGZvciBjbGlja2luZyBvbiBBZGQgTmV3IFRhc2tcclxuICAgIGVsLmFkZG5ld3Rhc2suYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBsZXQgaXRlbVRleHQgPSBlbC5uZXdpdGVtdGV4dGJveC52YWx1ZTtcclxuICAgICAgICBpZiAoaXRlbVRleHQgIT09ICcnKSB7XHJcbiAgICAgICAgICAgIHRhc2tTdG9yZS5pbnNlcnQoeyB0ZXh0OiBpdGVtVGV4dCwgY29tcGxldGU6IGZhbHNlIH0pLnRoZW4ocmVmcmVzaFRhc2tMaXN0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWwubmV3aXRlbXRleHRib3gudmFsdWUgPSAnJztcclxuICAgICAgICBlbC5uZXdpdGVtdGV4dGJveC5mb2N1cygpO1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gU2V0IHVwIHRoZSBldmVudCBoYW5kbGVyIGZvciB1cGRhdGluZyBhIHRhc2tcclxuICAgIGVsLnRvZG9pdGVtcy5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICBsZXQgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xyXG4gICAgICAgIC8vIE9ubHkgaGFuZGxlIGNoYW5nZSBldmVudHMgb24gdGhlIGl0ZW0tdGV4dCBvciBpdGVtLWNvbXBsZXRlIGVsZW1lbnRzXHJcbiAgICAgICAgaWYgKHRhcmdldC5jbGFzc05hbWUgPT09ICdpdGVtLXRleHQnIHx8IHRhcmdldC5jbGFzc05hbWUgPT09ICdpdGVtLWNvbXBsZXRlJykge1xyXG4gICAgICAgICAgICAvLyBHZXQgdGhlIExJIG5vZGUgYWJvdmUgdGhlIGN1cnJlbnQgbm9kZVxyXG4gICAgICAgICAgICBsZXQgbGkgPSBmaW5kUGFyZW50Tm9kZSgnbGknLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICBpZiAoIWxpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ291bGQgbm90IGZpbmQgTEkgLSBicmVhaycpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFRoZSBJRCBpcyB0aGUgZGF0YS10b2RvaXRlbS1pZCBhdHRyaWJ1dGUgdmFsdWVcclxuICAgICAgICAgICAgbGV0IGlkID0gbGkuZ2V0QXR0cmlidXRlKCdkYXRhLXRvZG9pdGVtLWlkJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBQdWxsIHRoZSBvcmlnaW5hbCByZWNvcmRcclxuICAgICAgICAgICAgdGFza1N0b3JlLmdldEJ5SWQoaWQpLnRoZW4oKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgdGhlIGNvbXBsZXRlIG9yIHRleHQgZmllbGQgZnJvbSB0aGUgZXZlbnRcclxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuY2xhc3NOYW1lID09PSAnaXRlbS10ZXh0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudGV4dCA9IHRhcmdldC52YWx1ZS50cmltKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhcmdldC5jbGFzc05hbWUgPT09ICdpdGVtLWNvbXBsZXRlJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY29tcGxldGUgPSB0YXJnZXQuY2hlY2tlZDtcclxuICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIHJlY29yZCB3aXRoIHRoZSBuZXcgaW5mb3JtYXRpb25cclxuICAgICAgICAgICAgICAgIHJldHVybiB0YXNrU3RvcmUudXBkYXRlKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGhlbigoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVmcmVzaFRhc2tMaXN0KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59KTtcclxuIiwiaW1wb3J0IHtFdmVudEVtaXR0ZXJ9IGZyb20gJ2V2ZW50cyc7XHJcblxyXG4vKipcclxuICogQSBjbGFzcyBmb3IgaGFuZGxpbmcgYWxsIHRoZSBldmVudCBoYW5kbGluZyBmb3IgQXBhY2hlIENvcmRvdmFcclxuICogQGV4dGVuZHMgRXZlbnRFbWl0dGVyXHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEZXZpY2VNYW5hZ2VyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcclxuICAvKipcclxuICAgKiBDcmVhdGUgIG5ldyBEZXZpY2VNYW5hZ2VyIGluc3RhbmNlXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICBzdXBlcigpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlcmVhZHknLCB0aGlzLm9uRGV2aWNlUmVhZHkuYmluZCh0aGlzKSwgZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGFuZGxlIHRoZSBkZXZpY2VyZWFkeSBldmVudFxyXG4gICAqIEBzZWUgaHR0cDovL2NvcmRvdmEuYXBhY2hlLm9yZy9kb2NzL2VuLzUuNC4wL2NvcmRvdmEvZXZlbnRzL2V2ZW50cy5kZXZpY2VyZWFkeS5odG1sXHJcbiAgICogQGVtaXRzIHtkZXZpY2VyZWFkeX0gYSBkZXZpY2VyZWFkeSBldmVudFxyXG4gICAqIEBwYXJhbSB7RXZlbnR9IHRoZSBkZXZpY2VyZWFkeSBldmVudCBvYmplY3RcclxuICAgKi9cclxuICBvbkRldmljZVJlYWR5KGUpIHtcclxuICAgIGNvbnNvbGUuZGVidWcoJ1tEZXZpY2VNYW5hZ2VyI29uRGV2aWNlUmVhZHldIGV2ZW50ID0gJywgZSk7XHJcblxyXG4gICAgdGhpcy5lbWl0KCdkZXZpY2VyZWFkeScsIGUpO1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgdXVpZCBmcm9tICd1dWlkJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0b3JlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIGNvbnNvbGUuaW5mbygnSW5pdGlhbGl6aW5nIFN0b3JhZ2UgTWFuYWdlcicpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuX2RhdGEgPSBbXHJcbiAgICAgICAgICAgIHsgaWQ6IHV1aWQudjEoKSwgdGV4dDogJ0l0ZW0gMScsIGNvbXBsZXRlOiBmYWxzZSB9LFxyXG4gICAgICAgICAgICB7IGlkOiB1dWlkLnYxKCksIHRleHQ6ICdJdGVtIDInLCBjb21wbGV0ZTogZmFsc2UgfVxyXG4gICAgICAgIF07XHJcbiAgICB9IFxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgc29tZSByZWNvcmRzIGJhc2VkIG9uIHRoZSBxdWVyeS4gIFRoZSBlbGVtZW50cyBtdXN0IG1hdGNoXHJcbiAgICAgKiB0aGUgcXVlcnlcclxuICAgICAqIEBtZXRob2QgcmVhZFxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHF1ZXJ5IHRoZSB0aGluZ3MgdG8gbWF0Y2hcclxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IC0gcmVzb2x2ZShpdGVtcyksIHJlamVjdChlcnJvcilcclxuICAgICAqL1xyXG4gICAgcmVhZChxdWVyeSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbc3RvcmFnZS1tYW5hZ2VyXSByZWFkIHF1ZXJ5PScsIHF1ZXJ5KTtcclxuICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgdmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuX2RhdGEuZmlsdGVyKChlbGVtZW50LCBpbmRleCwgYXJyYXkpID0+IHtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IHEgaW4gcXVlcnkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocXVlcnlbcV0gIT09IGVsZW1lbnRbcV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmVzb2x2ZShmaWx0ZXJlZERhdGEpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgfSAgXHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogSW5zZXJ0IGEgbmV3IG9iamVjdCBpbnRvIHRoZSBkYXRhYmFzZS5cclxuICAgICAqIEBtZXRob2QgaW5zZXJ0XHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSB0aGUgZGF0YSB0byBpbnNlcnRcclxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IC0gcmVzb2x2ZShuZXdpdGVtKSwgcmVqZWN0KGVycm9yKVxyXG4gICAgICovXHJcbiAgICBpbnNlcnQoZGF0YSkge1xyXG4gICAgICAgIGRhdGEuaWQgPSB1dWlkLnYxKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tzdG9yYWdlLW1hbmFnZXJdIGluc2VydCBkYXRhPScsIGRhdGEpO1xyXG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBUaGlzIHByb21pc2UgYWx3YXlzIHJlc29sdmVzXHJcbiAgICAgICAgICAgIHRoaXMuX2RhdGEucHVzaChkYXRhKTtcclxuICAgICAgICAgICAgcmVzb2x2ZShkYXRhKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgIH0gXHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogRmV0Y2hlcyBhIHJlY29yZCBieSBJRFxyXG4gICAgICogQG1ldGhvZCBnZXRcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCB0aGUgSUQgdG8gcmV0cmlldmVcclxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IC0gcmVzb2x2ZShpdGVtKSwgcmVqZWN0KGVycm9yKVxyXG4gICAgICovXHJcbiAgICBnZXRCeUlkKGlkKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tzdG9yYWdlLW1hbmFnZXJdIGdldCBpZD0nLCBpZCk7XHJcbiAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuX2RhdGEuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuaWQgPT09IGlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kIElEOiAnICsgaWQpKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBVcGRhdGUgYSByZWNvcmRcclxuICAgICAqIEBtZXRob2QgdXBkYXRlXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSB0aGUgb2JqZWN0IHRvIHVwZGF0ZVxyXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gLSByZXNvbHZlKGl0ZW0pLCByZWplY3QoZXJyb3IpXHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZShkYXRhKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tzdG9yYWdlLW1hbmFnZXJdIHVwZGF0ZSBkYXRhPScsIGRhdGEpO1xyXG4gICAgICAgIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCA7IGkgPCB0aGlzLl9kYXRhLmxlbmd0aCA7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2RhdGFbaV0uaWQgPT09IGRhdGEuaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9kYXRhW2ldID0gZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kIElEOiAnICsgZGF0YVtpZF0pKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgIH1cclxufTtcclxuIl19
