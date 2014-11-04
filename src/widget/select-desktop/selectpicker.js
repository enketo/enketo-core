/**
 * @preserve Copyright 2012 Silvio Moreto, Martijn van de Rijdt & Modilabs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( [ 'jquery', 'enketo-js/Widget' ], function( $, Widget ) {
    "use strict";

    var pluginName = 'desktopSelectpicker';

    /**
     * Bootstrap Select picker that supports single and multiple selects
     * A port of https://github.com/silviomoreto/bootstrap-select
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, btnStyle: string, noneSelectedText: string, maxlength:number})} options options
     * @param {*=} e     event
     */

    function DesktopSelectpicker( element, options, e ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        if ( e ) {
            e.stopPropagation();
            e.preventDefault();
        }

        this.$picker = null;
        this.noneSelectedText = options.noneSelectedText || 'none selected';
        this.lengthmax = options.maxlength || 15;
        this.multiple = ( typeof $( element ).attr( 'multiple' ) !== 'undefined' && $( element ).attr( 'multiple' ) !== false );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    DesktopSelectpicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    DesktopSelectpicker.prototype.constructor = DesktopSelectpicker;

    DesktopSelectpicker.prototype._init = function() {
        var $template = this._getTemplate(),
            $select = $( this.element );
        $select.css( 'display', 'none' );
        $template = this._createLi( $template );
        this.$picker = $template.insertAfter( $select );
        this.$picker.find( '> a' ).addClass( this.selectClass );
        this._clickListener();
        this._focusListener();
    };

    DesktopSelectpicker.prototype._getTemplate = function() {
        var template =
            '<div class="btn-group bootstrap-select widget clearfix">' +
            '<button type="button" class="btn btn-default dropdown-toggle clearfix" data-toggle="dropdown">' +
            '<span class="selected">__SELECTED_OPTIONS</span><span class="caret"></span>' +
            '</button>' +
            '<ul class="dropdown-menu" role="menu">' +
            '__ADD_LI' +
            '</ul>' +
            '</div>';

        return template;
    };

    DesktopSelectpicker.prototype._createLi = function( template ) {

        var li = [];
        var liHtml = '';
        var inputAttr = ( this.multiple ) ? "type='checkbox'" : "type='radio' name='" + Math.random() * 100000 + "'";
        var _this = this;
        var checkedInputAttr,
            checkedLiAttr;

        $( this.element ).find( 'option' ).each( function() {
            li.push( {
                label: $( this ).text(),
                selected: $( this ).is( ':selected' ),
                value: $( this ).attr( 'value' )
            } );
        } );

        if ( li.length > 0 ) {
            template = template.replace( '__SELECTED_OPTIONS', this._createSelectedStr() );
            for ( var i = 0; i < li.length; i++ ) {
                if ( li[ i ].value ) {
                    checkedInputAttr = ( li[ i ].selected ) ? " checked='checked'" : '';
                    checkedLiAttr = ( li[ i ].selected && !_this.multiple ) ? "class='active'" : '';
                    /**
                     * e.g.:
                     * <li checked="checked">
                     *   <a class="option-wrapper" tabindex="-1" href="#">
                     *         <label>
                     *           <input class="ignore" type="checkbox" checked="checked" value="a"/>
                     *         </label>
                     *       </a>
                     *    </li>
                     */
                    liHtml +=
                        "<li " + checkedLiAttr + ">" +
                        "<a class='option-wrapper' tabindex='-1' href='#'>" +
                        "<label>" +
                        "<input class='ignore' " + inputAttr + checkedInputAttr + "value='" + li[ i ].value + "' />" +
                        "<span class='option-label'>" + li[ i ].label + "</span></label>" +
                        "</a>" +
                        "</li>";
                }
            }
        }

        template = template.replace( '__ADD_LI', liHtml );

        return $( template );
    };


    /**
     * create text to show in closed picker
     * @param  {jQuery=} $select  jQuery-wrapped select element
     * @return {string}
     */
    DesktopSelectpicker.prototype._createSelectedStr = function() {
        var textToShow,
            selectedLabels = [],
            $select = $( this.element );
        $select.find( 'option:selected' ).each( function() {
            if ( $( this ).attr( 'value' ).length > 0 ) {
                selectedLabels.push( $( this ).text() );
            }
        } );

        if ( selectedLabels.length === 0 ) {
            return this.noneSelectedText;
        }
        textToShow = selectedLabels.join( ', ' );
        return ( textToShow.length > this.lengthmax ) ? selectedLabels.length + ' selected' : textToShow;
    };

    DesktopSelectpicker.prototype._clickListener = function() {
        var _this = this;

        this.$picker.on( 'click', 'li:not(.disabled)', function( e ) {
            e.preventDefault();
            var $li = $( this ),
                $input = $li.find( 'input' ),
                $select = $( _this.element ),
                $option = $select.find( 'option[value="' + $input.val() + '"]' ),
                selectedBefore = $option.is( ':selected' );

            if ( !_this.multiple ) {
                _this.$picker.find( 'li' ).removeClass( 'active' );
                $option.siblings( 'option' ).prop( 'selected', false );
                _this.$picker.find( 'input' ).prop( 'checked', false );
            } else {
                //don't close dropdown for multiple select
                e.stopPropagation();
            }

            if ( selectedBefore ) {
                $li.removeClass( 'active' );
                $input.prop( 'checked', false );
                $option.prop( 'selected', false );
            } else {
                if ( !_this.multiple ) {
                    $li.addClass( 'active' );
                }
                $input.prop( 'checked', true );
                $option.prop( 'selected', true );
            }

            _this.$picker.find( '.selected' ).html( _this._createSelectedStr() );

            $select.trigger( 'change' );
        } );
    };

    DesktopSelectpicker.prototype._focusListener = function() {
        var _this = this;

        this.$picker.on( 'shown.bs.dropdown', function() {
            $( _this.element ).trigger( 'fakefocus' );
            return true;
        } ).on( 'hidden.bs.dropdown', function() {
            $( _this.element ).trigger( 'fakeblur' );
            return true;
        } );
    };

    //override super method
    DesktopSelectpicker.prototype.disable = function() {
        this.$picker.find( 'li' ).addClass( 'disabled' );
    };

    //override super method
    DesktopSelectpicker.prototype.enable = function() {
        this.$picker.find( 'li' ).removeClass( 'disabled' );
    };

    //override super method
    DesktopSelectpicker.prototype.update = function() {
        this.$picker.remove();
        this._init();
    };

    /**
     * [selectpicker description]
     * @param {({btnStyle: string, noneSelectedText: string, maxlength:number}|string)=} option options
     * @param {*=} event       [description]
     */
    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {

            var $this = $( this ),
                data = $this.data( pluginName );

            //only instantiate if options is an object AND if options.touch is falsy
            if ( !data && typeof options == 'object' && !options.touch ) {
                $this.data( pluginName, ( data = new DesktopSelectpicker( this, options, event ) ) );
            } else if ( data && typeof options == 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    + function( $ ) {
        //'use strict';

        // DROPDOWN CLASS DEFINITION
        // =========================

        var backdrop = '.dropdown-backdrop';
        var toggle = '[data-toggle=dropdown]';
        var Dropdown = function( element ) {
            $( element ).on( 'click.bs.dropdown', this.toggle );
        };

        Dropdown.prototype.toggle = function( e ) {
            var $this = $( this );

            if ( $this.is( '.disabled, :disabled' ) ) return;

            var $parent = getParent( $this );
            var isActive = $parent.hasClass( 'open' );

            clearMenus();

            if ( !isActive ) {
                if ( 'ontouchstart' in document.documentElement && !$parent.closest( '.navbar-nav' ).length ) {
                    // if mobile we use a backdrop because click events don't delegate
                    $( '<div class="dropdown-backdrop"/>' ).insertAfter( $( this ) ).on( 'click', clearMenus );
                }

                var relatedTarget = {
                    relatedTarget: this
                };
                $parent.trigger( e = $.Event( 'show.bs.dropdown', relatedTarget ) );

                if ( e.isDefaultPrevented() ) return;

                $parent
                    .toggleClass( 'open' )
                    .trigger( 'shown.bs.dropdown', relatedTarget );

                $this.focus();
            }

            return false;
        };

        Dropdown.prototype.keydown = function( e ) {
            if ( !/(38|40|27)/.test( e.keyCode ) ) return;

            var $this = $( this );

            e.preventDefault();
            e.stopPropagation();

            if ( $this.is( '.disabled, :disabled' ) ) return;

            var $parent = getParent( $this );
            var isActive = $parent.hasClass( 'open' );

            if ( !isActive || ( isActive && e.keyCode == 27 ) ) {
                if ( e.which == 27 ) $parent.find( toggle ).focus();
                return $this.click();
            }

            var desc = ' li:not(.divider):visible a';
            var $items = $parent.find( '[role=menu]' + desc + ', [role=listbox]' + desc );

            if ( !$items.length ) return;

            var index = $items.index( $items.filter( ':focus' ) );

            if ( e.keyCode == 38 && index > 0 ) index--; // up
            if ( e.keyCode == 40 && index < $items.length - 1 ) index++; // down
            if ( !~index ) index = 0;

            $items.eq( index ).focus();
        };

        function clearMenus( e ) {
            $( backdrop ).remove();
            $( toggle ).each( function() {
                var $parent = getParent( $( this ) );
                var relatedTarget = {
                    relatedTarget: this
                };
                if ( !$parent.hasClass( 'open' ) ) return;
                $parent.trigger( e = $.Event( 'hide.bs.dropdown', relatedTarget ) );
                if ( e.isDefaultPrevented() ) return;
                $parent.removeClass( 'open' ).trigger( 'hidden.bs.dropdown', relatedTarget );
            } );
        }

        function getParent( $this ) {
            var selector = $this.attr( 'data-target' );

            if ( !selector ) {
                selector = $this.attr( 'href' );
                selector = selector && /#[A-Za-z]/.test( selector ) && selector.replace( /.*(?=#[^\s]*$)/, '' ); //strip for ie7
            }

            var $parent = selector && $( selector );

            return $parent && $parent.length ? $parent : $this.parent();
        }


        // DROPDOWN PLUGIN DEFINITION
        // ==========================

        var old = $.fn.dropdown;

        $.fn.dropdown = function( option ) {
            return this.each( function() {
                var $this = $( this );
                var data = $this.data( 'bs.dropdown' );

                if ( !data ) $this.data( 'bs.dropdown', ( data = new Dropdown( this ) ) );
                if ( typeof option == 'string' ) data[ option ].call( $this );
            } );
        };

        $.fn.dropdown.Constructor = Dropdown;


        // DROPDOWN NO CONFLICT
        // ====================

        $.fn.dropdown.noConflict = function() {
            $.fn.dropdown = old;
            return this;
        };


        // APPLY TO STANDARD DROPDOWN ELEMENTS
        // ===================================

        $( document )
            .on( 'click.bs.dropdown.data-api', clearMenus )
            .on( 'click.bs.dropdown.data-api', '.dropdown form', function( e ) {
                e.stopPropagation();
            } )
            .on( 'click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle )
            .on( 'keydown.bs.dropdown.data-api', toggle + ', [role=menu], [role=listbox]', Dropdown.prototype.keydown );

    }( jQuery );

} );
