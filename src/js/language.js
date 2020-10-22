/**
 * Form languages module.
 *
 * @module language
 */

import { getSiblingElements } from './dom-utils';
import events from './event';

export default {
    /**
     * @param {string} overrideLang - override language IANA subtag
     */
    init( overrideLang ) {
        if ( !this.form ) {
            throw new Error( 'Language module not correctly instantiated with form property.' );
        }
        const root = this.form.view.html.closest( 'body' ) || this.form.view.html.parentNode;
        if ( !root ) {
            return;
        }
        const langSelector = root.querySelector( '.form-language-selector' );
        const formLanguages = this.form.view.html.querySelector( '#form-languages' );

        if ( !formLanguages ) {
            return;
        }

        this.languages = [ ...formLanguages.querySelectorAll( 'option' ) ].map( option => option.value );
        if ( langSelector ) {
            langSelector
                .append( formLanguages );
            if ( this.languages.length > 1 ) {
                langSelector.classList.remove( 'hide' );
            }
        }
        this.formLanguages = root.querySelector( '#form-languages' );

        if ( overrideLang && this.languages.includes( overrideLang ) && this.languages.length > 1 ) {
            this._currentLang = overrideLang;
            this.setFormUi( this._currentLang );
        } else {
            this._currentLang = this.formLanguages.dataset.defaultLang || this.languages[ 0 ] || '';
        }

        const langOption = this.formLanguages.querySelector( `[value="${this._currentLang}"]` );
        const currentDirectionality = langOption && langOption.dataset.dir || 'ltr';

        this.formLanguages.value = this._currentLang;

        this.form.view.html.setAttribute( 'dir', currentDirectionality );

        if ( this.languages.length < 2 ) {
            return;
        }

        this.formLanguages.addEventListener( events.Change().type, event => {
            event.preventDefault();
            this._currentLang = event.target.value;
            this.setFormUi( this._currentLang );
        } );

        this.form.view.html.addEventListener( events.AddRepeat().type, event => this.setFormUi( this._currentLang, event.target ) );
    },
    /**
     * @type {string}
     */
    get currentLang() {
        return this._currentLang;
    },
    /**
     * @type {string}
     */
    get currentLangDesc() {
        const langOption = this.formLanguages.querySelector( `[value="${this._currentLang}"]` );

        return langOption ? langOption.textContent : null;
    },
    /**
     * @type {Array}
     */
    get languagesUsed() {
        return this.languages || [];
    },
    setFormUi( lang, group = this.form.view.html ) {
        const dir = this.formLanguages.querySelector( `[value="${lang}"]` ).dataset.dir || 'ltr';
        const translations = [ ...group.querySelectorAll( '[lang]' ) ];

        this.form.view.html.setAttribute( 'dir', dir );
        translations.forEach( el => el.classList.remove( 'active' ) );
        translations
            .filter( el => el.matches( `[lang="${lang}"], [lang=""]` ) &&
                ( !el.classList.contains( 'or-form-short' ) || ( el.classList.contains( 'or-form-short' ) && getSiblingElements( el, '.or-form-long' ).length === 0 ) ) )
            .forEach( el => el.classList.add(
                'active'
            ) );

        // For use in locale-sensitive XPath functions.
        // Don't even check whether it's a proper subtag or not. It will revert to client locale if it is not recognized.
        window.enketoFormLocale = lang;

        this.form.view.html.querySelectorAll( 'select, datalist' ).forEach( el => this.setSelect( el ) );
        this.form.view.html.dispatchEvent( events.ChangeLanguage() );
    },
    /**
     * swap language of <select> and <datalist> <option>s
     *
     * @param {Element} select - select or datalist HTML element
     */
    setSelect( select ) {
        const type = select.nodeName.toLowerCase();
        const question = select.closest( '.question, .or-repeat-info' );
        const translations = question ? question.querySelector( '.or-option-translations' ) : null;

        if ( !translations ) {
            return;
        }

        [ ...select.children ].filter( el => el.matches( 'option' ) && !el.matches( '[value=""], [data-value=""]' ) )
            .forEach( option => {
                const curLabel = type === 'datalist' ? option.value : option.textContent;
                // Datalist will not have initialized when init function is called upon form load, so it is option.value until it has initialized. That is not great.
                const value = type === 'datalist' ? option.dataset.value || option.value : option.value;
                const translatedOption = translations.querySelector( `.active[data-option-value="${value}"]` );
                if ( translatedOption ) {
                    let newLabel = curLabel;
                    if ( translatedOption && translatedOption.textContent ) {
                        newLabel = translatedOption.textContent;
                    }
                    option.value = value;
                    option.textContent = newLabel;
                }
            } );
    }
};
