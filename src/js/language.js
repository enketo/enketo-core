'use strict';

/**
 * Form languages module.
 */

var $ = require( 'jquery' );

module.exports = {
    init: function() {
        var that = this;
        if ( !this.form ) {
            throw new Error( 'Language module not correctly instantiated with form property.' );
        }
        var root = this.form.view.html.closest( 'body' ) || this.form.view.html.parentNode;
        if ( !root ) {
            return;
        }
        var $langSelector = $( root.querySelector( '.form-language-selector' ) );
        this.$formLanguages = $( this.form.view.html.querySelector( '#form-languages' ) );
        this._currentLang = this.$formLanguages.attr( 'data-default-lang' ) || this.$formLanguages.find( 'option' ).eq( 0 ).attr( 'value' );
        var currentDirectionality = this.$formLanguages.find( '[value="' + this._currentLang + '"]' ).attr( 'data-dir' ) || 'ltr';

        if ( $langSelector.length && this.$formLanguages.find( 'option' ).length > 1 ) {
            this.$formLanguages
                .detach()
                .appendTo( $langSelector );
            $langSelector.removeClass( 'hide' );
        }

        this.$formLanguages.val( this._currentLang );

        this.form.view.$
            .attr( 'dir', currentDirectionality );

        if ( this.$formLanguages.find( 'option' ).length < 2 ) {
            return;
        }

        this.$formLanguages.change( function( event ) {
            event.preventDefault();
            that._currentLang = $( this ).val();
            that.setAll( that._currentLang );
        } );
    },
    /**
     * @deprecated
     */
    getCurrentLang: function() {
        console.deprecate( 'langs.getCurrentLang()', 'langs.currentLang' );
        return this.currentLang;
    },
    get currentLang() {
        return this._currentLang;
    },
    /**
     * @deprecated
     */
    getCurrentLangDesc: function() {
        console.deprecate( 'langs.getCurrentLangDesc()', 'langs.currentLangDesc' );
        return this.currentLangDesc;
    },
    get currentLangDesc() {
        return this.$formLanguages.find( '[value="' + this._currentLang + '"]' ).text();
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

        // For use in locale-sensitive XPath functions.
        // Don't even check whether it's a proper subtag or not. It will revert to client locale if it is not recognized.
        window.enketoFormLocale = lang;

        this.form.view.$.find( 'select, datalist' ).each( function() {
            that.setSelect( this );
        } );

        this.form.view.$.trigger( 'changelanguage' );
    },
    // swap language of <select> and <datalist> <option>s
    setSelect: function( select ) {
        var type = select.nodeName.toLowerCase();
        var question = select.closest( '.question' );
        var translations = question ? question.querySelector( '.or-option-translations' ) : null;

        if ( !translations ) {
            return;
        }
        Array.prototype.slice.call( select.children )
            .filter( function( el ) {
                return el.matches( 'option' ) && !el.matches( '[value=""], [data-value=""]' );
            } )
            .forEach( function( option ) {
                var curLabel = type === 'datalist' ? option.value : option.textContent;
                var value = type === 'datalist' ? option.dataset.value : option.value;
                var translatedOption = translations.querySelector( '.active[data-option-value="' + value + '"]' );
                var newLabel = curLabel;
                if ( translatedOption && translatedOption.textContent ) {
                    newLabel = translatedOption.textContent;
                }
                option.value = value;
                option.textContent = newLabel;
            } );
    }
};
