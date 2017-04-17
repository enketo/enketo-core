'use strict';

var $ = require( 'jquery' );

/*
 * Preloader module.
 * 
 * Note that preloaders may be deprecated in the future. This code is already prepared for a change 
 * by using a (secret) "session" instance.
 *
 * Functions are designed to fail silently if unknown preloaders are called.
 */
module.exports = {
    init: function() {
        var item;
        var param;
        var curVal;
        var newVal;
        var dataNode;
        var props;
        var $preload;
        var that = this;

        if ( !this.form ) {
            throw new Error( 'Preload module not correctly instantiated with form property.' );
        }

        //these initialize actual preload items
        this.form.view.$.find( 'input[data-preload], select[data-preload], textarea[data-preload]' ).each( function() {
            $preload = $( this );
            props = that.form.input.getProps( $preload );
            item = $preload.attr( 'data-preload' ).toLowerCase();
            param = $preload.attr( 'data-preload-params' ).toLowerCase();

            if ( typeof that[ item ] !== 'undefined' ) {
                dataNode = that.form.model.node( props.path, props.index );
                curVal = dataNode.getVal()[ 0 ];
                newVal = that[ item ]( {
                    param: param,
                    curVal: curVal,
                    dataNode: dataNode
                } );

                dataNode.setVal( newVal, null, props.xmlType );
            } else {
                console.log( 'Preload "' + item + '" not supported. May or may not be a big deal.' );
            }
        } );
    },
    'timestamp': function( o ) {
        var value;
        var that = this;
        // when is 'start' or 'end'
        if ( o.param === 'start' ) {
            return ( o.curVal.length > 0 ) ? o.curVal : this.form.model.evaluate( 'now()', 'string' );
        }
        if ( o.param === 'end' ) {
            //set event handler for each save event (needs to be triggered!)
            this.form.view.$.on( 'beforesave', function() {
                value = that.form.model.evaluate( 'now()', 'string' );
                o.dataNode.setVal( value, null, 'datetime' );
            } );
            //TODO: why populate this upon load?
            return this.form.model.evaluate( 'now()', 'string' );
        }
        return 'error - unknown timestamp parameter';
    },
    'date': function( o ) {
        var today;
        var year;
        var month;
        var day;

        if ( o.curVal.length === 0 ) {
            today = new Date( this.form.model.evaluate( 'today()', 'string' ) );
            year = today.getFullYear().toString().pad( 4 );
            month = ( today.getMonth() + 1 ).toString().pad( 2 );
            day = today.getDate().toString().pad( 2 );

            return year + '-' + month + '-' + day;
        }
        return o.curVal;
    },
    'property': function( o ) {
        var node;

        // 'deviceid', 'subscriberid', 'simserial', 'phonenumber'
        if ( o.curVal.length === 0 ) {
            node = this.form.model.node( 'instance("__session")/session/context/' + o.param );
            if ( node.get().length ) {
                return node.getVal()[ 0 ];
            } else {
                return 'no ' + o.param + ' property in enketo';
            }
        }
        return o.curVal;
    },
    'context': function( o ) {
        // 'application', 'user'??
        if ( o.curVal.length === 0 ) {
            return ( o.param === 'application' ) ? 'enketo' : o.param + ' not supported in enketo';
        }
        return o.curVal;
    },
    'patient': function( o ) {
        if ( o.curVal.length === 0 ) {
            return 'patient preload item not supported in enketo';
        }
        return o.curVal;
    },
    'user': function( o ) {
        if ( o.curVal.length === 0 ) {
            return 'user preload item not supported in enketo yet';
        }
        return o.curVal;
    },
    'uid': function( o ) {
        if ( o.curVal.length === 0 ) {
            return this.form.model.evaluate( 'concat("uuid:", uuid())', 'string' );
        }
        return o.curVal;
    }
};
