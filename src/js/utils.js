var profilerRecords = [];
var xpathEvalNum = 0,
    xpathEvalTime = 0,
    xpathEvalTimePure = 0;

/**
 * Little profiler
 * @param {string} taskName [description]
 * @constructor
 */

function Profiler( taskName ) {
    var start = new Date().getTime();
    /**
     * @param  {string=} message [description]
     */
    this.report = function( message ) {
        message = message || 'time taken for ' + taskName + ' to execute in milliseconds: ' + ( new Date().getTime() - start );
        //console.error(message);
        profilerRecords.push( message );
    };
}

var helper = new Helper();
/**
 * @constructor
 */

function Helper() {
    "use strict";
    this.setSettings = function() {
        var i, queryParam,
            settingsMap = [ {
                q: 'return',
                s: 'returnURL'
            }, {
                q: 'showbranch',
                s: 'showBranch'
            }, {
                q: 'debug',
                s: 'debug'
            }, {
                q: 'touch',
                s: 'touch'
            }, {
                q: 'server',
                s: 'serverURL'
            }, {
                q: 'form',
                s: 'formURL'
            }, {
                q: 'id',
                s: 'formId'
            }, {
                q: 'formName',
                s: 'formId'
            }, {
                q: 'instanceId',
                s: 'instanceId'
            }, {
                q: 'entityId',
                s: 'entityId'
            } ];
        for ( i = 0; i < settingsMap.length; i++ ) {
            queryParam = this.getQueryParam( settingsMap[ i ].q );
            //a query variable has preference
            settings[ settingsMap[ i ].s ] = ( queryParam !== null ) ?
                queryParam : ( typeof settings[ settingsMap[ i ].s ] !== 'undefined' ) ? settings[ settingsMap[ i ].s ] : null;
        }
    };
    this.getQueryParam = function( param ) {
        var allParams = this.getAllQueryParams();
        for ( var paramName in allParams ) {
            if ( paramName.toLowerCase() === param.toLowerCase() ) {
                return allParams[ paramName ];
            }
        }
        return null;
    };
    this.getAllQueryParams = function() {
        var val, processedVal,
            query = window.location.search.substring( 1 ),
            vars = query.split( "&" ),
            params = {};
        for ( var i = 0; i < vars.length; i++ ) {
            var pair = vars[ i ].split( "=" );
            if ( pair[ 0 ].length > 0 ) {
                val = decodeURIComponent( pair[ 1 ] );
                processedVal = ( val === 'true' ) ? true : ( val === 'false' ) ? false : val;
                params[ pair[ 0 ] ] = processedVal;
            }
        }
        return params;
    };
}

window.onload = function() {
    setTimeout( function() {
        var loadLog, t, loadingTime, exLog, timingO = {};
        if ( window.performance ) {
            t = window.performance.timing;
            loadingTime = t.loadEventEnd - t.responseEnd;
            if ( typeof settings !== 'undefined' && settings.debug ) {
                exLog = /**@type {string} */ window.localStorage.getItem( '__loadLog' );
                loadLog = ( exLog ) ? JSON.parse( exLog ) : [];
                loadLog.push( loadingTime );
                if ( loadLog.length > 10 ) {
                    loadLog.shift();
                }
                window.localStorage.setItem( '__loadLog', JSON.stringify( loadLog ) );
            }
            profilerRecords.push( 'total loading time: ' + loadingTime + ' milliseconds' );
            //$('.enketo-power').append('<p style="font-size: 0.7em;">(total load: '+loadingTime+' msec, XPath: '+xpathEvalTime+' msec)</p>');
            //FF doesn't allow stringifying native window objects so we create a copy first
            for ( var prop in window.performance.timing ) {
                timingO[ prop ] = window.performance.timing[ prop ];
            }
            if ( window.opener && window.performance && window.postMessage ) window.opener.postMessage( JSON.stringify( timingO ), '*' );
            $( profilerRecords ).each( function( i, v ) {
                console.log( v );
            } );
        }
    }, 0 );
};
