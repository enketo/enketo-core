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

/**
 * Bootstrap Select picker that supports single and multiple selects
 * A port of https://github.com/silviomoreto/bootstrap-select
 */

( function( factory ) {
  if ( typeof define === 'function' && define.amd ) {
    // AMD. Register as an anonymous module.
    define( [ 'jquery' ], factory );
  } else {
    // Browser globals
    factory( jQuery );
  }
}( function( $ ) {
  "use strict";

  var pluginName = 'selectpicker';

  /**
   * Select picker Class
   * @constructor
   * @param {Element} element [description]
   * @param {(boolean|{btnStyle: string, noneSelectedText: string, maxlength:number})} options options
   * @param {*=} e     event
   */

  function Selectpicker( element, options, e ) {
    if ( e ) {
      e.stopPropagation( );
      e.preventDefault( );
    }
    this.$element = $( element );
    this.$newElement = null;
    this.selectClass = options.btnStyle || '';
    this.noneSelectedText = options.noneSelectedText || 'none selected';
    this.lengthmax = options.maxlength || 20;
    this.multiple = ( typeof this.$element.attr( 'multiple' ) !== 'undefined' && this.$element.attr( 'multiple' ) !== false );
    this.init( );
  }

  Selectpicker.prototype = {

    constructor: Selectpicker,

    init: function( ) {
      var $template = this.getTemplate( );
      this.$element.css( 'display', 'none' );
      $template = this.createLi( $template );
      this.$element.after( $template );
      this.$newElement = this.$element.next( '.bootstrap-select' );
      this.$newElement.find( '> a' ).addClass( this.selectClass );
      this.clickListener( );
      //this.focusListener();
    },

    getTemplate: function( ) {
      var template =
        "<div class='btn-group bootstrap-select widget'>" +
        "<a class='btn dropdown-toggle clearfix' data-toggle='dropdown' href='#''>" +
        "<span class='filter-option pull-left'>__SELECTED_OPTIONS</span>" +
        "<span class='caret pull-right'></span>" +
        "</a>" +
        "<ul class='dropdown-menu' role='menu'>" +
        "__ADD_LI" +
        "</ul>" +
        "</div>";

      return template;
    },

    createLi: function( template ) {

      var li = [ ];
      var liHtml = '';
      var inputAttr = ( this.multiple ) ? "type='checkbox'" : "type='radio' style='display: none;' name='" + Math.random( ) * 100000 + "'";
      var _this = this;
      var checkedInputAttr,
        checkedLiAttr;

      this.$element.find( 'option' ).each( function( ) {
        li.push( {
          label: $( this ).text( ),
          selected: $( this ).is( ':selected' ),
          value: $( this ).attr( 'value' )
        } );
      } );

      if ( li.length > 0 ) {
        template = template.replace( '__SELECTED_OPTIONS', this.createSelectedStr( ) );
        for ( var i = 0; i < li.length; i++ ) {
          if ( li[ i ].value ) {
            checkedInputAttr = ( li[ i ].selected ) ? " checked='checked'" : '';
            checkedLiAttr = ( li[ i ].selected && !_this.multiple ) ? "class='active'" : '';
            liHtml += "<li " + checkedLiAttr + "><a tabindex='-1' href='#'><label class='checkbox inline'>" +
              "<input class='ignore' " + inputAttr + checkedInputAttr + "value='" + li[ i ].value + "' />" + li[ i ].label + "</label></a></li>";
          }
        }
      }

      template = template.replace( '__ADD_LI', liHtml );

      return template;
    },
    /**
     * create text to show in closed picker
     * @param  {jQuery=} $select  jQuery-wrapped select element
     * @return {string}
     */
    createSelectedStr: function( $select ) {
      var textToShow,
        selectedLabels = [ ];
      $select = $select || this.$element;
      $select.find( 'option:selected' ).each( function( ) {
        if ( $( this ).attr( 'value' ).length > 0 ) {
          selectedLabels.push( $( this ).text( ) );
        }
      } );

      if ( selectedLabels.length === 0 ) {
        return this.noneSelectedText;
      }
      textToShow = selectedLabels.join( ', ' );
      return ( textToShow.length > this.lengthmax ) ? selectedLabels.length + ' selected' : textToShow;
    },

    clickListener: function( ) {
      var _this = this;

      this.$newElement.find( 'li' ).on( 'click', function( e ) {
        e.preventDefault( );
        var $li = $( this ),
          $input = $li.find( 'input' ),
          $picker = $li.parents( '.bootstrap-select' ),
          $select = $picker.prev( 'select' ),
          $option = $select.find( 'option[value="' + $input.val( ) + '"]' ),
          selectedBefore = $option.is( ':selected' );

        if ( !_this.multiple ) {
          $picker.find( 'li' ).removeClass( 'active' );
          $option.siblings( 'option' ).prop( 'selected', false );
          $picker.find( 'input' ).prop( 'checked', false );
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

        $picker.find( '.filter-option' ).html( _this.createSelectedStr( $select ) );

        $select.trigger( 'change' );
      } );
    },
    //this listener for fake focus and blur events has a bug and actually breaks the widget!
    //TODO: when bootstrap 3.0 has launched, used the dropdown open and close events to do this.
    focusListener: function( ) {
      var _this = this;

      _this.$newElement.find( '.dropdown-toggle' ).hover(
        function( ) {
          console.debug( 'focus...' );
          _this.$element.trigger( 'focus' );
          return true;
        },
        function( ) {
          console.debug( 'blur...' );
          _this.$element.trigger( 'blur' );
          return true;
        }
      );
    },
    destroy: function( ) {
      console.debug( 'selectpicker destroy called' );
    },
    enable: function( ) {
      console.debug( 'selectpicker enable called' );
    },
    disable: function( ) {
      console.debug( 'selectpicker disable called' );
    },
    update: function( ) {
      console.debug( 'selectpicker update called' );
      this.$newElement.remove( );
      this.init( );
    }
  };

  /**
   * [selectpicker description]
   * @param {({btnStyle: string, noneSelectedText: string, maxlength:number}|string)=} option options
   * @param {*=} event       [description]
   */
  $.fn[ pluginName ] = function( options, event ) {
    return this.each( function( ) {
      var $this = $( this ),
        data = $this.data( pluginName ),
        options = options || {};

      if ( !data ) {
        $this.data( pluginName, ( data = new Selectpicker( this, options, event ) ) );
      }
      if ( typeof options == 'string' ) {
        data[ options ]( );
      }
    } );
  };

  $.fn[ pluginName ].Constructor = Selectpicker;

} ) );