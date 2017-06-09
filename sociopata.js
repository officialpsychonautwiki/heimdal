/* CLOSURE COMPILER EXTERNS */

// mw.config.values..

/**
 * @constructor
 */
function MWConfig() {}

/**
 * @typedef {{
 *   wgUserName: (string|undefined),
 *   wgPageName: (string|undefined),
 * }}
 */
MWConfig.prototype.values;

/**
 * @constructor
 */
function MWBase() {}

/** @type {MWConfig} */
MWBase.prototype.config;

/** @type {MWBase} */
window.mw;

/**
 * @constructor
 */
function Countly() {}

/** @type (string|undefined) */
Countly.prototype.device_id;

/** @type {Countly} */
window.Countly;

class Heimdal {
    constructor () {
        this._constants = {
            endpoint: 'https://h.psychonautwiki.org/ingress',

            grace: 200,
            max: 15,
            storeName: '__hd_d'
        };

        this._internal = {
            _tt: 0,
            _retries: 0
        };

        this._plugins = [];
        this._eventHeap = [];

        this._clientId = this._getClientId();

        this._ensureListeners();
    }

    _ensureListeners () {
        window['addEventListener']('unload', () => {
            this._lastResortStrategies();
        }, false);
    }

    _getClientId () {
        let clientId;

        try {
            clientId = window['Countly']['device_id'];
        } catch (e) {}

        if (!clientId) {
            this._ingestError(new Error('Heimdal: Could not identify user'));
        }

        return clientId;
    }

    _ingestError (err) {
        if ('Raven' in window && 'captureException' in Raven) {
            /* send to sentry */
            Raven['captureException'](err);
        }
    }

    _ingestEvent (evt) {
        this._addEvent(evt);
        this._queueTelemetry();
    }

    _addEvent (evt) {
        let user = null;

        try {
            user = window['mw']['config']['values']['wgUserName'];
        } catch(err) { this._ingestError(err) }

        this._eventHeap.push(`${this._clientId};${Date.now()};${user};${evt}`);
        this._persistEventHeap();
    }

    _storageStrategy () {
        const ts = "301";

        try {
            window['sessionStorage']['_pcl'] = ts;

            if (ts === window['sessionStorage']['_pcl']) {
                window['sessionStorage']['removeItem']('_pcl');

                return 1;
            }
        } catch(e) {}

        try {
            window['localStorage']['_pcl'] = ts;

            if (ts === window['localStorage']['_pcl']) {
                window['localStorage']['removeItem']('_pcl');

                return 2;
            }
        } catch(e) {}
    }

    _lastResortStrategies () {

    }

    _obtainEventHeap () {
        let data;

        switch(this._storageStrategy()) {
            case 1:
                data = window['sessionStorage'][this._constants.storeName];
                break;
            case 2:
                data = window['localStorage'][this._constants.storeName];
                break;
        }

        try {
            this._eventHeap = window['JSON']['parse'](data);
        } catch(e) {}
    }

    _persistEventHeap () {
        const dump = window['JSON']['stringify'](this._eventHeap);

        switch(this._storageStrategy()) {
            case 1:
                window['sessionStorage'][this._constants.storeName] = dump;
                return;
            case 2:
                window['localStorage'][this._constants.storeName] = dump;
                return;
            default:
                this._ingestError(new Error('Heimdal: Could not identify storage strategy'));
        }
    }

    _resetEventHeap () {
        this._eventHeap = [];
        this._persistEventHeap();
    }

    _queueTelemetry () {
        clearTimeout(this._internal._tt);

        this._internal._tt = setTimeout(
            this._transferTelemetry.bind(this),
            (100 + (this._internal._retries * this._constants.grace))
        );
    }

    _requeueTelemetry () {
        this._internal._retries++;
        this._queueTelemetry();
    }

    _transferTelemetry () {
        try {
            const xhr = new window['XMLHttpRequest']();

            xhr['open']("POST", this._constants.endpoint, true);

            xhr['setRequestHeader']('Content-Type', 'application/json');

            xhr['onreadystatechange'] = () => {
                if (xhr.readyState == 4) {
                    if (xhr.status !== 200) {
                        return this._requeueTelemetry();
                    }

                    this._resetEventHeap();
                    this._internal._retries = 0;
                }
            };

            xhr['onerror'] = this._requeueTelemetry.bind(this);

            xhr['send'](window['JSON']['stringify'](this._eventHeap));
        } catch(e) {
            this._ingestError(e);
        }
    }

    use (ref, plugin) {
        this._plugins.push([ref, plugin]);
    }

    init () {
        this._obtainEventHeap();

        if (this._eventHeap.length) {
            this._queueTelemetry();
        }

        for (let i = 0; i < this._plugins.length; ++i) {
            try {
                this._plugins[i][1](this);
            } catch(err) {
                this._ingestError(new Error(`Heimdal: '${this._plugins[i][0]}' failed: ${err}`));
            }
        }
    }
}

let heimdal = new Heimdal();

heimdal.use('t', ctx => {
    ctx._ingestEvent(`t;${window['mw']['config']['values']['wgPageName']}`);
});

heimdal.use('a', ctx => {
    $('a').click(evt => {
        if (!evt['target'] || !evt['target']['href']) return;

        if (!evt['target']['href']['match'](/\#$/) && evt['target']['href']['match'](/\/wiki\/(.*?)$/)) {
            ctx._ingestEvent(`a;${window['mw']['config']['values']['wgPageName']};${evt['target']['href']['match'](/\/wiki\/(.*?)$/)[1]}`)
        }
    })
});

heimdal.init();