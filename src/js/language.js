'use strict';

/**
 * Form languages module.
 */

var $ = require( 'jquery' );

module.exports = {
    init: function() {
        var that = this;
        var $langSelector = $( '.form-language-selector' );
        var currentDirectionality;

        if ( !this.form ) {
            throw new Error( 'Language module not correctly instantiated with form property.' );
        }

        this.$formLanguages = this.form.view.$.find( '#form-languages' );
        this.currentLang = this.$formLanguages.attr( 'data-default-lang' ) || this.$formLanguages.find( 'option' ).eq( 0 ).attr( 'value' );
        currentDirectionality = this.$formLanguages.find( '[value="' + this.currentLang + '"]' ).attr( 'data-dir' ) || 'ltr';

        this.$formLanguages
            .detach()
            .appendTo( $langSelector )
            .val( this.currentLang );

        this.form.view.$
            .attr( 'dir', currentDirectionality );

        if ( this.$formLanguages.find( 'option' ).length < 2 ) {
            return;
        }

        $langSelector.removeClass( 'hide' );

        this.$formLanguages.change( function( event ) {
            event.preventDefault();
            that.currentLang = $( this ).val();
            that.setAll( that.currentLang );
        } );
    },
    getCurrentLang: function() {
        return this.currentLang;
    },
    getCurrentLangDesc: function() {
        return this.$formLanguages.find( '[value="' + this.currentLang + '"]' ).text();
    },
    setAll: function( lang ) {
        var that = this;
        var dir = this.$formLanguages.find( '[value="' + lang + '"]' ).attr( 'data-dir' ) || 'ltr';

        this.form.view.$
            .attr( 'dir', dir )
            .find( '[lang]' )
            .removeClass( 'active' )
            .filter( '[lang="' + lang + '"], [lang=""]' )
            .filter( function() {
                var $this = $( this );
                return !$this.hasClass( 'or-form-short' ) || ( $this.hasClass( 'or-form-short' ) && $this.siblings( '.or-form-long' ).length === 0 );
            } )
            .addClass( 'active' );

        this.form.view.$.find( 'select, datalist' ).each( function() {
            that.setSelect( $( this ) );
        } );

        this.form.view.$.trigger( 'changelanguage' );
    },
    // swap language of <select> and <datalist> <option>s
    setSelect: function( $select ) {
        var value;
        var /** @type {string} */ curLabel;
        var /** @type {string} */ newLabel;
        $select.children( 'option' ).not( '[value=""], [data-value=""]' ).each( function() {
            var $option = $( this );
            curLabel = $option.text();
            value = $option.attr( 'value' ) || $option[ 0 ].dataset.value;
            newLabel = $option.closest( '.question' ).find( '.or-option-translations' )
                .children( '.active[data-option-value="' + value + '"]' ).text().trim();
            newLabel = ( typeof newLabel !== 'undefined' && newLabel.length > 0 ) ? newLabel : curLabel;
            $option.text( newLabel );
        } );
    }
};
